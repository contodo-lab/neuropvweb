(async function () {
    const partials = document.querySelectorAll('[data-partial], #site-footer, #site-header');
    
    // Helper to determine the correct partial path for the footer
    const getFooterPath = () => {
        const isEn = window.location.pathname.includes('/en/') || window.location.pathname.includes('/guides/');
        return isEn ? '/partials/footer-en.html' : '/partials/footer.html';
    };

    const loadPartial = async (mount) => {
        let filePath = mount.getAttribute('data-partial');
        
        // Default logic for footer/header if no data-partial is provided
        if (!filePath) {
            if (mount.id === 'site-footer') filePath = getFooterPath();
            // Future: if (mount.id === 'site-header') filePath = getHeaderPath();
        }

        if (!filePath) return;

        try {
            const res = await fetch(filePath);
            if (!res.ok) throw new Error(`Partial fetch failed: ${res.status}`);
            const html = await res.text();
            mount.innerHTML = html;
            
            // Dispatch event for specialized scripts (like animation observer)
            const partialName = filePath.split('/').pop().replace('.html', '');
            document.dispatchEvent(new CustomEvent('neurosinc:partial-ready', { 
                detail: { name: partialName, mount: mount } 
            }));
        } catch (e) {
            console.warn(`[layout] partial failed: ${filePath}`, e);
        }
    };

    // Load all found partials
    await Promise.all(Array.from(partials).map(loadPartial));
})();