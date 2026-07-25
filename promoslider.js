(() => {
    'use strict';

    class PromoEventSlider {
        constructor(root) {
            this.root = root;
            this.slides = Array.from(root.querySelectorAll('.pes-slide'));
            this.dots = Array.from(root.querySelectorAll('.pes-slider__dot'));
            this.prevButton = root.querySelector('.pes-slider__arrow--prev');
            this.nextButton = root.querySelector('.pes-slider__arrow--next');
            this.closeButton = root.querySelector('.pes-slider__close');
            this.index = Math.max(0, this.slides.findIndex((slide) => slide.classList.contains('is-active')));
            this.autoplayMs = Math.max(2500, Number(root.dataset.autoplay || 5200));
            this.dismissHours = Math.max(0, Number(root.dataset.dismissHours || 24));
            this.dismissKey = `pes-slider-dismissed:${root.dataset.dismissKey || root.id || 'default'}`;
            this.timer = null;
            this.pointerStartX = null;

            if (this.isDismissed()) {
                this.root.hidden = true;
                return;
            }

            this.bindClose();

            if (this.slides.length < 2) return;

            this.bindSlider();
            this.start();
        }

        bindClose() {
            this.closeButton?.addEventListener('click', () => this.close());
        }

        bindSlider() {
            this.prevButton?.addEventListener('click', () => this.go(this.index - 1, true));
            this.nextButton?.addEventListener('click', () => this.go(this.index + 1, true));

            this.dots.forEach((dot, index) => {
                dot.addEventListener('click', () => this.go(index, true));
            });

            this.root.addEventListener('mouseenter', () => this.stop());
            this.root.addEventListener('mouseleave', () => this.start());
            this.root.addEventListener('focusin', () => this.stop());
            this.root.addEventListener('focusout', () => this.start());

            this.root.addEventListener('pointerdown', (event) => {
                if (event.target.closest('a, button')) return;
                this.pointerStartX = event.clientX;
            }, { passive: true });

            this.root.addEventListener('pointerup', (event) => {
                if (this.pointerStartX === null) return;
                const distance = event.clientX - this.pointerStartX;
                this.pointerStartX = null;

                if (Math.abs(distance) > 42) {
                    this.go(this.index + (distance < 0 ? 1 : -1), true);
                }
            }, { passive: true });

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.stop();
                else this.start();
            });
        }

        isDismissed() {
            if (!this.closeButton || this.dismissHours <= 0) return false;

            try {
                const saved = window.localStorage.getItem(this.dismissKey);
                if (!saved) return false;

                const data = JSON.parse(saved);
                const expiresAt = Number(data.expiresAt || 0);

                if (expiresAt > Date.now()) return true;

                window.localStorage.removeItem(this.dismissKey);
            } catch (error) {
                // Slider tetap berfungsi ketika localStorage diblokir browser.
            }

            return false;
        }

        close() {
            this.stop();

            if (this.dismissHours > 0) {
                try {
                    window.localStorage.setItem(this.dismissKey, JSON.stringify({
                        expiresAt: Date.now() + (this.dismissHours * 60 * 60 * 1000),
                    }));
                } catch (error) {
                    // Abaikan jika penyimpanan browser tidak tersedia.
                }
            }

            this.root.classList.add('is-closing');
            this.root.setAttribute('aria-hidden', 'true');

            const finish = () => {
                this.root.hidden = true;
                this.root.classList.remove('is-closing');
                this.root.dispatchEvent(new CustomEvent('promoSliderClosed', {
                    bubbles: true,
                    detail: { dismissHours: this.dismissHours },
                }));
            };

            window.setTimeout(finish, 260);
        }

        go(nextIndex, restart = false) {
            const total = this.slides.length;
            this.index = (nextIndex + total) % total;

            this.slides.forEach((slide, index) => {
                const active = index === this.index;
                slide.classList.toggle('is-active', active);
                slide.setAttribute('aria-hidden', active ? 'false' : 'true');
            });

            this.dots.forEach((dot, index) => {
                const active = index === this.index;
                dot.classList.toggle('is-active', active);
                dot.setAttribute('aria-selected', active ? 'true' : 'false');
            });

            if (restart) {
                this.stop();
                this.start();
            }
        }

        start() {
            if (this.timer || document.hidden || this.slides.length < 2 || this.root.hidden) return;
            this.timer = window.setInterval(() => this.go(this.index + 1), this.autoplayMs);
        }

        stop() {
            if (!this.timer) return;
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }

    const init = () => {
        document.querySelectorAll('.pes-slider').forEach((root) => {
            if (root.dataset.initialized === '1') return;
            root.dataset.initialized = '1';
            new PromoEventSlider(root);
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
