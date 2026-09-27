/**
 * THE CROWN DANCE STUDIO - GALERÍA INMERSIVA & LUXURY EDITORIAL MASONRY
 * Inspirado en la dirección visual y cinética de Rachel Neville Studios
 */

(function () {
    'use strict';

    let currentItems = [];
    let currentIndex = 0;
    let touchStartX = 0;
    let touchEndX = 0;

    // Elementos DOM
    const filterPills = document.querySelectorAll('.filter-pill');
    const galleryCards = document.querySelectorAll('.gallery-card');
    const lightboxModal = document.getElementById('immersiveLightbox');
    const lightboxContainer = document.getElementById('lightboxMedia');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxDiscipline = document.getElementById('lightboxDiscipline');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    // 1. Inicialización de Items Visibles
    function updateVisibleItems() {
        currentItems = Array.from(galleryCards).filter(card => !card.classList.contains('hidden'));
    }

    // 2. Sistema de Filtrado Fluido (Pills)
    function filterGallery(category, triggerBtn) {
        // Actualizar estado visual de los botones
        filterPills.forEach(pill => pill.classList.remove('active'));
        if (triggerBtn) {
            triggerBtn.classList.add('active');
        } else {
            const activeBtn = Array.from(filterPills).find(p => p.getAttribute('data-filter') === category);
            if (activeBtn) activeBtn.classList.add('active');
        }

        // Animar salida
        galleryCards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            const shouldShow = (category === 'all' || cardCat === category);

            if (!shouldShow) {
                card.classList.add('anim-fade-out');
                setTimeout(() => {
                    card.classList.add('hidden');
                    card.classList.remove('anim-fade-out');
                    updateVisibleItems();
                }, 280);
            } else {
                card.classList.remove('hidden');
                card.classList.remove('anim-fade-out');
                card.classList.add('anim-fade-in');
                setTimeout(() => {
                    card.classList.remove('anim-fade-in');
                    updateVisibleItems();
                }, 500);
            }
        });

        // Actualizar URL hash sin salto de scroll
        if (history.replaceState) {
            history.replaceState(null, null, category === 'all' ? '#' : `#${category}`);
        }
    }

    filterPills.forEach(pill => {
        pill.addEventListener('click', function () {
            const filter = this.getAttribute('data-filter');
            filterGallery(filter, this);
        });
    });

    // 3. Videos: Autoloop on Hover (Desktop) & IntersectionObserver (Mobile)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    galleryCards.forEach(card => {
        const video = card.querySelector('video');
        if (video) {
            if (!isTouchDevice) {
                // Desktop: hover play/pause
                card.addEventListener('mouseenter', () => {
                    video.play().catch(() => {});
                });
                card.addEventListener('mouseleave', () => {
                    video.pause();
                });
            }
        }

        // Click para abrir Lightbox
        card.addEventListener('click', function () {
            const mediaType = this.getAttribute('data-type') || 'image';
            const mediaSrc = this.getAttribute('data-src');
            const discipline = this.getAttribute('data-discipline') || '';
            const title = this.getAttribute('data-title') || '';
            const desc = this.getAttribute('data-desc') || '';

            updateVisibleItems();
            currentIndex = currentItems.indexOf(this);
            if (currentIndex === -1) currentIndex = 0;

            openLightbox(mediaType, mediaSrc, discipline, title, desc);
        });
    });

    // IntersectionObserver para reproducción silenciosa eficiente de videos
    if ('IntersectionObserver' in window) {
        const videoCards = document.querySelectorAll('.gallery-card[data-type="video"] video');
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && isTouchDevice) {
                    entry.target.play().catch(() => {});
                } else if (!entry.isIntersecting) {
                    entry.target.pause();
                }
            });
        }, { threshold: 0.5 });

        videoCards.forEach(v => videoObserver.observe(v));
    }

    // 4. Visor Lightbox Full-Screen
    function openLightbox(type, src, discipline, title, desc) {
        if (!lightboxModal) return;

        // Limpiar contenedor
        lightboxContainer.innerHTML = '';

        if (type === 'video') {
            const videoElem = document.createElement('video');
            videoElem.src = src;
            videoElem.controls = true;
            videoElem.autoplay = true;
            videoElem.playsInline = true;
            videoElem.controlsList = 'nodownload';
            lightboxContainer.appendChild(videoElem);
        } else {
            const imgElem = document.createElement('img');
            imgElem.src = src;
            imgElem.alt = title;
            lightboxContainer.appendChild(imgElem);
        }

        // Textos y Contador
        if (lightboxDiscipline) lightboxDiscipline.textContent = discipline;
        if (lightboxTitle) lightboxTitle.textContent = title;
        if (lightboxDesc) lightboxDesc.textContent = desc;

        updateCounter();

        // Mostrar modal y bloquear scroll de página
        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightboxModal) return;
        lightboxModal.classList.remove('active');
        document.body.style.overflow = '';

        // Pausar cualquier video que estuviera reproduciéndose
        const activeVideo = lightboxContainer.querySelector('video');
        if (activeVideo) activeVideo.pause();
        lightboxContainer.innerHTML = '';
    }

    function updateCounter() {
        if (!lightboxCounter) return;
        const total = currentItems.length;
        const current = currentIndex + 1;
        lightboxCounter.textContent = `${String(current).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    }

    function navigateLightbox(direction) {
        if (currentItems.length === 0) return;

        currentIndex += direction;
        if (currentIndex < 0) {
            currentIndex = currentItems.length - 1;
        } else if (currentIndex >= currentItems.length) {
            currentIndex = 0;
        }

        const targetCard = currentItems[currentIndex];
        if (targetCard) {
            const type = targetCard.getAttribute('data-type') || 'image';
            const src = targetCard.getAttribute('data-src');
            const discipline = targetCard.getAttribute('data-discipline') || '';
            const title = targetCard.getAttribute('data-title') || '';
            const desc = targetCard.getAttribute('data-desc') || '';

            openLightbox(type, src, discipline, title, desc);
        }
    }

    // Controles de Lightbox
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });
    if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

    // Cerrar al hacer clic en el backdrop oscuro
    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    // Navegación con Teclado (Esc, Flechas)
    window.addEventListener('keydown', (e) => {
        if (!lightboxModal || !lightboxModal.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    });

    // Soporte Gestual Táctil (Swipe en Móvil)
    if (lightboxModal) {
        lightboxModal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightboxModal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) > 45) {
            if (deltaX < 0) {
                navigateLightbox(1); // Swipe izquierda -> siguiente
            } else {
                navigateLightbox(-1); // Swipe derecha -> anterior
            }
        }
    }

    // 5. Lectura Inicial del Hash de URL con Soporte de Alias
    window.addEventListener('DOMContentLoaded', () => {
        updateVisibleItems();
        let hash = window.location.hash.replace('#', '').trim().toLowerCase();
        
        // Mapeo de alias para compatibilidad retroactiva
        var aliasMap = {
            'urbano': 'urbano-heels',
            'heels': 'urbano-heels',
            'tecnica': 'ballet-tecnica',
            'ballet': 'ballet-tecnica',
            'kids': 'backstage-emocion',
            'festival': 'backstage-emocion',
            'festival2025': 'crown-company',
            'company': 'crown-company',
            'compania': 'crown-company',
            'crown-company': 'crown-company'
        };

        if (aliasMap[hash]) {
            hash = aliasMap[hash];
        }

        if (hash) {
            const matchingPill = Array.from(filterPills).find(p => p.getAttribute('data-filter') === hash);
            if (matchingPill) {
                filterGallery(hash, matchingPill);
            }
        }
    });

})();
