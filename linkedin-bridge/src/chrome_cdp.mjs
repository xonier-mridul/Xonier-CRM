import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  buildMessagesGraphqlUrl,
  extractProfileId,
  extractThreadId,
  parseLinkedInMessagingPayload,
} from './messaging_parser.mjs';

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

export const VIEWPORT_WIDTH = 1280;
export const VIEWPORT_HEIGHT = 800;

const KEY_CODES = {
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13, text: '\r' },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  ' ': { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function findChromeExecutable() {
  for (const candidate of CHROME_PATHS) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function isAllowedLinkedInUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' && (parsed.hostname === 'linkedin.com' || parsed.hostname.endsWith('.linkedin.com'));
  } catch {
    return false;
  }
}

export function normalizeCookiesForCdp(cookies) {
  if (!Array.isArray(cookies)) return [];
  const out = [];
  for (const item of cookies) {
    if (!item || typeof item.name !== 'string' || typeof item.value !== 'string' || !item.name) continue;
    const cookie = {
      name: item.name,
      value: item.value,
      domain: typeof item.domain === 'string' && item.domain ? item.domain : '.linkedin.com',
      path: typeof item.path === 'string' && item.path ? item.path : '/',
      secure: item.secure !== false,
      httpOnly: Boolean(item.httpOnly),
    };
    if (typeof item.expires === 'number' && Number.isFinite(item.expires) && item.expires > 0) {
      cookie.expires = item.expires;
    }
    if (item.sameSite === 'Strict' || item.sameSite === 'Lax' || item.sameSite === 'None') {
      cookie.sameSite = item.sameSite;
    }
    out.push(cookie);
  }
  return out;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ''));
  } catch {
    return String(value || '');
  }
}

function normalizeLinkedInApiPath(rawUrl) {
  try {
    const parsed = new URL(rawUrl, 'https://www.linkedin.com');
    return parsed.pathname + parsed.search;
  } catch {
    return String(rawUrl || '');
  }
}

function isTrackableMessagingUrl(url) {
  if (typeof url !== 'string') return false;
  if (/\/voyager\/api\/voyagerMessagingGraphQL\/graphql/i.test(url)) {
    if (/queryId=messenger(?:MailboxCounts|Presence|Typing|SeenReceipt|Badging|Unread)/i.test(url)) {
      return false;
    }
    return true;
  }
  return (
    /\/voyager\/api\/messaging\/conversations/i.test(url)
    || /\/voyager\/api\/voyagerMessagingDashMessenger(?:Conversations|Messages)/i.test(url)
  );
}

export class ChromeSession {
  constructor(sid, options = {}) {
    this.sid = sid;
    this.proc = null;
    this.userDataDir = null;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.closed = false;
    this.queue = Promise.resolve();
    this.lastUsedAt = Date.now();
    this.lastClickedPoint = null;
    this.userAgent = null;
    this.onMessagingData = typeof options.onMessagingData === 'function' ? options.onMessagingData : null;
    this.selfIdentity = { memberUrn: '', profileId: '', handle: '', profileName: '' };
    this.trackedRequests = new Map();
    this.pendingCaptures = new Set();
    this.pendingRawMessagingPayloads = [];
    this.capturedChats = new Map();
    this.capturedMessages = new Map();
    this.capturedMessagingApi = {
      conversationsUrl: null,
      conversationsAccept: null,
      messagesUrl: null,
      messagesQueryId: null,
      messagesAccept: null,
      mailboxUrn: null,
    };
  }

  setSelfIdentity(identity = {}) {
    if (!identity || typeof identity !== 'object') return;
    const memberUrn = String(identity.memberUrn || this.selfIdentity.memberUrn || '').trim();
    const profileId = String(
      identity.profileId
      || extractProfileId(identity.memberUrn)
      || this.selfIdentity.profileId
      || extractProfileId(memberUrn)
      || '',
    ).trim();
    const handle = String(identity.handle || this.selfIdentity.handle || '').trim();
    const profileName = String(identity.profileName || this.selfIdentity.profileName || '').trim();

    this.selfIdentity = { memberUrn, profileId, handle, profileName };

    if ((profileId || handle) && this.pendingRawMessagingPayloads.length > 0) {
      const queued = this.pendingRawMessagingPayloads.splice(0, this.pendingRawMessagingPayloads.length);
      for (const raw of queued) {
        this.ingestMessagingPayload(raw);
      }
    }
  }

  _mergeChat(chat) {
    if (!chat?.threadId) return;
    const existing = this.capturedChats.get(chat.threadId);
    if (!existing) {
      while (this.capturedChats.size >= 200) {
        const firstKey = this.capturedChats.keys().next().value;
        this.capturedChats.delete(firstKey);
      }
      this.capturedChats.set(chat.threadId, { ...chat });
      return;
    }
    this.capturedChats.set(chat.threadId, {
      threadId: chat.threadId,
      conversationUrn:
        (String(chat.conversationUrn || '').startsWith('urn:li:msg_conversation:') ? chat.conversationUrn : null)
        || (String(existing.conversationUrn || '').startsWith('urn:li:msg_conversation:') ? existing.conversationUrn : null)
        || chat.conversationUrn
        || existing.conversationUrn
        || chat.threadId,
      name: (chat.name && chat.name !== 'LinkedIn Conversation' ? chat.name : null) || existing.name || 'LinkedIn Conversation',
      headline: chat.headline || existing.headline || '',
      handle: chat.handle || existing.handle || null,
      profileUrl: chat.profileUrl || existing.profileUrl || null,
      preview: (chat.timestamp || 0) >= (existing.timestamp || 0)
        ? (chat.preview || existing.preview || '')
        : (existing.preview || chat.preview || ''),
      timestamp: Math.max(chat.timestamp || 0, existing.timestamp || 0),
    });
  }

  _mergeMessage(msg) {
    if (!msg?.threadId || !msg?.messageId) return;
    const key = `${msg.threadId}:${msg.messageId}`;
    if (!this.capturedMessages.has(key)) {
      while (this.capturedMessages.size >= 1000) {
        const firstKey = this.capturedMessages.keys().next().value;
        this.capturedMessages.delete(firstKey);
      }
    }
    this.capturedMessages.set(key, { ...msg });
  }

  _recordMessagingRequest(params) {
    const request = params?.request;
    const urlStr = String(request?.url || '');
    if (!isTrackableMessagingUrl(urlStr)) return;

    const decoded = safeDecode(urlStr);
    const mailboxMatch = decoded.match(/urn:li:fsd_profile:[0-9A-Za-z_-]+/);
    if (mailboxMatch?.[0]) {
      this.capturedMessagingApi.mailboxUrn = mailboxMatch[0];
    }

    const reqHeaders = request?.headers || {};
    const acceptKey = Object.keys(reqHeaders).find(k => k.toLowerCase() === 'accept');
    const acceptHeader = acceptKey ? String(reqHeaders[acceptKey] || '').trim() : null;

    const queryIdMatch = urlStr.match(/[?&]queryId=([^&]+)/i);
    const queryId = queryIdMatch ? safeDecode(queryIdMatch[1]) : '';
    const hasSyncToken = /syncToken:[^,)\s]+/i.test(decoded);

    if (/^messengerConversations/i.test(queryId)) {
      if (!hasSyncToken || !this.capturedMessagingApi.conversationsUrl) {
        this.capturedMessagingApi.conversationsUrl = normalizeLinkedInApiPath(urlStr);
        if (acceptHeader) this.capturedMessagingApi.conversationsAccept = acceptHeader;
      }
    } else if (/^messengerMessages/i.test(queryId)) {
      this.capturedMessagingApi.messagesQueryId = queryId;
      if (/conversationUrn:/i.test(decoded) && (!hasSyncToken || !this.capturedMessagingApi.messagesUrl)) {
        this.capturedMessagingApi.messagesUrl = normalizeLinkedInApiPath(urlStr);
        if (acceptHeader) this.capturedMessagingApi.messagesAccept = acceptHeader;
      }
    }

    if (params?.requestId) {
      while (this.trackedRequests.size >= 200) {
        const oldestKey = this.trackedRequests.keys().next().value;
        this.trackedRequests.delete(oldestKey);
      }
      this.trackedRequests.set(params.requestId, {
        url: urlStr,
        method: String(request?.method || 'GET').toUpperCase(),
      });
    }
  }

  ingestMessagingPayload(json) {
    if (!json || typeof json !== 'object') {
      return { chats: [], messages: [] };
    }
    if (!this.selfIdentity.profileId && !this.selfIdentity.handle) {
      if (this.pendingRawMessagingPayloads.length >= 10) {
        this.pendingRawMessagingPayloads.shift();
      }
      this.pendingRawMessagingPayloads.push(json);
      return { chats: [], messages: [] };
    }

    const parsed = parseLinkedInMessagingPayload(json, this.selfIdentity);
    for (const chat of parsed.chats) this._mergeChat(chat);
    for (const message of parsed.messages) this._mergeMessage(message);

    if ((parsed.chats.length || parsed.messages.length) && this.onMessagingData) {
      try {
        Promise.resolve(this.onMessagingData(parsed)).catch(() => {});
      } catch {
        // Ignore downstream listener errors
      }
    }
    return parsed;
  }

  async captureNetworkBody(requestId) {
    if (!requestId || this.closed) return;
    const bodyRes = await this.send('Network.getResponseBody', { requestId }, 6000);
    if (!bodyRes?.body) return;
    const raw = bodyRes.base64Encoded
      ? Buffer.from(bodyRes.body, 'base64').toString('utf8')
      : bodyRes.body;
    const trimmed = String(raw || '').trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return;
    const json = JSON.parse(trimmed);
    this.ingestMessagingPayload(json);
  }

  enqueue(fn) {
    const task = this.queue.catch(() => {}).then(async () => {
      this.lastUsedAt = Date.now();
      return fn();
    });
    this.queue = task;
    return task;
  }

  async start(initialUrl = 'https://www.linkedin.com/login', savedCookies = null, userAgent = null) {
    const executable = findChromeExecutable();
    if (!executable) {
      throw Object.assign(new Error('Google Chrome is not installed on this server.'), { status: 503 });
    }
    const safeUa = typeof userAgent === 'string' && /^Mozilla\/5\.0\b/i.test(userAgent.trim()) && userAgent.length <= 300
      ? userAgent.trim()
      : null;
    this.userAgent = safeUa || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    const safeSid = String(this.sid || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    this.userDataDir = path.join(process.cwd(), '.profiles', safeSid);
    await mkdir(this.userDataDir, { recursive: true });
    for (const lockFile of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      await rm(path.join(this.userDataDir, lockFile), { force: true }).catch(() => {});
    }
    const args = [
      '--headless=new',
      '--remote-debugging-port=0',
      `--user-data-dir=${this.userDataDir}`,
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--mute-audio',
      ...(process.platform === 'linux' ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] : []),
      `--user-agent=${this.userAgent}`,
      'about:blank',
    ];
    this.proc = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.proc.once('exit', () => {
      this.closed = true;
      for (const entry of this.pending.values()) entry.reject(new Error('Browser closed'));
      this.pending.clear();
    });

    const port = await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => reject(new Error('Timed out starting Chrome browser')), 15000);
      const onData = chunk => {
        buffer += chunk.toString();
        const match = buffer.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//);
        if (match) {
          clearTimeout(timer);
          this.proc.stderr.off('data', onData);
          resolve(Number(match[1]));
        }
      };
      this.proc.stderr.on('data', onData);
      this.proc.once('exit', code => {
        clearTimeout(timer);
        reject(new Error(`Chrome exited prematurely (${code})`));
      });
    });
    this.port = port;

    let first = null;
    for (let attempt = 0; attempt < 20 && !first; attempt += 1) {
      const targets = await this.listPages();
      first = targets[0] || null;
      if (!first) await sleep(150);
    }
    if (!first) {
      const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
      first = await created.json();
    }
    if (!first?.webSocketDebuggerUrl) throw new Error('Unable to attach to Chrome page target');
    await this.attach(first);

    if (Array.isArray(savedCookies) && savedCookies.length) {
      await this.setCookies(savedCookies);
    }
    if (isAllowedLinkedInUrl(initialUrl)) {
      await this.send('Page.navigate', { url: initialUrl });
      await sleep(1200);
    }
  }

  async listPages() {
    const response = await fetch(`http://127.0.0.1:${this.port}/json/list`);
    const targets = await response.json();
    return targets.filter(t => t.type === 'page' && t.webSocketDebuggerUrl);
  }

  // Attach (or re-attach) the CDP connection to a page target, e.g. a Google sign-in popup.
  async attach(target) {
    const previous = this.ws;
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Target switched'));
    }
    this.pending.clear();
    this.trackedRequests.clear();
    this.latestFrameImage = null;
    this.latestFrameTs = 0;
    this.currentUrl = target.url || this.currentUrl || '';
    this.currentTitle = target.title || this.currentTitle || '';

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WebSocket connection timed out')), 10000);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket connection failed')); }, { once: true });
    });
    ws.addEventListener('message', event => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString());
        if (msg.id && this.pending.has(msg.id)) {
          const entry = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          clearTimeout(entry.timer);
          if (msg.error) entry.reject(new Error(msg.error.message || 'CDP error'));
          else entry.resolve(msg.result || {});
        } else if (msg.method === 'Page.screencastFrame') {
          const params = msg.params || {};
          if (params.data && this.ws === ws) {
            this.latestFrameImage = `data:image/jpeg;base64,${params.data}`;
            this.latestFrameTs = Date.now();
          }
          if (params.sessionId !== undefined && this.ws === ws && ws.readyState === WebSocket.OPEN) {
            this.send('Page.screencastFrameAck', { sessionId: params.sessionId }, 5000).catch(() => {});
          }
        } else if (msg.method === 'Page.frameNavigated') {
          if (!msg.params?.frame?.parentId && msg.params?.frame?.url && this.ws === ws) {
            this.currentUrl = msg.params.frame.url;
          }
        } else if (msg.method === 'Page.navigatedWithinDocument') {
          if (msg.params?.url && this.ws === ws) {
            this.currentUrl = msg.params.url;
          }
        } else if (msg.method === 'Network.requestWillBeSent') {
          if (this.ws === ws) {
            this._recordMessagingRequest(msg.params);
          }
        } else if (msg.method === 'Network.responseReceived') {
          if (this.ws === ws) {
            const reqId = msg.params?.requestId;
            const status = Number(msg.params?.response?.status || 0);
            if (reqId && this.trackedRequests.has(reqId) && (status < 200 || status >= 300)) {
              this.trackedRequests.delete(reqId);
            }
          }
        } else if (msg.method === 'Network.loadingFailed') {
          if (this.ws === ws && msg.params?.requestId) {
            this.trackedRequests.delete(msg.params.requestId);
          }
        } else if (msg.method === 'Network.loadingFinished') {
          if (this.ws === ws) {
            const reqId = msg.params?.requestId;
            if (reqId && this.trackedRequests.has(reqId)) {
              this.trackedRequests.delete(reqId);
              const captureTask = this.captureNetworkBody(reqId)
                .catch(() => {})
                .finally(() => this.pendingCaptures.delete(captureTask));
              this.pendingCaptures.add(captureTask);
            }
          }
        }
      } catch {
        // Ignore malformed CDP frames
      }
    });
    ws.addEventListener('close', () => {
      if (this.ws !== ws) return; // an old target (closed popup) must not end the session
      for (const entry of this.pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('Target socket closed'));
      }
      this.pending.clear();
      if (this.proc?.exitCode !== null && this.proc?.exitCode !== undefined) this.closed = true;
    });
    this.ws = ws;
    this.targetId = target.id;
    if (previous) { try { previous.close(); } catch {} }

    await this.send('Page.enable');
    await this.send('Network.enable', {
      maxResourceBufferSize: 10 * 1024 * 1024,
      maxTotalBufferSize: 30 * 1024 * 1024,
    }).catch(() => this.send('Network.enable'));
    await this.send('Runtime.enable');
    await this.send('Page.bringToFront').catch(() => {});
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    if (this.userAgent) {
      await this.send('Emulation.setUserAgentOverride', { userAgent: this.userAgent }).catch(() => {});
    }
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await this.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        if (!window.chrome) window.chrome = { runtime: {} };
      `,
    });
    await this.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 65,
      maxWidth: VIEWPORT_WIDTH,
      maxHeight: VIEWPORT_HEIGHT,
      everyNthFrame: 1,
    }).catch(() => {});
  }

  // Follow popups (Google sign-in opens one) and return to the main tab when they close.
  async syncTargets(force = false) {
    if (this.closed || !this.port) return;
    if (!force && this.ws && this.ws.readyState === WebSocket.OPEN && Date.now() - (this.lastTargetSyncAt || 0) < 1500) {
      return;
    }
    this.lastTargetSyncAt = Date.now();
    let pages;
    try { pages = await this.listPages(); } catch { return; }
    if (!pages.length) return;

    const current = pages.find(p => p.id === this.targetId);
    if (current) {
      if (current.url) this.currentUrl = current.url;
      if (current.title) this.currentTitle = current.title;
    }
    const oauthPopup = pages.length > 1
      ? pages.find(p => /accounts\.google\.com|appleid\.apple\.com|login\.microsoftonline\.com/i.test(p.url || ''))
      : null;
    const mainLinkedIn = pages.find(p => /linkedin\.com/i.test(p.url || '')) || pages[0];

    let desired = current;
    if (oauthPopup) {
      desired = oauthPopup;
    } else if (!current || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      desired = mainLinkedIn;
    } else if (pages.length > (this.knownPages || 1)) {
      desired = pages.find(p => p.id !== this.targetId) || pages[0];
    } else if (/^about:blank/i.test(current.url || '') && mainLinkedIn && mainLinkedIn.id !== current.id) {
      desired = mainLinkedIn;
    }

    if (desired && (desired.id !== this.targetId || !this.ws || this.ws.readyState !== WebSocket.OPEN)) {
      await this.attach(desired).catch(() => {});
    }
    this.knownPages = pages.length;
  }

  send(method, params = {}, timeoutMs = 20000) {
    if (this.closed || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Browser session is closed'));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout on ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, awaitPromise = true) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    }, 30000);
    if (result.exceptionDetails) {
      const desc = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Script evaluation failed';
      throw new Error(desc);
    }
    return result.result?.value;
  }

  async getCookies() {
    return this.enqueue(async () => {
      await this.syncTargets();
      let cookies = [];
      try {
        const res = await this.send('Storage.getCookies');
        cookies = res.cookies || [];
      } catch {
        const res = await this.send('Network.getCookies', {
          urls: ['https://www.linkedin.com', 'https://linkedin.com'],
        });
        cookies = res.cookies || [];
      }
      return cookies.filter(c => c.domain?.includes('linkedin.com'));
    });
  }

  async setCookies(cookies) {
    const normalized = normalizeCookiesForCdp(cookies);
    if (!normalized.length) return;
    return this.enqueue(async () => {
      await this.syncTargets();
      await this.send('Network.setCookies', { cookies: normalized });
    });
  }

  async captureFrame(forceFresh = false) {
    await this.syncTargets();
    if (!forceFresh && this.latestFrameImage && Date.now() - (this.latestFrameTs || 0) < 2000) {
      return {
        image: this.latestFrameImage,
        url: this.currentUrl || this.lastFrame?.url || '',
        title: this.currentTitle || this.lastFrame?.title || '',
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      };
    }

    const shoot = () => this.send(
      'Page.captureScreenshot',
      { format: 'jpeg', quality: 62, fromSurface: true, optimizeForSpeed: true },
      6000,
    );
    let shot;
    try {
      shot = await shoot();
    } catch {
      try {
        await this.syncTargets(true);
        shot = await shoot();
      } catch (error) {
        if (this.latestFrameImage || this.lastFrame) {
          return {
            image: this.latestFrameImage || this.lastFrame.image,
            url: this.currentUrl || this.lastFrame?.url || '',
            title: this.currentTitle || this.lastFrame?.title || '',
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            stale: true,
          };
        }
        throw error;
      }
    }
    const meta = await this.evaluate('(() => ({ url: window.location.href || "", title: document.title || "" }))()', false)
      .catch(() => ({ url: this.currentUrl || this.lastFrame?.url || '', title: this.currentTitle || '' }));
    if (meta?.url) this.currentUrl = meta.url;
    if (meta?.title) this.currentTitle = meta.title;
    this.latestFrameImage = `data:image/jpeg;base64,${shot.data}`;
    this.latestFrameTs = Date.now();
    this.lastFrame = {
      image: this.latestFrameImage,
      url: this.currentUrl || '',
      title: this.currentTitle || '',
      width: VIEWPORT_WIDTH,
      height: VIEWPORT_HEIGHT,
    };
    return this.lastFrame;
  }

  async ensureFocusEmulation() {
    await this.send('Page.bringToFront').catch(() => {});
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  }

  async performAction(action) {
    return this.enqueue(async () => {
      await this.syncTargets(action?.type === 'navigate');
      let actionResult = {};
      const type = action?.type;
      if (type === 'click') {
        const x = Math.max(0, Math.min(VIEWPORT_WIDTH, Number(action.x) || 0));
        const y = Math.max(0, Math.min(VIEWPORT_HEIGHT, Number(action.y) || 0));
        this.lastClickedPoint = { x, y };
        await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
        await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
        const evalRes = await this.evaluate(`(() => {
          const hit = document.elementFromPoint(${x}, ${y});
          if (!hit) return { selectMenu: null };
          const selectEl = hit.tagName === 'SELECT' ? hit : hit.closest('select');
          if (selectEl) {
            selectEl.focus({ preventScroll: true });
            const optionsData = Array.from(selectEl.options).map((opt, idx) => ({
              index: idx,
              value: opt.value,
              text: opt.textContent || opt.label || opt.value,
            }));
            return { selectMenu: { value: selectEl.value, options: optionsData } };
          }
          const focusable = hit.closest('input, textarea, select, [contenteditable="true"], button, a, label') || hit;
          if (focusable && typeof focusable.focus === 'function') {
            focusable.focus({ preventScroll: true });
          }
          return { selectMenu: null };
        })()`, false).catch(() => ({}));
        if (evalRes && 'selectMenu' in evalRes) actionResult = evalRes;
        await sleep(60);
      } else if (type === 'scroll') {
        const x = Math.max(0, Math.min(VIEWPORT_WIDTH, Number(action.x) || 640));
        const y = Math.max(0, Math.min(VIEWPORT_HEIGHT, Number(action.y) || 400));
        const deltaX = Math.max(-2000, Math.min(2000, Number(action.deltaX) || 0));
        const deltaY = Math.max(-2000, Math.min(2000, Number(action.deltaY) || 0));
        await this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY });
        await sleep(15);
      } else if (type === 'type' && action.key === 'SELECT_OPTION') {
        const value = typeof action.text === 'string' ? action.text : '';
        const pt = JSON.stringify(this.lastClickedPoint || null);
        await this.evaluate(`(() => {
          const val = ${JSON.stringify(value)};
          const pt = ${pt};
          const hit = pt ? document.elementFromPoint(pt.x, pt.y) : null;
          const selectEl = (hit && (hit.tagName === 'SELECT' ? hit : hit.closest('select')))
            || (document.activeElement?.tagName === 'SELECT' ? document.activeElement : null)
            || document.querySelector('select');
          if (selectEl) {
            const idx = Array.from(selectEl.options).findIndex(o => o.value === val || (o.textContent || '') === val);
            if (idx >= 0) selectEl.selectedIndex = idx;
            selectEl.value = idx >= 0 ? selectEl.options[idx].value : val;
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()`, false).catch(() => {});
        actionResult = { selectMenu: null };
        await sleep(50);
      } else if (type === 'type') {
        const text = typeof action.text === 'string' ? action.text.slice(0, 4000) : '';
        if (text) {
          const pt = JSON.stringify(this.lastClickedPoint || null);
          const beforeState = await this.evaluate(`(() => {
            const pt = ${pt};
            let el = document.activeElement;
            if ((!el || el === document.body || el === document.documentElement) && pt) {
              const hit = document.elementFromPoint(pt.x, pt.y);
              el = hit?.closest?.('input, textarea, [contenteditable="true"]') || hit;
              if (el && el.isConnected && typeof el.focus === 'function') el.focus({ preventScroll: true });
            }
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
              return { isInput: true, len: (el.value || '').length };
            }
            return { isInput: false, len: 0 };
          })()`, false).catch(() => ({ isInput: false, len: 0 }));

          await this.send('Input.insertText', { text });
          await sleep(25);

          if (beforeState?.isInput) {
            const payload = JSON.stringify({ text, prevLen: beforeState.len, pt: this.lastClickedPoint || null });
            await this.evaluate(`(() => {
              const { text, prevLen, pt } = ${payload};
              let el = document.activeElement;
              if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) {
                const hit = pt ? document.elementFromPoint(pt.x, pt.y) : null;
                el = hit?.closest?.('input, textarea') || null;
              }
              if (!el || !el.isConnected) return;
              if ((el.value || '').length === prevLen) {
                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                const next = (el.value || '') + text;
                if (setter) setter.call(el, next);
                else el.value = next;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()`, false).catch(() => {});
          }
        }
      } else if (type === 'key') {
        const pt = JSON.stringify(this.lastClickedPoint || null);
        await this.evaluate(`(() => {
          const pt = ${pt};
          const el = document.activeElement;
          if ((!el || el === document.body || el === document.documentElement) && pt) {
            const hit = document.elementFromPoint(pt.x, pt.y);
            const target = hit?.closest?.('input, textarea, [contenteditable="true"]') || hit;
            if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
          }
        })()`, false).catch(() => {});
        const keyName = String(action.key || '');
        const spec = KEY_CODES[keyName];
        if (spec) {
          const prevVal = keyName === 'Backspace'
            ? await this.evaluate(`(() => {
                const el = document.activeElement;
                return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? String(el.value || '') : null;
              })()`, false).catch(() => null)
            : null;
          await this.send('Input.dispatchKeyEvent', {
            type: 'keyDown',
            key: spec.key,
            code: spec.code,
            windowsVirtualKeyCode: spec.keyCode,
            nativeVirtualKeyCode: spec.keyCode,
            ...(spec.text ? { text: spec.text } : {}),
          });
          await this.send('Input.dispatchKeyEvent', {
            type: 'keyUp',
            key: spec.key,
            code: spec.code,
            windowsVirtualKeyCode: spec.keyCode,
            nativeVirtualKeyCode: spec.keyCode,
          });
          await sleep(35);
          if (keyName === 'Backspace' && prevVal && prevVal.length > 0) {
            await this.evaluate(`(() => {
              const el = document.activeElement;
              if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.value === ${JSON.stringify(prevVal)}) {
                const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                const next = el.value.slice(0, -1);
                if (setter) setter.call(el, next);
                else el.value = next;
                el.dispatchEvent(new Event('input', { bubbles: true }));
              }
            })()`, false).catch(() => {});
          }
        } else if (keyName.length === 1) {
          await this.send('Input.insertText', { text: keyName });
          await sleep(20);
        }
      } else if (type === 'navigate') {
        if (!isAllowedLinkedInUrl(action.url)) {
          throw Object.assign(new Error('Only linkedin.com URLs are allowed.'), { status: 400 });
        }
        this.currentUrl = action.url;
        await this.send('Page.navigate', { url: action.url });
        await sleep(400);
      } else if (type === 'back') {
        await this.evaluate('window.history.back()', false);
        await sleep(250);
      } else if (type === 'forward') {
        await this.evaluate('window.history.forward()', false);
        await sleep(250);
      } else if (type === 'reload') {
        await this.send('Page.reload', {});
        await sleep(250);
      }
      return actionResult;
    });
  }

  async extractLinkedInProfile() {
    return this.enqueue(async () => {
      await this.syncTargets();
      const profile = await this.evaluate(`(async () => {
        if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
          return { authenticated: false, transient: true, url: location.href };
        }
        const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
        const csrf = match ? match[1] : '';
        try {
          const res = await fetch('/voyager/api/me', {
            credentials: 'include',
            headers: {
              'csrf-token': csrf,
              'x-restli-protocol-version': '2.0.0',
              'accept': 'application/vnd.linkedin.normalized+json+2.1'
            }
          });
          if (!res.ok) return { authenticated: false, status: res.status, url: location.href };
          const payload = await res.json();
          const included = Array.isArray(payload.included) ? payload.included : [];
          const prof = included.find(x => x && (x.firstName || x.publicIdentifier)) || payload.data?.miniProfile || payload.miniProfile || {};
          const first = prof.firstName || '';
          const last = prof.lastName || '';
          const profileName = (first + ' ' + last).trim() || null;
          const handle = prof.publicIdentifier || null;
          const headline = prof.occupation || prof.headline || null;
          const entityUrn = prof.entityUrn || payload.data?.plainId || null;
          return {
            authenticated: true,
            profileName,
            headline,
            handle,
            profileUrl: handle ? 'https://www.linkedin.com/in/' + handle + '/' : null,
            memberUrn: entityUrn ? String(entityUrn) : null,
            url: location.href
          };
        } catch (err) {
          return { authenticated: false, error: String(err), url: location.href };
        }
      })()`);
      if (profile?.authenticated) {
        this.setSelfIdentity(profile);
      }
      return profile;
    });
  }

  async _fetchInPageJson(url, accept = 'application/vnd.linkedin.normalized+json+2.1') {
    const args = JSON.stringify({ url, accept });
    return this.evaluate(`(async () => {
      const { url, accept } = ${args};
      if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
        return { ok: false, blocked: true };
      }
      const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
      const csrf = match ? match[1] : '';
      try {
        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            'csrf-token': csrf,
            'x-restli-protocol-version': '2.0.0',
            'accept': accept
          }
        });
        if (!res.ok) return { ok: false, status: res.status };
        return { ok: true, json: await res.json() };
      } catch {
        return { ok: false };
      }
    })()`).catch(() => ({ ok: false }));
  }

  async _extractAndIngestCodeIslands() {
    const blobs = await this.evaluate(`(() => {
      if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
        return [];
      }
      const out = [];
      for (const code of document.querySelectorAll('code')) {
        const text = (code.textContent || '').trim();
        if (!text || text[0] !== '{' || text.length > 1500000) continue;
        if (!/(msg_conversation|fs_conversation|messenger\\.Conversation|messenger\\.Message)/.test(text)) continue;
        try {
          out.push(JSON.parse(text));
        } catch {}
        if (out.length >= 20) break;
      }
      return out;
    })()`).catch(() => []);
    for (const blob of Array.isArray(blobs) ? blobs : []) {
      this.ingestMessagingPayload(blob);
    }
  }

  async _extractMessagingDomFallback() {
    const selfInfoJson = JSON.stringify({ profileName: this.selfIdentity.profileName || '' });
    const domResult = await this.evaluate(`(() => {
      if (!location.hostname.endsWith('linkedin.com') || !/^\\/messaging/i.test(location.pathname)) {
        return { chats: [], messages: [] };
      }
      const { profileName: selfName } = ${selfInfoJson};
      const clean = s => String(s || '').replace(/\\s+/g, ' ').trim();
      const nowSec = Math.floor(Date.now() / 1000);
      const activeMatch = location.pathname.match(/\\/messaging\\/thread\\/([^/?#]+)/);
      const activeThreadId = activeMatch?.[1] ? decodeURIComponent(activeMatch[1]) : '';

      const chats = [];
      const seenThreads = new Set();
      const cards = document.querySelectorAll('li.msg-conversation-listitem, [data-control-name="view_message"]');
      for (const card of cards) {
        const link = card.querySelector('a[href*="/messaging/thread/"]');
        const href = link?.getAttribute('href') || '';
        const hrefMatch = href.match(/\\/messaging\\/thread\\/([^/?#]+)/);
        const isActive = Boolean(
          card.classList.contains('active')
          || card.querySelector('[aria-selected="true"], .msg-conversation-listitem__link--active')
        );
        const threadId = (hrefMatch?.[1] ? decodeURIComponent(hrefMatch[1]) : '') || (isActive ? activeThreadId : '');
        if (!threadId || seenThreads.has(threadId)) continue;
        seenThreads.add(threadId);

        const nameEl = card.querySelector('.msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3, [class*="participant-names"]');
        const snippetEl = card.querySelector('.msg-conversation-card__message-snippet, .msg-conversation-card__message-snippet-body, p');
        const profileLink = card.querySelector('a[href*="/in/"]');
        const profileUrl = profileLink?.href || null;
        const handleMatch = profileUrl?.match(/\\/in\\/([^/?#]+)/i);

        chats.push({
          threadId,
          conversationUrn: threadId,
          name: clean(nameEl?.textContent) || 'LinkedIn Conversation',
          headline: '',
          handle: handleMatch?.[1] ? decodeURIComponent(handleMatch[1]) : null,
          profileUrl,
          preview: clean(snippetEl?.textContent).slice(0, 180),
          timestamp: nowSec - chats.length,
        });
      }

      const messages = [];
      if (activeThreadId) {
        const headerTitle = clean(document.querySelector('.msg-entity-lockup__entity-title, .msg-thread__link-to-profile, h2.msg-overlay-bubble-header__title')?.textContent);
        const headerProfileLink = document.querySelector('.msg-thread a[href*="/in/"]')?.href || null;
        const headerHandleMatch = headerProfileLink?.match(/\\/in\\/([^/?#]+)/i);
        if (!seenThreads.has(activeThreadId) && headerTitle) {
          chats.unshift({
            threadId: activeThreadId,
            conversationUrn: activeThreadId,
            name: headerTitle,
            headline: '',
            handle: headerHandleMatch?.[1] ? decodeURIComponent(headerHandleMatch[1]) : null,
            profileUrl: headerProfileLink,
            preview: '',
            timestamp: nowSec,
          });
        }

        const items = document.querySelectorAll('.msg-s-message-list__event, li.msg-s-message-list-item');
        let idx = 0;
        for (const item of items) {
          const bodyEl = item.querySelector('.msg-s-event-listitem__body, p.msg-s-event-listitem__body');
          const text = clean(bodyEl?.textContent);
          if (!text) continue;
          const group = item.closest('.msg-s-message-list__event') || item;
          const senderName = clean(group.querySelector('.msg-s-message-group__name')?.textContent);
          const fromMe = Boolean(
            selfName && senderName && senderName.toLowerCase() === selfName.toLowerCase()
          );
          messages.push({
            threadId: activeThreadId,
            messageId: 'dom-' + activeThreadId.slice(0, 24) + '-' + idx + '-' + text.slice(0, 12),
            text: text.slice(0, 16000),
            fromMe,
            senderName: senderName || (fromMe ? selfName || 'You' : headerTitle || ''),
            timestamp: nowSec + idx,
            status: 3,
          });
          idx += 1;
        }
      }

      return { chats, messages };
    })()`).catch(() => ({ chats: [], messages: [] }));

    if (domResult?.chats?.length || domResult?.messages?.length) {
      for (const chat of domResult.chats || []) this._mergeChat(chat);
      for (const message of domResult.messages || []) this._mergeMessage(message);
      if (this.onMessagingData) {
        try {
          Promise.resolve(this.onMessagingData({
            chats: domResult.chats || [],
            messages: domResult.messages || [],
          })).catch(() => {});
        } catch {}
      }
    }
  }

  async _fetchThreadMessagesUnlocked(threadId, conversationUrn = null) {
    await this.syncTargets();
    const cachedChat = this.capturedChats.get(threadId);
    const urnCandidate =
      (conversationUrn && String(conversationUrn).startsWith('urn:li:msg_conversation:') ? String(conversationUrn).trim() : null)
      || (cachedChat?.conversationUrn && String(cachedChat.conversationUrn).startsWith('urn:li:msg_conversation:') ? cachedChat.conversationUrn : null);

    const mailboxUrn =
      this.capturedMessagingApi.mailboxUrn
      || (this.selfIdentity.profileId ? `urn:li:fsd_profile:${this.selfIdentity.profileId}` : '');

    const fullConvUrn = urnCandidate || (mailboxUrn ? `urn:li:msg_conversation:(${mailboxUrn},${threadId})` : '');

    const countForThread = () => {
      let n = 0;
      for (const m of this.capturedMessages.values()) {
        if (m.threadId === threadId) n += 1;
      }
      return n;
    };

    const beforeCount = countForThread();

    if (fullConvUrn) {
      const gqlUrl = buildMessagesGraphqlUrl(this.capturedMessagingApi, fullConvUrn);
      if (gqlUrl) {
        const res = await this._fetchInPageJson(gqlUrl, this.capturedMessagingApi.messagesAccept || 'application/graphql');
        if (res?.blocked) return { ok: false, transient: true, messages: [] };
        if (res?.ok && res.json) {
          this.ingestMessagingPayload(res.json);
        }
      }
    }

    if (countForThread() <= beforeCount) {
      const legacyUrl = `/voyager/api/messaging/conversations/${encodeURIComponent(threadId)}/events`;
      const legacyRes = await this._fetchInPageJson(legacyUrl, 'application/vnd.linkedin.normalized+json+2.1');
      if (legacyRes?.blocked) return { ok: false, transient: true, messages: [] };
      if (legacyRes?.ok && legacyRes.json) {
        this.ingestMessagingPayload(legacyRes.json);
      }
    }

    return {
      ok: true,
      messages: [...this.capturedMessages.values()]
        .filter(m => m.threadId === threadId)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
    };
  }

  async fetchThreadMessages(threadId, conversationUrn = null) {
    return this.enqueue(() => this._fetchThreadMessagesUnlocked(threadId, conversationUrn));
  }

  async syncConversationsAndConnections() {
    return this.enqueue(async () => {
      await this.syncTargets();

      // 1. Check safety guard & resolve self profile so we can identify outgoing messages
      const meCheck = await this.evaluate(`(async () => {
        if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
          return { blocked: true, url: location.href, pathname: location.pathname };
        }
        const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
        const csrf = match ? match[1] : '';
        const headers = {
          'csrf-token': csrf,
          'x-restli-protocol-version': '2.0.0',
          'accept': 'application/vnd.linkedin.normalized+json+2.1'
        };
        try {
          const meRes = await fetch('/voyager/api/me', { credentials: 'include', headers });
          if (meRes.ok) {
            const meJson = await meRes.json();
            const meProf = (meJson.included || []).find(x => x && (x.firstName || x.publicIdentifier)) || meJson.miniProfile || {};
            return {
              blocked: false,
              url: location.href,
              pathname: location.pathname,
              memberUrn: String(meProf.entityUrn || ''),
              handle: String(meProf.publicIdentifier || ''),
              profileName: ((meProf.firstName || '') + ' ' + (meProf.lastName || '')).trim(),
            };
          }
        } catch {}
        return { blocked: false, url: location.href, pathname: location.pathname };
      })()`).catch(() => ({ blocked: true }));

      if (meCheck?.blocked) {
        return { ok: false, transient: true };
      }
      if (meCheck?.memberUrn || meCheck?.handle || meCheck?.profileName) {
        this.setSelfIdentity(meCheck);
      }

      // 2. If a Messenger GraphQL conversations query URL was already captured, replay it cleanly
      if (this.capturedMessagingApi.conversationsUrl) {
        const gqlConv = await this._fetchInPageJson(
          this.capturedMessagingApi.conversationsUrl,
          this.capturedMessagingApi.conversationsAccept || 'application/graphql',
        );
        if (gqlConv?.ok && gqlConv.json) {
          this.ingestMessagingPayload(gqlConv.json);
        }
      }

      // 3. If still no chats captured, navigate gently to /messaging/ to trigger LinkedIn's native GraphQL traffic
      if (this.capturedChats.size === 0) {
        const onMessaging = /^\/messaging/i.test(meCheck?.pathname || '');
        if (onMessaging) {
          await this._extractAndIngestCodeIslands();
          if (this.capturedChats.size === 0) {
            await this.send('Page.reload', {}).catch(() => {});
          }
        } else {
          this.currentUrl = 'https://www.linkedin.com/messaging/';
          await this.send('Page.navigate', { url: 'https://www.linkedin.com/messaging/' }).catch(() => {});
        }

        if (this.capturedChats.size === 0) {
          for (let attempt = 0; attempt < 17; attempt += 1) {
            await sleep(350);
            if (/\/(checkpoint|login|uas|signup)/i.test(this.currentUrl || '')) {
              return { ok: false, transient: true };
            }
            if (this.capturedChats.size > 0) {
              await sleep(900);
              await Promise.allSettled([...this.pendingCaptures]);
              break;
            }
          }
          await Promise.allSettled([...this.pendingCaptures]);
        }
      }

      if (/\/(checkpoint|login|uas|signup)/i.test(this.currentUrl || '')) {
        return { ok: false, transient: true };
      }

      // 4. SSR <code> JSON islands fallback
      if (this.capturedChats.size === 0) {
        await this._extractAndIngestCodeIslands();
      }

      // 5. Legacy inbox fallback
      if (this.capturedChats.size === 0) {
        const legacyRes = await this._fetchInPageJson(
          '/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX',
          'application/vnd.linkedin.normalized+json+2.1',
        );
        if (legacyRes?.ok && legacyRes.json) {
          this.ingestMessagingPayload(legacyRes.json);
        }
      }

      // 6. Read-only /messaging/ DOM fallback
      if (this.capturedChats.size === 0) {
        await this._extractMessagingDomFallback();
      }

      // 7. Fetch latest messages for top 5 chats that have fewer than 2 messages cached (human-paced)
      const topChats = [...this.capturedChats.values()]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 5);
      for (const chat of topChats) {
        let msgCount = 0;
        for (const msg of this.capturedMessages.values()) {
          if (msg.threadId === chat.threadId) msgCount += 1;
        }
        if (msgCount >= 2) continue;
        await sleep(750 + Math.floor(Math.random() * 500));
        await this._fetchThreadMessagesUnlocked(chat.threadId, chat.conversationUrn).catch(() => {});
      }

      // 8. Connections (human-paced delay)
      await sleep(700 + Math.floor(Math.random() * 600));
      const selfIdentityJson = JSON.stringify({
        selfUrn: this.selfIdentity.memberUrn || '',
        selfProfileId: this.selfIdentity.profileId || '',
        selfHandle: (this.selfIdentity.handle || '').toLowerCase(),
      });
      const contacts = await this.evaluate(`(async () => {
        if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
          return [];
        }
        const { selfUrn, selfProfileId, selfHandle } = ${selfIdentityJson};
        const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
        const csrf = match ? match[1] : '';
        const headers = {
          'csrf-token': csrf,
          'x-restli-protocol-version': '2.0.0',
          'accept': 'application/vnd.linkedin.normalized+json+2.1'
        };
        const buildIndex = (included) => {
          const map = new Map();
          for (const item of included || []) {
            if (!item) continue;
            if (item.entityUrn) map.set(item.entityUrn, item);
            if (item['$id']) map.set(item['$id'], item);
          }
          return map;
        };
        const resolve = (map, val) => (typeof val === 'string' ? map.get(val) : val) || null;
        const extractId = (urn) => {
          const s = String(urn || '');
          const paren = s.match(/,([^)]+)\\)/);
          if (paren) return paren[1];
          const parts = s.split(':');
          return parts[parts.length - 1] || s;
        };
        const contacts = [];
        try {
          let connRes = await fetch('/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=100&q=search&sortType=RECENTLY_ADDED', { credentials: 'include', headers });
          if (!connRes.ok) {
            connRes = await fetch('/voyager/api/relationships/connections?start=0&count=100', { credentials: 'include', headers });
          }
          if (connRes.ok) {
            const connJson = await connRes.json();
            const cMap = buildIndex(connJson.included);
            const seenContacts = new Set();
            const pushProfile = (prof) => {
              if (!prof) return;
              const name = ((prof.firstName || '') + ' ' + (prof.lastName || '')).trim();
              const handle = prof.publicIdentifier ? String(prof.publicIdentifier) : null;
              const urn = String(prof.entityUrn || prof.objectUrn || handle || '');
              const profId = extractId(urn);
              const contactId = handle || profId;
              if (!contactId || !name || seenContacts.has(contactId)) return;
              if (
                (selfUrn && urn === selfUrn)
                || (selfProfileId && profId === selfProfileId)
                || (selfHandle && handle && handle.toLowerCase() === selfHandle)
              ) {
                return;
              }
              seenContacts.add(contactId);
              contacts.push({
                contactId,
                name,
                headline: String(prof.headline || prof.occupation || ''),
                handle,
                profileUrl: handle ? 'https://www.linkedin.com/in/' + handle + '/' : null,
              });
            };
            for (const item of connJson.included || []) {
              if (item && (item.firstName || item.publicIdentifier)) pushProfile(item);
            }
            for (const el of connJson.data?.elements || connJson.elements || []) {
              const resolved = resolve(cMap, el) || el;
              const prof = resolve(cMap, resolved?.['*connectedMemberResolutionResult'] || resolved?.connectedMemberResolutionResult || resolved?.['*miniProfile'] || resolved?.miniProfile) || resolved;
              pushProfile(prof);
            }
          }
        } catch {}
        return contacts;
      })()`).catch(() => []);

      return {
        ok: true,
        chats: [...this.capturedChats.values()],
        messages: [...this.capturedMessages.values()],
        contacts: Array.isArray(contacts) ? contacts : [],
      };
    });
  }

  async sendMessage(threadId, text, conversationUrn = null) {
    return this.enqueue(async () => {
      await this.syncTargets();
      const mailboxFromArg = String(conversationUrn || '').match(/urn:li:fsd_profile:[^,)]+/)?.[0] || '';
      const mailboxUrn =
        mailboxFromArg
        || this.capturedMessagingApi.mailboxUrn
        || (this.selfIdentity.profileId ? `urn:li:fsd_profile:${this.selfIdentity.profileId}` : '')
        || null;
      const fullConversationUrn =
        conversationUrn && String(conversationUrn).startsWith('urn:li:msg_conversation:')
          ? String(conversationUrn).trim()
          : mailboxUrn
            ? `urn:li:msg_conversation:(${mailboxUrn},${threadId})`
            : null;

      const payloadArgs = JSON.stringify({ threadId, text, fullConversationUrn, mailboxUrn });
      const sent = await this.evaluate(`(async () => {
        if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
          return { ok: false, transient: true };
        }
        const { threadId, text, fullConversationUrn, mailboxUrn } = ${payloadArgs};
        const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
        const csrf = match ? match[1] : '';
        const headers = {
          'csrf-token': csrf,
          'x-restli-protocol-version': '2.0.0',
          'content-type': 'application/json',
          'accept': 'application/json'
        };

        let lastStatus = 0;
        if (fullConversationUrn && fullConversationUrn.startsWith('urn:li:msg_conversation:')) {
          const dashRes = await fetch('/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              message: {
                body: { attributes: [], text },
                renderContentUnions: [],
                conversationUrn: fullConversationUrn,
                originToken: crypto.randomUUID()
              },
              ...(mailboxUrn ? { mailboxUrn } : {}),
              dedupeByClientGeneratedToken: false
            })
          });
          lastStatus = dashRes.status;
          if (dashRes.ok) {
            const dashData = await dashRes.json().catch(() => ({}));
            const rawId =
              dashData?.value?.entityUrn
              || dashData?.value?.backendUrn
              || dashData?.data?.value?.entityUrn
              || crypto.randomUUID();
            return { ok: true, rawId: String(rawId), timestamp: Math.floor(Date.now() / 1000) };
          }
        }

        const res = await fetch('/voyager/api/messaging/conversations/' + encodeURIComponent(threadId) + '/events?action=create', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            eventCreate: {
              value: {
                'com.linkedin.voyager.messaging.create.MessageCreate': {
                  attributedBody: { text, attributes: [] },
                  attachments: []
                }
              }
            }
          })
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const rawId = data?.value?.eventUrn || data?.value?.backendEventUrn || crypto.randomUUID();
          return { ok: true, rawId: String(rawId), timestamp: Math.floor(Date.now() / 1000) };
        }
        return { ok: false, status: res.status || lastStatus };
      })()`).catch(() => ({ ok: false }));

      if (sent?.ok) {
        return {
          ok: true,
          messageId: extractThreadId(sent.rawId) || String(sent.rawId),
          timestamp: sent.timestamp || Math.floor(Date.now() / 1000),
        };
      }
      return sent;
    });
  }

  async close(deleteProfile = false) {
    this.closed = true;
    try { this.ws?.close(); } catch {}
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Browser closed'));
    }
    this.pending.clear();
    if (this.proc && !this.proc.killed) {
      try { this.proc.kill('SIGTERM'); } catch {}
    }
    if (deleteProfile && this.userDataDir) {
      await sleep(250);
      await rm(this.userDataDir, { recursive: true, force: true }).catch(() => {});
    }
    this.userDataDir = null;
  }
}
