#!/usr/bin/env node
/*
 * Build Beyond Classroom - static site builder (v0)
 *
 * Reads Markdown from content/<lang>/ and the site settings from
 * content/data/site.json, wraps each page in templates/page.html and writes
 * plain HTML to public/. No dependencies: run it with `node build.js`.
 *
 * Default language pages are written to the site root; other languages go
 * to /<lang>/. To add a language, add a folder content/<lang>/ with
 * translated copies of the .md files and add the language to site.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public');
const STATIC = path.join(ROOT, 'static');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'templates', 'page.html'), 'utf8');
const site = JSON.parse(fs.readFileSync(path.join(CONTENT, 'data', 'site.json'), 'utf8'));

/* ---------- small helpers ---------- */

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

/* ---------- front matter ---------- */

function parseFrontMatter(raw, file) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter (--- ... ---)`);
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1');
  }
  if (!meta.title) throw new Error(`${file}: front matter needs a title`);
  if (!meta.slug && meta.slug !== '') throw new Error(`${file}: front matter needs a slug (use an empty slug for the home page)`);
  return { meta, body: m[2] };
}

/* ---------- Markdown (the small subset the content uses) ---------- */

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href);
    const attrs = external ? ' rel="noopener noreferrer"' : '';
    return `<a href="${href}"${attrs}>${label}</a>`;
  });
  return s;
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function markdown(src, ui) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = slugify(text);
      if (level === 2) headings.push({ id, text });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // tables
    if (line.includes('|') && lines[i + 1] && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const th = head.map((c) => `<th scope="col">${inline(c)}</th>`).join('');
      const tr = rows
        .map((r) => `<tr>${r.map((c, n) => (n === 0 ? `<th scope="row">${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join('')}</tr>`)
        .join('');
      out.push(`<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(ui.tableLabel)}"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
      continue;
    }

    // lists
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      const re = ul ? /^\s*[-*]\s+(.*)$/ : /^\s*\d+\.\s+(.*)$/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(lines[i].match(re)[1]);
        i++;
      }
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      continue;
    }

    // callout (> text)
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<aside class="note">${inline(quote.join(' '))}</aside>`);
      continue;
    }

    // paragraph
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return { html: out.join('\n'), headings };
}

/* ---------- build ---------- */

function loadPages(lang) {
  const dir = path.join(CONTENT, lang);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const { meta, body } = parseFrontMatter(raw, `${lang}/${f}`);
      return { lang, file: f, meta, body, order: Number(meta.order || 99) };
    })
    .sort((a, b) => a.order - b.order);
}

// Words used by the page shell live in content/<lang>/ui.json, never in the template or here.
const UI_KEYS = ['skipLink', 'navLabel', 'contactLabel', 'footerNote', 'tableLabel'];

function loadUi(lang) {
  const file = path.join(CONTENT, lang, 'ui.json');
  if (!fs.existsSync(file)) throw new Error(`content/${lang}/ui.json is missing (copy it from content/${site.defaultLanguage}/)`);
  const ui = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of UI_KEYS) {
    if (typeof ui[key] !== 'string' || !ui[key]) throw new Error(`content/${lang}/ui.json needs a value for "${key}"`);
  }
  return ui;
}

function urlFor(lang, slug) {
  const prefix = lang === site.defaultLanguage ? '' : `/${lang}`;
  return `${prefix}/${slug ? slug + '/' : ''}`;
}

function render(page, pages, ui) {
  // {{contactEmail}} can be used inside page text; it is filled from site.json.
  const { html } = markdown(page.body.replace(/{{contactEmail}}/g, site.contactEmail), ui);
  const lang = page.lang;
  const nav = pages
    .filter((p) => p.meta.nav !== 'false')
    .map((p) => {
      const href = urlFor(lang, p.meta.slug);
      const current = p === page ? ' aria-current="page"' : '';
      return `<li><a href="${href}"${current}>${esc(p.meta.navTitle || p.meta.title)}</a></li>`;
    })
    .join('');

  const langLinks = site.languages
    .filter((l) => l.code !== lang && fs.existsSync(path.join(CONTENT, l.code, page.file)))
    .map((l) => `<a href="${urlFor(l.code, page.meta.slug)}" hreflang="${l.code}" lang="${l.code}">${esc(l.name)}</a>`)
    .join(' ');

  const title = page.meta.slug === '' ? site.name : `${page.meta.title} | ${site.name}`;
  const robots = site.indexing ? 'index,follow' : 'noindex,nofollow';
  const draft = site.status
    ? `<p class="status" role="note">${esc(site.status)}</p>`
    : '';

  return TEMPLATE.replace(/{{lang}}/g, esc(lang))
    .replace(/{{title}}/g, esc(title))
    .replace(/{{description}}/g, esc(page.meta.description || site.tagline))
    .replace(/{{robots}}/g, robots)
    .replace(/{{siteName}}/g, esc(site.name))
    .replace(/{{tagline}}/g, esc(site.tagline))
    .replace(/{{nav}}/g, nav)
    .replace(/{{langLinks}}/g, langLinks)
    .replace(/{{status}}/g, draft)
    .replace(/{{contactEmail}}/g, esc(site.contactEmail))
    .replace(/{{year}}/g, String(new Date().getFullYear()))
    .replace(/{{ui\.(\w+)}}/g, (_, key) => {
      if (typeof ui[key] !== 'string') throw new Error(`templates/page.html uses {{ui.${key}}}, which is not in ui.json`);
      return esc(ui[key]);
    })
    .replace(/{{content}}/g, () => html);
}

function main() {
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(STATIC)) copyDir(STATIC, OUT);

  const written = [];
  for (const { code } of site.languages) {
    if (!fs.existsSync(path.join(CONTENT, code))) continue;
    const pages = loadPages(code);
    const ui = loadUi(code);
    for (const page of pages) {
      const url = urlFor(code, page.meta.slug);
      const dest = path.join(OUT, url, 'index.html');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, render(page, pages, ui));
      written.push(url);
    }
  }

  // Offline layer: the service worker caches every page and the static files.
  const assets = fs.readdirSync(STATIC).filter((f) => !/^service-worker\.js$/.test(f)).map((f) => '/' + f);
  const precache = [...written, ...assets];
  const version = crypto.createHash('sha1').update(JSON.stringify(precache) + Date.now()).digest('hex').slice(0, 10);
  const swPath = path.join(OUT, 'service-worker.js');
  fs.writeFileSync(
    swPath,
    fs
      .readFileSync(swPath, 'utf8')
      .replace('__VERSION__', version)
      .replace('__PRECACHE__', JSON.stringify(precache))
  );

  // While the site is a draft, ask search engines to stay away.
  if (!site.indexing) fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');

  console.log(`Built ${written.length} pages into public/`);
  for (const u of written) console.log('  ' + u);
}

main();
