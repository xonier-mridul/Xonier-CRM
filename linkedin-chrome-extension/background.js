let activeLoginWatcher = null;

function mapSameSite(value) {
  if (value === 'no_restriction') return 'None';
  if (value === 'lax') return 'Lax';
  if (value === 'strict') return 'Strict';
  return undefined;
}

async function getLinkedInSessionCookies() {
  const raw = await chrome.cookies.getAll({ domain: 'linkedin.com' });
  const cookies = raw
    .filter(c => c && c.name && typeof c.value === 'string')
    .map(c => {
      const mapped = {
        name: c.name,
        value: c.value,
        domain: c.domain || '.linkedin.com',
        path: c.path || '/',
        secure: c.secure !== false,
        httpOnly: Boolean(c.httpOnly),
      };
      const sameSite = mapSameSite(c.sameSite);
      if (sameSite) mapped.sameSite = sameSite;
      if (typeof c.expirationDate === 'number' && Number.isFinite(c.expirationDate)) {
        mapped.expires = Math.floor(c.expirationDate);
      }
      return mapped;
    });

  const liAtCookie = cookies.find(c => c.name === 'li_at' && c.value);
  const jsessionCookie = cookies.find(c => c.name === 'JSESSIONID' && c.value);
  const jsessionId = jsessionCookie ? jsessionCookie.value.replace(/^"|"$/g, '') : '';

  return {
    liAt: liAtCookie ? liAtCookie.value : '',
    jsessionId,
    cookies,
  };
}

function stopLoginWatcher() {
  if (activeLoginWatcher) {
    clearInterval(activeLoginWatcher);
    activeLoginWatcher = null;
  }
}

async function watchForLinkedInLogin(senderTabId, loginTabId) {
  stopLoginWatcher();
  let attempts = 0;

  activeLoginWatcher = setInterval(async () => {
    attempts += 1;
    if (attempts > 80) {
      stopLoginWatcher();
      return;
    }
    try {
      const session = await getLinkedInSessionCookies();
      if (session.liAt && session.liAt.length >= 20) {
        stopLoginWatcher();
        // Give LinkedIn 900ms to finish setting JSESSIONID and redirect cookies.
        await new Promise(resolve => setTimeout(resolve, 900));
        const finalSession = await getLinkedInSessionCookies();
        if (loginTabId) {
          chrome.tabs.remove(loginTabId).catch(() => {});
        }
        if (senderTabId) {
          chrome.tabs.update(senderTabId, { active: true }).catch(() => {});
          chrome.tabs.sendMessage(senderTabId, {
            type: 'XONIER_LINKEDIN_COOKIES_READY',
            ok: true,
            liAt: finalSession.liAt || session.liAt,
            jsessionId: finalSession.jsessionId || session.jsessionId,
            cookies: finalSession.cookies?.length ? finalSession.cookies : session.cookies,
          }).catch(() => {});
        }
      }
    } catch {
      // Ignore transient cookie read errors while login is in progress.
    }
  }, 1500);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;

  if (msg.type === 'XONIER_PING') {
    sendResponse({ installed: true, version: '1.0.0' });
    return false;
  }

  if (msg.type === 'XONIER_STATUS') {
    getLinkedInSessionCookies()
      .then(session => sendResponse({ loggedIn: Boolean(session.liAt && session.liAt.length >= 20) }))
      .catch(() => sendResponse({ loggedIn: false }));
    return true;
  }

  if (msg.type === 'XONIER_GRAB_LINKEDIN') {
    (async () => {
      const session = await getLinkedInSessionCookies();
      if (session.liAt && session.liAt.length >= 20) {
        sendResponse({
          ok: true,
          liAt: session.liAt,
          jsessionId: session.jsessionId,
          cookies: session.cookies,
        });
        return;
      }

      if (msg.openTabIfMissing) {
        const loginTab = await chrome.tabs.create({
          url: 'https://www.linkedin.com/login',
          active: true,
        });
        sendResponse({ ok: false, waitingForLogin: true });
        await watchForLinkedInLogin(sender.tab?.id, loginTab?.id);
        return;
      }

      sendResponse({
        ok: false,
        error: 'Please sign in to linkedin.com in Chrome first.',
      });
    })().catch(err => {
      sendResponse({ ok: false, error: err?.message || 'Unable to read LinkedIn session.' });
    });
    return true;
  }

  return false;
});
