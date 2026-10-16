# Build Beyond Classroom: website v0

A static website in raw HTML, CSS and JavaScript. No CMS, no framework, no dependencies, no database, no accounts, no analytics. It follows the Gate 7 specification and the rules in `CLAUDE.md`.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or later.

```
node preview.js        # builds the site and shows it at http://localhost:3000
node build.js          # only builds, writing the site into public/
node check.js          # builds, then runs the automatic checks (about 390)
```

Use `node preview.js` to see the site. Opening `public/index.html` straight from the folder will not work properly: the pages link to `/styles.css` and other files from the site root, so the stylesheet will not load.

## Edit it

- Pages: `content/en/*.md`. Each file starts with a short block (`title`, `slug`, `order`, `description`, plus optional `eyebrow`, `nav: false` to keep a page out of the top menu, and `layout: home`).
- Page layout in Markdown: a line such as `{features 4}`, `{cards 3}`, `{checks}`, `{routes}`, `{path}`, `{stats}`, `{ladder}` or `{legend}` directly before a list turns it into that component. Features, cards and routes can start with an icon written `@name | ` (the icon names are the `ICONS` list in `build.js`). Every second section gets a tinted band automatically, and every page except the sign-up and 404 pages ends with the call to action. `+++ Title` followed by text makes a disclosure. `==text==` is the highlight. See the comment at the top of the Markdown section in `build.js`.
- The eight Studio steps (title, what happens, AI role, partner, facilitator decision): `content/<lang>/studio.json`. The Studio page, the home page list and the tour all read from it.
- Words in the page shell and in the scripts (skip link, menu, footer, tour and tool text): `content/<lang>/ui.json`. Each language folder needs its own `ui.json` and `studio.json`.
- Site name, contact email, site address (`siteUrl`) and the search-engine switch (`indexing`): `content/data/site.json`. An optional `status` line shows a notice bar above the header; leave it out while the site is live. While the email is still the placeholder, the site shows "to be confirmed" instead.
- Look and feel: `static/styles.css`. Page shell: `templates/page.html`.
- Scripts: `static/site.js` (theme button, Studio track, the two small tools) and `static/tour.js` (the 3D tour). Fonts: `static/fonts/`. Three.js: `static/vendor/`. Every page works with JavaScript off. On the home page the 3D scene starts by itself once the page has loaded, except for visitors with reduced motion, data-saver on or a 2G/3G connection, who keep the still poster (`static/hero-poster.jpg`) and can press the button to load it. The scene is not part of the offline copy.
- Use `{{contactEmail}}` inside a page to insert the email from `site.json`.

## Launch status

The website launched on 16 October 2026 (`"indexing": true`). The programme itself has not opened yet: no cohort has run and applications are not open, and the pages say so. Keep every page true to that, and check any new claim against `docs/gates/`. The legal form, first pilot site, evaluator, prices and licence are still undecided.

> The site is already online. See `docs/HOSTING.md` for what is connected (GitHub, Vercel, the domain) and `docs/LAUNCH-CHECKLIST.md` for what is still open. The steps below are how it was set up.

## Put it online (all free, no card expected)

BBC is run from the owner's own accounts (GitHub `HG-E`, Vercel, and the registrar that holds the domain). There is no separate BBC account. The steps below are how it was set up:

1. On your GitHub account, make a new **public** repository and push this folder.
2. Create a Vercel account by signing in with GitHub, import the repository, and accept the settings (they come from `vercel.json`).
3. Buy the domain only after the name and trademark checks. Until then the free Vercel address works.

**Hosting rule (Gate 7):** Vercel's free Hobby plan is for non-commercial use only, and Vercel counts anyone paid for any part of the site work, including through a company or grant. Use Hobby for the pilot only after Vercel support confirms in writing that the pilot qualifies, and keep the reply. Before the first paid engagement, paid site work or an institution paying BBC, move to Cloudflare Pages or Netlify. Nothing in this folder is tied to Vercel except `vercel.json`.

**Account safety:** turn on two-step sign-in for GitHub, Vercel and the registrar, and keep the recovery codes somewhere safe.

## Working with Claude Code in VS Code

Open this folder in VS Code and start Claude Code. It reads `CLAUDE.md` first. Keep sessions short and to one task, and commit after each working step.

## Design decisions

`docs/GATE-DECISIONS.md` summarises the nine design gates. The full text is in `docs/gates/`. It was typed out from Claude Docs, so diagrams appear as placeholders and the wording should be checked against the originals before it is relied on.

## What is not here yet (by design)

Records, sign-in and a database arrive at v1, after the first pilot has shown what facilitators need. See Gate 7.
