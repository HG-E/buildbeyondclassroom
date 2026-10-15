# Build Beyond Classroom: rules for every Claude Code session

Read this file first. It carries the decisions from the nine design gates (Gate 7 is the specification for this repository). A compact digest is in `docs/GATE-DECISIONS.md`; read it before writing or checking any claim. The full gate text is in `docs/gates/` (typed from Claude Docs; diagrams are placeholders). The approved visual design and build steps are in `docs/design/`.

## What this repository is
The v0 website for Build Beyond Classroom (BBC): a **static site in raw HTML, CSS and JavaScript**. No CMS, no framework, no runtime dependencies. `node build.js` turns Markdown in `content/` into plain pages in `public/`.

v0 has **no database, no accounts, no forms that save data and no analytics**. Do not add any of these. Version v1 (records in Turso) starts only after the first pilot, and only when the owner says so.

## The eight principles (do not break these)
1. **Paper first.** Every kit and template must work printed. The site distributes them; it does not replace them. Keep the print stylesheet working.
2. **Light by default.** Small pages, no autoplay, no heavy images. Fonts are self-hosted only (Atkinson Hyperlegible for body, Bricolage Grotesque for headings, IBM Plex Mono for labels), Latin subset, `font-display: swap`, with system-font fallbacks. Every page must be fully readable and usable with JavaScript off.
3. **Open content, protected people.** Programme content is public. Nothing about a named learner is ever published or stored on this site.
4. **Learner-owned portfolio.** Learners can export their work in open formats.
5. **No lock-in.** Content is plain Markdown/JSON in Git so the host or database can change.
6. **Translation-ready.** All words live in `content/<lang>/`, never in templates or code. Add a language by copying the folder.
7. **Accessible (WCAG 2.2 AA).** Semantic headings and landmarks, visible focus, keyboard use, sufficient contrast, text resizable to 200%, plain language. Check every change.
8. **Child-data rules.** Minors take part only in facilitator-run sessions; minimal data; no tracking; no profiling.

## Hard rules
- Say "BBC" or "Build Beyond Classroom". This is a separate programme with its own brand and domain; do not mix in other organisations' names.
- Never add third-party scripts, trackers, fonts, embeds or analytics, and never make a request to another host. The Content-Security-Policy in `vercel.json` allows only this site's own files. Fonts and scripts are all local.
- **One JavaScript exception: the 3D scene on the home page.** Three.js is self-hosted in `static/vendor/` at a pinned version with its licence file. Owner decision (15 October 2026): the scene starts by itself behind the home-page headline, after the page has loaded and the browser is idle, and "Take the virtual tour" then guides the visitor through it. It must NOT start for visitors with reduced motion, data-saver on, or a 2G/3G connection; they keep the still poster (`static/hero-poster.jpg`) and can press the button to load it. It pauses when off screen or in a background tab. The page must stay fully readable and usable with JavaScript off. Nothing else may need JavaScript to be read or used, and small interactive tools (the five-questions worksheet, the interest-message builder) are enhancements that save and send nothing.
- Never write a claim the gate documents do not support (prices, numbers, partner names, outcomes). If a fact is missing, leave it out or write "to be decided".
- Keep `"indexing": false` in `content/data/site.json` until the owner approves launch.
- Hosting is Vercel Hobby, which is for non-commercial use only. Before any paid engagement (institution, licence, paid site work), stop and raise moving to Cloudflare Pages or Netlify.
- Secrets never go in the repository.

## How to work
- One small task per session. Plan first for anything touching data or consent, and show the plan.
- Run `node check.js` after changes. It builds the site and checks links, accessibility basics, privacy rules, file sizes and the corrected claims. Look at the result with `node preview.js` (opening `public/index.html` from the folder cannot load the stylesheet).
- Commit after each working step with a clear message.

## Layout
```
content/en/*.md        pages (front matter: title, slug, order, description)
content/en/ui.json     words used by the page shell (skip link, menu label, footer)
content/data/site.json site name, contact email, languages, draft banner, indexing
templates/page.html    the one page shell
static/                styles.css, service-worker.js, register-sw.js (copied as-is)
static/fonts/          self-hosted woff2 fonts (open licences kept alongside)
static/vendor/         self-hosted Three.js, pinned, with licence (tour only)
build.js               the builder (no dependencies)
public/                generated output (not committed)
vercel.json            build command and security headers
check.js              automatic checks (also run on every push by .github/workflows/check.yml)
preview.js            builds and serves the site at http://localhost:3000
content/en/404.md      the page shown for a wrong address (written to public/404.html)
docs/                  GATE-DECISIONS.md digest; gates/ full gate text; design/ approved design reference and build prompt
docs/HOSTING.md       what is connected (GitHub, Vercel, domain) and how it was set up
docs/LAUNCH-CHECKLIST.md  what is verified and what still needs a person
```
