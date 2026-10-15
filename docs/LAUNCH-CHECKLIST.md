# Launch checklist

The site is a draft. Nothing below happens until the owner says so. Tick each item when it is done and note the date.

## Already checked in this repository (15 October 2026)

- [x] Every page builds, and all internal links and files resolve.
- [x] No third-party requests, no inline scripts or styles, no analytics. Only this site's own files are loaded.
- [x] Fonts and Three.js are self-hosted, with licences and SHA-256 hashes in `static/fonts/SOURCES.txt` and `static/vendor/SOURCES.txt`.
- [x] Text and interface colours meet WCAG 2.2 AA contrast in both themes.
- [x] No horizontal scrolling from 320 px wide, including with text enlarged to 200%.
- [x] Interactive targets are at least 44 px. Every button and link has an accessible name. One h1, and banner, navigation, main and contentinfo landmarks on every page.
- [x] Pages are readable and usable with JavaScript off. The tour loads only after its button is pressed, and is not in the offline copy.
- [x] Site claims were checked against `docs/gates/` and the digest. Unsupported claims were removed or softened.
- [x] `indexing` is `false`, the draft banner is on, and `robots.txt` disallows everything.

## Needs a person (cannot be done from the code)

- [ ] **Screen reader pass.** Use NVDA (Windows) or VoiceOver (Mac or iPhone) on the home page, Studio, Partners, Safety and data, and Get involved. Check that headings, the menu, the Studio table, the disclosures and the two tools read sensibly. Record the result on the accessibility page's "How we check" section only after it is done.
- [ ] **Keyboard pass in a real browser.** Tab through each page. The focus mark must always be visible, and the tour must work by keyboard.
- [ ] **Automated tester.** Run a free tool (for example axe or WAVE) on each page and fix anything it reports.
- [ ] **Mobile device check.** Open the site on a real, low-end phone on a weak connection.

## Accounts and hosting (Gate 7)

- [ ] A shared BBC email address that two people can open (`buildbeyondclassroom@gmail.com` is in `site.json`). Turn on two-step sign-in.
- [ ] A BBC GitHub account using that email, with two-step sign-in and a second owner. Transfer the repository to it.
- [ ] Vercel account signed in with GitHub, repository imported. Keep it on the free address.
- [ ] Ask Vercel support in writing whether the pilot qualifies as non-commercial on Hobby. Keep the reply.
- [ ] If anyone is paid for site work (including through a grant), or an institution pays BBC, move to Cloudflare Pages or Netlify first.

## Decisions still open (the site says "to be decided" where relevant)

- [ ] Gates 2, 8 and 9: record the owner's confirmation in `docs/GATE-DECISIONS.md`.
- [ ] Legal form of BBC.
- [ ] The first pilot site and the three pilot contexts.
- [ ] A second delivery lead.
- [ ] Name, trademark and domain checks. Buy the domain only after these.
- [ ] Independent evaluator, numeric thresholds and minimum reporting group size.
- [ ] Local legal advice on data protection, including how email messages to BBC are kept and for how long.
- [ ] Per-funder income cap and the pilot budget.

## Launch (owner's sign-off only)

- [ ] Re-read every page once more against `docs/gates/`.
- [ ] Set `"indexing": true` in `content/data/site.json` and rebuild.
- [ ] Make the repository public (Gate 7: open content). This publishes `docs/gates/` too, so decide whether those files should stay in the public repository.
- [ ] Remove or reword the draft banner in `site.json`.
