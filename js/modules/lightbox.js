/**
 * ============================================================================
 * THE CROWN DANCE STUDIO - CINEMATIC LIGHTBOX MODAL
 * ============================================================================
 */

export function initLightbox() {
    const modal = document.getElementById('lightboxModal');
    const mediaContainer = document.getElementById('lightboxMedia');
    const titleEl = document.getElementById('lightboxTitle');
    const descEl = document.getElementById('lightboxDesc');

    if (!modal) return;

    window.openLightbox = function(type, src, title, desc) {
        if (!mediaContainer) return;
        mediaContainer.innerHTML = '';

        if (type === 'video') {
            mediaContainer.innerHTML = `<video controls autoplay playsinline><source src="${src}" type="video/mp4"></video>`;
        } else {
            mediaContainer.innerHTML = `<img src="${src}" alt="${title}">`;
        }

        if (titleEl) titleEl.innerText = title;
        if (descEl) descEl.innerText = desc;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function() {
        modal.classList.remove('active');
        if (mediaContainer) mediaContainer.innerHTML = '';
        document.body.style.overflow = '';
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            window.closeLightbox();
        }
    });

    // Cerrar con tecla Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            window.closeLightbox();
        }
    });
}
