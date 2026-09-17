/**
 * ============================================================================
 * THE CROWN DANCE STUDIO - CROWN 3D PARTICLE CONSTELLATION
 * Hardware-accelerated 3D particle ring simulation in Canvas/WebGL
 * ============================================================================
 */

export function initCrown3D(canvasId = 'crown3dCanvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Detección móvil para ajustar partículas (60 FPS garantizados)
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 320 : 750;

    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let rotationAngle = 0;
    let isVisible = true;
    let animId = null;

    // Paleta de colores para las partículas
    const colors = [
        'rgba(255, 102, 196, 0.85)', // Rosa Neón
        'rgba(193, 154, 81, 0.85)',  // Dorado
        'rgba(255, 255, 255, 0.75)', // Diamante Blanco
        'rgba(255, 51, 153, 0.65)'   // Fucsia
    ];

    class Particle3D {
        constructor() {
            this.reset();
        }

        reset() {
            // Distribución en cilindro/corona toroidal en 3D
            const theta = Math.random() * Math.PI * 2;
            const radius = 180 + Math.random() * 140;
            const crownHeight = (Math.random() - 0.5) * 160;

            this.x = Math.cos(theta) * radius;
            this.z = Math.sin(theta) * radius;
            this.y = crownHeight + Math.sin(theta * 5) * 40; // Ondulación forma corona

            this.size = Math.random() * 2.2 + 0.8;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.pulseSpeed = 0.02 + Math.random() * 0.03;
            this.pulse = Math.random() * Math.PI;
        }

        update(cosRot, sinRot, tiltX, tiltY) {
            // Rotación sobre eje Y
            let rx = this.x * cosRot - this.z * sinRot;
            let rz = this.x * sinRot + this.z * cosRot;
            let ry = this.y;

            // Inclinación 3D por movimiento del ratón/giroscopio
            let ry2 = ry * Math.cos(tiltX) - rz * Math.sin(tiltX);
            let rz2 = ry * Math.sin(tiltX) + rz * Math.cos(tiltX);
            let rx2 = rx * Math.cos(tiltY) + rz2 * Math.sin(tiltY);
            let rz3 = -rx * Math.sin(tiltY) + rz2 * Math.cos(tiltY);

            // Proyección de perspectiva 3D
            const fov = 450;
            const distance = 500;
            const scale = fov / (distance + rz3);

            this.projX = width / 2 + rx2 * scale;
            this.projY = height / 2 + ry2 * scale - 20;
            this.projScale = scale;
            this.alpha = Math.min(1, Math.max(0.1, (scale - 0.3) * 1.5));
            this.pulse += this.pulseSpeed;
        }

        draw() {
            if (this.projScale <= 0) return;
            const currentSize = this.size * this.projScale * (1 + Math.sin(this.pulse) * 0.25);

            ctx.beginPath();
            ctx.arc(this.projX, this.projY, Math.max(0.5, currentSize), 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.alpha;
            ctx.fill();
        }
    }

    // Inicializar partículas
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle3D());
    }

    // Eventos de movimiento del ratón con amortiguamiento suave
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / width - 0.5) * 2;
        mouseY = (e.clientY / height - 0.5) * 2;
        targetTiltX = mouseY * 0.35;
        targetTiltY = mouseX * 0.35;
    }, { passive: true });

    // Soporte táctil / giroscópico en móviles
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouseX = (e.touches[0].clientX / width - 0.5) * 2;
            mouseY = (e.touches[0].clientY / height - 0.5) * 2;
            targetTiltX = mouseY * 0.25;
            targetTiltY = mouseX * 0.25;
        }
    }, { passive: true });

    // Redimensionamiento de ventana
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // Pausar animación con IntersectionObserver cuando el Hero no es visible
    const headerEl = document.querySelector('header#inicio');
    if (headerEl) {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
                if (isVisible && !animId) {
                    loop();
                }
            });
        }, { threshold: 0.1 });
        obs.observe(headerEl);
    }

    // Bucle de renderizado
    function loop() {
        if (!isVisible) {
            animId = null;
            return;
        }

        ctx.clearRect(0, 0, width, height);

        // Interpolación suave del tilt (Lerp)
        currentTiltX += (targetTiltX - currentTiltX) * 0.06;
        currentTiltY += (targetTiltY - currentTiltY) * 0.06;
        rotationAngle += 0.007;

        const cosRot = Math.cos(rotationAngle);
        const sinRot = Math.sin(rotationAngle);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update(cosRot, sinRot, currentTiltX, currentTiltY);
            particles[i].draw();
        }

        ctx.globalAlpha = 1;
        animId = requestAnimationFrame(loop);
    }

    loop();
}
