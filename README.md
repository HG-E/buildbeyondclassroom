# Build Beyond Classroom: website v0

A static website in raw HTML, CSS and JavaScript. No CMS, no framework, no dependencies, no database, no accounts, no analytics. It follows the Gate 7 specification and the rules in `CLAUDE.md`.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or later.

```
node preview.js        # builds the site and shows it at http://localhost:3000
node build.js          # only builds, writing the site into public/
```

Use `node preview.js` to see the site. Opening `public/index.html` straight from the folder will not work properly: the pages link to `/styles.css` and other files from the site root, so the stylesheet will not load.

## Edit it

- Pages: `content/en/*.md`. Each file starts with a short block (`title`, `slug`, `order`, `description`, plus optional `eyebrow`, `nav: false` to keep a page out of the top menu, and `layout: home`).
- Page layout in Markdown: a line such as `{cards 3}`, `{path}`, `{defs}`, `{stats}`, `{routes}`, `{ladder}` or `{legend}` directly before a list turns it into that component. `+++ Title` followed by text makes a disclosure. `==text==` is the highlight. See the comment at the top of the Markdown section in `build.js`.
- The eight Studio steps (title, what happens, AI role, partner, facilitator decision): `content/<lang>/studio.json`. The Studio page, the home page list and the tour all read from it.
- Words in the page shell and in the scripts (skip link, menu, footer, tour and tool text): `content/<lang>/ui.json`. Each language folder needs its own `ui.json` and `studio.json`.
- Site name, contact email, draft banner and indexing switch: `content/data/site.json`. While the email is still the placeholder, the site shows "to be confirmed" instead.
- Look and feel: `static/styles.css`. Page shell: `templates/page.html`.
- Scripts: `static/site.js` (theme button, Studio track, the two small tools) and `static/tour.js` (the 3D tour). Fonts: `static/fonts/`. Three.js: `static/vendor/`. Every page works with JavaScript off. On the home page the 3D scene starts by itself once the page has loaded, except for visitors with reduced motion, data-saver on or a 2G/3G connection, who keep the still poster (`static/hero-poster.jpg`) and can press the button to load it. The scene is not part of the offline copy.
- Use `{{contactEmail}}` inside a page to insert the email from `site.json`.

## Before anything goes public

1. Check that the address in `content/data/site.json` (`contactEmail`) is one that two people can open, as Gate 7 requires.
2. Check every page against the gates. Nothing here is final: the legal form, first pilot site, evaluator, prices and domain are all undecided.
3. When you approve launch, set `"indexing": true` in `site.json`. Until then the site tells search engines to stay away.

## Put it online (all free, no card expected)

1. Create a shared BBC email address that two people can open.
2. Create a GitHub account with it, make a new **public** repository, and push this folder.
3. Create a Vercel account by signing in with GitHub, import the repository, and accept the settings (they come from `vercel.json`).
4. Buy the domain only after the name and trademark checks. Until then the free Vercel address works.

**Hosting rule (Gate 7):** Vercel's free Hobby plan is for non-commercial use only, and Vercel counts anyone paid for any part of the site work, including through a company or grant. Use Hobby for the pilot only after Vercel support confirms in writing that the pilot qualifies, and keep the reply. Before the first paid engagement, paid site work or an institution paying BBC, move to Cloudflare Pages or Netlify. Nothing in this folder is tied to Vercel except `vercel.json`.

**Account safety (Gate 7):** turn on two-step sign-in for GitHub, Vercel and the shared email account, and keep two owners on every account.

## Working with Claude Code in VS Code

Open this folder in VS Code and start Claude Code. It reads `CLAUDE.md` first. Keep sessions short and to one task, and commit after each working step.

## Design decisions

`docs/GATE-DECISIONS.md` summarises the nine design gates. The full text is in `docs/gates/`. It was typed out from Claude Docs, so diagrams appear as placeholders and the wording should be checked against the originals before it is relied on.

## What is not here yet (by design)

Records, sign-in and a database arrive at v1, after the first pilot has shown what facilitators need. See Gate 7.
