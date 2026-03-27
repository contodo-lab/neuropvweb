(async function () {
    const partials = document.querySelectorAll('[data-partial], #site-footer, #site-header');

    // Helper to determine the correct partial path based on language
    const isEn = () => window.location.pathname.startsWith('/en/');

    const getFooterPath = () => isEn() ? '/partials/footer-en.html' : '/partials/footer.html';
    const getHeaderPath = () => isEn() ? '/partials/header-en.html' : '/partials/header.html';

    const loadPartial = async (mount) => {
        let filePath = mount.getAttribute('data-partial');

        // Default logic for footer/header if no data-partial is provided
        if (!filePath) {
            if (mount.id === 'site-footer') filePath = getFooterPath();
            if (mount.id === 'site-header') filePath = getHeaderPath();
        }

        if (!filePath) return;

        // Hide mount point to prevent flicker while fetching
        mount.style.opacity = '0';

        try {
            const res = await fetch(filePath);
            if (!res.ok) throw new Error(`Partial fetch failed: ${res.status}`);
            const html = await res.text();
            mount.innerHTML = html;

            // Update lang-switch to point to the correct alternate page for this URL.
            // Reads from the <link rel="alternate" hreflang="..."> tags already in <head>.
            if (mount.id === 'site-header') {
                const targetLang = isEn() ? 'es' : 'en';
                const altLink = document.querySelector(`link[rel="alternate"][hreflang="${targetLang}"]`);
                if (altLink) {
                    const langSwitch = mount.querySelector('.lang-switch');
                    if (langSwitch) langSwitch.href = new URL(altLink.href).pathname;
                }

                // ── Mobile menu toggle ──────────────────────────────────────
                const btn  = mount.querySelector('#hamburger-btn');
                const menu = mount.querySelector('#mobile-menu');

                if (btn && menu) {
                    const open  = () => {
                        btn.classList.add('is-open');
                        menu.classList.add('is-open');
                        btn.setAttribute('aria-expanded', 'true');
                        menu.setAttribute('aria-hidden', 'false');
                        document.body.style.overflow = 'hidden';
                    };
                    const close = () => {
                        btn.classList.remove('is-open');
                        menu.classList.remove('is-open');
                        btn.setAttribute('aria-expanded', 'false');
                        menu.setAttribute('aria-hidden', 'true');
                        document.body.style.overflow = '';
                    };
                    const toggle = () => btn.classList.contains('is-open') ? close() : open();

                    btn.addEventListener('click', toggle);

                    // Close when any mobile nav link is tapped
                    menu.querySelectorAll('.mobile-nav-link').forEach(link => {
                        link.addEventListener('click', close);
                    });

                    // Close on Escape key
                    document.addEventListener('keydown', e => {
                        if (e.key === 'Escape' && btn.classList.contains('is-open')) close();
                    });

                    // Close if user resizes to desktop width
                    window.addEventListener('resize', () => {
                        if (window.innerWidth >= 768) close();
                    });
                }
                // ────────────────────────────────────────────────────────────
            }

            // Fade in smoothly once content is ready
            mount.style.transition = 'opacity 0.05s ease';
            requestAnimationFrame(() => { mount.style.opacity = '1'; });

            // Dispatch event for specialized scripts (like animation observer)
            const partialName = filePath.split('/').pop().replace('.html', '');
            document.dispatchEvent(new CustomEvent('neurosinc:partial-ready', {
                detail: { name: partialName, mount: mount }
            }));
        } catch (e) {
            console.warn(`[layout] partial failed: ${filePath}`, e);
            mount.style.opacity = '1'; // always show on error so page isn't broken
        }
    };

    // Load all found partials
    await Promise.all(Array.from(partials).map(loadPartial));
})();