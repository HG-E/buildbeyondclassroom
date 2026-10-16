# Launch checklist

The website launched on 16 October 2026. The items below are what is verified and what is still open. Tick each item when it is done and note the date.

## Already checked in this repository (15 October 2026)

- [x] Every page builds, and all internal links and files resolve.
- [x] No third-party requests, no inline scripts or styles, no analytics. Only this site's own files are loaded.
- [x] Fonts and Three.js are self-hosted, with licences and SHA-256 hashes in `static/fonts/SOURCES.txt` and `static/vendor/SOURCES.txt`.
- [x] Text and interface colours meet WCAG 2.2 AA contrast in both themes.
- [x] No horizontal scrolling from 320 px wide, including with text enlarged to 200%.
- [x] Interactive targets are at least 44 px. Every button and link has an accessible name. One h1, and banner, navigation, main and contentinfo landmarks on every page.
- [x] Pages are readable and usable with JavaScript off. The home-page 3D scene starts by itself only for capable visitors (not with reduced motion, data-saver or 2G/3G), pauses off screen, and is not in the offline copy.
- [x] Site claims were checked against `docs/gates/` and the digest. Unsupported claims were removed or softened.
- [x] `indexing` is `false`, the draft banner is on, and `robots.txt` disallows everything.

## Needs a person (cannot be done from the code)

- [ ] **Screen reader pass.** Use NVDA (Windows) or VoiceOver (Mac or iPhone) on the home page, Studio, Partners, Safety and data, and Get involved. Check that headings, the menu, the Studio table, the disclosures and the two tools read sensibly. Record the result on the accessibility page's "How we check" section only after it is done.
- [ ] **Keyboard pass in a real browser.** Tab through each page. The focus mark must always be visible, and the tour must work by keyboard.
- [ ] **Automated tester.** Run a free tool (for example axe or WAVE) on each page and fix anything it reports.
- [ ] **Mobile device check.** Open the site on a real, low-end phone on a weak connection.

## Accounts and hosting (Gate 7)

Done and verified on 15 October 2026:

- [x] Vercel project `bbc-site` is connected to the GitHub repository and deploys every push to `main` (latest: success).
- [x] The domain `buildbeyondclassroom.com` is connected and shows "Valid Configuration" in Vercel, with Vercel's nameservers set at the registrar (details in `docs/HOSTING.md`).
- [x] `https://www.buildbeyondclassroom.com` serves the site over valid HTTPS. The bare domain redirects (308) to www. `http` redirects to `https`. The free address `bbc-site-ten.vercel.app` also works.
- [x] The live site sends the security headers from `vercel.json` and is still marked `noindex,nofollow`.
- [x] **Owner decision (15 October 2026): BBC stays on the owner's own accounts.** The repository `HG-E/buildbeyondclassroom`, the Vercel project and the domain are held by the owner, who is the product owner. No separate BBC GitHub account or organisation is needed. This replaces the Gate 7 idea of a shared BBC account. See `docs/GATE-DECISIONS.md`.

Still to do:

- [ ] Turn on two-step sign-in for `buildbeyondclassroom@gmail.com`, the contact address in `site.json`, and keep its recovery codes safe. (Gate 7 also suggested an address a second person can open. That is optional now that BBC runs from the owner's accounts.)
- [x] **Registrar (Qservers) two-step sign-in is on.** Confirmed by the owner on 15 October 2026 (not something that can be checked from outside). The public registry also shows the transfer lock is on (`client transfer prohibited`).
- [ ] Registrar: recovery codes saved somewhere safe, not only on the phone that receives the codes.
- [ ] GitHub (`HG-E`): two-step sign-in on, recovery codes saved.
- [ ] Vercel: two-step sign-in on, recovery codes saved.
- [ ] The email address that receives the registrar's messages (and `buildbeyondclassroom@gmail.com`): two-step sign-in on in Google's security settings, because a taken-over email can be used to reset the registrar password.
- [ ] Domain expiry: the domain runs to **15 October 2027**. Set a reminder for mid-August 2027, check auto-renew is on and that the card on the registrar account is valid.
- [ ] Ask Vercel support in writing whether the pilot qualifies as non-commercial on Hobby. Keep the reply.
- [ ] If anyone is paid for site work (including through a grant), or an institution pays BBC, move to Cloudflare Pages or Netlify first.
- [ ] Hold the domain in the name of the legal entity once the legal form is decided, with a renewal reminder 60 days before expiry (Gate 7). Check the registrar's auto-renew setting.
- [ ] Check the live 3D scene and the tour on a real phone and a real computer (only tested on a software renderer so far).

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

## Public repository (15 October 2026)

The repository is public at `https://github.com/HG-E/buildbeyondclassroom`. This publishes everything in it, including `docs/gates/` and `docs/design/`, and the full Git history. Before this was done the history was scanned: no keys, tokens, passwords or personal file paths. Commits show the author name and a GitHub no-reply address.

- [ ] Choose a licence (nothing is set, so by default all rights are reserved). The programme says its content is open: for example MIT for the code and CC BY-SA 4.0 for the content under `content/` and `docs/`. This is the owner's decision.
- [ ] Decide whether `docs/gates/` (the full design documents, some decisions still unconfirmed) should stay in the public repository.

## Audit of 15 October 2026

Fixed in the repository:

- [x] The offline copy stored everything the page asked for, including the 600 KB 3D scene. It now keeps only the listed pages and small files.
- [x] Fonts and Three.js were re-downloaded on every visit (no caching headers). They now cache for a year.
- [x] Wrong addresses showed Vercel's plain "NOT_FOUND" page. They now show a 404 page in the site's own words (never indexed).
- [x] Markdown links were not restricted. The build now stops on anything other than https, mailto, site paths and anchors.
- [x] Added `object-src 'none'`, `X-Frame-Options`, `Cross-Origin-Opener-Policy` and more permission restrictions.
- [x] Canonical links, social tags, `sitemap.xml` and `robots.txt` are ready: launching is one switch, with guards against launching with a placeholder email or no `siteUrl`.
- [x] `check.js` and a GitHub Action run about 390 automatic checks on every push, including a check that the vendored files still match their recorded SHA-256 hashes.
- [x] `SECURITY.md` added; blank public issues switched off in the issue settings file; `docs/design/` marked as a historical reference.

Done on 15 October 2026 with the owner's approval (account settings, verified afterwards):

- [x] **Email spoofing closed.** Two DNS records were added in Vercel DNS: a TXT record `v=spf1 -all` on `buildbeyondclassroom.com` and a TXT record `v=DMARC1; p=reject` on `_dmarc.buildbeyondclassroom.com`. The domain sends no mail, so mail claiming to come from it is now rejected by receivers that check. (If the domain ever sends mail, these two records must be replaced first.)
- [x] **GitHub secret scanning and push protection** are on for the public repository.
- [x] **`main` branch is protected** against force-pushes and deletion. Normal pushes still work. As the repository's admin you can lift this in the branch settings if a history rewrite is ever needed.
- [x] **Issues, Projects and Wiki are switched off**, so strangers cannot post personal information in a public place. Turn Issues back on only when someone can moderate them.

Still open (the owner's decisions):

- [ ] **Licence** (see "Public repository" above).
- [ ] The Vercel project is still named `bbc-site`. Renaming it is optional and cosmetic.

## User-experience audit (16 October 2026)

The site was reviewed page by page, on a laptop and on a phone, in light and dark. Found and fixed:

- [x] On a phone the draft banner and a three-row sticky header took about a quarter of the screen on every page, and the main button was below the first screen. Now: a one-line draft notice, a 57 px header with a menu button, and the main button on the first screen.
- [x] Both small tools (the five-questions worksheet and the message builder) had a stretched button and large gaps. The layout is fixed and the preview stays in view while typing.
- [x] The stage path and several card rows were squeezed or left one card alone on a line. Grids now use set columns.
- [x] The home page was a stack of look-alike boxes. It now has a connected eight-step timeline, icon features, role routes, alternating section bands and a closing call to action. The weak "n/a" statistic and the repeated yellow note were removed.
- [x] Sign-up asked people to copy a message into their own email by hand. The page now leads with the form and offers "Open in my email app" (plus a copy button). Nothing is sent or stored by the website.
- [x] Footer tagline began in lower case, "Contact" appeared twice, the theme button was a vague word, and in-page links hid under the sticky header. All fixed.
- [x] Plain bullet lists on the inner pages are now clear check-lists, and every inner page has a page header band.

Still needs a person (not possible from here): a pass on real phones and a real screen reader, and a look at the 3D scene on a real graphics card.

## Launch (16 October 2026)

The owner approved launch on 16 October 2026. Done and verified:

- [x] The draft notice and every "draft / not launched / details may change" sentence were removed. The check script now fails if that wording returns.
- [x] `"indexing": true`: search engines are allowed, `robots.txt` allows crawling and points to `sitemap.xml` (all pages listed). The 404 page stays out of search.
- [x] Every page has a canonical link, a share image (1200 by 630), a touch icon, theme colours and a clear title and description. The home page carries structured data for search engines.
- [x] A "Where BBC stands today" section on the home page says plainly what is true: the website is live, applications are not open yet, the first pilot has not been announced, and there are no results yet. Nothing was added that the gate documents do not support.
- [x] Every link, button and control was exercised: all internal links resolve, the two outside links return 200, each type of visitor reaches their page in one click, and a keyboard user sees a focus mark on every stop.
- [x] The check script grew to cover well-formed HTML, colour contrast and the launch metadata.

Not done, and not possible from here (so it is not claimed on the site): a pass with a real screen reader on real phones, an outside accessibility tester, and a Vercel written answer that the free plan fits this use. Submitting the site to Google Search Console and Bing Webmaster Tools is the owner's step.
