# Persona and device checks

What was tested on the built site, and what was not. Run from a scripted Chrome (DevTools Protocol), so it covers layout, behaviour and speed. It does not replace real phones or a real screen reader.

## Device widths

All eight pages plus the 404 page at 280, 320, 360, 390, 430, 600 and 768 px (63 combinations): no sideways scroll, no clipped content, no link or button smaller than 24 px.

## Modes

All eight pages with JavaScript off (heading and full content present; the Studio steps appear as a table), with forced colours and reduced motion on, and at 320 px wide (the width a 400% zoom gives on a laptop): no sideways scroll and no missing content.

## Phone fixes made after this review

- Tables stack into labelled rows on phones, so the "What they get" column is no longer hidden off-screen.
- The eight-step Studio track is wider on phones and keeps words whole ("Research feasibility" no longer breaks mid-word). The step detail below it is the main reading path.
- Small label text raised to 12 px or more.
- `touch-action: manipulation` on links and buttons removes the tap delay.
- The automatic 3D scene is skipped on devices reporting 2 GB or less memory, 2 or fewer cores, slow networks, data-saver or reduced motion.

## Journeys

| Persona | What they need | Checked |
| --- | --- | --- |
| Cheap Android on a slow network | A fast, readable first screen | No 3D on slow links; text and poster first |
| Facilitator on a tablet, offline | Pages still open | Service worker serves listed pages |
| Hub host | Find hub requirements in one tap | Menu and home routes |
| Funder | Evidence and honest status | "Where BBC stands today" on home |
| Worried parent | Safeguarding and data, plain words | Direct menu link |
| Keyboard only | Visible focus, skip link, menu | Focus mark on every stop |
| Reduced motion | No animation | Motion off, 3D off |
| Wrong address | A helpful page | Own 404 page |

## Not tested here

Real phones, real screen readers (VoiceOver, TalkBack, NVDA), outside accessibility testers, and people from each persona group. Do these before making any claim beyond what is listed.

## Data use (measured on the live site, cold cache, 17 October 2026)

| Visit | Before | After |
| --- | --- | --- |
| Home page on a phone | 312 KB (the 3D scene downloaded by itself) | 152 KB (still picture; the scene loads only if the visitor taps the tour button) |
| Any other page | about 127 KB, plus about 60 KB the offline copy downloaded in the background | about 127 KB; other pages are saved for offline only when opened |

- The 3D scene starts by itself only on screens at least 1000 px wide, with a mouse, on a 4G or better connection, and never with data saver or reduced motion on.
- The offline copy is skipped when data saver is on.
- Fonts and the 3D library are cached for a year, so a returning visitor downloads almost nothing.
- Not measured: real mobile networks and real phones. Speed in the emulated 4G test varied between runs on this computer, so treat the load times as rough.

## Lighthouse (mobile, slow 4G, 4x slower CPU), live site, 17 October 2026

| Page | Performance | Accessibility | Best practices | SEO | Notes |
| --- | --- | --- | --- | --- | --- |
| Home | 94 | 100 | 100 | 100 | first paint 1.6 s, 138 KB, layout shift 0.005 |
| Programme | 81 | 100 | 100 | 100 | 113 KB; remaining cost is browser style and layout work |
| Get involved | not measured | | | | Lighthouse stopped with a trace-recording error (NO_NAVSTART) on two runs; the page loads normally in other browser tests |

- The test computer was slower than Lighthouse expects, so absolute times are pessimistic, and identical runs varied by several points.
- Run Google's own check on the live pages for an independent reading: https://pagespeed.web.dev
- Changes made from these results: hero picture and heading font are preloaded; the page height is no longer read at start-up (it forced a layout); the picture is cached for a week.
