/**
 * NeuroSinc — Waitlist Overlay
 * Two-screen flow: (1) Category selection → (2) Name + Email capture
 * Bilingual: auto-detects current page language via <html lang>
 * Posts { name, email, painPoint } to the Cloudflare Worker endpoint
 */
(function () {
    'use strict';

    /* ── Copy ─────────────────────────────────────────────────────────── */
    const COPY = {
        en: {
            step1Title: "What's draining you most?",
            step1Sub:   "We'll personalise your early access experience.",
            cards: [
                { id: 'stress', icon: '🌊', label: 'Stress',    sub: 'Constant tension & anxiety' },
                { id: 'focus',  icon: '🎯', label: 'Focus',     sub: 'Distraction & mental fog'   },
                { id: 'sleep',  icon: '🌙', label: 'Sleep',     sub: 'Restless nights & fatigue'  },
            ],
            step2Title: 'Claim your early access spot.',
            step2Sub:   'Be first to experience NeuroSinc when we launch on Kickstarter.',
            namePlaceholder: 'First name',
            nameError:       'Please enter your first name.',
            placeholder: 'Email address',
            submit:      'Join the Waitlist',
            submitting:  'Saving your spot…',
            successTitle: "You're on the list! 🎉",
            successSub:   "We'll notify you the moment NeuroSinc launches. Keep an eye on your inbox.",
            errorMsg:     'Something went wrong — please try again.',
            close:        'Close',
            back:         '← Back',
            privacy:      'No spam. Unsubscribe anytime.',
        },
        es: {
            step1Title: "¿Qué te drena más?",
            step1Sub:   "Personalizaremos tu experiencia de acceso anticipado.",
            cards: [
                { id: 'stress', icon: '🌊', label: 'Estrés',  sub: 'Tensión y ansiedad constante' },
                { id: 'focus',  icon: '🎯', label: 'Foco',    sub: 'Distracción y mente nublada'  },
                { id: 'sleep',  icon: '🌙', label: 'Sueño',   sub: 'Noches agitadas y fatiga'     },
            ],
            step2Title: 'Reserva tu lugar de acceso anticipado.',
            step2Sub:   'Sé el primero en experimentar NeuroSinc cuando lancemos en Kickstarter.',
            namePlaceholder: 'Nombre',
            nameError:       'Por favor ingresa tu nombre.',
            placeholder: 'Correo electrónico',
            submit:      'Únete a la Lista de Espera',
            submitting:  'Guardando tu lugar…',
            successTitle: '¡Estás en la lista! 🎉',
            successSub:   'Te avisaremos en cuanto NeuroSinc se lance. Revisa tu bandeja de entrada.',
            errorMsg:     'Algo salió mal — por favor intenta de nuevo.',
            close:        'Cerrar',
            back:         '← Volver',
            privacy:      'Sin spam. Cancela cuando quieras.',
        },
    };

    /* ── State ────────────────────────────────────────────────────────── */
    const lang = () => (document.documentElement.lang || 'en').startsWith('es') ? 'es' : 'en';
    let selectedCategory = null;
    let particleAnimId   = null;

    /* ── Helpers ──────────────────────────────────────────────────────── */
    function el(tag, cls, attrs) {
        const node = document.createElement(tag);
        if (cls)   node.className = cls;
        if (attrs) Object.assign(node, attrs);
        return node;
    }

    /* ── Particle Canvas ──────────────────────────────────────────────── */
    function createParticleCanvas(container) {
        const canvas = el('canvas', 'wl-particles');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const particles = [];
        const COUNT = 55;

        function resize() {
            canvas.width  = container.clientWidth;
            canvas.height = container.clientHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < COUNT; i++) {
            particles.push({
                x:     Math.random() * canvas.width,
                y:     Math.random() * canvas.height,
                r:     Math.random() * 1.8 + 0.4,
                dx:    (Math.random() - 0.5) * 0.35,
                dy:    (Math.random() - 0.5) * 0.35,
                alpha: Math.random() * 0.4 + 0.1,
            });
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0,194,178,${p.alpha})`;
                ctx.fill();

                p.x += p.dx;
                p.y += p.dy;

                if (p.x < 0)             p.x = canvas.width;
                if (p.x > canvas.width)  p.x = 0;
                if (p.y < 0)             p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            });
            particleAnimId = requestAnimationFrame(draw);
        }
        draw();

        return () => {
            cancelAnimationFrame(particleAnimId);
            window.removeEventListener('resize', resize);
        };
    }

    /* ── Build Overlay ────────────────────────────────────────────────── */
    function buildOverlay() {
        const c        = COPY[lang()];
        const overlay  = el('div', 'wl-overlay', { id: 'wl-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': c.step1Title });
        const backdrop = el('div', 'wl-backdrop');
        const panel    = el('div', 'wl-panel');
        const cleanupParticles = createParticleCanvas(overlay);

        // Close button
        const closeBtn = el('button', 'wl-close', { type: 'button', 'aria-label': c.close, title: c.close });
        closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

        /* ── Screen 1 ─────────────────────────────────────────────────── */
        const screen1 = el('div', 'wl-screen wl-screen--active', { id: 'wl-screen-1' });
        screen1.innerHTML = `
            <div class="wl-eyebrow">NeuroSinc Early Access</div>
            <h2 class="wl-title">${c.step1Title}</h2>
            <p class="wl-sub">${c.step1Sub}</p>
            <div class="wl-cards" role="group" aria-label="${c.step1Title}">
                ${c.cards.map(card => `
                <button class="wl-card" data-id="${card.id}" type="button" aria-pressed="false">
                    <span class="wl-card__icon">${card.icon}</span>
                    <span class="wl-card__label">${card.label}</span>
                    <span class="wl-card__sub">${card.sub}</span>
                    <span class="wl-card__check" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                </button>`).join('')}
            </div>`;

        /* ── Screen 2 ─────────────────────────────────────────────────── */
        const screen2 = el('div', 'wl-screen', { id: 'wl-screen-2' });
        screen2.innerHTML = `
            <button class="wl-back" type="button">${c.back}</button>
            <div class="wl-selected-badge" id="wl-selected-badge"></div>
            <h2 class="wl-title">${c.step2Title}</h2>
            <p class="wl-sub">${c.step2Sub}</p>
            <form class="wl-form" id="wl-form" novalidate>
                <div class="wl-input-wrap">
                    <input class="wl-input" id="wl-name" type="text" placeholder="${c.namePlaceholder}" autocomplete="given-name" required aria-label="${c.namePlaceholder}">
                </div>
                <div class="wl-input-wrap">
                    <input class="wl-input" id="wl-email" type="email" placeholder="${c.placeholder}" autocomplete="email" required aria-label="${c.placeholder}">
                </div>
                <div id="wl-error" class="wl-error" role="alert" hidden></div>
                <button class="wl-submit" id="wl-submit" type="submit">${c.submit}</button>
                <p class="wl-privacy">${c.privacy}</p>
            </form>`;

        /* ── Screen 3 — Success ───────────────────────────────────────── */
        const screen3 = el('div', 'wl-screen', { id: 'wl-screen-3' });
        screen3.innerHTML = `
            <div class="wl-success-icon">✓</div>
            <h2 class="wl-title">${c.successTitle}</h2>
            <p class="wl-sub">${c.successSub}</p>
            <button class="wl-submit wl-submit--outline" id="wl-done" type="button">${c.close}</button>`;

        panel.append(closeBtn, screen1, screen2, screen3);
        overlay.append(backdrop, panel);
        document.body.appendChild(overlay);

        /* ── Wire up Screen 1 cards ───────────────────────────────────── */
        screen1.querySelectorAll('.wl-card').forEach(card => {
            card.addEventListener('click', () => {
                // Deselect all
                screen1.querySelectorAll('.wl-card').forEach(c => {
                    c.classList.remove('wl-card--selected');
                    c.setAttribute('aria-pressed', 'false');
                });
                card.classList.add('wl-card--selected');
                card.setAttribute('aria-pressed', 'true');
                selectedCategory = card.dataset.id;

                // Update badge on screen 2
                const chosen = c.cards.find(x => x.id === selectedCategory);
                const badge  = screen2.querySelector('#wl-selected-badge');
                if (badge && chosen) {
                    badge.textContent = `${chosen.icon} ${chosen.label}`;
                    badge.hidden = false;
                }

                // Transition after short delay
                setTimeout(() => goTo(2), 280);
            });
        });

        /* ── Wire up Back ─────────────────────────────────────────────── */
        screen2.querySelector('.wl-back').addEventListener('click', () => goTo(1));

        /* ── Wire up Form ─────────────────────────────────────────────── */
        const form      = screen2.querySelector('#wl-form');
        const submitBtn = screen2.querySelector('#wl-submit');
        const errEl     = screen2.querySelector('#wl-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput  = form.querySelector('#wl-name');
            const emailInput = form.querySelector('#wl-email');
            const name       = nameInput.value.trim();
            const email      = emailInput.value.trim();

            // Validate name
            if (!name) {
                errEl.textContent = c.nameError;
                errEl.hidden = false;
                nameInput.focus();
                return;
            }

            // Validate email
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errEl.textContent = c.errorMsg;
                errEl.hidden = false;
                emailInput.focus();
                return;
            }

            errEl.hidden = true;
            submitBtn.disabled    = true;
            submitBtn.textContent = c.submitting;

            try {
                const resp = await fetch('https://divine-sea-84d1.contodoenpv.workers.dev/', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ name, email, painPoint: selectedCategory }),
                });

                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                goTo(3);
            } catch (err) {
                console.error('[Waitlist]', err);
                errEl.textContent = c.errorMsg;
                errEl.hidden      = false;
                submitBtn.disabled    = false;
                submitBtn.textContent = c.submit;
            }
        });

        /* ── Screen navigation ────────────────────────────────────────── */
        function goTo(n) {
            const screens = [screen1, screen2, screen3];
            screens.forEach((s, i) => {
                s.classList.toggle('wl-screen--active', i + 1 === n);
                s.classList.toggle('wl-screen--exit',   i + 1 < n);
            });
        }

        /* ── Close ────────────────────────────────────────────────────── */
        function close() {
            overlay.classList.add('wl-overlay--closing');
            setTimeout(() => {
                cleanupParticles();
                overlay.remove();
                document.body.style.overflow = '';
            }, 350);
        }

        closeBtn.addEventListener('click', close);
        backdrop.addEventListener('click', close);
        document.addEventListener('keydown', function onKey(e) {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
        });

        /* ── Done button ──────────────────────────────────────────────── */
        screen3.querySelector('#wl-done').addEventListener('click', close);

        /* ── Open animation ────────────────────────────────────────────── */
        requestAnimationFrame(() => overlay.classList.add('wl-overlay--visible'));
        document.body.style.overflow = 'hidden';
    }

    /* ── Attach to all waitlist CTA buttons ────────────────────────────── */
    function init() {
        document.querySelectorAll('[data-waitlist]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                buildOverlay();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
