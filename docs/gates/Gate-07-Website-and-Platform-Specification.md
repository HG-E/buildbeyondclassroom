# Website and Platform Specification (Gate 7, redo)

Oct 14, 2026 · Ekene

## What this gate decides

Build Beyond Classroom's website is written by hand in HTML, CSS and JavaScript on three free services: GitHub holds the code and content, Vercel hosts it, and Turso holds the data. There is no WordPress and no CMS. The first pilot runs on a static site with no database at all.

- **Replaces:** the first Gate 7, which assumed WordPress plus forms and spreadsheets.
- **Keeps:** the five surfaces, the three data stores, the low-bandwidth layer, WCAG 2.2 AA, the under-18 data rules and the domain checklist from the first Gate 7, now mapped onto this stack.
- **Sign-up cost:** Turso states that no credit card is needed. The GitHub and Vercel pages read for this gate list no payment for a free account; confirm at sign-up.
- **The one rule that can force a change:** Vercel's free Hobby plan is for non-commercial use only. Section 4 sets out when BBC must move and how to do it without rebuilding.

## Principles the build must keep

Eight rules carried over from Gates 1 to 6 decide every technical choice below.

1. **Paper first.** Every facilitator kit and template must work printed. The site distributes them; it does not replace them.
2. **Light by default.** Pages are small, fast and readable on a weak phone connection.
3. **Open content, protected people.** The programme content is public. Anything about a named learner is not.
4. **Learner-owned portfolio.** A learner can export their work in open formats at any time.
5. **No lock-in.** Content lives as plain files in Git, so the host and the database can be swapped.
6. **Translation-ready.** Text is kept apart from page layout from day one.
7. **Accessible.** WCAG 2.2 AA is the target, tested on every release.
8. **Child-data rules.** Minors take part only in facilitator-run sessions, with minimal data, no tracking and no profiling.

## The stack and why

Three free services do the whole job, and each can be replaced without rewriting the site.

| Layer | Choice | Free terms (as checked on 14 Oct 2026) | Why it fits BBC |
| --- | --- | --- | --- |
| Code and content | GitHub, public repository | Free account with email verification; no payment mentioned | Content as plain files is the lock-in insurance |
| Hosting | Vercel Hobby | 100 GB transfer and 1M function calls a month; 200 projects; 100 deployments a day | Simple deploys from GitHub; see section 4 for its commercial-use limit |
| Data (from v1) | Turso (SQLite) | 5 GB, 100 databases, 500M row reads and 10M row writes a month; no card | Does not pause when quiet; standard SQLite exports cleanly |
| Pages | Raw HTML, CSS, JavaScript | Free | No framework or CMS to maintain or upgrade |
| Content | Markdown and JSON files in the repository | Free | Field Cards and translations are files a volunteer can edit |
| Building | VS Code with Claude Code | Uses the existing Claude subscription | Real codebase, reviewable changes |

**How the pages are made.** A short build script reads the Markdown and JSON content and writes plain HTML pages. If the page count passes about 20, a static-site generator can replace the script without touching the content files.

**Deliberately left out.**

- Any CMS, including WordPress.
- Supabase. Its free projects pause after one week of inactivity, which a school break would trigger.
- Third-party logins and trackers. Under the child-data rules, v0 has no analytics at all.

## The Vercel free-tier rule

Vercel's Hobby plan is "restricted to non-commercial personal use only", and BBC must plan for the day it stops qualifying.

[Vercel's fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) define commercial use as any deployment used for the financial gain of **anyone** involved in **any part of the production**, "including a paid employee or consultant writing the code". Donations are explicitly not commercial.

| Situation | Counts as commercial? | Action |
| --- | --- | --- |
| Public programme pages, free to learners, no ads, nobody paid for the site work | Not under Vercel's examples | Stay on Hobby |
| Someone is paid to build, update or host the site, including through a company or grant | Yes, by the wording above | Ask Vercel support in writing before launch; keep the reply |
| Institutions pay BBC for training, licences or hub membership | Likely yes: advertising or selling a service | Move host or upgrade before the first invoice |
| Ads, affiliate links, selling kits through the site | Yes | Move host or upgrade |
| Donations only | No, stated by Vercel | Stay on Hobby |

**Cost of upgrading.** Vercel Pro is $20 per developer seat per month and needs a card, which breaks the zero-payment rule.

**Exit plan.** The site is static files in GitHub, so the host can change in about a day and Turso needs no change. Two ready options, both checked on 14 Oct 2026:

- **Cloudflare Pages:** account needs only an email and password; 500 builds a month, 20,000 files per site, 25 MiB per file.
- **Netlify:** its free-plan announcement says no card is required and commercial projects are allowed; the pricing page now meters a 300-credit monthly allowance, and a site that exceeds it is suspended for the rest of the month.

**Trigger to move:** the first paid engagement, a "commercial" answer from Vercel support, or any hard usage pause on Hobby. Vercel's pause for overuse lasts until 30 days have passed.

## Surfaces and build versions

The site is built in three versions, and each one waits for evidence from the pilot before the next starts.

[Diagram not exported: build versions v0 to v2, 2 gates]

The five surfaces arrive in this order: the public site at v0; core admin, learner space and hub tools at v1; the partner view at v2. Only v0 is needed for the first pilot.

## Data and protection

The pilot site stores no personal data; the database arrives at v1 and holds the minimum needed to run cohorts.

**At v0**, applications arrive by email or on paper at the hub, and records stay in the hub's spreadsheet as Gate 4 planned. The public site has no forms that save data, no accounts and no analytics.

**At v1**, Turso holds four kinds of record:

| Record | What it holds | Who can see it | Rule for under-18s |
| --- | --- | --- | --- |
| Learner | Pseudonymous ID, first name or alias, age band, hub, cohort | The learner, their facilitator, core admin | No date of birth, school or address; under 13 only through a facilitator-led session |
| Portfolio entry | Text and links to studio evidence, step and date | The learner; others only if the learner shares it | Facilitator reviews before anything is made public |
| Consent | What was agreed, by whom, when, and any withdrawal | Core admin and the hub lead | Guardian consent recorded for minors; withdrawal honoured at once |
| Sign-off | Do-No-Harm Check and the three unaided checks, with the facilitator's name | Learner, facilitator, core admin | Same as above |

**Rules that apply to every record**

- Collect only what a step needs. A field with no named use is not added.
- No profiling, no ranking of learners against each other, no sale or sharing of data with advertisers.
- Learners export their full portfolio as Markdown and CSV on request.
- Retention is a proposal to confirm: remove or anonymise a learner's record 12 months after their cohort ends, sooner on request.
- Counsel confirms which Nigerian data protection requirements apply before v1 collects anything about a person.
- Uploaded files are out of scope for v1; portfolios hold text and links. Decide file storage after the pilot shows the real need.

## Low bandwidth, languages and accessibility

A static site is the right base for all three, because pages are plain files that load fast and need no scripts to read.

**Low bandwidth and offline**

- Every page works with JavaScript off; scripts only add convenience.
- Images are compressed and sized for phones; no video autoplay and no web fonts beyond one family.
- A small service worker, written by hand, saves the facilitator kit and Field Cards for offline use at hubs with poor connections.
- Every downloadable kit has a print version, matching the paper-first rule.

**Languages**

- All text sits in content files, not in page templates, so a translation is a copy of the file.
- The pilot ships in English. Adding a language later means adding a folder, not changing code.
- Each language page is marked with its language code so screen readers pronounce it correctly.

**Accessibility (WCAG 2.2 AA)**

- Semantic headings, landmarks and labelled form fields on every page.
- Full keyboard use with a visible focus mark; no content that needs a mouse.
- Text contrast and target sizes meet AA; text can be enlarged to 200% without loss.
- Plain language, short sentences and no content that depends on colour alone.
- Every release is checked with a free automated tester and by hand with a keyboard and a screen reader before it goes live.

## Security basics

Seven habits keep a small team on free tools safe; none of them costs money.

1. **Two-step sign-in** on GitHub, Vercel, Turso and the email account that owns them.
2. **Two owners** on every account, so one lost phone cannot lock BBC out.
3. **Secrets stay out of the code.** Database keys live in the host's settings, never in the repository.
4. **Least access.** Facilitators get access to their own cohort's records only; core admin access is a short, named list.
5. **Review before release.** Every change to the repository is read by a second person, or by Claude Code's review with a human sign-off, before it goes live.
6. **Backups.** The repository is the backup for content; a weekly export of the Turso database is saved to a second place.
7. **A written response plan** for a lost key or a data mistake: who is told, how fast, and who tells affected families.

## Setup and build path

Setup takes four accounts and one repository, and the build then proceeds in short sessions inside VS Code.

**Accounts, in this order**

1. A shared BBC email address that two people can open.
2. GitHub, using that email. Make the repository public.
3. Vercel, signing in with GitHub, then importing the repository.
4. Turso, only when v1 starts.

**Building with Claude Code in VS Code.** The [VS Code extension](https://code.claude.com/docs/en/vs-code) needs VS Code 1.94 or later and a paid Claude subscription (Pro, Max, Team or Enterprise) or a Console account. The existing subscription covers it.

**Repository layout**

```
bbc-site/
  CLAUDE.md          rules for every session: the eight principles
  content/
    en/              pages, Field Cards, kit text as Markdown
    data/            Field Cards and hub list as JSON
  templates/         HTML page shells
  build.js           reads content, writes /public
  public/            the finished static site
  service-worker.js  offline kit and Field Cards
```

**Session discipline to protect usage**

- One session, one small task: a page template, a Field Card, one form.
- Start each session by pointing Claude at `CLAUDE.md` and the Gate 7 section it is working from.
- Ask for a plan before code on anything touching data or consent, then review the plan.
- Use the lighter model for routine edits and a stronger one only for architecture or security review.
- Commit after every working step so any session can be undone.

## Domain and name checklist

The domain is the one cost this stack cannot avoid, roughly $10 to $15 a year (approximate, not sourced). Until it is bought, the site can run on a free address from Vercel.

- [ ] Confirm the programme name "Build Beyond Classroom" is clear of existing marks, both exact and similar, before buying anything.
- [ ] Check that the same name is free on the main domain endings and on the social handles BBC will use.
- [ ] Buy the domain in the name of the legal entity, not a person, once the legal form is decided.
- [ ] Turn on two-step sign-in and auto-renew at the registrar.
- [ ] Record two administrators and a renewal reminder for 60 days before expiry.
- [ ] Point the domain at the host; the free address stays as a fallback.
- [ ] Set up a role email address (for example hello@) that more than one person can read.

## Decisions to confirm and open items

Six decisions need a yes before the build starts, and four older questions are still open.

**Decisions**

- [ ] Stack: GitHub, Vercel Hobby, Turso, with Supabase dropped.
- [ ] Pages written in raw HTML, CSS and JavaScript with a small build script; a static-site generator only if pages pass about 20.
- [ ] Vercel Hobby is used for the pilot only, after Vercel support confirms in writing that the pilot qualifies as non-commercial.
- [ ] Cloudflare Pages or Netlify is the named exit if BBC becomes commercial.
- [ ] No analytics at v0.
- [ ] Records removed or anonymised 12 months after a cohort ends, subject to counsel.

**Still open from earlier gates**

- Legal form of BBC.
- The three pilot contexts and the first pilot site.
- A second delivery lead who can maintain the site.
- Name, trademark and domain checks.

## Sources

Pages opened and read on 14 October 2026.

- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Turso pricing](https://turso.tech/pricing)
- [GitHub: creating an account](https://docs.github.com/en/get-started/start-your-journey/creating-an-account-on-github)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare: creating an account](https://developers.cloudflare.com/fundamentals/account/create-account/)
- [Netlify free plan announcement](https://www.netlify.com/blog/introducing-netlify-free-plan/)
- [Netlify pricing](https://www.netlify.com/pricing/)
- [Supabase pricing](https://supabase.com/pricing)
- [Claude Code in VS Code](https://code.claude.com/docs/en/vs-code)
