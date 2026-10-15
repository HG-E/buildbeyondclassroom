# Paste-in prompt for Claude Code (use Sonnet 5.5)

Read `CLAUDE.md`, `docs/GATE-DECISIONS.md` and `docs/design/bbc-design.html` (the approved visual design, a single-file reference). Do the work below in the order given. Show a short plan first, then do one step at a time. Run `node build.js` after each step and commit with a clear message.

## Owner decisions already made (update CLAUDE.md first)
1. **Self-hosted fonts are allowed.** Atkinson Hyperlegible (body), Bricolage Grotesque (headings), IBM Plex Mono (labels). Download open-licence woff2 files into `static/fonts/`, subset to Latin, `font-display: swap`, system-font fallback stacks. No Google Fonts requests.
2. **One JavaScript exception: the 3D tour on the home page.** Three.js is self-hosted in `static/vendor/` (pinned version, licence file kept). It loads only after the visitor presses "Take the virtual tour". Every page must still be fully readable and usable with JavaScript off.
3. Update the principles in `CLAUDE.md` to say this precisely. Update the Content-Security-Policy in `vercel.json` to `default-src 'self'` with no third-party hosts (fonts and scripts are all local). Keep `indexing: false`.

## Step 1: design system
Port the tokens, type scale, components and light/dark themes from `docs/design/bbc-design.html` into `static/styles.css` and `templates/page.html`. Keep the print stylesheet working. Keep the four-item navigation (Programme, Studio, Partners, Safety and data) plus one action button.

## Step 2: pages
Rebuild the existing Markdown pages with the new components (disclosure sections, partner table, path of stages, role pills). Move the Studio's eight steps out of any script into `content/data/studio.json` (title, what happens, AI role, partner joins, facilitator decision). `build.js` renders the Studio track as plain HTML (a table or list) from that file. JavaScript only enhances it with the tap-a-step panel.

## Step 3: home hero
- Without JavaScript: the headline, the lede, two buttons and the eight-step list.
- With JavaScript: a "Take the virtual tour" button that loads `static/vendor/three.min.js` and `static/tour.js`, ported from the script at the end of the reference file, with the same controls, keyboard support, reduced-motion handling and no-WebGL fallback. Build the tour's stop text from `studio.json`.
- No autoplay audio, no tracking, nothing loaded before the button is pressed.

## Step 4: interactive tools
Port the "five questions for your field" worksheet and the interest-message builder from the reference file. They save and send nothing. Show the BBC role email as selectable text with a copy button, read from `site.json`. If it is still the placeholder, show "to be confirmed" instead.

## Step 5: checks
- WCAG 2.2 AA: contrast in both themes, visible focus, keyboard-only use, text resizes to 200%, 44 px targets.
- Works from 360 px wide and with JavaScript off.
- Home page weight before the tour button is pressed stays small. Report the size.
- Every claim on the site is supported by `docs/GATE-DECISIONS.md` or `docs/gates/`. List anything that is not and remove it.
- Report what you did and anything you could not do.

## Do not
Add accounts, forms that store data, analytics, third-party requests or invented numbers, prices or partner names.
