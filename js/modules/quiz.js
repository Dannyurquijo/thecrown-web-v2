/**
 * ============================================================================
 * THE CROWN DANCE STUDIO - INTERACTIVE CLASS MATCHER (QUIZ)
 * ============================================================================
 */

export function initQuiz() {
    let quizAnswers = {};

    window.selectQuiz = function(step, value) {
        if (step === 1) {
            quizAnswers.target = value;
            const step1 = document.getElementById('quizStep1');
            const step2 = document.getElementById('quizStep2');
            if (step1) step1.classList.remove('active');
            if (step2) step2.classList.add('active');
        } else if (step === 2) {
            quizAnswers.style = value;
            const step2 = document.getElementById('quizStep2');
            if (step2) step2.classList.remove('active');
            showQuizResult();
        }
    };

    window.resetQuiz = function() {
        quizAnswers = {};
        const resStep = document.getElementById('quizResultStep');
        const step2 = document.getElementById('quizStep2');
        const step1 = document.getElementById('quizStep1');
        if (resStep) resStep.classList.remove('active');
        if (step2) step2.classList.remove('active');
        if (step1) step1.classList.add('active');
    };

    function showQuizResult() {
        const resultStep = document.getElementById('quizResultStep');
        const resultTitle = document.getElementById('quizResultTitle');
        const resultDesc = document.getElementById('quizResultDesc');
        const resultBtn = document.getElementById('quizResultBtn');

        if (!resultStep || !resultTitle || !resultDesc || !resultBtn) return;

        resultStep.classList.add('active');

        let disciplinaQuery = 'hip_hop_multinivel';

        if (quizAnswers.target === 'kids') {
            if (quizAnswers.style === 'urbano') {
                resultTitle.innerText = "¡Hip Hop Kids!";
                resultDesc.innerText = "La combinación perfecta de ritmo, coordinación y diversión para los más jóvenes.";
                disciplinaQuery = 'hip_hop_kids';
            } else if (quizAnswers.style === 'tecnica') {
                resultTitle.innerText = "¡Baby Ballet / Jazz Kids!";
                resultDesc.innerText = "Desarrolla la postura, gracia y fundamentos técnicos desde una edad temprana.";
                disciplinaQuery = 'baby_ballet';
            } else {
                resultTitle.innerText = "¡Circo & Danza Aérea Kids!";
                resultDesc.innerText = "Para pequeños aventureros que quieren volar y desarrollar flexibilidad en telas.";
                disciplinaQuery = 'danza_aerea_kids';
            }
        } else {
            if (quizAnswers.style === 'urbano') {
                resultTitle.innerText = "¡Hip Hop & Heels Choreography!";
                resultDesc.innerText = "Potencia tu presencia escénica, fuerza y seguridad en cada movimiento.";
                disciplinaQuery = 'heels';
            } else if (quizAnswers.style === 'tecnica') {
                resultTitle.innerText = "¡Ballet Técnico o Contemporáneo!";
                resultDesc.innerText = "Base sólida, expresión corporal y técnica de alto nivel para tu crecimiento.";
                disciplinaQuery = 'ballet_1';
            } else {
                resultTitle.innerText = "¡Danza Aérea en Telas & Acrobacia!";
                resultDesc.innerText = "Desafía tus límites en las alturas trabajando fuerza muscular y arte corporal.";
                disciplinaQuery = 'danza_aerea_multinivel';
            }
        }

        resultBtn.href = `agenda.html?disciplina=${disciplinaQuery}`;
    }
}
