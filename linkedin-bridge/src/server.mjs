import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import pino from 'pino';
import { verifyTicket, signTicket, seal, unseal, scope } from './security.mjs';
import { isSessionOwnerActive } from './session_access.mjs';
import { ChromeSession, isAllowedLinkedInUrl } from './chrome_cdp.mjs';

const secret = process.env.LINKEDIN_BRIDGE_SECRET || '';
const encryptionKey = Buffer.from(process.env.LINKEDIN_SESSION_KEY || '', 'base64');
if (secret.length < 32 || encryptionKey.length !== 32 || !process.env.MONGO_URI || !process.env.DATABASE_NAME) {
  throw new Error('Configure MongoDB, a bridge secret of at least 32 characters and a 32-byte base64 session key');
}

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db(process.env.DATABASE_NAME);
const connections = db.collection('linkedin_connections');
const auth = db.collection('linkedin_auth');
const chats = db.collection('linkedin_chats');
const contacts = db.collection('linkedin_contacts');
const messages = db.collection('linkedin_messages');
const sends = db.collection('linkedin_sends');

await Promise.all([
  connections.createIndex({ company: 1, owner: 1 }, { unique: true }),
  chats.createIndex({ sid: 1, threadId: 1 }, { unique: true }),
  chats.createIndex({ sid: 1, timestamp: -1 }),
  contacts.createIndex({ sid: 1, contactId: 1 }, { unique: true }),
  messages.createIndex({ sid: 1, threadId: 1, messageId: 1 }, { unique: true }),
  messages.createIndex({ sid: 1, threadId: 1, timestamp: -1 }),
]);

const leaseOwner = randomUUID();
const leases = db.collection('linkedin_worker_leases');
try {
  const leaseFilter = process.env.FORCE_TAKEOVER !== '0'
    ? { _id: 'worker' }
    : { _id: 'worker', expiresAt: { $lt: new Date() } };
  await leases.updateOne(
    leaseFilter,
    { $set: { owner: leaseOwner, expiresAt: new Date(Date.now() + 45000) } },
    { upsert: true },
  );
} catch {
  throw new Error('Another LinkedIn worker is active; run exactly one bridge replica');
}
const leaseTimer = setInterval(async () => {
  try {
    const result = await leases.updateOne(
      { _id: 'worker', owner: leaseOwner },
      { $set: { expiresAt: new Date(Date.now() + 45000) } },
    );
    if (!result.matchedCount) process.exit(1);
  } catch {
    process.exit(1);
  }
}, 10000);

const logger = pino({ level: 'silent' });
void logger;

const live = new Map();
const locks = new Map();
const rates = new Map();

const fail = (status, message) => Object.assign(new Error(message), { status });
const safeThreadId = id => typeof id === 'string' && id.length >= 2 && id.length <= 240 && /^[0-9A-Za-z_.:(),~-]+$/.test(id);

async function serialized(sid, fn) {
  const previous = locks.get(sid) || Promise.resolve();
  const task = previous.catch(() => {}).then(fn);
  locks.set(sid, task);
  try {
    return await task;
  } finally {
    if (locks.get(sid) === task) locks.delete(sid);
  }
}

function limit(key, max) {
  const now = Date.now();
  if (rates.size > 10000) {
    for (const [id, row] of rates) if (row.until < now) rates.delete(id);
  }
  const row = rates.get(key);
  if (!row || row.until < now) {
    rates.set(key, { count: 1, until: now + 60000 });
    return;
  }
  if (++row.count > max) throw fail(429, 'Too many requests. Please wait a minute.');
}

async function readBody(req) {
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw fail(413, 'Request too large');
    parts.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString() || '{}');
  } catch {
    throw fail(400, 'Invalid JSON');
  }
}

async function sealCookies(sid, cookies) {
  const id = `${sid}:cookies`;
  await auth.updateOne(
    { _id: id },
    { $set: { sid, value: seal(JSON.stringify(cookies), encryptionKey, id), updatedAt: new Date() } },
    { upsert: true },
  );
}

async function unsealCookies(sid) {
  const id = `${sid}:cookies`;
  const row = await auth.findOne({ _id: id });
  if (!row?.value) return null;
  try {
    return JSON.parse(unseal(row.value, encryptionKey, id));
  } catch {
    return null;
  }
}

async function stopBrowser(sid, deleteProfile = false) {
  const state = live.get(sid);
  live.delete(sid);
  if (state?.session) {
    await state.session.close(deleteProfile);
  }
  if (deleteProfile) {
    const safeSid = String(sid || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    await rm(path.join(process.cwd(), '.profiles', safeSid), { recursive: true, force: true }).catch(() => {});
  }
}

async function recoverConnectionIfSealed(sid, row) {
  if (!row || row.status !== 'error') return row;
  const saved = await unsealCookies(sid);
  if (Array.isArray(saved) && saved.some(c => c.name === 'li_at' && c.value)) {
    await connections.updateOne(
      { _id: sid },
      { $set: { status: 'connected', desired: true, error: null } },
    );
    return { ...row, status: 'connected', desired: true, error: null };
  }
  return row;
}

async function checkSessionAccess(sid) {
  const cachedState = live.get(sid);
  if (cachedState?.accessVerifiedAt && Date.now() - cachedState.accessVerifiedAt < 60000) {
    return true;
  }
  try {
    if (await isSessionOwnerActive(db, sid)) {
      if (cachedState) cachedState.accessVerifiedAt = Date.now();
      return true;
    }
  } catch (error) {
    await stopBrowser(sid);
    throw error;
  }
  await stopBrowser(sid);
  await connections.updateOne(
    { _id: sid },
    {
      $set: {
        desired: false,
        status: 'disconnected',
        error: 'LinkedIn sync stopped because the CRM user or company is no longer active.',
      },
    },
  );
  return false;
}

async function ensureBrowser(sid, targetUrl = null, userAgent = null) {
  let state = live.get(sid);
  if (state?.session && !state.session.closed) {
    return state;
  }
  const [savedCookies, row] = await Promise.all([
    unsealCookies(sid),
    connections.findOne({ _id: sid }),
  ]);
  const hasLiAt = Array.isArray(savedCookies) && savedCookies.some(c => c.name === 'li_at' && c.value);
  const startUrl = isAllowedLinkedInUrl(targetUrl)
    ? targetUrl
    : hasLiAt
      ? 'https://www.linkedin.com/feed/'
      : 'https://www.linkedin.com/login';

  const resolvedUa = (typeof userAgent === 'string' && userAgent.trim()) || row?.userAgent || null;
  if (userAgent && row && !row.userAgent) {
    await connections.updateOne({ _id: sid }, { $set: { userAgent: String(userAgent).slice(0, 300) } }).catch(() => {});
  }
  const session = new ChromeSession(sid);
  await session.start(startUrl, savedCookies, resolvedUa);
  state = {
    session,
    status: row?.status === 'connected' || hasLiAt ? 'connected' : 'login_browser',
    profileName: row?.profileName || null,
    handle: row?.handle || null,
    syncing: false,
    lastSyncAt: 0,
    lastProfileCheckAt: 0,
    lastAuthCheckAt: 0,
    lastCookieSealAt: 0,
    accessVerifiedAt: Date.now(),
  };
  live.set(sid, state);
  return state;
}

async function syncSessionData(sid) {
  const state = live.get(sid);
  if (!state || state.session.closed) return null;
  if (state.syncing) return null;
  state.syncing = true;
  try {
    const result = await state.session.syncConversationsAndConnections();
    if (!result?.ok) return null;
    if (!await checkSessionAccess(sid)) return null;

    if (Array.isArray(result.chats) && result.chats.length) {
      await chats.bulkWrite(
        result.chats.map(c => ({
          updateOne: {
            filter: { sid, threadId: c.threadId },
            update: {
              $set: {
                sid,
                threadId: c.threadId,
                conversationUrn: c.conversationUrn || c.threadId,
                name: c.name || 'LinkedIn Conversation',
                headline: c.headline || '',
                handle: c.handle || null,
                profileUrl: c.profileUrl || null,
                preview: c.preview || '',
                timestamp: Number(c.timestamp || Math.floor(Date.now() / 1000)),
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    if (Array.isArray(result.messages) && result.messages.length) {
      await messages.bulkWrite(
        result.messages.map(m => ({
          updateOne: {
            filter: { sid, threadId: m.threadId, messageId: m.messageId },
            update: {
              $setOnInsert: {
                sid,
                threadId: m.threadId,
                messageId: m.messageId,
                text: m.text,
                fromMe: Boolean(m.fromMe),
                senderName: m.senderName || '',
                timestamp: Number(m.timestamp || Math.floor(Date.now() / 1000)),
                status: m.status ?? 3,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    if (Array.isArray(result.contacts) && result.contacts.length) {
      await contacts.bulkWrite(
        result.contacts.map(c => ({
          updateOne: {
            filter: { sid, contactId: c.contactId },
            update: {
              $set: {
                sid,
                contactId: c.contactId,
                name: c.name,
                headline: c.headline || '',
                handle: c.handle || null,
                profileUrl: c.profileUrl || null,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    state.lastSyncAt = Date.now();
    await connections.updateOne({ _id: sid }, { $set: { lastSyncedAt: new Date() } });
    return {
      chatsCount: result.chats?.length || 0,
      messagesCount: result.messages?.length || 0,
      contactsCount: result.contacts?.length || 0,
    };
  } finally {
    state.syncing = false;
  }
}

async function finalizeAuthIfLoggedIn(sid, state, currentUrl = '') {
  if (/linkedin\.com\/(login|uas|checkpoint|signup)/i.test(currentUrl)) {
    return state.status === 'connected';
  }
  const cookies = await state.session.getCookies().catch(() => null);
  if (!cookies) {
    // Transient target switch or closing popup; never falsely mark a connected session expired.
    return state.status === 'connected';
  }
  const liAtCookie = cookies.find(c => c.name === 'li_at' && c.value);

  if (!liAtCookie) {
    const saved = await unsealCookies(sid);
    if (Array.isArray(saved) && saved.some(c => c.name === 'li_at' && c.value)) {
      await state.session.setCookies(saved).catch(() => {});
      return true;
    }
    const isOAuth = /accounts\.google\.com|appleid\.apple\.com|login\.microsoftonline\.com/i.test(currentUrl);
    if (state.status === 'connected' && !isOAuth) {
      state.status = 'error';
      await connections.updateOne(
        { _id: sid },
        { $set: { status: 'error', error: 'LinkedIn session expired. Please sign in again.' } },
      );
    }
    return false;
  }

  if (currentUrl && !/linkedin\.com/i.test(currentUrl) && state.status !== 'connected') {
    return false;
  }

  if (state.status !== 'connected' || Date.now() - (state.lastCookieSealAt || 0) > 60000) {
    await sealCookies(sid, cookies);
    state.lastCookieSealAt = Date.now();
  }

  const shouldVerifyProfile = state.status !== 'connected' || Date.now() - (state.lastProfileCheckAt || 0) > 900000;
  if (!shouldVerifyProfile) {
    return true;
  }

  const profile = await state.session.extractLinkedInProfile().catch(() => ({ authenticated: false, transient: true }));
  if (profile?.transient) {
    return state.status === 'connected';
  }
  state.lastProfileCheckAt = Date.now();

  if (profile?.authenticated) {
    const wasConnected = state.status === 'connected';
    state.status = 'connected';
    state.profileName = profile.profileName || state.profileName || null;
    state.handle = profile.handle || state.handle || null;
    await connections.updateOne(
      { _id: sid },
      {
        $set: {
          status: 'connected',
          desired: true,
          error: null,
          profileName: profile.profileName || null,
          headline: profile.headline || null,
          handle: profile.handle || null,
          profileUrl: profile.profileUrl || null,
          memberUrn: profile.memberUrn || null,
          ...(wasConnected ? {} : { linkedAt: new Date() }),
        },
      },
    );
    return true;
  }

  if (state.status !== 'connected' && /linkedin\.com\/(feed|mynetwork|messaging|notifications|in\/)/i.test(currentUrl)) {
    state.status = 'connected';
    await connections.updateOne(
      { _id: sid },
      { $set: { status: 'connected', desired: true, error: null, linkedAt: new Date() } },
    );
    return true;
  }

  return state.status === 'connected';
}

function connectionView(row, sid = null) {
  if (!row) return { status: 'disconnected', browserActive: false };
  const state = sid ? live.get(sid) : live.get(row._id);
  return {
    owner: row.owner,
    ownerName: row.ownerName,
    profileName: row.profileName || null,
    headline: row.headline || null,
    handle: row.handle || null,
    profileUrl: row.profileUrl || null,
    status: state?.status || row.status || 'disconnected',
    browserActive: Boolean(state?.session && !state.session.closed),
    lastSyncedAt: row.lastSyncedAt || null,
    error: row.error || null,
  };
}

const bridgePort = Number(process.env.LINKEDIN_BRIDGE_PORT || 3102);
const bridgePublicUrl = `http://127.0.0.1:${bridgePort}`;
const streamMeta = actor => ({ streamTicket: signTicket(actor, secret, 300), bridgeUrl: bridgePublicUrl });

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  try {
    let actor;
    try {
      actor = verifyTicket(req.headers.authorization?.replace(/^Bearer /, ''), secret);
    } catch {
      throw fail(401, 'Unauthorized');
    }

    const url = new URL(req.url, 'http://localhost');
    const sid = scope(actor, url.searchParams.get('owner') || actor.user);
    limit(`${sid}:read`, 3000);

    let data;
    if (req.method === 'GET' && url.pathname === '/connections') {
      const filter = actor.admin ? { company: actor.company } : { company: actor.company, owner: actor.user };
      const rows = await Promise.all(
        (await connections.find(filter).toArray()).map(row => recoverConnectionIfSealed(row._id, row)),
      );
      data = {
        admin: Boolean(actor.admin),
        currentUser: actor.user,
        connections: rows.map(row => connectionView(row, row._id)),
      };
    } else if (req.method === 'GET' && url.pathname === '/connection') {
      const own = scope(actor);
      const row = await recoverConnectionIfSealed(own, await connections.findOne({ _id: own }));
      data = { ...connectionView(row, own), ...streamMeta(actor) };
    } else if (req.method === 'POST' && url.pathname === '/connect') {
      const own = scope(actor);
      limit(`${own}:connect`, 10);
      const body = await readBody(req);
      if (body.consent !== true) throw fail(400, 'Confirm company visibility before connecting LinkedIn');
      if (!await checkSessionAccess(own)) throw fail(403, 'An active company account is required');

      const mode = body.mode === 'cookie' ? 'cookie' : 'browser';
      data = await serialized(own, async () => {
        if (mode === 'cookie') {
          const liAt = typeof body.liAt === 'string' ? body.liAt.trim() : '';
          const jsessionId = typeof body.jsessionId === 'string' ? body.jsessionId.trim() : '';
          if (liAt.length < 20 || liAt.length > 2048) {
            throw fail(400, 'Please enter a valid LinkedIn li_at session cookie.');
          }
          await stopBrowser(own);
          const seedCookies = Array.isArray(body.cookies)
            ? body.cookies
                .filter(c => c && typeof c.name === 'string' && typeof c.value === 'string'
                  && (!c.domain || String(c.domain).endsWith('linkedin.com')))
                .slice(0, 150)
            : [];
          if (!seedCookies.some(c => c.name === 'li_at' && c.value === liAt)) {
            seedCookies.push({
              name: 'li_at',
              value: liAt,
              domain: '.linkedin.com',
              path: '/',
              secure: true,
              httpOnly: true,
              sameSite: 'None',
            });
          }
          if (jsessionId && !seedCookies.some(c => c.name === 'JSESSIONID')) {
            seedCookies.push({
              name: 'JSESSIONID',
              value: jsessionId,
              domain: '.www.linkedin.com',
              path: '/',
              secure: true,
              httpOnly: false,
              sameSite: 'None',
            });
          }
          const session = new ChromeSession(own);
          await session.start('https://www.linkedin.com/feed/', seedCookies, actor.ua || null);
          const profile = await session.extractLinkedInProfile().catch(() => ({ authenticated: false }));
          if (!profile?.authenticated) {
            await session.close();
            throw fail(400, 'LinkedIn rejected this session cookie or requested login verification. Use Live LinkedIn Browser login instead.');
          }
          const verifiedCookies = await session.getCookies();
          await sealCookies(own, verifiedCookies.length ? verifiedCookies : seedCookies);
          const state = {
            session,
            status: 'connected',
            profileName: profile.profileName || null,
            handle: profile.handle || null,
            syncing: false,
            lastSyncAt: 0,
            lastProfileCheckAt: Date.now(),
            lastAuthCheckAt: Date.now(),
            lastCookieSealAt: Date.now(),
            accessVerifiedAt: Date.now(),
          };
          live.set(own, state);
          await connections.updateOne(
            { _id: own },
            {
              $set: {
                company: actor.company,
                owner: actor.user,
                ownerName: String(actor.name || '').slice(0, 100),
                userAgent: actor.ua ? String(actor.ua).slice(0, 300) : null,
                desired: true,
                status: 'connected',
                error: null,
                profileName: profile.profileName || null,
                headline: profile.headline || null,
                handle: profile.handle || null,
                profileUrl: profile.profileUrl || null,
                memberUrn: profile.memberUrn || null,
                consentAt: new Date(),
                linkedAt: new Date(),
              },
            },
            { upsert: true },
          );
          return { ...connectionView(await connections.findOne({ _id: own }), own), ...streamMeta(actor) };
        }

        // Default mode: Interactive Live Browser Login inside CRM
        await stopBrowser(own);
        const existingRow = await connections.findOne({ _id: own });
        const savedCookies = await unsealCookies(own);
        const initialUrl = savedCookies?.length && existingRow?.status === 'connected'
          ? 'https://www.linkedin.com/feed/'
          : 'https://www.linkedin.com/login';

        const resolvedUa = actor.ua || existingRow?.userAgent || null;
        const session = new ChromeSession(own);
        await session.start(initialUrl, savedCookies, resolvedUa);
        const state = {
          session,
          status: 'login_browser',
          profileName: existingRow?.profileName || null,
          handle: existingRow?.handle || null,
          syncing: false,
          lastSyncAt: 0,
          lastProfileCheckAt: 0,
          lastAuthCheckAt: 0,
          lastCookieSealAt: 0,
          accessVerifiedAt: Date.now(),
        };
        live.set(own, state);
        await connections.updateOne(
          { _id: own },
          {
            $set: {
              company: actor.company,
              owner: actor.user,
              ownerName: String(actor.name || '').slice(0, 100),
              ...(resolvedUa ? { userAgent: String(resolvedUa).slice(0, 300) } : {}),
              desired: true,
              status: 'login_browser',
              error: null,
              consentAt: new Date(),
            },
          },
          { upsert: true },
        );
        const frame = await session.captureFrame();
        await finalizeAuthIfLoggedIn(own, state, frame.url);
        return {
          ...connectionView(await connections.findOne({ _id: own }), own),
          ...streamMeta(actor),
          frame,
        };
      });
    } else if (req.method === 'DELETE' && url.pathname === '/connection') {
      await serialized(sid, async () => {
        await stopBrowser(sid, true);
        await Promise.all([
          auth.deleteMany({ sid }),
          contacts.deleteMany({ sid }),
          chats.deleteMany({ sid }),
          messages.deleteMany({ sid }),
          sends.deleteMany({ sid }),
        ]);
        await connections.deleteOne({ _id: sid });
      });
      data = { success: true };
    } else if (req.method === 'GET' && url.pathname === '/browser/frame') {
      const own = scope(actor);
      if (!await checkSessionAccess(own)) throw fail(403, 'An active company account is required');
      const target = url.searchParams.get('url');
      let state = live.get(own);
      if (!state?.session || state.session.closed) {
        state = await serialized(own, () => ensureBrowser(own, target, actor.ua));
      }
      if (isAllowedLinkedInUrl(target)) {
        await state.session.performAction({ type: 'navigate', url: target });
      }
      const frame = await state.session.captureFrame(isAllowedLinkedInUrl(target));
      if (state.status !== 'connected' || Date.now() - (state.lastAuthCheckAt || 0) > 10000) {
        state.lastAuthCheckAt = Date.now();
        await finalizeAuthIfLoggedIn(own, state, frame.url);
      }
      data = {
        ...frame,
        status: state.status || 'login_browser',
        profileName: state.profileName || null,
        handle: state.handle || null,
        ...streamMeta(actor),
      };
    } else if (req.method === 'POST' && url.pathname === '/browser/action') {
      const own = scope(actor);
      if (!await checkSessionAccess(own)) throw fail(403, 'An active company account is required');
      const body = await readBody(req);
      let state = live.get(own);
      if (!state?.session || state.session.closed) {
        state = await serialized(own, () => ensureBrowser(own, null, actor.ua));
      }
      let synced = null;
      let actionResult = null;
      if (body.type === 'sync') {
        if (state.lastSyncAt && Date.now() - state.lastSyncAt < 60000) {
          throw fail(429, 'Please wait 1 minute between LinkedIn syncs to keep your account safe.');
        }
        synced = await serialized(own, () => syncSessionData(own));
      } else {
        actionResult = await state.session.performAction(body);
      }
      const frame = await state.session.captureFrame(body.type !== 'sync');
      if (state.status !== 'connected' || Date.now() - (state.lastAuthCheckAt || 0) > 10000) {
        state.lastAuthCheckAt = Date.now();
        await finalizeAuthIfLoggedIn(own, state, frame.url);
      }
      data = {
        ...frame,
        status: state.status || 'login_browser',
        profileName: state.profileName || null,
        handle: state.handle || null,
        ...streamMeta(actor),
        ...(actionResult && 'selectMenu' in actionResult ? { selectMenu: actionResult.selectMenu } : {}),
        synced,
      };
    } else if (req.method === 'POST' && url.pathname === '/sync') {
      const own = scope(actor);
      limit(`${own}:sync`, 12);
      if (!await checkSessionAccess(own)) throw fail(403, 'An active company account is required');
      data = await serialized(own, async () => {
        const row = await connections.findOne({ _id: own });
        const saved = await unsealCookies(own);
        if (!row || (!saved?.length && row.status !== 'connected')) {
          throw fail(409, 'Connect your LinkedIn account before syncing.');
        }
        const state = await ensureBrowser(own, 'https://www.linkedin.com/feed/', actor.ua);
        if (state.lastSyncAt && Date.now() - state.lastSyncAt < 60000) {
          throw fail(429, 'Please wait 1 minute between LinkedIn syncs to keep your account safe.');
        }
        await finalizeAuthIfLoggedIn(own, state);
        if (state.status !== 'connected') {
          throw fail(409, 'LinkedIn login is not complete yet.');
        }
        const stats = await syncSessionData(own);
        return { synced: true, ...(stats || { chatsCount: 0, messagesCount: 0, contactsCount: 0 }) };
      });
    } else if (req.method === 'GET' && url.pathname === '/chats') {
      data = await chats
        .find({ sid }, { projection: { _id: 0, sid: 0 } })
        .sort({ timestamp: -1 })
        .limit(200)
        .toArray();
    } else if (req.method === 'GET' && url.pathname === '/contacts') {
      const q = (url.searchParams.get('q') || '').trim();
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const filter = q
        ? {
            sid,
            $or: [
              { name: { $regex: esc, $options: 'i' } },
              { headline: { $regex: esc, $options: 'i' } },
              { handle: { $regex: esc, $options: 'i' } },
            ],
          }
        : { sid };
      data = await contacts
        .find(filter, { projection: { _id: 0, sid: 0 } })
        .sort({ name: 1 })
        .limit(q ? 50 : 1000)
        .toArray();
    } else if (req.method === 'GET' && url.pathname === '/messages') {
      const threadId = url.searchParams.get('threadId');
      if (!safeThreadId(threadId)) throw fail(400, 'Invalid conversation');
      const filter = { sid, threadId };
      const before = Number(url.searchParams.get('before'));
      if (before > 0) filter.timestamp = { $lt: before };
      data = (
        await messages
          .find(filter, { projection: { _id: 0, sid: 0 } })
          .sort({ timestamp: -1, messageId: -1 })
          .limit(100)
          .toArray()
      ).reverse();
    } else if (req.method === 'POST' && url.pathname === '/messages') {
      const own = scope(actor);
      const body = await readBody(req);
      if (
        !safeThreadId(body.threadId)
        || typeof body.text !== 'string'
        || !body.text.trim()
        || body.text.length > 4096
        || !/^[a-f0-9-]{36}$/.test(body.requestId || '')
      ) {
        throw fail(400, 'Invalid message');
      }
      limit(`${own}:send`, 20);
      data = await serialized(own, async () => {
        if (!await checkSessionAccess(own)) throw fail(403, 'An active company account is required');
        const row = await connections.findOne({ _id: own });
        if (!row || row.status !== 'connected') {
          throw fail(409, 'LinkedIn is disconnected. Link your account before sending.');
        }
        const chat = await chats.findOne({ sid: own, threadId: body.threadId });
        if (!chat) throw fail(404, 'Conversation not found');

        const sendKey = `${own}:${body.requestId}`;
        const existing = await sends.findOne({ _id: sendKey });
        if (existing) {
          if (existing.threadId !== body.threadId || existing.text !== body.text) {
            throw fail(409, 'Request ID already used');
          }
          if (existing.messageId) return { messageId: existing.messageId };
          throw fail(409, 'Previous send outcome is uncertain. Check LinkedIn before sending again.');
        }

        await sends.insertOne({ _id: sendKey, sid: own, threadId: body.threadId, text: body.text, createdAt: new Date() });
        const state = await ensureBrowser(own, 'https://www.linkedin.com/messaging/');
        const sent = await state.session.sendMessage(body.threadId, body.text.trim(), chat.conversationUrn).catch(() => null);
        if (!sent?.ok) {
          throw fail(502, 'Could not send message via LinkedIn API. You can also reply directly inside the Live LinkedIn Browser tab.');
        }

        const nowTs = sent.timestamp || Math.floor(Date.now() / 1000);
        await sends.updateOne({ _id: sendKey }, { $set: { messageId: sent.messageId } });
        await messages.updateOne(
          { sid: own, threadId: body.threadId, messageId: sent.messageId },
          {
            $setOnInsert: {
              sid: own,
              threadId: body.threadId,
              messageId: sent.messageId,
              text: body.text.trim(),
              fromMe: true,
              senderName: row.profileName || 'You',
              timestamp: nowTs,
              status: 3,
            },
          },
          { upsert: true },
        );
        await chats.updateOne(
          { sid: own, threadId: body.threadId },
          { $set: { preview: body.text.trim().slice(0, 180), timestamp: nowTs } },
        );
        return { messageId: sent.messageId };
      });
    } else {
      throw fail(404, 'Not found');
    }

    res.end(JSON.stringify(data));
  } catch (error) {
    if (!error.status || error.status >= 500) console.error('LinkedIn bridge error:', req.method, req.url?.split('?')[0], error.message);
    res.statusCode = error.status || 500;
    res.end(JSON.stringify({ message: error.status ? error.message : 'LinkedIn operation failed. Please try again.' }));
  }
});

server.requestTimeout = 65000;

// Periodically verify session access and recycle idle Chrome instances to preserve memory.
let housekeeping = false;
const housekeepingTimer = setInterval(async () => {
  if (housekeeping) return;
  housekeeping = true;
  try {
    const now = Date.now();
    for (const [sid, state] of [...live.entries()]) {
      await serialized(sid, async () => {
        if (live.get(sid) !== state) return;
        const active = await checkSessionAccess(sid);
        if (!active) return;
        const idleMs = now - (state.session?.lastUsedAt || now);
        if (idleMs > 120 * 60 * 1000) {
          await stopBrowser(sid);
        }
      }).catch(() => {});
    }
  } finally {
    housekeeping = false;
  }
}, 60000);

for await (const row of connections.find({ status: 'error' })) {
  await recoverConnectionIfSealed(row._id, row).catch(() => {});
}

server.listen(Number(process.env.LINKEDIN_BRIDGE_PORT || 3102), process.env.LINKEDIN_BRIDGE_HOST || '127.0.0.1');

async function shutdown() {
  server.close();
  clearInterval(leaseTimer);
  clearInterval(housekeepingTimer);
  for (const sid of [...live.keys()]) await stopBrowser(sid);
  await leases.deleteOne({ _id: 'worker', owner: leaseOwner });
  await client.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
console.info('LinkedIn bridge started (private API; cookies and credentials are never logged)');
