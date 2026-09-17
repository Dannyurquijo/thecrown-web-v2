/**
 * ============================================================================
 * THE CROWN DANCE STUDIO - 3D CARD TILT INTERACTION
 * Easing perspective tilt on hoverable glass cards
 * ============================================================================
 */

export function initCardTilt(selector = '.card, .stat-card, .sched-card, .mv-container') {
    // Solo activar en dispositivos con puntero fino (escritorio/laptop)
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -7; // Límite suave de 7 grados
            const rotateY = ((x - centerX) / centerX) * 7;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        });
    });
}
