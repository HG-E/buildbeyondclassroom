# Hosting and domain: how it is set up

Written 15 October 2026. This records what is connected and what was learned, so the next person does not have to rediscover it. It does not hold any password or token.

## What is connected

| Part | Setting |
|---|---|
| Code and content | GitHub repository `HG-E/buildbeyondclassroom` (public, renamed from `bbc-site` on 15 October 2026), branch `main` |
| Hosting | Vercel project `bbc-site`, Hobby plan, deploys on every push to `main` |
| Build | `node build.js`, output folder `public/` (from `vercel.json`) |
| Free address | `https://bbc-site-ten.vercel.app` |
| Domain | `buildbeyondclassroom.com`, registered with a third-party registrar |
| Nameservers | `ns1.vercel-dns.com` and `ns2.vercel-dns.com`, set at the registrar |
| Main address | `https://www.buildbeyondclassroom.com` (Production) |
| Bare domain | `buildbeyondclassroom.com` redirects (308) to the www address |

The Vercel Hobby plan is for non-commercial use only. Read the hosting rule in `README.md` and Gate 7 before any paid work or paid engagement.

## How the domain was connected

1. In the Vercel project: Settings, Domains, add `buildbeyondclassroom.com`, keep "Redirect apex domains to www" ticked and "Connect to an environment: Production".
2. At the registrar: replace the nameservers with `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. Nothing else is needed at the registrar. (The A and CNAME records Vercel also shows are only for the other method, where the registrar keeps its own nameservers. Do not mix the two methods.)
3. Wait. It took about 45 minutes here.

## What to expect, and what was confusing

- **Vercel showed "Invalid Configuration" for about 45 minutes** even though the registry already pointed to Vercel's nameservers. During that time Vercel's own nameservers answered "REFUSED" for the domain: Vercel had not yet switched on its DNS zone for it. In Vercel's team Domains list the domain showed as "Third Party" until then. It resolved by itself. Pressing Refresh is harmless but not needed.
- **The `www` certificate came first; the bare domain showed "Failed To Generate Cert" for a few minutes** and then fixed itself. If it does not, press Refresh on that row. Removing and re-adding only the bare-domain entry is the next step, and it leaves `www` and the free address untouched.
- **Do not trust `bbc-site.vercel.app`.** That address belongs to someone else's unrelated site. Use `bbc-site-ten.vercel.app`.
- **Vercel Authentication (Deployment Protection)** puts a login in front of deployment-specific addresses such as `bbc-site-xxxx-hg-es-projects.vercel.app`. The production domains above are public.

## How to check it from a terminal (no login needed)

```
nslookup -type=A buildbeyondclassroom.com 8.8.8.8
curl -I https://www.buildbeyondclassroom.com/
curl -I https://buildbeyondclassroom.com/        # expect 308 to the www address
```

The registry's record of the nameservers can be read at `https://rdap.verisign.com/com/v1/domain/buildbeyondclassroom.com`.

## Still open

See `docs/LAUNCH-CHECKLIST.md`: two owners and two-step sign-in on every account, a BBC GitHub account, Vercel's written answer on non-commercial use, and the domain held in the legal entity's name.

## Caching, and a rule to remember

`vercel.json` sets long caching for `/fonts/` and `/vendor/` (one year, immutable) and one day for the poster and favicon. Everything else is revalidated on each visit.

**If you ever replace a font or the Three.js file, give the new file a new name.** A browser that already has the old file will keep using it for up to a year.

The offline copy (the service worker) keeps only the pages and small files listed at build time. It never stores the 3D scene, the poster or the 404 page.

## When the site is launched

Turning on `"indexing": true` in `content/data/site.json` also writes `robots.txt` (allow) and `sitemap.xml`. The build refuses to do this unless `siteUrl` is set and `contactEmail` is a real address. Every page already carries a canonical link and basic social tags using `siteUrl`.

## Automatic checks

`node check.js` builds the site and runs about 390 checks (links, accessibility basics, privacy rules, file sizes, hashes of the vendored files, headers, and wording that was corrected against the gate documents). The same check runs on every push through `.github/workflows/check.yml`.
