import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

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

export class ChromeSession {
  constructor(sid) {
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
    await this.send('Network.enable');
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
      return this.evaluate(`(async () => {
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
          const profile = included.find(x => x && (x.firstName || x.publicIdentifier)) || payload.data?.miniProfile || payload.miniProfile || {};
          const first = profile.firstName || '';
          const last = profile.lastName || '';
          const profileName = (first + ' ' + last).trim() || null;
          const handle = profile.publicIdentifier || null;
          const headline = profile.occupation || profile.headline || null;
          const entityUrn = profile.entityUrn || payload.data?.plainId || null;
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
    });
  }

  async syncConversationsAndConnections() {
    return this.enqueue(async () => {
      return this.evaluate(`(async () => {
        if (!location.hostname.endsWith('linkedin.com') || /^\\/(checkpoint|login|uas|signup)/i.test(location.pathname)) {
          return { ok: false, transient: true };
        }
        const humanDelay = (min = 700, span = 600) => new Promise(r => setTimeout(r, min + Math.floor(Math.random() * span)));
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
        const extractThreadId = (urn) => {
          const s = String(urn || '');
          const paren = s.match(/,([^)]+)\\)/);
          if (paren) return paren[1];
          const parts = s.split(':');
          return parts[parts.length - 1] || s;
        };

        // 1. Self profile to identify outgoing messages
        let selfUrn = '';
        let selfHandle = '';
        try {
          const meRes = await fetch('/voyager/api/me', { credentials: 'include', headers });
          if (meRes.ok) {
            const meJson = await meRes.json();
            const meProf = (meJson.included || []).find(x => x && (x.firstName || x.publicIdentifier)) || meJson.miniProfile || {};
            selfUrn = String(meProf.entityUrn || '');
            selfHandle = String(meProf.publicIdentifier || '');
          }
        } catch {}

        // 2. Conversations
        await humanDelay();
        const chats = [];
        const messages = [];
        try {
          const convRes = await fetch('/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX', { credentials: 'include', headers });
          if (convRes.ok) {
            const convJson = await convRes.json();
            const map = buildIndex(convJson.included);
            const rawList = Array.isArray(convJson.data?.elements)
              ? convJson.data.elements.map(e => resolve(map, e) || e)
              : Array.isArray(convJson.elements)
                ? convJson.elements
                : (convJson.included || []).filter(x => String(x?.entityUrn || '').includes('fs_conversation'));

            const seenThreads = new Set();
            for (const conv of rawList) {
              if (!conv) continue;
              const convUrn = String(conv.entityUrn || conv['*conversation'] || '');
              const threadId = extractThreadId(convUrn);
              if (!threadId || seenThreads.has(threadId)) continue;
              seenThreads.add(threadId);

              const partRefs = conv['*participants'] || conv.participants || [];
              const otherProfiles = [];
              for (const ref of partRefs) {
                const pObj = resolve(map, ref) || ref;
                const member = resolve(map, pObj?.['*messagingMember'] || pObj?.messagingMember || pObj) || pObj;
                const mini = resolve(map, member?.['*miniProfile'] || member?.miniProfile || member?.['com.linkedin.voyager.messaging.MessagingMember']?.['*miniProfile'] || member?.['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile) || member;
                if (mini && (mini.firstName || mini.publicIdentifier)) {
                  const urn = String(mini.entityUrn || '');
                  const handle = String(mini.publicIdentifier || '');
                  if ((selfUrn && urn === selfUrn) || (selfHandle && handle === selfHandle)) continue;
                  otherProfiles.push(mini);
                }
              }
              const primary = otherProfiles[0] || {};
              const name = ((primary.firstName || '') + ' ' + (primary.lastName || '')).trim() || 'LinkedIn Conversation';
              const headline = primary.occupation || primary.headline || '';
              const handle = primary.publicIdentifier || null;
              const profileUrl = handle ? 'https://www.linkedin.com/in/' + handle + '/' : null;

              let preview = '';
              let timestamp = Number(conv.lastActivityAt || 0);
              const eventRefs = conv['*events'] || conv.events || [];
              for (const evRef of eventRefs) {
                const ev = resolve(map, evRef) || evRef;
                if (!ev) continue;
                const ec = ev.eventContent?.['com.linkedin.voyager.messaging.event.MessageEvent'] || ev.eventContent || {};
                const bodyText = ec.attributedBody?.text || ec.body || '';
                if (bodyText) preview = String(bodyText).slice(0, 180);
                if (ev.createdAt && Number(ev.createdAt) > timestamp) timestamp = Number(ev.createdAt);
              }

              chats.push({
                threadId,
                conversationUrn: convUrn || threadId,
                name,
                headline,
                handle,
                profileUrl,
                preview,
                timestamp: timestamp > 1e12 ? Math.floor(timestamp / 1000) : timestamp || Math.floor(Date.now() / 1000),
              });
            }

            // Fetch latest events for top 5 chats with human pacing
            for (const chat of chats.slice(0, 5)) {
              try {
                await humanDelay(800, 400);
                const evRes = await fetch('/voyager/api/messaging/conversations/' + encodeURIComponent(chat.threadId) + '/events', { credentials: 'include', headers });
                if (!evRes.ok) continue;
                const evJson = await evRes.json();
                const evMap = buildIndex(evJson.included);
                const events = Array.isArray(evJson.data?.elements)
                  ? evJson.data.elements.map(e => resolve(evMap, e) || e)
                  : Array.isArray(evJson.elements)
                    ? evJson.elements
                    : (evJson.included || []).filter(x => String(x?.entityUrn || '').includes('fs_event'));

                for (const ev of events) {
                  if (!ev) continue;
                  const ec = ev.eventContent?.['com.linkedin.voyager.messaging.event.MessageEvent'] || ev.eventContent || {};
                  const text = String(ec.attributedBody?.text || ec.body || '').trim();
                  if (!text) continue;
                  const fromObj = resolve(evMap, ev['*from'] || ev.from) || ev.from || {};
                  const fromMember = resolve(evMap, fromObj['*messagingMember'] || fromObj.messagingMember || fromObj) || fromObj;
                  const fromMini = resolve(evMap, fromMember?.['*miniProfile'] || fromMember?.miniProfile || fromMember?.['com.linkedin.voyager.messaging.MessagingMember']?.['*miniProfile'] || fromMember?.['com.linkedin.voyager.messaging.MessagingMember']?.miniProfile) || fromMember;
                  const senderUrn = String(fromMini?.entityUrn || '');
                  const senderHandle = String(fromMini?.publicIdentifier || '');
                  const fromMe = Boolean((selfUrn && senderUrn === selfUrn) || (selfHandle && senderHandle === selfHandle));
                  const tsRaw = Number(ev.createdAt || Date.now());
                  const ts = tsRaw > 1e12 ? Math.floor(tsRaw / 1000) : tsRaw;
                  const messageId = extractThreadId(ev.entityUrn || ev.backendUrn || (chat.threadId + '-' + ts + '-' + text.slice(0, 16)));
                  messages.push({
                    threadId: chat.threadId,
                    messageId,
                    text: text.slice(0, 16000),
                    fromMe,
                    senderName: ((fromMini?.firstName || '') + ' ' + (fromMini?.lastName || '')).trim() || (fromMe ? 'You' : chat.name),
                    timestamp: ts,
                    status: 3,
                  });
                }
              } catch {}
            }
          }
        } catch {}

        // 3. Connections
        await humanDelay();
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
              const contactId = handle || extractThreadId(urn);
              if (!contactId || !name || seenContacts.has(contactId)) return;
              if ((selfUrn && urn === selfUrn) || (selfHandle && handle === selfHandle)) return;
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

        return { ok: true, chats, messages, contacts };
      })()`);
    });
  }

  async sendMessage(threadId, text, conversationUrn = null) {
    return this.enqueue(async () => {
      const payloadArgs = JSON.stringify({ threadId, text, conversationUrn });
      return this.evaluate(`(async () => {
        const { threadId, text, conversationUrn } = ${payloadArgs};
        const match = document.cookie.match(/JSESSIONID="?([^";]+)"?/);
        const csrf = match ? match[1] : '';
        const headers = {
          'csrf-token': csrf,
          'x-restli-protocol-version': '2.0.0',
          'content-type': 'application/json',
          'accept': 'application/json'
        };
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
          return { ok: true, messageId: String(rawId), timestamp: Math.floor(Date.now() / 1000) };
        }
        if (conversationUrn && String(conversationUrn).startsWith('urn:li:')) {
          const dashRes = await fetch('/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
              message: {
                body: { attributes: [], text },
                renderContentUnions: [],
                conversationUrn,
                originToken: crypto.randomUUID()
              },
              mailboxUrn: conversationUrn.match(/urn:li:fsd_profile:[^,)]+/)?.[0] || undefined
            })
          });
          if (dashRes.ok) {
            const dashData = await dashRes.json().catch(() => ({}));
            return { ok: true, messageId: String(dashData?.value?.entityUrn || crypto.randomUUID()), timestamp: Math.floor(Date.now() / 1000) };
          }
        }
        return { ok: false, status: res.status };
      })()`);
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
