# Build Beyond Classroom: rules for every Claude Code session

Read this file first. It carries the decisions from the nine design gates (Gate 7 is the specification for this repository). A compact digest is in `docs/GATE-DECISIONS.md`; read it before writing or checking any claim. Full gate text, if exported, is in `docs/gates/`.

## What this repository is
The v0 website for Build Beyond Classroom (BBC): a **static site in raw HTML, CSS and JavaScript**. No CMS, no framework, no runtime dependencies. `node build.js` turns Markdown in `content/` into plain pages in `public/`.

v0 has **no database, no accounts, no forms that save data and no analytics**. Do not add any of these. Version v1 (records in Turso) starts only after the first pilot, and only when the owner says so.

## The eight principles (do not break these)
1. **Paper first.** Every kit and template must work printed. The site distributes them; it does not replace them. Keep the print stylesheet working.
2. **Light by default.** Small pages, system fonts, no web fonts, no autoplay, no heavy images. Pages must be fully readable with JavaScript off.
3. **Open content, protected people.** Programme content is public. Nothing about a named learner is ever published or stored on this site.
4. **Learner-owned portfolio.** Learners can export their work in open formats.
5. **No lock-in.** Content is plain Markdown/JSON in Git so the host or database can change.
6. **Translation-ready.** All words live in `content/<lang>/`, never in templates or code. Add a language by copying the folder.
7. **Accessible (WCAG 2.2 AA).** Semantic headings and landmarks, visible focus, keyboard use, sufficient contrast, text resizable to 200%, plain language. Check every change.
8. **Child-data rules.** Minors take part only in facilitator-run sessions; minimal data; no tracking; no profiling.

## Hard rules
- Say "BBC" or "Build Beyond Classroom". This is a separate programme with its own brand and domain; do not mix in other organisations' names.
- Never add third-party scripts, trackers, fonts, embeds or analytics. The Content-Security-Policy in `vercel.json` allows only this site's own files.
- Never write a claim the gate documents do not support (prices, numbers, partner names, outcomes). If a fact is missing, leave it out or write "to be decided".
- Keep `"indexing": false` in `content/data/site.json` until the owner approves launch.
- Hosting is Vercel Hobby, which is for non-commercial use only. Before any paid engagement (institution, licence, paid site work), stop and raise moving to Cloudflare Pages or Netlify.
- Secrets never go in the repository.

## How to work
- One small task per session. Plan first for anything touching data or consent, and show the plan.
- Run `node build.js` after changes and open `public/index.html` or `npx serve public`.
- Commit after each working step with a clear message.

## Layout
```
content/en/*.md        pages (front matter: title, slug, order, description)
content/en/ui.json     words used by the page shell (skip link, menu label, footer)
content/data/site.json site name, contact email, languages, draft banner, indexing
templates/page.html    the one page shell
static/                styles.css, service-worker.js, register-sw.js (copied as-is)
build.js               the builder (no dependencies)
public/                generated output (not committed)
vercel.json            build command and security headers
docs/                  GATE-DECISIONS.md digest; gates/ for full exports
```
