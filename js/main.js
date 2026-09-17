/**
 * ============================================================================
 * THE CROWN DANCE STUDIO - MAIN JAVASCRIPT COORDINATOR
 * ============================================================================
 */

import { initCrown3D } from './modules/crown-3d.js';
import { initCardTilt } from './modules/card-tilt.js';
import { initQuiz } from './modules/quiz.js';
import { initSchedule } from './modules/schedule.js';
import { initLightbox } from './modules/lightbox.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Módulos Interactivos
    initCrown3D('crown3dCanvas');
    initCardTilt();
    initQuiz();
    initSchedule();
    initLightbox();

    // 2. Spotlight Cursor Glow
    window.addEventListener('mousemove', (e) => {
        document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    }, { passive: true });

    // 3. Navbar Flotante Inteligente
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (navbar) {
            if (scrollTop > lastScrollTop && scrollTop > 120) {
                navbar.classList.add('nav-hidden');
            } else {
                navbar.classList.remove('nav-hidden');
            }
        }
        lastScrollTop = scrollTop;
    }, { passive: true });

    // 4. Scroll Reveal Animations
    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length > 0) {
        if ('IntersectionObserver' in window) {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });
            reveals.forEach(r => revealObserver.observe(r));
        } else {
            reveals.forEach(r => r.classList.add('active'));
        }

        // Fallback de seguridad: visibilidad garantizada en móviles
        setTimeout(() => {
            reveals.forEach(r => r.classList.add('active'));
        }, 1200);
    }

    // 5. Contadores Numéricos Animados
    const statNumbers = document.querySelectorAll('.stat-number');
    let animatedStats = false;
    const statsSection = document.querySelector('.stats-section');

    if (statsSection && statNumbers.length > 0) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !animatedStats) {
                    animatedStats = true;
                    statNumbers.forEach(stat => {
                        const target = parseInt(stat.getAttribute('data-target') || '0', 10);
                        const isPercentage = stat.innerText.includes('%');
                        const hasPlus = stat.innerText.includes('+');
                        let count = 0;
                        const step = Math.max(1, Math.ceil(target / 40));

                        const updateCount = () => {
                            count += step;
                            if (count < target) {
                                stat.innerText = (hasPlus ? '+' : '') + count + (isPercentage ? '%' : '');
                                setTimeout(updateCount, 30);
                            } else {
                                stat.innerText = (hasPlus ? '+' : '') + target + (isPercentage ? '%' : '');
                            }
                        };
                        updateCount();
                    });
                }
            });
        }, { threshold: 0.25 });
        statsObserver.observe(statsSection);
    }

    // 6. FAB Floating Speed Dial
    const fabContainer = document.getElementById('fabContainer');
    const fabToggle = document.getElementById('fabToggle');

    if (fabToggle && fabContainer) {
        fabToggle.addEventListener('click', () => {
            fabContainer.classList.toggle('active');
            const icon = fabToggle.querySelector('i');
            if (icon) {
                if (fabContainer.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-comment-dots';
                }
            }
        });
    }

    // 7. Menú Hamburguesa en Móviles
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            if (icon) {
                if (navLinks.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });

        const links = navLinks.querySelectorAll('a, button');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // 8. Toggle de Idioma (ES / EN)
    window.toggleLanguage = function() {
        document.body.classList.toggle('lang-en');
    };
});
