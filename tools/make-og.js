// Draws one 1200x630 share image per page into static/og/ using headless Chrome and the site's own fonts.
// Run after changing a page title or description:  node tools/make-og.js
// Needs Chrome installed (set CHROME_PATH if it is not in the usual place). The site build itself does not need this.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const slash = (p) => p.split(path.sep).join('/');
const fontUrl = (f) => 'file:///' + slash(path.join(ROOT, 'static', 'fonts', f));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/data/site.json'), 'utf8'));

function meta(file) {
  const t = fs.readFileSync(file, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const o = {};
  (m ? m[1] : '').split(/\r?\n/).forEach((l) => {
    const i = l.indexOf(':');
    if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  });
  return o;
}

const dir = path.join(ROOT, 'content/en');
const pages = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !['index.md', '404.md'].includes(f));
const tmp = path.join(os.tmpdir(), 'bbc-og');
fs.mkdirSync(tmp, { recursive: true });
fs.mkdirSync(path.join(ROOT, 'static/og'), { recursive: true });

for (const f of pages) {
  const m = meta(path.join(dir, f));
  const slug = m.slug || f.replace(/\.md$/, '');
  const title = m.title;
  const desc = (m.description || '').slice(0, 130);
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;src:url("${fontUrl('bricolage-grotesque-latin-wght-normal.woff2')}");font-weight:200 800}
@font-face{font-family:A;src:url("${fontUrl('atkinson-hyperlegible-latin-400-normal.woff2')}")}
@font-face{font-family:M;src:url("${fontUrl('ibm-plex-mono-latin-500-normal.woff2')}")}
*{box-sizing:border-box;margin:0}html,body{width:1200px;height:630px;overflow:hidden}
body{background:#0C1A15;color:#E9F0EB;font-family:A;position:relative;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;
background-image:linear-gradient(rgba(142,169,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(142,169,255,.08) 1px,transparent 1px);background-size:48px 48px}
.glow{position:absolute;right:-160px;top:-160px;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,rgba(142,169,255,.35),transparent 65%)}
.brand{display:flex;align-items:center;gap:16px;font:700 30px B;position:relative}
.mark{width:44px;height:44px;border:4px solid #E9F0EB;border-radius:10px;position:relative}.mark::after{content:"";position:absolute;right:-12px;top:-12px;width:20px;height:20px;border-radius:5px;background:#8EA9FF}
.eyebrow{font:500 22px M;letter-spacing:.12em;text-transform:uppercase;color:#8EA9FF;margin-bottom:22px}
h1{font:800 ${title.length > 28 ? 76 : 92}px/1.02 B;letter-spacing:-.02em;max-width:980px}
p{font:400 30px/1.4 A;color:#A3B6AD;margin-top:24px;max-width:900px}
.foot{font:500 22px M;color:#A3B6AD;position:relative}
.bar{position:absolute;left:0;bottom:0;height:10px;width:100%;background:linear-gradient(90deg,#8EA9FF,#F6C927)}
</style><div class="glow"></div>
<div class="brand"><span class="mark"></span>${esc(site.name)}</div>
<div style="position:relative"><div class="eyebrow">${esc(m.eyebrow || title)}</div><h1>${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ''}</div>
<div class="foot">${esc(site.siteUrl.replace(/^https?:\/\//, ''))}</div><div class="bar"></div>`;
  const hf = path.join(tmp, slug + '.html');
  fs.writeFileSync(hf, html);
  const out = path.join(ROOT, 'static/og', slug + '.png');
  const r = spawnSync(CHROME, ['--headless=old', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--window-size=1200,630', '--virtual-time-budget=3000', '--user-data-dir=' + path.join(tmp, 'profile'), '--screenshot=' + out, 'file:///' + slash(hf)], { timeout: 60000 });
  const png = fs.existsSync(out) ? fs.readFileSync(out) : null;
  const dims = png ? png.readUInt32BE(16) + 'x' + png.readUInt32BE(20) : 'MISSING';
  console.log(slug.padEnd(26), dims, png ? Math.round(png.length / 1024) + ' KB' : r.status);
}
