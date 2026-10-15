# BBC gate decisions: digest

A compact summary of Gates 1–9, so site work can be checked against the design. It is a digest, not the full documents. If a claim on the site is not supported here (or in the full gate text in `docs/gates/`, if exported), leave it out or write "to be decided".

**Status of decisions:** Gate 7 (hosting and stack) and the "no CMS / no WordPress" rule are confirmed by the owner. Gates 3–6 recommendations (studio, AI rules, curriculum, delivery) were confirmed by the owner on 15 October 2026. The decisions listed in Gates 2, 8 and 9 have **not** been recorded as confirmed; treat them as the working plan, not as final.

**Owner design decisions (15 October 2026), which refine Gate 7's "no web fonts beyond one family" and "scripts only add convenience":** self-hosted fonts are allowed (Atkinson Hyperlegible, Bricolage Grotesque, IBM Plex Mono); one JavaScript exception, the home-page 3D tour, loaded only after the visitor presses its button. Details are in `CLAUDE.md` and `docs/design/CLAUDE-CODE-PROMPT.md`.

## What BBC is
A standalone global programme. Four musts: build with AI; find and validate a real community problem; make the business case in your own field; own the result. It is separate from any other programme.

## Programme (Gates 3–6, unconfirmed)
- **Community Problem Studio:** eight steps. The facilitator decides go, redesign or stop at step 2, and signs off safety at step 6.
- **AI use:** tutor always; co-builder in steps 4–6; author **not** allowed in steps 2, 7 and 8. Three short unaided checks. A Do-No-Harm Check is signed by the facilitator. Stop rules: no AI-only medical, legal or financial advice; no unneeded personal data; no profiling.
- **Journeys:** Explore, Build, Launch. **Levels:** Understand and use; Apply and build; Create and scale (aligned to UNESCO's student AI competency framework and the OECD / European Commission AI literacy framework).
- **Ladder:** seven rungs (chat and research; content and design; no-code and AI app builders; automate and build assistants; code with AI; deploy and publish; operate and measure).
- **Field lens:** five questions (who benefits, who pays, what it costs, what rules apply, who else serves the need).
- **Ages:** under 13 facilitator-led only. First pilot is 18+, an 8-week facilitated Build journey.
- **Delivery:** physical, hybrid, or virtual live-facilitated. No self-paced online core. Hub certification. Facilitator route: participate, co-run, lead and certify.

## Stack and hosting (Gate 7, confirmed)
- GitHub public repo for code and content; Vercel Hobby hosts; Turso (SQLite) only at v1. Hand-written HTML/CSS/JS built by a zero-dependency Node script. No CMS, no framework.
- **v0** static, no database, no accounts, no analytics (first pilot). **v1** Turso records: portfolios, consent, sign-offs, learner export (pilots two and three; built after the first pilot shows needs). **v2** partner view, impact data, roles for many hubs, hosting review.
- **Vercel Hobby is non-commercial only**, including anyone paid for any part of production. Before the first paid engagement or paid site work, move to Cloudflare Pages or Netlify. The domain (roughly $10–15 a year, approximate) is the one unavoidable cost.

## Partners and funding (Gate 8)
- Six partner types: hub host, regional partner, community partner, employer or field mentor, funder, independent evaluator.
- Four-stage path with checks A/B/C; B is the safeguarding gate (certified facilitator, signed data protocol, named data owner).
- Seven agreement clauses: safeguarding; data; open content and brand; learner ownership; AI use; standards and reporting; independence and exit.
- Funding order: grants and in-kind first; licences and certification only after first pilot evidence; challenges later. Sustainability test: BBC can lose any funder, and hubs can run from the open playbook. No prices have been set.

## Impact and ethics (Gate 9)
- Results chain of four links; impact is counted at "community results", where the partner confirms (step 8 and day 90). Eleven indicators across learner, community and programme levels.
- Capture is paper first plus one hub spreadsheet at v0. An independent evaluator agrees the design and thresholds before week 1.
- BBC will not claim outcomes it has not measured.
- Eight ethics rules: separate consent for research; no ranking; small-number rule; pseudonyms; 18+ pilot; no named data to partners or funders; learner-first access; no profiling.

## Open decisions (do not invent answers on the site)
Legal form; the three pilot contexts and first site; a second delivery lead; name, trademark and domain checks; independent evaluator and numeric thresholds; minimum reporting group size; per-funder income cap; pilot budget; counsel's confirmation of data-protection law; whether the BBC contact address in use (buildbeyondclassroom@gmail.com) can be opened by two people, as Gate 7 requires.
