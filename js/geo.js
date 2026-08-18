/**
 * NeuroSinc — geo + language routing
 *
 * Chile has its own store (neurosinc.cl) with local checkout (MercadoPago / Klap).
 * neurosinc.com cannot take a Chilean order, so every CL visitor who lands here
 * is a lost sale. Google ranks both domains for "neurosinc", so this happens a lot.
 *
 *   Home pages ( / and /es/ )  -> redirect Chilean visitors to neurosinc.cl
 *   Every other page           -> dismissible banner (keeps guide/SEO pages intact)
 *
 * Country comes from Cloudflare's own /cdn-cgi/trace endpoint: same-origin,
 * free, no third-party API, no rate limit. Both domains already sit behind CF.
 *
 * Escape hatches: ?nogeo=1 (permanent opt-out) and the banner's dismiss button.
 *
 * WORKING ON THE SITE FROM CHILE
 *   Opt out:  load any page once with ?nogeo=1 — persists in localStorage.
 *   Undo it:  localStorage.removeItem('ns-geo-optout'); sessionStorage.clear();
 *   (sessionStorage holds the cached country + banner-dismissed flag, so clear
 *    both for a true first-time-visitor test.)
 *   See CHANGELOG.md → "Pinned: working on the site from Chile".
 */
(function () {
    var CL_SITE       = 'https://neurosinc.cl/';
    var OPT_OUT_KEY   = 'ns-geo-optout';      // localStorage — permanent
    var COUNTRY_KEY   = 'ns-geo-country';     // sessionStorage — cache the lookup
    var DISMISS_KEY   = 'ns-geo-dismissed';   // sessionStorage — banner only
    var LANG_KEY      = 'lang-redirected';    // sessionStorage — pre-existing key

    var path = window.location.pathname;
    var isEs = path.indexOf('/es/') === 0;
    var isHome = path === '/' || path === '/index.html' ||
                 path === '/es/' || path === '/es/index.html';

    // Storage can throw in private mode / embedded webviews — never break the page.
    function get(store, key) { try { return window[store].getItem(key); } catch (e) { return null; } }
    function set(store, key, val) { try { window[store].setItem(key, val); } catch (e) {} }

    // Don't route crawlers. Googlebot crawls from US IPs so it would not trigger
    // this anyway, but bots that do run JS should still see the .com version.
    if (/bot|crawl|spider|slurp|bingpreview|headlesschrome/i.test(navigator.userAgent)) return;

    // Permanent opt-out: someone in Chile who genuinely wants the global site.
    if (window.location.search.indexOf('nogeo=1') !== -1) set('localStorage', OPT_OUT_KEY, '1');
    if (get('localStorage', OPT_OUT_KEY) === '1') { languageRouting(null); return; }

    var cached = get('sessionStorage', COUNTRY_KEY);
    if (cached) { route(cached); return; }

    fetch('/cdn-cgi/trace', { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.text() : Promise.reject(res.status); })
        .then(function (text) {
            var match = /(?:^|\n)loc=([A-Z]{2})/.exec(text);
            var country = match ? match[1] : '';
            if (country) set('sessionStorage', COUNTRY_KEY, country);
            route(country);
        })
        .catch(function (e) {
            // Geo unavailable: fall through to the old language-only behaviour.
            console.warn('[geo] country lookup failed', e);
            languageRouting(null);
        });

    function route(country) {
        if (country !== 'CL') { languageRouting(country); return; }

        if (isHome) {
            // from=com lets the .cl side attribute this traffic in analytics.
            // NOT ?ref= — that key is sales-agent attribution on .cl and any
            // value lands in ns_agent_code / the checkout vendor field.
            window.location.replace(CL_SITE + '?from=com');
            return;
        }
        showBanner();
    }

    /**
     * Spanish-speaking browsers outside Chile get the /es/ page.
     * This used to be an inline script in index.html that fired before the geo
     * check, which sent Chilean visitors to /es/ — a page with no CL checkout.
     * It now runs only once the country is known.
     */
    function languageRouting(country) {
        if (country === 'CL') return;
        if (path !== '/' && path !== '/index.html') return;
        if (get('sessionStorage', LANG_KEY)) return;

        var lang = navigator.language || navigator.userLanguage;
        if (lang && lang.toLowerCase().indexOf('es') === 0) {
            set('sessionStorage', LANG_KEY, 'true');
            window.location.replace('/es/');
        }
    }

    function showBanner() {
        if (get('sessionStorage', DISMISS_KEY)) return;

        var copy = isEs ? {
            text: 'Estás en Chile. Compra con envío y pago local en',
            cta: 'Ir a neurosinc.cl',
            close: 'Cerrar'
        } : {
            text: 'You appear to be in Chile. Order with local shipping and payment at',
            cta: 'Go to neurosinc.cl',
            close: 'Dismiss'
        };

        var bar = document.createElement('div');
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', isEs ? 'Sitio de Chile' : 'Chile store');
        bar.style.cssText = [
            'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
            'display:flex', 'align-items:center', 'justify-content:center',
            'gap:0.75rem', 'flex-wrap:wrap',
            'padding:0.75rem 3rem 0.75rem 1rem',
            'background:#00C2B2', 'color:#0B0B0B',
            'font-family:\'Outfit\',-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
            'font-size:0.95rem', 'font-weight:500', 'line-height:1.4',
            'text-align:center', 'box-shadow:0 2px 12px rgba(0,0,0,0.35)'
        ].join(';');

        var label = document.createElement('span');
        label.textContent = '🇨🇱 ' + copy.text;

        var link = document.createElement('a');
        link.href = CL_SITE + '?from=com-banner';   // see note on ?ref= above
        link.textContent = copy.cta;
        link.style.cssText = [
            'display:inline-block', 'padding:0.35rem 0.9rem', 'border-radius:999px',
            'background:#0B0B0B', 'color:#EAEAEA', 'text-decoration:none',
            'font-weight:600', 'white-space:nowrap'
        ].join(';');

        var close = document.createElement('button');
        close.type = 'button';
        close.setAttribute('aria-label', copy.close);
        close.textContent = '✕';
        close.style.cssText = [
            'position:absolute', 'right:0.75rem', 'top:50%', 'transform:translateY(-50%)',
            'background:transparent', 'border:0', 'color:#0B0B0B',
            'font-size:1.1rem', 'line-height:1', 'cursor:pointer', 'padding:0.25rem'
        ].join(';');
        close.addEventListener('click', function () {
            set('sessionStorage', DISMISS_KEY, '1');
            bar.remove();
            document.body.style.paddingTop = '';
        });

        bar.appendChild(label);
        bar.appendChild(link);
        bar.appendChild(close);

        var mount = function () {
            document.body.appendChild(bar);
            // Push the fixed site header down so the banner never covers the nav.
            document.body.style.paddingTop = bar.offsetHeight + 'px';
        };

        if (document.body) mount();
        else document.addEventListener('DOMContentLoaded', mount);
    }
})();
