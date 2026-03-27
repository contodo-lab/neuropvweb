document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Intersection Observer for animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Homepage cards (adds fade-in-up dynamically)
    const animateElements = document.querySelectorAll(
        '.mode-card, .stat-card, .step-card, .quote-card, .section-title, .faq-item'
    );
    animateElements.forEach(el => {
        el.classList.add('fade-in-up');
        observer.observe(el);
    });

    // Function to observe any element that has fade-in-up but isn't visible
    const observeNewAnimations = () => {
        document.querySelectorAll('.fade-in-up:not(.visible)').forEach(el => {
            observer.observe(el);
        });
    };

    // Initial run
    observeNewAnimations();

    // Listen for dynamic content being added via partials
    document.addEventListener('neurosinc:partial-ready', (e) => {
        // console.log(`[script] Partial loaded: ${e.detail.name}, re-observing animations`);
        observeNewAnimations();
    });

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all items
            faqItems.forEach(faq => {
                faq.classList.remove('active');
            });

            // If it wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
});
