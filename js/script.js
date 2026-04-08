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

    // Video Modal Logic
    const videoModal = document.getElementById('video-modal');
    const openVideoBtns = document.querySelectorAll('.open-video-modal');
    const closeVideoBtn = document.getElementById('video-modal-close');
    const videoIframe = document.getElementById('video-modal-iframe');
    
    // YOUTUBE VIDEO ID
    // Uses different video IDs based on the page language
    const pageLang = document.documentElement.lang;
    const youtubeVideoId = pageLang === 'es' ? '1exSqWQZlOk' : 'S0ErOhZ0jTw'; 

    if (videoModal && openVideoBtns.length > 0 && closeVideoBtn && videoIframe) {
        openVideoBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                videoModal.style.display = 'flex';
                // Small delay to allow display flex to apply before adding opacity class
                setTimeout(() => videoModal.classList.add('is-active'), 10);
                videoIframe.src = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`;
            });
        });

        const closeVideoModal = () => {
            videoModal.classList.remove('is-active');
            setTimeout(() => {
                videoModal.style.display = 'none';
                videoIframe.src = ''; // Stop video on close
            }, 300);
        };

        closeVideoBtn.addEventListener('click', closeVideoModal);
        
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && videoModal.classList.contains('is-active')) {
                closeVideoModal();
            }
        });
    }
});
