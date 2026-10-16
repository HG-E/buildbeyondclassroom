#!/usr/bin/env node
/*
 * Build Beyond Classroom: automatic checks.   Run:  node check.js
 *
 * Builds the site, then checks the things that must stay true. It uses only
 * Node's built-in modules. It exits with code 1 if anything fails, so it can
 * run on every push (see .github/workflows/check.yml).
 *
 * What it can and cannot tell you: it checks structure, privacy rules, file
 * sizes and links. It does NOT replace a screen-reader pass, a look at the
 * site on a real phone, or a human reading of the words against docs/gates/.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const failures = [];
const warnings = [];
let passed = 0;

function ok(cond, message, detail) {
  if (cond) passed++;
  else failures.push(detail ? `${message}: ${detail}` : message);
}
function warn(cond, message) {
  if (!cond) warnings.push(message);
}
const read = (p) => fs.readFileSync(p, 'utf8');
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/* ---------- 1. build ---------- */
try {
  execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { stdio: 'pipe' });
  ok(true, 'build');
} catch (e) {
  ok(false, 'The build failed', String(e.stderr || e.message).split('\n').slice(0, 6).join(' | '));
  report();
}

const site = JSON.parse(read(path.join(ROOT, 'content/data/site.json')));
const htmlFiles = walk(PUBLIC).filter((f) => f.endsWith('.html'));
ok(htmlFiles.length >= 8, 'at least 8 HTML pages were built', String(htmlFiles.length));

/* ---------- 2. every page ---------- */
const titles = new Map();
for (const file of htmlFiles) {
  const name = rel(file).replace(/^public\//, '');
  const h = read(file);
  const is404 = name === '404.html';

  ok(/<html lang="[a-z-]+"/.test(h), `${name}: has a language`);
  const title = (h.match(/<title>([^<]+)<\/title>/) || [])[1];
  ok(!!title, `${name}: has a title`);
  if (title) {
    ok(!titles.has(title), `${name}: title is unique`, titles.get(title));
    titles.set(title, name);
  }
  ok(/name="viewport"/.test(h), `${name}: has a viewport`);
  ok((h.match(/<h1[ >]/g) || []).length === 1, `${name}: exactly one h1`);
  const levels = [...h.matchAll(/<h([1-6])[ >]/g)].map((m) => +m[1]);
  let jump = false;
  for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) jump = true;
  ok(!jump, `${name}: no skipped heading levels`);
  for (const tag of ['main', 'header', 'footer']) {
    ok((h.match(new RegExp('<' + tag + '[ >]', 'g')) || []).length === 1, `${name}: exactly one <${tag}>`);
  }
  ok(/<nav class="main" aria-label="[^"]+"/.test(h), `${name}: main menu has a label`);
  // the mobile menu button points at the menu, and every page has the shared shell parts
  const ctrl = (h.match(/id="menuBtn"[^>]*aria-controls="([^"]+)"/) || [])[1] || (h.match(/aria-controls="([^"]+)"[^>]*id="menuBtn"/) || [])[1];
  ok(!!ctrl && h.includes(`id="${ctrl}"`), `${name}: menu button controls an element that exists`);
  ok(/id="themeBtn"[^>]*aria-label="[^"]+"/.test(h), `${name}: theme button has a name`);
  ok(/<div class="draft"[^>]*role="note"/.test(h) || !site.status, `${name}: draft notice is present while the site is a draft`);
  if (!is404) {
    ok(name === "index.html" ? /class="hero"/.test(h) : /class="page-head"/.test(h), `${name}: has its page header`);
    ok(name === "get-involved/index.html" || /class="cta-band"/.test(h), `${name}: ends with the call to action`);
  }
  const skip = (h.match(/class="skip" href="#([^"]+)"/) || [])[1];
  ok(!!skip && h.includes(`id="${skip}"`), `${name}: skip link points at something`);

  const ids = [...h.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const dups = ids.filter((x, i) => ids.indexOf(x) !== i);
  ok(dups.length === 0, `${name}: no duplicate ids`, [...new Set(dups)].join(', '));

  // privacy and the content rules: nothing inline, nothing from other hosts
  ok(!/ style="|<style|<script(?![^>]*\bsrc=)[^>]*>(?!\s*<\/script>)/.test(h.replace(/<script type="application\/json"[^>]*>[\s\S]*?<\/script>/g, '')),
    `${name}: no inline styles or inline scripts`);
  ok(!/ on[a-z]+=["']/i.test(h), `${name}: no inline event handlers`);
  const loadable = h.replace(/<link rel="(?:canonical|alternate)"[^>]*>/g, '');
  const loads = [...loadable.matchAll(/<(?:script|img|link|iframe|source|video|audio)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]+"/gi)];
  ok(loads.length === 0, `${name}: nothing is loaded from another host`, loads.slice(0, 2).map((m) => m[0].slice(0, 80)).join(' | '));
  ok(!/google-analytics|googletagmanager|gtag\(|plausible|hotjar|_vercel\/insights|facebook\.net/i.test(h), `${name}: no analytics`);
  ok(!/target="_blank"/.test(h), `${name}: no links that open a new tab`);

  // links and files
  const refs = [...h.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:|#|data:)/.test(u));
  const broken = [];
  for (const u of refs) {
    let p = path.join(PUBLIC, u.split('#')[0].split('?')[0]);
    if (u.endsWith('/') || u.split('#')[0] === '') p = path.join(p, 'index.html');
    if (u.split('#')[0] !== '' && !fs.existsSync(p)) broken.push(u);
  }
  ok(broken.length === 0, `${name}: every link and file exists`, broken.slice(0, 3).join(', '));
  const anchors = [...h.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  ok(anchors.every((a) => h.includes(`id="${a}"`)), `${name}: every #anchor exists`);
  const emptyLinks = [...h.matchAll(/<a [^>]*>([\s\S]*?)<\/a>/g)].filter((m) => !m[1].replace(/<[^>]+>/g, '').trim() && !/aria-label=/.test(m[0]));
  ok(emptyLinks.length === 0, `${name}: no links without a name`);
  ok(!(/<img\b/.test(h) && /<img(?![^>]*\balt=)/.test(h)), `${name}: every image has alt text`);
  for (const t of h.matchAll(/<table>[\s\S]*?<\/table>/g)) ok(/<th scope="col"/.test(t[0]), `${name}: tables have column headers`);

  // draft protection and the contact address
  if (!site.indexing || is404) ok(/name="robots" content="noindex,nofollow"/.test(h), `${name}: marked noindex`);
  ok(!/@example\.(org|com)|REPLACE-WITH/.test(h), `${name}: no placeholder email`);
}

/* ---------- 3. draft protection ---------- */
const robots = fs.existsSync(path.join(PUBLIC, 'robots.txt')) ? read(path.join(PUBLIC, 'robots.txt')) : '';
if (!site.indexing) {
  ok(/Disallow: \//.test(robots) && !/Allow: \//.test(robots), 'robots.txt keeps search engines away while indexing is off');
  ok(!fs.existsSync(path.join(PUBLIC, 'sitemap.xml')), 'no sitemap while indexing is off');
} else {
  ok(/Sitemap: https:\/\//.test(robots), 'robots.txt lists the sitemap once indexing is on');
  ok(fs.existsSync(path.join(PUBLIC, 'sitemap.xml')), 'sitemap exists once indexing is on');
}
warn(!site.indexing, 'indexing is ON: the site is open to search engines');

/* ---------- 4. headers (vercel.json) ---------- */
const vercel = JSON.parse(read(path.join(ROOT, 'vercel.json')));
const rootHeaders = Object.fromEntries(
  (vercel.headers.find((x) => x.source === '/(.*)') || { headers: [] }).headers.map((h) => [h.key.toLowerCase(), h.value])
);
const csp = rootHeaders['content-security-policy'] || '';
ok(/default-src 'self'/.test(csp), 'CSP: default-src is self');
ok(!/https?:\/\//.test(csp), 'CSP: names no other host');
ok(!/unsafe-inline|unsafe-eval/.test(csp), 'CSP: no unsafe-inline or unsafe-eval');
ok(/object-src 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp), 'CSP: no plugins, no framing');
for (const k of ['x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy']) {
  ok(!!rootHeaders[k], `header ${k} is set`);
}
const longCache = (src) => ((vercel.headers.find((x) => x.source === src) || { headers: [] }).headers.find((h) => /cache-control/i.test(h.key)) || {}).value || '';
ok(/max-age=31536000/.test(longCache('/fonts/(.*)')), 'fonts are cached for a year');
ok(/max-age=31536000/.test(longCache('/vendor/(.*)')), 'vendor scripts are cached for a year');
ok(/no-cache/.test(longCache('/service-worker.js')), 'the service worker is never cached');

/* ---------- 5. offline copy ---------- */
const sw = read(path.join(PUBLIC, 'service-worker.js'));
const precache = JSON.parse((sw.match(/const PRECACHE = (\[.*\]);/) || [, '[]'])[1]);
ok(precache.length > 8, 'the offline list is not empty', String(precache.length));
ok(precache.every((u) => fs.existsSync(path.join(PUBLIC, u.endsWith('/') ? u + 'index.html' : u))), 'every offline file exists');
ok(!precache.some((u) => u.startsWith('/vendor/') || u === '/tour.js' || u === '/hero-poster.jpg' || u.startsWith('/404')), 'the 3D scene, poster and 404 page are not in the offline list');
ok(/KEEP\.has\(/.test(sw), 'the service worker only keeps listed files');

/* ---------- 6. budgets (bytes) ---------- */
const size = (p) => fs.statSync(path.join(PUBLIC, p)).size;
const fonts = walk(path.join(PUBLIC, 'fonts')).filter((f) => f.endsWith('.woff2')).reduce((a, f) => a + fs.statSync(f).size, 0);
const homeWeight = size('index.html') + size('styles.css') + size('site.js') + size('register-sw.js') + fonts;
ok(homeWeight <= 200 * 1024, 'home page weight before the 3D scene is within 200 KB', `${Math.round(homeWeight / 1024)} KB`);
ok(size('hero-poster.jpg') <= 60 * 1024, 'hero poster is within 60 KB', `${Math.round(size('hero-poster.jpg') / 1024)} KB`);
ok(size('styles.css') <= 40 * 1024, 'stylesheet is within 40 KB', `${Math.round(size('styles.css') / 1024)} KB`);

/* ---------- 7. supply chain: vendored files match their recorded hashes ---------- */
for (const dir of ['static/fonts', 'static/vendor']) {
  const sources = read(path.join(ROOT, dir, 'SOURCES.txt'));
  const found = [...sources.matchAll(/([0-9a-f]{64})\s+(?:\*)?(\S+)/g)];
  ok(found.length > 0, `${dir}/SOURCES.txt lists hashes`);
  for (const [, hash, file] of found) {
    const p = path.join(ROOT, dir, file);
    const actual = fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'missing';
    ok(actual === hash, `${dir}/${file} matches its recorded SHA-256`, actual === 'missing' ? 'file missing' : 'hash differs');
  }
}

/* ---------- 8. content: language files, links, corrected claims ---------- */
for (const lang of site.languages.map((l) => l.code)) {
  for (const f of ['ui.json', 'studio.json']) {
    try {
      JSON.parse(read(path.join(ROOT, 'content', lang, f)));
      ok(true, `content/${lang}/${f}`);
    } catch (e) {
      ok(false, `content/${lang}/${f} is valid JSON`, e.message);
    }
  }
}
// Wording that was found unsupported by the gate documents and corrected. If one of these comes
// back, the build stays green only if someone re-checks it against docs/gates/ and removes the rule.
const BANNED = [
  [/only to reply/i, 'a promise about how email is used that the gates do not make'],
  [/straight away/i, 'a response-time promise the gates do not make'],
  [/has been checked with a free automated/i, 'a claim about an accessibility check that was not evidenced'],
  [/trained facilitator\./i, 'the gates say "certified facilitator"'],
  [/fair use of the BBC/i, 'the gates say the name is used only as the agreement allows'],
  [/stays at that stage/i, 'not in the partnership path of Gate 8'],
  [/worth solving and safe to work on/i, 'Gate 3 says "real, big enough and doable"'],
  [/allowed in steps 4 to 6(?!,)/i, 'Gate 3 says "mainly" steps 4 to 6, and only if reviewed and explained'],
  [/finished solution to real users/i, 'Gate 2: Launch takes a solution into a second community'],
  [/readiness check/i, 'Gate 8 names the stage hub certification'],
  [/guarantee|guaranteed|guarantees/i, 'outcome promises are not supported by the gates'],
];
const contentFiles = walk(path.join(ROOT, 'content')).filter((f) => /\.(md|json)$/.test(f));
for (const f of contentFiles) {
  const text = read(f);
  for (const [re, why] of BANNED) ok(!re.test(text), `${rel(f)}: no banned wording ${re}`, why);
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    ok(/^(https:\/\/|mailto:|\/|#)/.test(m[1]), `${rel(f)}: link target is allowed`, m[1]);
  }
}
for (const f of walk(path.join(ROOT, 'content')).filter((x) => x.endsWith('.md'))) {
  ok(!/\bhttps?:\/\/(?!www\.unesco\.org|digital-skills-jobs\.europa\.eu)/.test(read(f).replace(/\]\(\/[^)]*\)/g, '')), `${rel(f)}: only the expected external links`);
}

/* ---------- 9. the contact address ---------- */
warn(site.contactEmail && !/REPLACE|@example\./i.test(site.contactEmail), 'contactEmail is still a placeholder');

report();

function report() {
  console.log(`\nChecks passed: ${passed}`);
  if (warnings.length) {
    console.log(`Warnings (${warnings.length}):`);
    warnings.forEach((w) => console.log('  - ' + w));
  }
  if (failures.length) {
    console.log(`\nFAILED (${failures.length}):`);
    failures.forEach((f) => console.log('  x ' + f));
    process.exit(1);
  }
  console.log('\nAll checks passed.');
  process.exit(0);
}
