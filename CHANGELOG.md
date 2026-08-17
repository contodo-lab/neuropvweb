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
