const $ = (id) => document.getElementById(id);

(async () => {
  const { autoScheduleUrl } = await chrome.storage.local.get('autoScheduleUrl');
  if (autoScheduleUrl) $('url').value = autoScheduleUrl;
})();

$('save').addEventListener('click', async () => {
  const raw = $('url').value.trim().replace(/\/$/, '');
  const status = $('status');
  status.className = 'status';
  if (!/^https?:\/\//.test(raw)) {
    status.className = 'status err';
    status.textContent = 'URL must start with http(s)://';
    return;
  }
  let originPattern;
  try {
    const u = new URL(raw);
    originPattern = `${u.protocol}//${u.host}/*`;
  } catch {
    status.className = 'status err';
    status.textContent = 'invalid URL';
    return;
  }
  // Runtime-requested host permission: cleaner install warning than a blanket
  // <all_urls> grant. User sees "extension wants access to <your server>".
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) {
    status.className = 'status err';
    status.textContent = 'permission denied — cannot talk to that host';
    return;
  }
  await chrome.storage.local.set({ autoScheduleUrl: raw });
  status.className = 'status ok';
  status.textContent = 'saved ✓';
});
