import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, { BufferJSON, DisconnectReason, initAuthCreds, proto, Browsers, jidNormalizedUser, normalizeMessageContent } from '@whiskeysockets/baileys';
import { verifyTicket, seal, unseal, scope } from './security.mjs';
import { ContactDirectory, mergeChatAliases, phoneFromJid } from './contacts.mjs';
import { isSessionOwnerActive } from './session_access.mjs';

// libsignal logs session objects directly to console, outside the Baileys logger.
const signalSessionLogs = new Set([
  'Closing session:', 'Opening session:', 'Removing old closed session:', 'Session already closed',
]);
for (const level of ['info', 'warn']) {
  const write = console[level].bind(console);
  console[level] = (message, ...args) => {
    if (signalSessionLogs.has(message)) return;
    write(message, ...args);
  };
}

const secret = process.env.WHATSAPP_BRIDGE_SECRET || '';
const encryptionKey = Buffer.from(process.env.WHATSAPP_SESSION_KEY || '', 'base64');
if (secret.length < 32 || encryptionKey.length !== 32 || !process.env.MONGO_URI || !process.env.DATABASE_NAME) {
  throw new Error('Configure MongoDB, a bridge secret of at least 32 characters and a 32-byte base64 session key');
}
const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db(process.env.DATABASE_NAME);
const connections = db.collection('whatsapp_connections');
const auth = db.collection('whatsapp_auth');
const chats = db.collection('whatsapp_chats');
const messages = db.collection('whatsapp_messages');
const sends = db.collection('whatsapp_sends');
const contacts = db.collection('whatsapp_contacts');
const directory = new ContactDirectory(contacts);
await Promise.all([
  contacts.createIndex({ sid: 1, jid: 1 }, { unique: true }),
  connections.createIndex({ company: 1, owner: 1 }, { unique: true }),
  connections.createIndex({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }),
  chats.createIndex({ sid: 1, jid: 1 }, { unique: true }),
  chats.createIndex({ sid: 1, timestamp: -1 }),
  messages.createIndex({ sid: 1, jid: 1, messageId: 1 }, { unique: true }),
  messages.createIndex({ sid: 1, jid: 1, timestamp: -1 }),
]);
// Exactly one socket owner across worker replicas/restarts. Expired leases recover after a crash.
const leaseOwner = randomUUID();
const leases = db.collection('whatsapp_worker_leases');
try {
  await leases.updateOne({ _id: 'worker', expiresAt: { $lt: new Date() } },
    { $set: { owner: leaseOwner, expiresAt: new Date(Date.now() + 45000) } }, { upsert: true });
} catch {
  throw new Error('Another WhatsApp worker is active; run exactly one bridge replica');
}
const leaseTimer = setInterval(async () => {
  try {
    const result = await leases.updateOne({ _id: 'worker', owner: leaseOwner }, { $set: { expiresAt: new Date(Date.now() + 45000) } });
    if (!result.matchedCount) process.exit(1);
  } catch { process.exit(1); }
}, 10000);
const live = new Map();
const locks = new Map();
const logger = pino({ level: 'silent' }); // Never log QR, credentials, message bodies or WhatsApp internal errors.
const fail = (status, message) => Object.assign(new Error(message), { status });
const safeJid = jid => typeof jid === 'string' && /^[0-9A-Za-z_.:-]+@(s\.whatsapp\.net|lid|g\.us)$/.test(jid) && jid.length <= 160;
const directJid = jid => safeJid(jid) && !jid.endsWith('@g.us');
async function serialized(sid, fn) {
  const previous = locks.get(sid) || Promise.resolve();
  const task = previous.catch(() => {}).then(fn);
  locks.set(sid, task);
  try { return await task; } finally { if (locks.get(sid) === task) locks.delete(sid); }
}
async function authState(sid) {
  const read = async name => {
    const row = await auth.findOne({ _id: `${sid}:${name}` });
    return row ? JSON.parse(unseal(row.value, encryptionKey, `${sid}:${name}`), BufferJSON.reviver) : null;
  };
  const write = async (name, value) => {
    const id = `${sid}:${name}`;
    if (value == null) return auth.deleteOne({ _id: id });
    await auth.updateOne({ _id: id }, { $set: { sid, value: seal(JSON.stringify(value, BufferJSON.replacer), encryptionKey, id) } }, { upsert: true });
  };
  const creds = await read('creds') || initAuthCreds();
  return { state: { creds, keys: {
    get: async (type, ids) => {
      const values = {};
      for (const id of ids) {
        let value = await read(`${type}:${id}`);
        if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
        if (value) values[id] = value;
      }
      return values;
    },
    set: async data => {
      for (const [type, entries] of Object.entries(data)) for (const [id, value] of Object.entries(entries)) await write(`${type}:${id}`, value);
    },
  } }, save: () => write('creds', creds) };
}
async function saveMessages(sid, batch) {
  const rows = [];
  const previews = new Map();
  const mappings = new Map();
  for (const message of batch) {
    const jid = message.key?.remoteJid;
    if (!safeJid(jid) || !message.key?.id || !message.message) continue;
    if (jid.endsWith('@lid') && message.key.remoteJidAlt?.endsWith('@s.whatsapp.net')) mappings.set(jid, message.key.remoteJidAlt);
    const content = normalizeMessageContent(message.message) || {};
    // Respect disappearing/view-once content: don't copy it into the CRM.
    if (message.message.viewOnceMessage || message.message.viewOnceMessageV2 || message.message.viewOnceMessageV2Extension
      || message.message.ephemeralMessage || Object.values(content).some(value => value?.contextInfo?.expiration || value?.viewOnce)) continue;
    const text = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || '';
    const type = content.conversation || content.extendedTextMessage ? 'text' : content.imageMessage ? 'image' : content.videoMessage ? 'video' : content.audioMessage ? 'audio' : content.documentMessage ? 'document' : 'unsupported';
    if (type === 'unsupported' && !text) continue;
    const timestamp = Number(message.messageTimestamp || Math.floor(Date.now() / 1000));
    rows.push({ sid, jid, messageId: message.key.id, text: text.slice(0, 65536), type, timestamp, fromMe: Boolean(message.key.fromMe), status: message.status ?? 1 });
    if (!previews.has(jid) || previews.get(jid).timestamp <= timestamp) previews.set(jid, { sid, jid, timestamp, preview: text.slice(0, 160) || `[${type}]` });
  }
  for (let offset = 0; offset < rows.length; offset += 200) {
    await messages.bulkWrite(rows.slice(offset, offset + 200).map(({ status, ...row }) => ({
      updateOne: {
        filter: { sid, jid: row.jid, messageId: row.messageId },
        update: status > 1 ? { $setOnInsert: row, $max: { status } } : { $setOnInsert: { ...row, status } },
        upsert: true,
      },
    })), { ordered: true });
  }
  const items = [...previews.values()];
  for (let offset = 0; offset < items.length; offset += 200) {
    const chunk = items.slice(offset, offset + 200);
    await chats.bulkWrite(chunk.map(row => ({ updateOne: { filter: { sid, jid: row.jid },
      update: { $setOnInsert: { sid, jid: row.jid, name: row.jid.split('@')[0], timestamp: 0 } }, upsert: true } })), { ordered: true });
    // Older history batches must not replace the newest preview.
    await chats.bulkWrite(chunk.map(row => ({ updateOne: { filter: { sid, jid: row.jid, timestamp: { $lte: row.timestamp } },
      update: { $set: row } } })), { ordered: true });
  }
  await directory.map(sid, [...mappings].map(([lid, pn]) => ({ lid, pn })));
}

async function storedAliases(sid, jids) {
  const prefix = `${sid}:lid-mapping:`;
  const keys = new Map();
  for (const jid of jids) {
    if (!directJid(jid)) continue;
    const lid = jid.endsWith('@lid');
    keys.set(prefix + jidNormalizedUser(jid).split('@')[0] + (lid ? '_reverse' : ''), jid);
  }
  const aliases = new Map();
  if (!keys.size) return aliases;
  for (const row of await auth.find({ _id: { $in: [...keys.keys()] } }).toArray()) {
    const jid = keys.get(row._id);
    let value;
    try { value = JSON.parse(unseal(row.value, encryptionKey, row._id), BufferJSON.reviver); }
    catch { continue; } // A damaged mapping must not prevent the rest of the inbox from loading.
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      aliases.set(jid, `${value}@${jid.endsWith('@lid') ? 's.whatsapp.net' : 'lid'}`);
    }
  }
  return aliases;
}

async function conversationAliases(sid, jid) {
  const aliases = await directory.conversationAliases(sid, jid);
  const recovered = (await storedAliases(sid, [jid])).get(jid);
  if (!recovered) return aliases;
  return [...new Set([...aliases, ...await directory.conversationAliases(sid, recovered)])];
}

async function stop(sid) {
  const state = live.get(sid);
  live.delete(sid);
  if (state) { clearTimeout(state.timer); clearTimeout(state.expiry); state.socket?.end(new Error('Session stopped')); }
}
async function checkSessionAccess(sid) {
  try {
    if (await isSessionOwnerActive(db, sid)) return true;
  } catch (error) {
    await stop(sid);
    throw error;
  }
  await stop(sid);
  await connections.updateOne({ _id: sid }, { $set: {
    desired: false, status: 'disconnected', error: 'WhatsApp sync stopped because the CRM user or company is no longer active.',
  } });
  return false;
}
async function connect(sid, company, owner, attempt = 0) {
  if (!await checkSessionAccess(sid)) throw fail(403, 'An active company account is required');
  if (live.has(sid)) return;
  const state = { status: 'connecting', qr: null, qrExpiresAt: null, attempt };
  live.set(sid, state);
  await connections.updateOne({ _id: sid }, { $set: { company, owner, desired: true, status: 'connecting', error: null } }, { upsert: true });
  try {
    const stored = await authState(sid);
    if (live.get(sid) !== state) return;
    // One-time repair: replay contact snapshots, since an earlier history batch
    // with name: undefined could erase a saved name. Keep encryption/Signal keys.
    const connection = await connections.findOne({ _id: sid });
    if (stored.state.creds.myAppStateKeyId && connection?.contactNamesRepair !== 1) {
      await stored.state.keys.set({ 'app-state-sync-version': Object.fromEntries(
        ['critical_block', 'critical_unblock_low', 'regular_low', 'regular_high', 'regular'].map(name => [name, null])) });
      await connections.updateOne({ _id: sid }, { $set: { contactNamesRepair: 1 } });
    }
    const socket = makeWASocket({ auth: stored.state, logger, browser: Browsers.ubuntu('Xonier CRM'), syncFullHistory: true,
      markOnlineOnConnect: false, getMessage: async () => undefined });
    state.socket = socket;
    const guarded = fn => (...args) => serialized(sid, async () => {
      if (live.get(sid) === state && await checkSessionAccess(sid)) await fn(...args);
    }).catch(async () => {
      if (live.get(sid) !== state) return;
      await stop(sid);
      await connections.updateOne({ _id: sid }, { $set: { status: 'error', desired: false, error: 'Session synchronization failed. Disconnect and link again.' } });
    });
    socket.ev.on('creds.update', guarded(stored.save));
    socket.ev.on('connection.update', guarded(async update => {
      if (update.qr) {
        state.qr = await QRCode.toDataURL(update.qr, { width: 300, margin: 2 });
        state.qrExpiresAt = Date.now() + 55000;
        state.status = 'qr';
        clearTimeout(state.expiry);
        state.expiry = setTimeout(() => { state.qr = null; }, 55000);
      }
      if (update.connection === 'open') {
        state.qr = null; state.status = 'connected'; state.attempt = 0;
        clearTimeout(state.expiry);
        // Do not await here: app-state resync emits events handled by this same session queue.
        socket.resyncAppState(['critical_block', 'critical_unblock_low', 'regular_low', 'regular_high', 'regular'], true).catch(() => {});
        const phone = socket.user?.id?.split(':')[0]?.split('@')[0];
        const previousAccount = await connections.findOne({ _id: sid });
        if (previousAccount?.phone && previousAccount.phone !== phone) {
          await socket.logout();
          await stop(sid);
          await auth.deleteMany({ sid });
          await connections.updateOne({ _id: sid }, { $set: { status: 'error', desired: false, error: 'Disconnect the previous account before linking a different number.' } });
          return;
        }
        try {
          await connections.updateOne({ _id: sid }, { $set: { phone, status: 'connected', error: null, linkedAt: new Date() } });
        } catch (error) {
          if (error.code !== 11000) throw error;
          await socket.logout();
          await stop(sid);
          await Promise.all([auth.deleteMany({ sid }), contacts.deleteMany({ sid }), chats.deleteMany({ sid }), messages.deleteMany({ sid })]);
          await connections.updateOne({ _id: sid }, { $set: { status: 'error', desired: false, error: 'This WhatsApp number is already connected to another CRM user.' } });
        }
      }
      if (update.connection === 'close') {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        const retry = code !== DisconnectReason.loggedOut && code !== DisconnectReason.connectionReplaced && attempt < 5;
        await stop(sid);
        await connections.updateOne({ _id: sid }, { $set: { status: retry ? 'reconnecting' : 'disconnected', desired: retry } });
        if (code === DisconnectReason.loggedOut) await auth.deleteMany({ sid });
        if (retry) {
          const placeholder = { status: 'reconnecting', attempt: attempt + 1 };
          live.set(sid, placeholder);
          placeholder.timer = setTimeout(() => serialized(sid, async () => {
            if (live.get(sid) !== placeholder) return;
            live.delete(sid); await connect(sid, company, owner, attempt + 1);
          }).catch(() => {}), code === DisconnectReason.restartRequired ? 500 : Math.min(30000, 2000 * 2 ** attempt));
        }
      }
    }));
    socket.ev.on('messages.upsert', guarded(async ({ messages: batch }) => saveMessages(sid, batch)));
    socket.ev.on('contacts.upsert', guarded(batch => directory.absorb(sid, batch)));
    socket.ev.on('contacts.update', guarded(batch => directory.absorb(sid, batch)));
    socket.ev.on('lid-mapping.update', guarded(mapping => directory.map(sid, [mapping])));
    socket.ev.on('messaging-history.set', guarded(async ({ chats: batch, contacts: people, lidPnMappings, messages: history }) => {
      if (batch?.length) {
        const rows = batch.filter(chat => safeJid(chat.id));
        for (let offset = 0; offset < rows.length; offset += 200) {
          await chats.bulkWrite(rows.slice(offset, offset + 200).map(chat => ({ updateOne: {
            filter: { sid, jid: chat.id },
            update: { ...(chat.name ? { $set: { name: chat.name } } : {}), $setOnInsert: { sid, jid: chat.id, timestamp: 0 } },
            upsert: true,
          } })));
        }
      }
      if (!await checkSessionAccess(sid)) return;
      await saveMessages(sid, history || []);
      if (!await checkSessionAccess(sid)) return;
      await directory.absorb(sid, people);
      await directory.map(sid, lidPnMappings);
    }));
    socket.ev.on('chats.update', guarded(async batch => {
      for (const chat of batch) if (safeJid(chat.id) && chat.name) await chats.updateOne({ sid, jid: chat.id }, { $set: { name: chat.name } });
    }));
    socket.ev.on('messages.update', guarded(async batch => {
      for (const { key, update } of batch) {
        const status = update.status;
        if (!safeJid(key.remoteJid) || !key.id || !Number.isInteger(status) || status < 0 || status > 5 || status === 1) continue;
        const jid = jidNormalizedUser(key.remoteJid);
        const aliases = new Set([key.remoteJid, ...await directory.conversationAliases(sid, jid)]);
        if (directJid(jid)) {
          const mapping = socket.signalRepository.lidMapping;
          const alternate = jid.endsWith('@lid') ? await mapping.getPNForLID(jid) : await mapping.getLIDForPN(jid);
          if (directJid(alternate)) aliases.add(jidNormalizedUser(alternate));
          if (directJid(key.remoteJidAlt)) aliases.add(jidNormalizedUser(key.remoteJidAlt));
        }
        const filter = { sid, jid: { $in: [...aliases] }, messageId: key.id, fromMe: Boolean(key.fromMe) };
        if (status === 0) {
          await messages.updateMany({ ...filter, status: { $lte: 1 } }, { $set: { status } });
        } else {
          await messages.updateMany(filter, { $max: { status } });
        }
      }
    }));
  } catch {
    await stop(sid);
    await connections.updateOne({ _id: sid }, { $set: { desired: false, status: 'error', error: 'Unable to restore WhatsApp session. Disconnect and link again.' } });
    throw fail(503, 'Unable to start WhatsApp connection');
  }
}
const rates = new Map();
function limit(key, max) {
  const now = Date.now();
  if (rates.size > 10000) for (const [id, row] of rates) if (row.until < now) rates.delete(id);
  const row = rates.get(key);
  if (!row || row.until < now) { rates.set(key, { count: 1, until: now + 60000 }); return; }
  if (++row.count > max) throw fail(429, 'Too many requests. Please wait a minute.');
}
async function readBody(req) {
  let size = 0; const parts = [];
  for await (const chunk of req) { size += chunk.length; if (size > 20000) throw fail(413, 'Message too large'); parts.push(chunk); }
  try { return JSON.parse(Buffer.concat(parts).toString() || '{}'); } catch { throw fail(400, 'Invalid JSON'); }
}
function connectionView(row, own = false) {
  if (!row) return { status: 'disconnected' };
  const state = live.get(row._id);
  return { owner: row.owner, ownerName: row.ownerName, phone: row.phone, status: state?.status || row.status, error: row.error,
    ...(own && state?.qr && state.qrExpiresAt > Date.now() ? { qr: state.qr, qrExpiresAt: state.qrExpiresAt } : {}) };
}
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  try {
    let actor;
    try { actor = verifyTicket(req.headers.authorization?.replace(/^Bearer /, ''), secret); } catch { throw fail(401, 'Unauthorized'); }
    const url = new URL(req.url, 'http://localhost');
    const sid = scope(actor, url.searchParams.get('owner') || actor.user);
    limit(`${sid}:read`, 180);
    let data;
    if (req.method === 'GET' && url.pathname === '/connections') {
      const filter = actor.admin ? { company: actor.company } : { company: actor.company, owner: actor.user };
      data = { admin: actor.admin, currentUser: actor.user, connections: (await connections.find(filter).toArray()).map(row => connectionView(row)) };
    } else if (req.method === 'GET' && url.pathname === '/connection') {
      data = connectionView(await connections.findOne({ _id: scope(actor) }), true);
    } else if (req.method === 'POST' && url.pathname === '/connect') {
      limit(`${scope(actor)}:connect`, 6);
      const body = await readBody(req);
      if (body.consent !== true) throw fail(400, 'Confirm company visibility before connecting WhatsApp');
      await serialized(scope(actor), async () => {
        await connect(scope(actor), actor.company, actor.user);
        await connections.updateOne({ _id: scope(actor) }, { $set: { ownerName: String(actor.name || '').slice(0, 100), consentAt: new Date() } });
      });
      data = { status: 'connecting' };
    } else if (req.method === 'DELETE' && url.pathname === '/connection') {
      await serialized(sid, async () => {
        const state = live.get(sid);
        if (state?.socket && state.status === 'connected') await state.socket.logout();
        await stop(sid);
        // Delete copied chats too, preventing a subsequently linked number from seeing the former account's history.
        await Promise.all([auth.deleteMany({ sid }), contacts.deleteMany({ sid }), chats.deleteMany({ sid }), messages.deleteMany({ sid }), sends.deleteMany({ sid })]);
        await connections.deleteOne({ _id: sid });
      });
      data = { success: true };
    } else if (req.method === 'GET' && url.pathname === '/chats') {
      data = await chats.find({ sid }, { projection: { _id: 0, sid: 0 } }).sort({ timestamp: -1 }).limit(1000).toArray();
      const phones = await storedAliases(sid, data.map(chat => chat.jid).filter(jid => jid.endsWith('@lid')));
      data = mergeChatAliases(await directory.decorate(sid, data, phones)).slice(0, 200);
    } else if (req.method === 'GET' && url.pathname === '/contacts') {
      const q = (url.searchParams.get('q') || '').trim();
      if (q.length === 1) {
        data = [];
      } else {
        // Empty query returns the full saved-contact list (for browsing); otherwise search by name/number.
        const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filter = q ? { sid, $or: [
          { name: { $regex: esc, $options: 'i' } },
          { jid: { $regex: esc } },
          { phoneNumber: { $regex: esc } },
        ] } : { sid };
        const rows = await contacts.find(filter, { projection: { _id: 0, sid: 0 } }).limit(q ? 120 : 5000).toArray();
        const phones = await storedAliases(sid, rows.map(c => c.jid).filter(jid => jid.endsWith('@lid')));
        const seen = new Map();
        for (const c of rows) {
          const pnJid = c.phoneNumber || phones.get(c.jid) || (phoneFromJid(c.jid) ? c.jid : null);
          const phone = phoneFromJid(pnJid) || phoneFromJid(c.jid) || null;
          const jid = pnJid || c.jid;
          const name = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : null;
          if (!name && !phone) continue;
          const prev = seen.get(jid);
          if (!prev || (!prev.name && name)) seen.set(jid, { jid, name: name || prev?.name || null, phone: phone || prev?.phone || null });
        }
        data = [...seen.values()]
          .sort((a, b) => (a.name ? 0 : 1) - (b.name ? 0 : 1) || (a.name || a.phone || '').localeCompare(b.name || b.phone || '', undefined, { sensitivity: 'base' }))
          .slice(0, q ? 30 : 2000);
      }
    } else if (req.method === 'GET' && url.pathname === '/messages') {
      const jid = url.searchParams.get('jid');
      if (!safeJid(jid)) throw fail(400, 'Invalid conversation');
      const filter = { sid, jid: { $in: await conversationAliases(sid, jid) } };
      const before = Number(url.searchParams.get('before'));
      if (before > 0) filter.timestamp = { $lt: before };
      data = (await messages.aggregate([
        { $match: filter },
        { $sort: { status: -1 } },
        { $group: { _id: { messageId: '$messageId', fromMe: '$fromMe' }, message: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$message' } },
        { $sort: { timestamp: -1, messageId: -1 } }, { $limit: 100 },
        { $project: { _id: 0, sid: 0 } },
      ]).toArray()).reverse();
    } else if (req.method === 'POST' && url.pathname === '/messages') {
      // Replies always use the caller's connection. Admin oversight does not grant impersonation.
      const own = scope(actor);
      const body = await readBody(req);
      if (!directJid(body.jid) || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4096 || !/^[a-f0-9-]{36}$/.test(body.requestId || '')) throw fail(400, 'Invalid message');
      limit(`${own}:send`, 30);
      data = await serialized(own, async () => {
        const state = live.get(own);
        if (state?.status !== 'connected') throw fail(409, 'WhatsApp is disconnected. Link it again before sending.');
        if (!await checkSessionAccess(own)) throw fail(403, 'An active company account is required');
        const aliases = await conversationAliases(own, body.jid);
        if (!await chats.findOne({ sid: own, jid: { $in: aliases } }) && !await contacts.findOne({ sid: own, jid: { $in: aliases } })) throw fail(404, 'Conversation not found');
        const id = `${own}:${body.requestId}`;
        const existing = await sends.findOne({ _id: id });
        if (existing) {
          if (existing.jid !== body.jid || existing.text !== body.text) throw fail(409, 'Request ID already used');
          if (existing.messageId) return { messageId: existing.messageId };
          throw fail(409, 'Previous send outcome is uncertain. Check your WhatsApp before sending again.');
        }
        await sends.insertOne({ _id: id, sid: own, jid: body.jid, text: body.text, createdAt: new Date() });
        let sent;
        try { sent = await state.socket.sendMessage(body.jid, { text: body.text }); }
        catch { throw fail(502, 'Send outcome is uncertain. Check your WhatsApp before sending again.'); }
        await sends.updateOne({ _id: id }, { $set: { messageId: sent.key.id } });
        if (await checkSessionAccess(own)) await saveMessages(own, [sent]);
        return { messageId: sent.key.id };
      });
    } else throw fail(404, 'Not found');
    res.end(JSON.stringify(data));
  } catch (error) {
    res.statusCode = error.status || 500;
    res.end(JSON.stringify({ message: error.status ? error.message : 'WhatsApp operation failed. Please try again.' }));
  }
});
server.requestTimeout = 30000;
// Also close idle sockets. Event handlers check access before processing new data.
let checkingSessions = false;
const sessionTimer = setInterval(async () => {
  if (checkingSessions) return;
  checkingSessions = true;
  try {
    await Promise.allSettled([...live.entries()].map(([sid, state]) => serialized(sid, async () => {
      if (live.get(sid) === state) await checkSessionAccess(sid);
    })));
  } finally {
    checkingSessions = false;
  }
}, 10000);
server.listen(Number(process.env.WHATSAPP_BRIDGE_PORT || 3101), process.env.WHATSAPP_BRIDGE_HOST || '127.0.0.1');
for await (const row of connections.find({ desired: true })) {
  await serialized(row._id, async () => {
    if (await connections.findOne({ _id: row._id, desired: true })) await connect(row._id, row.company, row.owner);
  }).catch(() => {});
}
async function shutdown() {
  server.close(); clearInterval(leaseTimer); clearInterval(sessionTimer);
  for (const sid of live.keys()) await stop(sid);
  await leases.deleteOne({ _id: 'worker', owner: leaseOwner });
  await client.close(); process.exit(0);
}
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
console.info('WhatsApp bridge started (private API; QR and credentials are never logged)');
