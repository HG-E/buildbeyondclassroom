// Draws the home page share image (static/og-image.jpg, 1200x630) from the home page heading, using headless Chrome.
// Run after changing the home page heading or eyebrow:  node tools/make-og-home.js
// Needs Chrome installed (set CHROME_PATH if it is not in the usual place). Node 22 or later. The site build does not need this.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9300 + Math.floor(Math.random() * 500);
const slash = (p) => p.split(path.sep).join('/');
const fileUrl = (...p) => 'file:///' + slash(path.join(ROOT, ...p));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/site.json'), 'utf8'));
const md = fs.readFileSync(path.join(ROOT, 'content/en/index.md'), 'utf8');
const eyebrow = (md.match(/^eyebrow:\s*(.+)$/m) || [])[1] || '';
const h1 = (md.match(/^#\s+(.+)$/m) || [])[1];
if (!h1) throw new Error('No main heading found in content/en/index.md');

// " // " is a line break; ==text== is the yellow highlight (the same rules the site builder uses)
const headingHtml = h1
  .split(' // ')
  .map((line) => esc(line).replace(/==(.+?)==/g, '<span class="hl">$1</span>'))
  .join('<br>');

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url("${fileUrl('static/fonts/bricolage-grotesque-latin-wght-normal.woff2')}");font-weight:200 800}
@font-face{font-family:M;src:url("${fileUrl('static/fonts/ibm-plex-mono-latin-500-normal.woff2')}")}
*{box-sizing:border-box;margin:0}html,body{width:1200px;height:630px;overflow:hidden}
body{position:relative;background:#0A1612 url("${fileUrl('static/hero-poster.jpg')}") 70% 40%/cover no-repeat;color:#E9F0EB;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
body::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#0A1612 0%,rgba(10,22,18,.94) 42%,rgba(10,22,18,.25) 82%,rgba(10,22,18,0) 100%)}
body>*{position:relative}
.eyebrow{font:500 22px M;letter-spacing:.12em;text-transform:uppercase;color:#A3B6AD}
h1{font:800 104px/1.08 B;letter-spacing:-.025em;margin-top:26px}
.hl{background:#F6C927;color:#10251E;padding:0 .14em;border-radius:14px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.row{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:16px;font:700 30px B}
.mark{width:44px;height:44px;border:4px solid #E9F0EB;border-radius:10px;position:relative}.mark::after{content:"";position:absolute;right:-12px;top:-12px;width:20px;height:20px;border-radius:5px;background:#8EA9FF}
.url{font:500 22px M;color:#A3B6AD}
</style>
<div><div class="eyebrow">${esc(eyebrow)}</div><h1>${headingHtml}</h1></div>
<div class="row"><div class="brand"><span class="mark"></span>${esc(site.name)}</div><div class="url">${esc(site.siteUrl.replace(/^https?:\/\//, ''))}</div></div>`;

const tmp = path.join(os.tmpdir(), 'bbc-og-home');
fs.mkdirSync(tmp, { recursive: true });
const page = path.join(tmp, 'home.html');
fs.writeFileSync(page, html);

(async () => {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + path.join(tmp, 'profile-' + Date.now()), '--window-size=1200,630', 'about:blank'], { stdio: 'ignore' });
  try {
    let tabs = null;
    for (let i = 0; i < 80 && !tabs; i++) {
      try { tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch (e) { await sleep(250); }
    }
    if (!tabs) throw new Error('Chrome did not start');
    const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
    const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'file:///' + slash(page) });
    await sleep(2500);
    // quality steps down until the file is within the 150 KB the site check allows
    let out = null;
    for (const q of [88, 82, 76, 70, 64]) {
      const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: q });
      out = Buffer.from(r.result.data, 'base64');
      if (out.length <= 148 * 1024) break;
    }
    fs.writeFileSync(path.join(ROOT, 'static', 'og-image.jpg'), out);
    console.log('static/og-image.jpg written,', Math.round(out.length / 1024), 'KB');
    ws.close();
  } finally {
    try { process.platform === 'win32' ? require('child_process').execSync('taskkill /PID ' + chrome.pid + ' /T /F', { stdio: 'ignore' }) : chrome.kill(); } catch (e) { /* already gone */ }
  }
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
