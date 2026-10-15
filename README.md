# Build Beyond Classroom: website v0

A static website in raw HTML, CSS and JavaScript. No CMS, no framework, no dependencies, no database, no accounts, no analytics. It follows the Gate 7 specification and the rules in `CLAUDE.md`.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or later.

```
node build.js          # writes the site into public/
npx serve public       # optional: view it at http://localhost:3000
```

Use `npx serve public` to view the site. Opening `public/index.html` straight from the folder will not work properly: the pages link to `/styles.css` and other files from the site root, so the stylesheet will not load.

## Edit it

- Pages: `content/en/*.md`. Each file starts with a short block (`title`, `slug`, `order`, `description`).
- Site name, contact email, draft banner and indexing switch: `content/data/site.json`.
- Look and feel: `static/styles.css`. Page shell: `templates/page.html`.
- Words in the page shell (skip link, menu label, footer): `content/<lang>/ui.json`. Each language folder needs its own copy.
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
