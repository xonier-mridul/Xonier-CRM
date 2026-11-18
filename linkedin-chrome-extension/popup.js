const statusEl = document.getElementById('status');
const detailEl = document.getElementById('detail');
const openBtn = document.getElementById('open-li');

chrome.runtime.sendMessage({ type: 'XONIER_STATUS' }, response => {
  if (response?.loggedIn) {
    statusEl.textContent = 'LinkedIn signed in';
    statusEl.className = 'status ok';
    detailEl.textContent = 'Ready for 1-Click Auto-Connect inside Xonier CRM (/linkedin).';
  } else {
    statusEl.textContent = 'Sign in required';
    statusEl.className = 'status warn';
    detailEl.textContent = 'Sign in to linkedin.com in Chrome, then click Auto-Connect in Xonier CRM.';
  }
});

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.linkedin.com/feed/' });
});
