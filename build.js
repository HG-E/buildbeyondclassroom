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
 * translated copies of the .md files, ui.json and studio.json, and add the
 * language to site.json.
 *
 * Every page is complete HTML that reads and works with JavaScript off.
 * The words used by scripts travel in a JSON data block (not in the code).
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

// JSON that is safe inside <script type="application/json">.
const safeJson = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

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

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : ['/' + path.relative(base, full).split(path.sep).join('/')];
  });
}

const EMAIL_PLACEHOLDER = /REPLACE|@example\.(org|com)$/i;
const hasRealEmail = () => !!site.contactEmail && !EMAIL_PLACEHOLDER.test(site.contactEmail);

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

/* ---------- Markdown (the small subset the content uses, plus a few layout directives) ----------
 *
 * Directive lines go directly before a list:
 *   {path}     numbered stages            {ladder}  the skills ladder
 *   {defs}     lettered definitions       {cards N} cards in N columns (2, 3 or 4)
 *   {stats}    "value | label" items      {routes}  "eyebrow | title | text | link text | /url/"
 *   {legend}   "role | label | text"
 * Card items are "**Title.** text", "Title | text" or "Eyebrow | Title | text".
 * "+++ Summary" followed by text makes a disclosure. "==text==" is the highlight.
 * A line holding only {{name}} inserts a block built by the builder.
 */

// Only https, mailto, site paths and anchors may be linked from content. Anything else
// (javascript:, data:, http:, ...) stops the build, so a typo cannot ship an unsafe link.
function assertSafeHref(href) {
  if (/^(https:\/\/|mailto:|\/|#|\.{1,2}\/)/i.test(href)) return;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) return; // a relative path with no scheme
  throw new Error('Link target not allowed (only https, mailto, paths and anchors): ' + href);
}

function inline(text) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/==([^=]+)==/g, '<span class="hl">$1</span>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    assertSafeHref(href);
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

// "**Title.** text" -> { title, text }
function titleText(item) {
  const m = item.match(/^\*\*(.+?)\*\*\.?\s*(.*)$/);
  return m ? { title: m[1].replace(/\.$/, ''), text: m[2] } : { title: item, text: '' };
}

/* ---------- icons: simple outline shapes, drawn for BBC, no external files ---------- */
const ICONS = {
  build: '<rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="10" y="9" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  briefcase: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  export: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  learner: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/>',
  users: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15.5 14.2c3 .2 5.5 2.4 5.5 5.8"/>',
  hub: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  funder: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10"/><path d="M14.8 9.4c-.6-.8-1.6-1.2-2.8-1.2-1.6 0-2.8.8-2.8 2s1 1.7 2.8 2.1 2.8.9 2.8 2.1-1.2 2-2.8 2c-1.2 0-2.3-.4-3-1.3"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

function svgIcon(name, cls) {
  if (!ICONS[name]) throw new Error('Unknown icon @' + name + ' (known: ' + Object.keys(ICONS).join(', ') + ')');
  return `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

// "@name | a | b" -> ['name', ['a', 'b']];  "a | b" -> ['', ['a', 'b']]
function splitIcon(parts) {
  if (parts[0] && parts[0].startsWith('@')) return [parts[0].slice(1).trim(), parts.slice(1)];
  return ['', parts];
}
const iconWrap = (name) => (name ? `<span class="ic-wrap">${svgIcon(name)}</span>` : '');

function renderDirectiveList(kind, items, ui) {
  const cell = (t) => inline(t);
  if (kind === 'path') {
    return `<ol class="path">${items
      .map((t) => {
        const { title, text } = titleText(t);
        return `<li><strong>${cell(title)}</strong>${text ? `<span class="muted">${cell(text)}</span>` : ''}</li>`;
      })
      .join('')}</ol>`;
  }
  if (kind === 'ladder') {
    return `<ol class="ladder">${items
      .map((t, i) => `<li class="rung r${i + 1}"><span class="n">${i + 1}</span><strong>${cell(t)}</strong></li>`)
      .join('')}</ol>`;
  }
  if (kind === 'checks') {
    return `<ul class="checks">${items.map((t) => `<li>${svgIcon('check')}<span>${cell(t)}</span></li>`).join('')}</ul>`;
  }
  if (kind === 'stats') {
    return `<div class="stats">${items
      .map((t) => {
        const [value, label] = t.split('|').map((x) => x.trim());
        return `<div class="stat"><b>${cell(value)}</b><span>${cell(label || '')}</span></div>`;
      })
      .join('')}</div>`;
  }
  if (kind === 'routes') {
    return `<div class="grid g4">${items
      .map((t) => {
        const [ic, rest] = splitIcon(t.split('|').map((x) => x.trim()));
        const [eyebrow, title, text, go, href] = rest;
        assertSafeHref(href);
        return `<a class="route" href="${esc(href)}">${iconWrap(ic)}<span class="mono">${cell(eyebrow)}</span><strong>${cell(title)}</strong><span class="muted">${cell(text)}</span><span class="go">${cell(go)}${svgIcon('arrow')}</span></a>`;
      })
      .join('')}</div>`;
  }
  if (kind === 'legend') {
    return `<ul class="legend">${items
      .map((t) => {
        const [role, label, text] = t.split('|').map((x) => x.trim());
        return `<li><span class="pill ${esc(role)}">${cell(label)}</span><span>${cell(text)}</span></li>`;
      })
      .join('')}</ul>`;
  }
  const f = kind.match(/^features(?:\s+(\d))?$/);
  if (f) {
    const cols = { 2: 'g2', 3: 'g3', 4: 'g4' }[f[1] || 4] || 'g4';
    return `<div class="grid ${cols}">${items
      .map((t) => {
        const [ic, rest] = splitIcon(t.split(' | ').map((x) => x.trim()));
        const [title, text = ''] = rest;
        return `<article class="feature">${iconWrap(ic)}<h3>${cell(title)}</h3>${text ? `<p class="muted">${cell(text)}</p>` : ''}</article>`;
      })
      .join('')}</div>`;
  }
  const m = kind.match(/^cards(?:\s+(\d))?$/);
  if (m) {
    const cols = { 2: 'g2', 3: 'g3', 4: 'g4' }[m[1] || 3] || 'g3';
    return `<div class="grid ${cols}">${items
      .map((t) => {
        const [ic, parts] = splitIcon(t.split(' | ').map((x) => x.trim()));
        let eyebrow = '';
        let title;
        let text = '';
        if (parts.length >= 3) [eyebrow, title, text] = parts;
        else if (parts.length === 2) [title, text] = parts;
        else ({ title, text } = titleText(parts[0]));
        return `<div class="card">${iconWrap(ic)}${eyebrow ? `<p class="mono">${cell(eyebrow)}</p>` : ''}<h3>${cell(title)}</h3>${text ? `<p class="muted">${cell(text)}</p>` : ''}</div>`;
      })
      .join('')}</div>`;
  }
  throw new Error(`Unknown directive {${kind}}`);
}

function markdown(src, ui, blocks) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let h1 = '';
  let lede = '';
  let sectionOpen = false;
  let sectionCount = 0;
  let afterH1 = false;
  let i = 0;

  const closeSection = () => {
    if (sectionOpen) out.push('</section>');
    sectionOpen = false;
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // inserted block: a line holding only {{name}}
    const blk = line.trim().match(/^\{\{(\w+)\}\}$/);
    if (blk) {
      if (!(blk[1] in blocks)) throw new Error(`Markdown uses {{${blk[1]}}}, which the builder does not provide`);
      out.push(blocks[blk[1]]);
      i++;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      const id = slugify(text.split(' // ').join(' '));
      if (level === 1) {
        // " // " in a main heading is a deliberate line break
        h1 = `<h1 id="${id}" tabindex="-1">${text.split(' // ').map((part) => inline(part)).join('<br>')}</h1>`;
        afterH1 = true;
        i++;
        continue;
      }
      afterH1 = false;
      if (level === 2) {
        closeSection();
        headings.push({ id, text });
        out.push(`<section class="block${sectionCount++ % 2 ? ' alt' : ''}"><div class="head"><h2 id="${id}">${inline(text)}</h2></div>`);
        sectionOpen = true;
      } else {
        out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      }
      i++;
      continue;
    }

    // directive before a list: {path}, {cards 3}, ...
    const dir = line.trim().match(/^\{([a-z]+(?:\s+\d)?)\}$/);
    if (dir && lines[i + 1] !== undefined) {
      const kind = dir[1];
      i++;
      const re = /^\s*(?:[-*]|\d+\.)\s+(.*)$/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(lines[i].match(re)[1]);
        i++;
      }
      out.push(renderDirectiveList(kind, items, ui));
      continue;
    }

    // disclosure: "+++ Summary" then text
    if (/^\+\+\+\s+/.test(line)) {
      const group = [];
      while (i < lines.length && /^\+\+\+\s+/.test(lines[i])) {
        const summary = lines[i].replace(/^\+\+\+\s+/, '').trim();
        i++;
        const body = [];
        while (i < lines.length && lines[i].trim() && !/^\+\+\+\s+/.test(lines[i])) {
          body.push(lines[i].trim());
          i++;
        }
        while (i < lines.length && !lines[i].trim()) i++;
        group.push(`<details><summary>${inline(summary)}</summary><p>${inline(body.join(' '))}</p></details>`);
      }
      out.push(`<div class="disclosures">${group.join('')}</div>`);
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
        .map((r) => `<tr>${r.map((c, n) => (n === 0 ? `<th scope="row">${inline(c)}</th>` : `<td data-label="${esc(head[n])}">${inline(c)}</td>`)).join('')}</tr>`)
        .join('');
      out.push(`<div class="tw" tabindex="0" role="region" aria-label="${esc(ui.tableLabel)}"><table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></div>`);
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
      out.push(`<${tag} class="plain">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${tag}>`);
      afterH1 = false;
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
      afterH1 = false;
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
      !/^>\s?/.test(lines[i]) &&
      !/^\+\+\+\s+/.test(lines[i]) &&
      !/^\{[a-z]+(?:\s+\d)?\}$/.test(lines[i].trim()) &&
      !/^\{\{\w+\}\}$/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (afterH1 && !lede) {
      lede = `<p class="lede">${inline(para.join(' '))}</p>`;
    } else {
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
    afterH1 = false;
  }
  closeSection();

  return { h1, lede, html: out.join('\n'), headings };
}

/* ---------- content data ---------- */

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

// Words used by the page shell and the scripts live in content/<lang>/, never in the template or here.
const UI_KEYS = [
  'skipLink', 'navLabel', 'contactLabel', 'footerNote', 'tableLabel', 'brandLabel', 'ctaLabel', 'ctaSlug',
  'themeLabel', 'menuOpen', 'menuClose', 'ogImageAlt', 'journeyEyebrow', 'journeyLead', 'ctaBandTitle', 'ctaBandText', 'footerPagesTitle', 'footerContactTitle', 'footerNoTracking', 'footerCopyright', 'toTop',
  'emailPending', 'emailLabel', 'copyEmail', 'homePrimary', 'homePrimarySlug', 'heroLogTitle', 'heroLogHint',
  'tourStart', 'noJavaScriptLens', 'noJavaScriptInterest',
];

function loadJson(lang, name, keys) {
  const file = path.join(CONTENT, lang, name);
  if (!fs.existsSync(file)) throw new Error(`content/${lang}/${name} is missing (copy it from content/${site.defaultLanguage}/)`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const key of keys) {
    if (data[key] === undefined || data[key] === '') throw new Error(`content/${lang}/${name} needs a value for "${key}"`);
  }
  return data;
}

function urlFor(lang, slug) {
  const prefix = lang === site.defaultLanguage ? '' : `/${lang}`;
  return `${prefix}/${slug ? slug + '/' : ''}`;
}

/* ---------- blocks built from data ---------- */

function studioTable(studio, ui) {
  const c = studio.columns;
  const rows = studio.steps
    .map((s) => {
      const role = studio.roles[s.ai];
      const partner = s.partner ? studio.partner.yes : studio.partner.no;
      const fac = s.facilitator ? s.facilitator.text : studio.facilitatorDefault;
      return `<tr id="step-${s.n}"><th scope="row">${s.n}. ${esc(s.title)}</th><td data-label="${esc(c.what)}">${esc(s.what)}</td><td data-label="${esc(c.ai)}"><span class="pill ${esc(s.ai)}">${esc(role.label)}</span></td><td data-label="${esc(c.partner)}">${esc(partner)}</td><td data-label="${esc(c.facilitator)}">${esc(fac)}</td></tr>`;
    })
    .join('');
  return (
    `<div class="tw" id="studioStatic" tabindex="0" role="region" aria-label="${esc(ui.tableLabel)}"><table>` +
    `<thead><tr><th scope="col">${esc(c.step)}</th><th scope="col">${esc(c.what)}</th><th scope="col">${esc(c.ai)}</th><th scope="col">${esc(c.partner)}</th><th scope="col">${esc(c.facilitator)}</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></div><div id="studioLive" hidden></div>`
  );
}

function toolShell(name, ui) {
  return `<div class="tool" data-tool="${name}" hidden></div><noscript><p class="hint">${esc(name === 'lens' ? ui.noJavaScriptLens : ui.noJavaScriptInterest)}</p></noscript>`;
}

function emailBox(ui) {
  if (!hasRealEmail()) {
    return `<p class="emailbox"><span class="mono">${esc(ui.emailLabel)}</span> <strong>${esc(ui.emailPending)}</strong></p>`;
  }
  return (
    `<p class="emailbox"><span class="mono">${esc(ui.emailLabel)}</span> <strong class="pick" id="emailText">${esc(site.contactEmail)}</strong> ` +
    `<button class="btn small ghost" type="button" id="emailCopy" hidden>${esc(ui.copyEmail)}</button> <span class="hint" id="emailMsg" role="status"></span></p>`
  );
}

/* ---------- page render ---------- */

const ucfirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function journeyBlock(studio, ui, lang) {
  const items = studio.steps
    .map(
      (s) =>
        `<li><a href="${urlFor(lang, ui.homePrimarySlug)}#step-${s.n}"><span class="n">${s.n}</span><span class="jt">${esc(s.title)}</span><span class="pill ${esc(s.ai)}">${esc(studio.roles[s.ai].label)}</span></a></li>`
    )
    .join('');
  return `<section class="block journey-block alt"><div class="head"><p class="mono">${esc(ui.journeyEyebrow)}</p><h2>${esc(ui.heroLogTitle)}</h2><p class="muted">${esc(ui.journeyLead)}</p></div><ol class="journey">${items}</ol></section>`;
}

function render(page, pages, ui, studio) {
  const lang = page.lang;
  const email = hasRealEmail() ? site.contactEmail : '';

  // {{contactEmail}} can be used inside page text; it is filled from site.json.
  let body = page.body;
  const mailLink = '[{{contactEmail}}](mailto:{{contactEmail}})';
  body = body.split(mailLink).join(email ? `[${email}](mailto:${email})` : ui.emailPending);
  body = body.replace(/{{contactEmail}}/g, email || ui.emailPending);

  const blocks = {
    studioSteps: studioTable(studio, ui),
    lensTool: toolShell('lens', ui),
    interestTool: toolShell('interest', ui),
    emailBox: emailBox(ui),
    journey: journeyBlock(studio, ui, lang),
  };
  const md = markdown(body, ui, blocks);

  const needsStudio = /\{\{studioSteps\}\}/.test(page.body) || page.meta.layout === 'home';
  const needsTools = /\{\{(lensTool|interestTool)\}\}/.test(page.body);
  const needsEmail = /\{\{emailBox\}\}/.test(page.body) || needsTools;
  const isHome = page.meta.layout === 'home';
  const is404 = page.meta.slug === '404';

  const ctaHref = urlFor(lang, ui.ctaSlug);
  const navPages = pages.filter((p) => p.meta.nav !== 'false');
  const navLinks =
    navPages
      .map((p) => {
        const href = urlFor(lang, p.meta.slug);
        const current = p === page ? ' aria-current="page"' : '';
        return `<a href="${href}"${current}>${esc(p.meta.navTitle || p.meta.title)}</a>`;
      })
      .join('') + `<a class="btn small nav-cta" href="${ctaHref}">${esc(ui.ctaLabel)}</a>`;
  const footerLinks = pages
    .filter((p) => p.meta.slug !== '' && p.meta.slug !== '404')
    .map((p) => `<li><a href="${urlFor(lang, p.meta.slug)}">${esc(p.meta.navTitle || p.meta.title)}</a></li>`)
    .join('');

  const langLinks = site.languages
    .filter((l) => l.code !== lang && fs.existsSync(path.join(CONTENT, l.code, page.file)))
    .map((l) => `<a href="${urlFor(l.code, page.meta.slug)}" hreflang="${l.code}" lang="${l.code}">${esc(l.name)}</a>`)
    .join(' ');

  const title = page.meta.titleTag || (page.meta.slug === '' ? site.name : `${page.meta.title} | ${site.name}`);
  const robots = site.indexing && !is404 ? 'index,follow' : 'noindex,nofollow';
  const draft = site.status
    ? `<div class="draft" role="note"><div class="wrap"><span class="tag">${esc(ui.draftTag || 'Notice')}</span><span class="d-long">${esc(site.status)}</span><span class="d-short">${esc(ui.draftShort || '')}</span></div></div>`
    : '';

  const tagline = ucfirst(site.tagline);
  const pageUrl = site.siteUrl ? site.siteUrl.replace(/\/$/, '') + urlFor(lang, page.meta.slug) : '';
  const ogPath = !isHome && page.meta.slug && fs.existsSync(path.join(STATIC, 'og', page.meta.slug + '.png')) ? '/og/' + page.meta.slug + '.png' : '/og-image.jpg';
  const metaTags = [
    isHome ? '<link rel="preload" as="image" href="/hero-poster.jpg" fetchpriority="high">' : '',
    pageUrl && !is404 ? `<link rel="canonical" href="${esc(pageUrl)}">` : '',
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(page.meta.description || tagline)}">`,
    pageUrl && !is404 ? `<meta property="og:url" content="${esc(pageUrl)}">` : '',
    pageUrl && !is404 ? `<meta property="og:image" content="${esc(site.siteUrl.replace(/\/$/, ''))}${ogPath}">` : '',
    pageUrl && !is404 ? '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : '',
    pageUrl && !is404 ? `<meta property="og:image:alt" content="${esc(ui.ogImageAlt)}">` : '',
    '<meta property="og:locale" content="' + esc(lang === 'en' ? 'en_GB' : lang) + '">',
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(page.meta.description || tagline)}">`,
    `<meta name="twitter:card" content="${pageUrl && !is404 ? 'summary_large_image' : 'summary'}">`,
    pageUrl && !is404 ? `<meta name="twitter:image" content="${esc(site.siteUrl.replace(/\/$/, ''))}${ogPath}">` : '',
  ]
    .filter(Boolean)
    .join('\n  ');
  const eyebrow = page.meta.eyebrow ? `<p class="mono">${esc(page.meta.eyebrow)}</p>` : '';

  // structured data for search engines, on the home page only (a data block: it never runs as a script)
  let jsonld = '';
  if (isHome && site.siteUrl) {
    const base = site.siteUrl.replace(/\/$/, '');
    const org = { '@type': 'Organization', '@id': base + '/#org', name: site.name, url: base + '/', logo: base + '/apple-touch-icon.png' };
    if (email) org.email = email;
    const web = { '@type': 'WebSite', '@id': base + '/#site', url: base + '/', name: site.name, description: tagline, inLanguage: lang, publisher: { '@id': base + '/#org' } };
    jsonld = '<script type="application/ld+json">' + safeJson({ '@context': 'https://schema.org', '@graph': [org, web] }) + '</script>';
  } else if (site.siteUrl && !is404) {
    const base = site.siteUrl.replace(/\/$/, '');
    const crumbs = { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: base + '/' },
      { '@type': 'ListItem', position: 2, name: page.meta.title, item: pageUrl } ] };
    const webpage = { '@type': 'WebPage', '@id': pageUrl + '#page', url: pageUrl, name: title, description: page.meta.description || tagline, inLanguage: lang, isPartOf: { '@id': base + '/#site' }, breadcrumb: crumbs };
    jsonld = '<script type="application/ld+json">' + safeJson({ '@context': 'https://schema.org', '@graph': [webpage] }) + '</script>';
  }

  let top;
  if (isHome) {
    top =
      `<section class="hero" id="hero"><div class="wrap">` +
      `<div class="hero-copy">${eyebrow}${md.h1}${md.lede}` +
      `<div class="actions"><a class="btn" href="${ctaHref}">${esc(ui.ctaLabel)}${svgIcon('arrow')}</a>` +
      `<a class="btn ghost" href="${urlFor(lang, ui.homePrimarySlug)}">${esc(ui.homePrimary)}</a>` +
      `<button class="btn quiet" type="button" id="startTour" hidden>${svgIcon('play')}${esc(ui.tourStart)}</button></div></div>` +
      `</div></section>`;
  } else {
    const artIcon = { programme: 'learner', studio: 'bulb', 'hubs-and-partners': 'hub', facilitators: 'users', 'safeguarding-and-data': 'shield', accessibility: 'globe', 'get-involved': 'mail' }[page.meta.slug];
    const art = artIcon ? `<div class="art" aria-hidden="true">${svgIcon(artIcon)}<i class="d1"></i><i class="d2"></i><i class="d3"></i></div>` : '';
    top = `<div class="page-head">${art}<div class="wrap"><div class="head">${eyebrow}${md.h1}${md.lede}</div></div></div>`;
  }

  // closing call to action, on every page except the sign-up page and the 404 page
  const showCta = !is404 && page.meta.cta !== 'false';
  const ctaBand = showCta
    ? `<section class="cta-band" aria-labelledby="ctaTitle"><div class="wrap cta-in"><div><h2 id="ctaTitle">${esc(ui.ctaBandTitle)}</h2><p>${esc(ui.ctaBandText)}</p></div><div class="cta-actions"><a class="btn" href="${ctaHref}">${esc(ui.ctaLabel)}${svgIcon('arrow')}</a></div></div></section>`
    : '';

  const data = {};
  if (needsStudio || needsTools || needsEmail) data.ui = ui.js || {};
  if (needsStudio) data.studio = studio;
  if (needsTools || needsEmail) data.email = email || null;
  data.lang = lang;
  const dataBlock = `<script type="application/json" id="bbc-data">${safeJson(data)}</script>`;

  const footerEmail = email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : esc(ui.emailPending);
  const pageHtml = `${top}<div class="wrap">${md.html}</div>`;

  return TEMPLATE.replace(/{{lang}}/g, esc(lang))
    .replace(/{{title}}/g, esc(title))
    .replace(/{{description}}/g, esc(page.meta.description || tagline))
    .replace(/{{robots}}/g, robots)
    .replace(/{{meta}}/g, () => metaTags)
    .replace(/{{jsonld}}/g, () => jsonld)
    .replace(/{{bodyClass}}/g, isHome ? ' class="is-home"' : '')
    .replace(/{{siteName}}/g, esc(site.name))
    .replace(/{{tagline}}/g, esc(tagline))
    .replace(/{{navLinks}}/g, () => navLinks)
    .replace(/{{footerLinks}}/g, footerLinks)
    .replace(/{{footerEmail}}/g, () => footerEmail)
    .replace(/{{langLinks}}/g, langLinks)
    .replace(/{{status}}/g, () => draft)
    .replace(/{{ctaBand}}/g, () => ctaBand)
    .replace(/{{year}}/g, String(new Date().getFullYear()))
    .replace(/{{ui\.(\w+)}}/g, (_, key) => {
      if (typeof ui[key] !== 'string') throw new Error(`templates/page.html uses {{ui.${key}}}, which is not in ui.json`);
      return esc(ui[key]);
    })
    .replace(/{{data}}/g, () => dataBlock)
    .replace(/{{content}}/g, () => pageHtml);
}

function main() {
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });
  if (fs.existsSync(STATIC)) copyDir(STATIC, OUT);

  const written = [];
  for (const { code } of site.languages) {
    if (!fs.existsSync(path.join(CONTENT, code))) continue;
    const pages = loadPages(code);
    const ui = loadJson(code, 'ui.json', UI_KEYS);
    const studio = loadJson(code, 'studio.json', ['columns', 'roles', 'partner', 'facilitatorDefault', 'steps']);
    for (const page of pages) {
      const is404 = page.meta.slug === '404';
      const url = urlFor(code, page.meta.slug);
      const dest = is404
        ? path.join(OUT, code === site.defaultLanguage ? '' : code, '404.html')
        : path.join(OUT, url, 'index.html');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, render(page, pages, ui, studio));
      if (!is404) written.push(url);
    }
  }

  // Offline layer: the service worker keeps every page and the small static files.
  // The tour (Three.js and tour.js) is large and optional, so it is never kept offline.
  const assets = listFiles(STATIC).filter(
    (f) => f !== '/service-worker.js' && !f.startsWith('/vendor/') && f !== '/tour.js' && f !== '/hero-poster.jpg' && f !== '/og-image.jpg' && !f.startsWith('/og/') && f !== '/apple-touch-icon.png' && !/\.txt$/.test(f)
  );
  // Saved on the first visit: only the home page and the files every page needs. Every other page is saved
  // when the visitor opens it, so a first visit never downloads pages nobody asked for (data is expensive).
  const keep = [...written, ...assets];
  const precache = ['/', ...assets];
  const version = crypto.createHash('sha1').update(JSON.stringify(keep) + Date.now()).digest('hex').slice(0, 10);
  const swPath = path.join(OUT, 'service-worker.js');
  fs.writeFileSync(
    swPath,
    fs
      .readFileSync(swPath, 'utf8')
      .replace('__VERSION__', version)
      .replace('__PRECACHE__', JSON.stringify(precache))
      .replace('__KEEP__', JSON.stringify(keep))
  );

  if (site.indexing) {
    if (!site.siteUrl) throw new Error('site.json needs "siteUrl" before "indexing" can be turned on');
    if (!hasRealEmail()) throw new Error('Set a real "contactEmail" in site.json before turning "indexing" on');
    const base = site.siteUrl.replace(/\/$/, '');
    let lastmod = '';
    try { lastmod = require('child_process').execSync('git log -1 --format=%cs -- content static templates', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { lastmod = ''; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) lastmod = '';
    const urls = written.map((u) => `  <url><loc>${base}${u}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n');
    fs.writeFileSync(
      path.join(OUT, 'sitemap.xml'),
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n'
    );
    fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
  } else {
    // While the site is a draft, ask search engines to stay away.
    fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  }

  console.log(`Built ${written.length} pages into public/`);
  for (const u of written) console.log('  ' + u);
}

main();
