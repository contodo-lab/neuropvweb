# NeuroSinc site — change log

A running record of what changed on **neurosinc.com**, why, and what it affects.
Newest entries at the top. Add an entry whenever we change behaviour, routing,
SEO tags, or anything a future person would be confused by.

Template for a new entry:

```
## YYYY-MM-DD — Short title
**Commit:** `abc1234`

**Problem** — what was actually broken, in business terms.
**Change** — what we did.
**Files** — what to look at.
**Verified** — how we know it works.
**Open** — anything still outstanding.
```

---

## Pinned: working on the site from Chile

The site redirects Chilean visitors to neurosinc.cl (see the 2026-08-17 entry). That
includes **you**, so while working on .com you need to opt out.

**Turn the geo routing off** — visit any page once with `?nogeo=1`:

```
https://neurosinc.com/?nogeo=1
```

That writes `ns-geo-optout` to `localStorage`, so it sticks. You can then browse every
section, close the tab, come back tomorrow, and still see the .com version. It's
per-browser and per-profile though — a different browser, a different device, an
incognito window, or clearing site data all mean doing it again.

**Turn it back on** to test what a real Chilean visitor sees — paste in the DevTools
console on neurosinc.com:

```js
localStorage.removeItem('ns-geo-optout'); sessionStorage.clear(); location.reload();
```

`sessionStorage.clear()` matters: that's where the cached country and the
"banner dismissed" flag live. Clearing both gives a true first-time-visitor test.

**Caveat:** `?nogeo=1` only disables the *Chile* routing. If your browser language is
Spanish, the homepage will still send you to `/es/` — that's the separate language
redirect. It fires once per tab session, so if you land on `/es/` and want the English
page, just navigate to `/` again in the same tab.

---

## 2026-08-18 — Geo handoff tag changed from `?ref=` to `?from=`
**Commit:** _(pending)_

**Problem** — the geo redirect handed traffic to `neurosinc.cl/?ref=com`, but `?ref=`
is already **sales-agent attribution** on the .cl side: its `layout.js` reads `ref`,
uppercases it, and stores it as `ns_agent_code`, which then pre-fills the vendor field
at checkout and rides onto the order. So every Chilean visitor redirected from .com was
being credited to a non-existent sales agent called `COM` — and the non-home banner link
(`?ref=com-banner`) was doing the same thing under a second fake code. Agent
attribution data on .cl has been quietly polluted since the redirect went live.

**Change** — switched both handoff links to the `?from=` key, which .cl does not read
for attribution. The com / com-banner distinction is preserved for analytics.

**Files** — `js/geo.js:71` (homepage redirect), `js/geo.js:126` (banner CTA link).

**Verified** — `grep` confirms no `?ref=` remains anywhere in the repo; these two lines
were the only places it was emitted. `node --check js/geo.js` passes.

**Open** — two follow-ups on the **.cl** side (separate repo, being handled there):
1. A guard so a stray `ref=com` / `ref=com-banner` is ignored rather than stored as an
   agent code. Still needed after this change, because bookmarks, cached pages and
   already-indexed links will keep arriving with the old `?ref=` for a while.
2. An arrival toast keyed on `?from=com` — "te llevamos a nuestra tienda en Chile,
   ¿buscabas el sitio global?" — with a link back to `neurosinc.com/?nogeo=1`. This
   replaces the idea of a blocking "estás siendo redirigido" interstitial on .com,
   which would have added friction to the highest-intent traffic and risked Google's
   intrusive-interstitial penalty. The way back matters because the redirect uses
   `location.replace()`, so the back button will not return them to .com.
3. Any existing `ns_agent_code` values of `COM` / `COM-BANNER` already in customers'
   localStorage — and any orders already tagged with them — may need cleaning up.

---

## 2026-08-17 — Chilean visitors on .com now reach the .cl store
**Commit:** `9748922` "changes to geolocal"

**Problem**
Google shows both neurosinc.cl and neurosinc.com for searches on "neurosinc" from
Chile. People clicked through to **.com**, which is the Kickstarter/waitlist site and
has no Chilean checkout — so those visits could never turn into orders. Lost sales.

There was no geo-detection on the site at all. The only redirect was an inline script
in `index.html` that read the **browser language** (not the country) and sent any
Spanish-language browser to `/es/` — still on .com. That made it worse: Chilean
visitors were pushed deeper into the site that can't sell to them.

The `<link rel="alternate" hreflang="es-CL" href="https://neurosinc.cl/">` tag is only a
hint to Google's indexer. It never redirects a real visitor. Easy to assume it does.

**Change**
New `js/geo.js`, loaded in `<head>` on all 38 pages. Country comes from Cloudflare's
own `/cdn-cgi/trace` endpoint — same-origin, free, no third-party API, no rate limit
(both domains already sit behind Cloudflare).

| Where | Chilean visitor gets |
|---|---|
| `/` and `/es/` | redirect to `https://neurosinc.cl/?ref=com` |
| every other page | dismissible teal banner linking to `?ref=com-banner`, in EN or ES to match the page |

Content pages get a banner rather than a redirect on purpose: the guides are what rank
organically for informational searches, and hard-redirecting them would dump someone
mid-article onto a product homepage.

Also included:
- `?nogeo=1` — permanent opt-out for anyone in Chile who genuinely wants the global site
- bot check, so crawlers always see the .com version
- country cached in `sessionStorage` so the lookup runs once per visit
- all storage access wrapped in try/catch — private mode can't break the page
- the old inline language redirect was **removed** from `index.html` and folded into
  `geo.js`, where it now only fires once the country is known and is not Chile

The `ref=com` / `ref=com-banner` params exist so the .cl side can attribute this traffic.

**Files**
- `js/geo.js` — new, all the logic, commented
- `index.html` — inline language-redirect script removed, replaced with the `geo.js` tag
- 37 other `.html` pages — one `<script src="/js/geo.js">` line added before `</head>`

**Verified**
Served the site locally with a faked `loc=CL` trace response: homepage redirected to the
real neurosinc.cl (Mercado Pago / Webpay checkout visible), both banner languages
rendered correctly. Re-ran with `loc=US`: English homepage loaded untouched, no banner,
no console errors.

**Open**
1. **hreflang is not bidirectional — likely the bigger cause of the ranking problem.**
   neurosinc.cl does not link back to neurosinc.com; it only declares
   `hreflang="es-CL"` and `x-default`, both pointing at itself. Google requires the
   return link, so it ignores the annotation entirely and treats the two domains as
   unrelated sites competing for the same brand term. Both domains also claim
   `x-default`, which is contradictory. **Fix lives on the .cl site, not this repo.**
2. **Optional edge-level version.** A Cloudflare Redirect Rule
   (`ip.src.country eq "CL"` → 302 to neurosinc.cl) would fire before any JS loads, so
   no flash of the .com page. Needs dashboard access, and needs a cookie condition so
   the `?nogeo=1` opt-out still works. The JS version works today with no config.
