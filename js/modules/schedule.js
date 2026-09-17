/**
 * ============================================================================
 * THE CROWN DANCE STUDIO - SCHEDULE FILTER (HORARIOS 2026)
 * ============================================================================
 */

export function initSchedule() {
    window.filterSchedule = function(category, btnElement) {
        const btns = document.querySelectorAll('.sched-btn');
        btns.forEach(b => b.classList.remove('active'));
        
        if (btnElement) {
            btnElement.classList.add('active');
        } else if (typeof event !== 'undefined' && event && event.target) {
            event.target.classList.add('active');
        }

        const cards = document.querySelectorAll('.sched-card');
        cards.forEach(card => {
            if (category === 'all' || card.getAttribute('data-category') === category) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    };
}
