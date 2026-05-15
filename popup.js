const $ = (id) => document.getElementById(id);

async function init() {
  const { autoScheduleUrl } = await chrome.storage.local.get('autoScheduleUrl');
  if (!autoScheduleUrl) {
    $('target').textContent = 'No server URL set — open Settings';
    $('sync').disabled = true;
    return;
  }
  $('target').textContent = autoScheduleUrl;
}

$('open-options').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

$('sync').addEventListener('click', async () => {
  const status = $('status');
  status.className = 'status muted';
  status.textContent = 'reading cookies…';

  const { autoScheduleUrl } = await chrome.storage.local.get('autoScheduleUrl');
  if (!autoScheduleUrl) {
    status.className = 'status err';
    status.textContent = 'server URL not configured';
    return;
  }

  // Pull every cookie set on any *.sfu.ca host. The site scraper's cookie
  // header sends all of them — CAS + coursys auth straddle both hosts.
  const raw = await chrome.cookies.getAll({ domain: 'sfu.ca' });
  const cookies = raw.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    expires: c.expirationDate ?? null,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite,
  }));
  if (cookies.length === 0) {
    status.className = 'status err';
    status.textContent = 'no SFU cookies found — log in to CourSys first';
    return;
  }

  status.textContent = `posting ${cookies.length} cookies…`;
  try {
    const res = await fetch(`${autoScheduleUrl.replace(/\/$/, '')}/api/coursys/cookies`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ consent: true, cookies }),
    });
    if (res.status === 401) {
      status.className = 'status err';
      status.textContent = 'not signed in to auto-schedule in this browser';
      return;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`);
    }
    const data = await res.json();
    status.className = 'status ok';
    status.textContent = `synced ${data.count} cookies ✓`;
  } catch (err) {
    status.className = 'status err';
    status.textContent = err.message;
  }
});

init();
