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
const zlib = require('zlib');
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
  ok(!/ style="|<style|<script(?![^>]*\bsrc=)[^>]*>(?!\s*<\/script>)/.test(h.replace(/<script type="application\/(?:json|ld\+json)"[^>]*>[\s\S]*?<\/script>/g, '')),
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
ok(/save-offline/.test(sw) && /offline-status/.test(sw), 'the service worker answers the "save for offline use" messages');
const keepList = JSON.parse((sw.match(/const KEEP_LIST = (\[.*\]);/) || [, '[]'])[1]);
ok(keepList.length >= precache.length && precache.every((u) => keepList.includes(u)), 'everything saved on a first visit is also in the full offline list');
ok(!keepList.some((u) => u.startsWith('/vendor/') || u === '/tour.js' || u === '/hero-poster.jpg' || u.startsWith('/og/') || u.startsWith('/404')), 'the full offline list leaves out the 3D scene, pictures and the 404 page');

/* ---------- 6. budgets: what a visitor actually downloads (gzip estimate; the host may compress a little better) ---------- */
const size = (p) => fs.statSync(path.join(PUBLIC, p)).size;
const gz = (p) => zlib.gzipSync(fs.readFileSync(path.join(PUBLIC, p.endsWith('/') ? p + 'index.html' : p)), { level: 9 }).length;
const kb = (n) => `${Math.round(n / 1024)} KB`;
const fontFiles = walk(path.join(PUBLIC, 'fonts')).filter((f) => f.endsWith('.woff2'));
const fonts = fontFiles.reduce((a, f) => a + fs.statSync(f).size, 0);
ok(fontFiles.length <= 4, 'no more than four font files are loaded', String(fontFiles.length));
const shell = gz('styles.css') + gz('site.js') + gz('early.js') + gz('register-sw.js') + size('favicon.svg') + fonts;
const firstVisitInner = shell + Math.max(...['programme/', 'studio/', 'hubs-and-partners/', 'facilitators/', 'safeguarding-and-data/', 'accessibility/', 'get-involved/'].map((p) => gz(p)));
const firstVisitHome = shell + gz('/') + size('hero-poster.jpg');
ok(firstVisitInner <= 135 * 1024, 'first visit to an inner page downloads at most 135 KB', kb(firstVisitInner));
ok(firstVisitHome <= 165 * 1024, 'first visit to the home page (picture, no 3D scene) downloads at most 165 KB', kb(firstVisitHome));
const offlinePack = keepList.filter((u) => !precache.includes(u)).reduce((a, u) => a + gz(u), 0);
ok(offlinePack <= 50 * 1024, 'the "save for offline use" download is under the 50 KB the button promises (content/<lang>/ui.json: offlineHint)', kb(offlinePack));
ok(precache.length <= 14, 'a first visit saves at most 14 files for offline use', String(precache.length));
ok(size('hero-poster.jpg') <= 60 * 1024, 'hero poster is within 60 KB', kb(size('hero-poster.jpg')));
ok(size('styles.css') <= 40 * 1024, 'stylesheet is within 40 KB', kb(size('styles.css')));
ok(size('early.js') <= 1024, 'the head script stays under 1 KB', `${size('early.js')} B`);

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
  [/\bBBC\b/, 'write "Build Beyond Classroom" in full: "BBC" reads like a trademark we do not hold, and it is also the British Broadcasting Corporation'],
  [/fair use of the Build Beyond Classroom name/i, 'the gates say the name is used only as the agreement allows'],
  [/stays at that stage/i, 'not in the partnership path of Gate 8'],
  [/worth solving and safe to work on/i, 'Gate 3 says "real, big enough and doable"'],
  [/allowed in steps 4 to 6(?!,)/i, 'Gate 3 says "mainly" steps 4 to 6, and only if reviewed and explained'],
  [/finished solution to real users/i, 'Gate 2: Launch takes a solution into a second community'],
  [/readiness check/i, 'Gate 8 names the stage hub certification'],
  [/guarantee|guaranteed|guarantees/i, 'outcome promises are not supported by the gates'],
  [/draft site|has not launched|not launched yet|details may change|being designed|is a draft|before launch/i, 'the website is live: do not describe it as a draft or as not yet launched'],
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

/* ---------- 10. validation: well-formed HTML, search and social metadata, launch state, contrast ---------- */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function lintHtml(h) {
  const problems = [];
  const src = h
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '<style></style>')
    .replace(/^<!doctype html>/i, '');
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z:_-][\w:.-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>=`]+))?)*)\s*(\/?)>/g;
  let m;
  let last = 0;
  while ((m = re.exec(src))) {
    const between = src.slice(last, m.index);
    if (/<[a-zA-Z/]/.test(between)) problems.push('a tag that is not well formed near: ' + between.slice(0, 50).replace(/\s+/g, ' '));
    last = re.lastIndex;
    const [, closing, name, attrs, selfClose] = m;
    const tag = name.toLowerCase();
    if (closing) {
      const top = stack.pop();
      if (top !== tag) problems.push(`</${tag}> closes <${top || 'nothing'}>`);
      continue;
    }
    const names = [...attrs.matchAll(/\s+([a-zA-Z:_-][\w:.-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'<>=`]+))?/g)].map((x) => x[1].toLowerCase());
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    if (dup.length) problems.push(`<${tag}> repeats the attribute ${[...new Set(dup)].join(', ')}`);
    if (tag === 'a' && !/\shref=/.test(attrs)) problems.push('an <a> without href');
    if (tag === 'button' && !/\stype=/.test(attrs)) problems.push('a <button> without type');
    if (tag === 'img' && !/\salt=/.test(attrs)) problems.push('an <img> without alt');
    if (tag === 'a' && stack.includes('a')) problems.push('a link inside a link');
    if (tag === 'button' && (stack.includes('a') || stack.includes('button'))) problems.push('a button inside a link or button');
    if (['div', 'section', 'ul', 'ol', 'table', 'h1', 'h2', 'h3', 'p'].includes(tag) && stack.includes('p')) problems.push(`<${tag}> inside a <p>`);
    if (!VOID.has(tag) && !selfClose) stack.push(tag);
  }
  if (/<[a-zA-Z/][^>]*$/.test(src.slice(last))) problems.push('the page ends inside a tag');
  if (stack.length) problems.push('never closed: ' + stack.join(', '));
  const ids = new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
  for (const x of h.matchAll(/\s(?:for|aria-controls|aria-labelledby)="([^"]+)"/g)) {
    for (const id of x[1].split(/\s+/)) if (!ids.has(id)) problems.push(`a reference to #${id}, which does not exist`);
  }
  return problems;
}
for (const file of htmlFiles) {
  const name = rel(file).replace(/^public\//, '');
  const h = read(file);
  const problems = lintHtml(h);
  ok(problems.length === 0, `${name}: well-formed HTML`, problems.slice(0, 3).join(' | '));
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const desc = (h.match(/name="description" content="([^"]*)"/) || [])[1] || '';
  ok(title.length >= 10 && title.length <= 70, `${name}: title length is 10 to 70 characters`, `${title.length}: ${title}`);
  ok(desc.length >= 50 && desc.length <= 175, `${name}: description is 50 to 175 characters`, String(desc.length));
  if (name !== '404.html') {
    if (site.siteUrl) {
      ok(/<link rel="canonical" href="https:\/\/[^"]+"/.test(h), `${name}: has a canonical link`);
      const ogUrl = (h.match(/property="og:image" content="https:\/\/[^"/]+(\/[^"]+\.(?:jpg|png))"/) || [])[1];
      ok(!!ogUrl && fs.existsSync(path.join(PUBLIC, ogUrl)), `${name}: has a share image that exists`);
      if (ogUrl) ok(fs.statSync(path.join(PUBLIC, ogUrl)).size <= 150 * 1024, `${name}: share image is within 150 KB`);
    }
    ok(/name="theme-color"/.test(h) && /rel="apple-touch-icon"/.test(h), `${name}: has theme colour and touch icon`);
  }
  for (const ld of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const j = JSON.parse(ld[1]);
      ok(j['@context'] === 'https://schema.org' && Array.isArray(j['@graph']), `${name}: structured data is valid`);
    } catch (e) {
      ok(false, `${name}: structured data is valid JSON`, e.message);
    }
  }
  if (site.indexing && name !== '404.html') ok(/name="robots" content="index,follow"/.test(h), `${name}: open to search engines`);
  if (!site.status) ok(!/class="draft"/.test(h), `${name}: no draft notice on a launched site`);
}
for (const f of ['og-image.jpg', 'apple-touch-icon.png']) {
  ok(fs.existsSync(path.join(PUBLIC, f)), `${f} exists`);
}
ok(size('og-image.jpg') <= 150 * 1024, 'share image is within 150 KB', `${Math.round(size('og-image.jpg') / 1024)} KB`);
if (site.indexing) {
  const sm = fs.existsSync(path.join(PUBLIC, 'sitemap.xml')) ? read(path.join(PUBLIC, 'sitemap.xml')) : '';
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  const pagesBuilt = htmlFiles.map((f) => rel(f).replace(/^public\//, '')).filter((n) => n !== '404.html');
  ok(locs.length === pagesBuilt.length, 'sitemap lists every page', `${locs.length} listed, ${pagesBuilt.length} built`);
  ok(locs.every((u) => u.startsWith(site.siteUrl)), 'sitemap uses the real site address');
}

// colour contrast of the palette, from the stylesheet itself (WCAG 2: 4.5 for text, 3 for interface marks)
{
  const css = read(path.join(ROOT, 'static/styles.css'));
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const tokens = (block) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
  const themes = { light: tokens(css.match(/:root\s*\{([\s\S]*?)\n\}/)[1]), dark: tokens(css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)[1]) };
  for (const [theme, t] of Object.entries(themes)) {
    const pairs = [
      ['text on page', t.ink, t.bg, 4.5], ['text on card', t.ink, t.surface, 4.5], ['muted text on page', t.muted, t.bg, 4.5],
      ['muted text on card', t.muted, t.surface, 4.5], ['muted text on band', t.muted, t['surface2'], 4.5],
      ['link on page', t.accent, t.bg, 4.5], ['link on card', t.accent, t.surface, 4.5], ['link on band', t.accent, t['surface2'], 4.5],
      ['button text on button', t['accent-ink'], t.accent, 4.5],
      ['tutor label', t.tutor, t['tutor-bg'], 4.5], ['co-builder label', t.build, t['build-bg'], 4.5], ['own-work label', t.own, t['own-bg'], 4.5],
      ['highlight text', '#10251E', t.mark, 4.5], ['focus mark on page', t.focus, t.bg, 3], ['focus mark on card', t.focus, t.surface, 3], ['focus mark on band', t.focus, t['surface2'], 3],
    ];
    for (const [label, fg, bg, min] of pairs) ok(ratio(fg, bg) >= min, `contrast (${theme}): ${label}`, ratio(fg, bg).toFixed(2));
  }
  const fixed = [['call-to-action text', '#E9F0EB', '#10251E', 4.5], ['call-to-action body', '#C9D6CE', '#10251E', 4.5], ['call-to-action button', '#0C1A15', '#8EA9FF', 4.5], ['tour pills', '#10251E', '#35D0B5', 4.5], ['tour link', '#9DB4FF', '#0A1612', 4.5]];
  for (const [label, fg, bg, min] of fixed) ok(ratio(fg, bg) >= min, `contrast (fixed): ${label}`, ratio(fg, bg).toFixed(2));
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
