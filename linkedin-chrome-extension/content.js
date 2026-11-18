document.documentElement.setAttribute('data-xonier-linkedin-ext', '1');
window.dispatchEvent(new CustomEvent('xonier-linkedin-ext-ready'));

window.addEventListener('message', event => {
  if (event.source !== window || !event.data || typeof event.data !== 'object') return;

  if (event.data.type === 'XONIER_PING_EXT') {
    window.postMessage({ type: 'XONIER_EXT_PONG', installed: true }, '*');
    return;
  }

  if (event.data.type === 'XONIER_REQUEST_LINKEDIN_SESSION') {
    chrome.runtime.sendMessage(
      {
        type: 'XONIER_GRAB_LINKEDIN',
        openTabIfMissing: event.data.openTabIfMissing !== false,
      },
      response => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              type: 'XONIER_LINKEDIN_SESSION_RESPONSE',
              ok: false,
              error: chrome.runtime.lastError.message || 'Extension communication failed.',
            },
            '*',
          );
          return;
        }
        window.postMessage(
          {
            type: 'XONIER_LINKEDIN_SESSION_RESPONSE',
            ...(response || { ok: false, error: 'No response from extension.' }),
          },
          '*',
        );
      },
    );
  }
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg && msg.type === 'XONIER_LINKEDIN_COOKIES_READY') {
    window.postMessage(
      {
        type: 'XONIER_LINKEDIN_SESSION_RESPONSE',
        ok: true,
        liAt: msg.liAt,
        jsessionId: msg.jsessionId,
        cookies: msg.cookies,
      },
      '*',
    );
  }
});
