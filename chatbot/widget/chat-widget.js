/**
 * ==========================================================================
 * THE CROWN DANCE STUDIO - CROWN ASSISTANT CHATBOT CLIENT WIDGET
 * ==========================================================================
 * Asistente virtual con Inteligencia Artificial con diseño de Bailarina.
 * Arquitectura Segura: Browser -> Proxy (/api/chat / Netlify Functions) -> Authenticated n8n
 * No expone credenciales, webhooks privados ni llaves de IA.
 */

(function () {
  'use strict';

  // Configuración predeterminada configurable via window.CROWN_CHAT_CONFIG
  const userConfig = window.CROWN_CHAT_CONFIG || {};
  const CONFIG = {
    endpoint: userConfig.endpoint || (
      window.location.hostname.includes('netlify') || 
      window.location.hostname.includes('thecrowndancestudio.com') 
        ? '/.netlify/functions/chat' 
        : '/api/chat'
    ),
    whatsappBaseUrl: userConfig.whatsappUrl || 'https://wa.me/524422366997',
    storageKey: 'crown_chat_session_v1',
    maxHistoryTurns: 10
  };

  // SVG de la Bailarina con Corona Dorada y Tutú Rosa Neón
  const BALLERINA_SVG = `<svg viewBox="0 0 120 120" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="crnGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FF66C4" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="#C19A51" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="crnGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFF0A5"/>
        <stop offset="50%" stop-color="#C19A51"/>
        <stop offset="100%" stop-color="#8C6621"/>
      </linearGradient>
      <linearGradient id="crnTutu" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF94DC"/>
        <stop offset="50%" stop-color="#FF66C4"/>
        <stop offset="100%" stop-color="#C2185B"/>
      </linearGradient>
      <linearGradient id="crnBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#F5F5F7"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="54" fill="url(#crnGlow)" opacity="0.45"/>
    <g>
      <path d="M54 13 L56 18 L60 14 L64 18 L66 13 L68 20 L52 20 Z" fill="url(#crnGold)" stroke="#FFE885" stroke-width="0.8"/>
      <circle cx="54" cy="13" r="1.1" fill="#FFFFFF"/>
      <circle cx="60" cy="14" r="1.1" fill="#FFFFFF"/>
      <circle cx="66" cy="13" r="1.1" fill="#FFFFFF"/>
      <circle cx="60" cy="24" r="5" fill="url(#crnBody)"/>
      <circle cx="58" cy="19" r="2.5" fill="url(#crnBody)"/>
      <path d="M58 29 Q60 30 62 29 L63 46 Q60 48 57 46 Z" fill="url(#crnBody)"/>
      <path d="M58 31 C52 25, 48 18, 54 12 C56 15, 54 22, 59 30" stroke="url(#crnBody)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M62 31 C69 28, 77 34, 76 43 C74 41, 70 34, 61 33" stroke="url(#crnBody)" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path d="M54 46 C40 47, 33 54, 42 58 C51 61, 69 61, 78 58 C87 54, 80 47, 66 46 Z" fill="url(#crnTutu)"/>
      <path d="M48 48 C38 52, 45 56, 60 56 C75 56, 82 52, 72 48" stroke="#FFEAF7" stroke-width="1.2" fill="none" opacity="0.8"/>
      <path d="M58 56 L59 98 L60 106 L58 106" stroke="url(#crnBody)" stroke-width="3" stroke-linecap="round"/>
      <path d="M58 104 L60 104 L60.5 108 L57.5 108 Z" fill="url(#crnTutu)"/>
      <line x1="57" y1="99" x2="61" y2="102" stroke="url(#crnTutu)" stroke-width="0.8"/>
      <line x1="61" y1="99" x2="57" y2="102" stroke="url(#crnTutu)" stroke-width="0.8"/>
      <path d="M62 56 C67 66, 75 75, 76 83 C76 85, 74 88, 70 87" stroke="url(#crnBody)" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <circle cx="70" cy="87" r="1.5" fill="url(#crnTutu)"/>
      <path d="M86 26 L88 30 L92 32 L88 34 L86 38 L84 34 L80 32 L84 30 Z" fill="#FFE082" opacity="0.95"/>
      <path d="M30 38 L31.5 41 L34.5 42.5 L31.5 44 L30 47 L28.5 44 L25.5 42.5 L28.5 41 Z" fill="#FF80AB" opacity="0.85"/>
      <path d="M82 88 L83 90 L85 91 L83 92 L82 94 L81 92 L79 91 L81 90 Z" fill="#FFE082" opacity="0.85"/>
    </g>
  </svg>`;

  // Textos y Localización (ES / EN)
  const I18N = {
    es: {
      assistantName: 'Crown Assistant',
      onlineStatus: 'Asesora Virtual con IA • En línea',
      triggerAria: 'Abrir asistente virtual Crown Assistant (Bailarina)',
      closeAria: 'Cerrar ventana de conversación',
      resetTitle: 'Reiniciar conversación',
      whatsappTooltip: 'Atención directa por WhatsApp',
      inputPlaceholder: 'Pregúntame sobre clases, edades, horarios o prueba...',
      sendAria: 'Enviar mensaje',
      privacyNotice: '👑 Conversación privada y temporal. Datos protegidos.',
      welcomeMsg: '¡Hola! Te damos la bienvenida a The Crown Dance Studio 👑✨ Soy Crown Assistant, tu asesora virtual de danza con Inteligencia Artificial. ¿Para quién buscas clases hoy o qué estilo te gustaría conocer?',
      teaserTitle: 'Crown Assistant • IA 🩰',
      teaserText: '¡Hola! ¿Bailamos? Te ayudo a encontrar tu disciplina ideal o apartar tu clase de prueba 👑✨',
      teaserPrompt1: '🩰 Recomiéndame una clase',
      teaserPrompt2: '✨ Agendar prueba',
      starterCards: [
        {
          icon: '🩰',
          title: 'Recomiéndame una clase',
          desc: 'Según edad, nivel y estilo ideal',
          query: '¿Qué clase me recomiendas según mi edad y estilo?'
        },
        {
          icon: '📅',
          title: 'Horarios Oficiales 2026',
          desc: 'Ballet, Jazz, Hip Hop, Heels, Danza Aérea...',
          query: '¿Cuáles son los horarios oficiales para 2026?'
        },
        {
          icon: '✨',
          title: 'Agendar Clase de Prueba',
          desc: 'Reserva tu lugar en Plaza Real Santa Lucía',
          query: 'Quiero información para agendar una clase de prueba'
        },
        {
          icon: '📍',
          title: 'Ubicación y Contacto',
          desc: 'Cam. a Vanegas 256, Corregidora, Qro.',
          query: '¿Dónde están ubicados exactamente y cómo llegar?'
        },
        {
          icon: '🎭',
          title: 'Festival Anual 2026',
          desc: 'Fechas, preparación y fotos/videos',
          query: '¿Cuándo es el Festival 2026 y dónde ver fotos o video?'
        }
      ],
      chips: [
        { label: '👶 Baby Ballet (3 a 5 años)', query: '¿Qué información tienen de Baby Ballet para 3 a 5 años?' },
        { label: '🔥 Clases de Heels', query: '¿Qué niveles tienen en Heels y cuáles son los requisitos?' },
        { label: '🎪 Danza Aérea', query: '¿Cómo son las clases de danza aérea en telas?' }
      ],
      leadTitle: '👑 Aparta tu Clase de Prueba',
      parentNameLabel: 'Nombre del adulto o tutor (obligatorio para menores):',
      parentNamePlaceholder: 'Ej. María González',
      studentAgeLabel: 'Edad del alumno:',
      phoneLabel: 'Teléfono / WhatsApp de contacto:',
      phonePlaceholder: '10 dígitos (Ej. 4421234567)',
      disciplineLabel: 'Disciplina de interés:',
      scheduleLabel: 'Horario o día conveniente:',
      consentLabel: '¿Autorizas que The Crown Dance Studio utilice estos datos para responder tu solicitud y dar seguimiento a tu clase de prueba?',
      leadSubmitBtn: 'Confirmar y Enviar Solicitud ✨',
      leadSuccess: '¡Excelente! Hemos recibido tu solicitud con consentimiento. Una asesora te contactará en breve para confirmar tu lugar. 👑✨',
      errorMessage: 'Hubo un inconveniente al conectar con el servidor. Puedes contactarnos de inmediato por WhatsApp:',
      retryBtn: 'Reintentar',
      whatsappEscalateText: 'Chatear con una asesora por WhatsApp'
    },
    en: {
      assistantName: 'Crown Assistant',
      onlineStatus: 'AI Virtual Advisor • Online',
      triggerAria: 'Open Crown Assistant virtual chat (Ballerina)',
      closeAria: 'Close chat window',
      resetTitle: 'Restart conversation',
      whatsappTooltip: 'Direct WhatsApp support',
      inputPlaceholder: 'Ask about classes, ages, schedules or trial...',
      sendAria: 'Send message',
      privacyNotice: '👑 Private and temporary chat. Your data is protected.',
      welcomeMsg: 'Hello and welcome to The Crown Dance Studio! 👑✨ I am Crown Assistant, your AI dance advisor. What style would you like to explore or who are you looking classes for?',
      teaserTitle: 'Crown Assistant • AI 🩰',
      teaserText: 'Hello! Ready to dance? Let me find the perfect class for you or book your trial session 👑✨',
      teaserPrompt1: '🩰 Recommend a class',
      teaserPrompt2: '✨ Book a trial',
      starterCards: [
        {
          icon: '🩰',
          title: 'Recommend a Class',
          desc: 'Find the right discipline by age & style',
          query: 'Which dance class do you recommend for my age and experience?'
        },
        {
          icon: '📅',
          title: 'Official 2026 Schedule',
          desc: 'Ballet, Jazz, Hip Hop, Heels, Aerial Dance...',
          query: 'What are your official 2026 class schedules?'
        },
        {
          icon: '✨',
          title: 'Book a Trial Class',
          desc: 'Reserve a spot at Plaza Real Santa Lucía',
          query: 'I would like to book a trial class'
        },
        {
          icon: '📍',
          title: 'Studio Location & Contact',
          desc: 'Cam. a Vanegas 256, Corregidora, Qro.',
          query: 'Where is The Crown Dance Studio located?'
        },
        {
          icon: '🎭',
          title: '2026 Annual Festival',
          desc: 'Dates, preparation and gallery details',
          query: 'Tell me about the 2026 Annual Festival'
        }
      ],
      chips: [
        { label: '👶 Baby Ballet (Ages 3-5)', query: 'Tell me about Baby Ballet for toddlers and kids' },
        { label: '🔥 Heels Dance Class', query: 'What levels do you have for Heels dance classes?' },
        { label: '🎪 Aerial Dance Silks', query: 'Tell me about the aerial silks dance classes' }
      ],
      leadTitle: '👑 Book Your Trial Class',
      parentNameLabel: 'Adult / Guardian Full Name (Required for minors):',
      parentNamePlaceholder: 'e.g. Sarah Jenkins',
      studentAgeLabel: 'Student Age:',
      phoneLabel: 'Contact Phone / WhatsApp:',
      phonePlaceholder: '10 digits with country code',
      disciplineLabel: 'Discipline of interest:',
      scheduleLabel: 'Preferred day / schedule:',
      consentLabel: 'Do you authorize The Crown Dance Studio to use this information to respond to your inquiry and schedule your trial class?',
      leadSubmitBtn: 'Confirm & Send Request ✨',
      leadSuccess: 'Awesome! We have received your request with authorized consent. Our team will contact you shortly to confirm your trial! 👑✨',
      errorMessage: 'We could not reach the server right now. You can reach us directly via WhatsApp:',
      retryBtn: 'Retry',
      whatsappEscalateText: 'Chat with our team on WhatsApp'
    }
  };

  // Estado reactivo en memoria
  let state = {
    isOpen: false,
    language: document.body.classList.contains('lang-en') ? 'en' : 'es',
    sessionId: '',
    stateToken: '',
    conversation: [],
    isSubmitting: false,
    leadFormActive: false
  };

  // Generador de UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function initSession() {
    try {
      const stored = sessionStorage.getItem(CONFIG.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        state.sessionId = parsed.sessionId || ('cr_' + generateUUID().replace(/-/g, '').slice(0, 24));
        state.stateToken = parsed.stateToken || '';
        state.conversation = Array.isArray(parsed.conversation) ? parsed.conversation : [];
        state.language = parsed.language || state.language;
      } else {
        state.sessionId = 'cr_' + generateUUID().replace(/-/g, '').slice(0, 24);
      }
    } catch (e) {
      state.sessionId = 'cr_' + generateUUID().replace(/-/g, '').slice(0, 24);
    }
  }

  function persistSession() {
    try {
      sessionStorage.setItem(CONFIG.storageKey, JSON.stringify({
        sessionId: state.sessionId,
        stateToken: state.stateToken,
        conversation: state.conversation.slice(-CONFIG.maxHistoryTurns),
        language: state.language
      }));
    } catch (e) {
      // Ignorar quota exceeded
    }
  }

  // Asegurar que los estilos estén cargados
  function ensureStylesLoaded() {
    if (!document.querySelector('link[href*="chat-widget.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'chatbot/widget/chat-widget.css';
      document.head.appendChild(link);
    }
  }

  // Elementos DOM
  let elements = {};

  function buildDOM() {
    ensureStylesLoaded();

    // 0. Burbuja Teaser de Invitación
    const teaser = document.createElement('aside');
    teaser.className = 'crown-ballerina-teaser';
    teaser.id = 'crownBallerinaTeaser';
    teaser.setAttribute('aria-label', 'Invitación a consultar con IA');
    teaser.innerHTML = `
      <button class="teaser-close" type="button" aria-label="Cerrar invitación">&times;</button>
      <div class="teaser-badge-row">
        <span class="teaser-badge">AI 🩰</span>
        <span class="teaser-title">${I18N[state.language].teaserTitle}</span>
      </div>
      <p class="teaser-text">${I18N[state.language].teaserText}</p>
      <div class="teaser-actions">
        <button type="button" class="teaser-btn-action" data-query="¿Qué clase me recomiendas según mi edad y estilo?">
          ${I18N[state.language].teaserPrompt1}
        </button>
        <button type="button" class="teaser-btn-action" data-query="Quiero información para agendar una clase de prueba">
          ${I18N[state.language].teaserPrompt2}
        </button>
      </div>
      <div class="teaser-tail" aria-hidden="true"></div>
    `;

    // 1. Botón Flotante de la Bailarina
    const trigger = document.createElement('button');
    trigger.className = 'crown-chat-trigger';
    trigger.setAttribute('type', 'button');
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', I18N[state.language].triggerAria);
    trigger.innerHTML = `
      <div class="trigger-ballerina-wrap" aria-hidden="true">
        ${BALLERINA_SVG}
      </div>
      <span class="trigger-badge">AI 🩰</span>
    `;

    // 2. Ventana Modal del Chatbot
    const widget = document.createElement('div');
    widget.className = 'crown-chat-widget';
    widget.setAttribute('role', 'dialog');
    widget.setAttribute('aria-modal', 'true');
    widget.setAttribute('aria-label', 'Crown Assistant - The Crown Dance Studio');

    widget.innerHTML = `
      <div class="crown-chat-header">
        <div class="header-left">
          <div class="assistant-avatar" aria-hidden="true">
            ${BALLERINA_SVG}
          </div>
          <div class="assistant-info">
            <h3 class="assistant-title">${I18N[state.language].assistantName} <span class="assistant-badge">IA</span></h3>
            <div class="assistant-status">
              <span class="status-dot"></span>
              <span class="status-label">${I18N[state.language].onlineStatus}</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-btn lang-btn" type="button" title="Switch language (ES/EN)">${state.language.toUpperCase()}</button>
          <a class="header-btn whatsapp-link" href="${CONFIG.whatsappBaseUrl}" target="_blank" rel="noopener noreferrer" title="${I18N[state.language].whatsappTooltip}">
            <i class="fab fa-whatsapp" aria-hidden="true"></i>
          </a>
          <button class="header-btn reset-btn" type="button" title="${I18N[state.language].resetTitle}" aria-label="${I18N[state.language].resetTitle}">
            <i class="fas fa-rotate-left" aria-hidden="true"></i>
          </button>
          <button class="header-btn close-btn" type="button" aria-label="${I18N[state.language].closeAria}">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div class="crown-error-banner" role="alert">
        <span class="error-text"></span>
        <button class="header-btn retry-btn" type="button">${I18N[state.language].retryBtn}</button>
      </div>

      <div class="crown-chat-messages" role="log" aria-live="polite"></div>

      <div class="crown-typing-indicator" aria-label="Crown Assistant está escribiendo">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>

      <div class="crown-chat-input-area">
        <form class="input-row" id="crownChatForm">
          <input type="text" name="hp_website_token" style="display:none !important;" tabindex="-1" autocomplete="off">
          <input type="text" class="crown-chat-input" placeholder="${I18N[state.language].inputPlaceholder}" maxlength="600" autocomplete="off" aria-label="Escribe tu mensaje">
          <button type="submit" class="crown-chat-send" aria-label="${I18N[state.language].sendAria}">
            <i class="fas fa-paper-plane" aria-hidden="true"></i>
          </button>
        </form>
        <div class="privacy-notice">${I18N[state.language].privacyNotice}</div>
      </div>
    `;

    document.body.appendChild(teaser);
    document.body.appendChild(trigger);
    document.body.appendChild(widget);

    elements = {
      teaser,
      trigger,
      widget,
      headerTitle: widget.querySelector('.assistant-title'),
      statusLabel: widget.querySelector('.status-label'),
      langBtn: widget.querySelector('.lang-btn'),
      resetBtn: widget.querySelector('.reset-btn'),
      closeBtn: widget.querySelector('.close-btn'),
      errorBanner: widget.querySelector('.crown-error-banner'),
      errorText: widget.querySelector('.error-text'),
      retryBtn: widget.querySelector('.retry-btn'),
      messagesContainer: widget.querySelector('.crown-chat-messages'),
      typingIndicator: widget.querySelector('.crown-typing-indicator'),
      form: widget.querySelector('#crownChatForm'),
      input: widget.querySelector('.crown-chat-input'),
      sendBtn: widget.querySelector('.crown-chat-send'),
      privacyNotice: widget.querySelector('.privacy-notice')
    };

    attachEvents();
    renderConversation();

    // Mostrar el Teaser tras 1.2 segundos si no fue descartado
    setTimeout(() => {
      try {
        if (!sessionStorage.getItem('crown_teaser_dismissed') && !state.isOpen) {
          if (elements.teaser) elements.teaser.classList.add('visible');
        }
      } catch (e) {
        if (elements.teaser && !state.isOpen) elements.teaser.classList.add('visible');
      }
    }, 1200);
  }

  function dismissTeaser() {
    if (elements.teaser) {
      elements.teaser.classList.remove('visible');
      elements.teaser.classList.add('dismissed');
      try {
        sessionStorage.setItem('crown_teaser_dismissed', '1');
      } catch (e) {}
    }
  }

  function openChat() {
    state.isOpen = true;
    elements.widget.classList.add('active');
    elements.trigger.setAttribute('aria-expanded', 'true');
    dismissTeaser();
    elements.input.focus();
    scrollToBottom();
  }

  function closeChat() {
    state.isOpen = false;
    elements.widget.classList.remove('active');
    elements.trigger.setAttribute('aria-expanded', 'false');
    elements.trigger.focus();
  }

  function toggleChat() {
    if (state.isOpen) {
      closeChat();
    } else {
      openChat();
    }
  }

  function attachEvents() {
    elements.trigger.addEventListener('click', toggleChat);
    elements.closeBtn.addEventListener('click', closeChat);
    elements.langBtn.addEventListener('click', toggleLanguage);
    elements.resetBtn.addEventListener('click', resetChat);

    // Eventos del Teaser
    if (elements.teaser) {
      const closeTeaserBtn = elements.teaser.querySelector('.teaser-close');
      if (closeTeaserBtn) {
        closeTeaserBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          dismissTeaser();
        });
      }

      elements.teaser.addEventListener('click', function (e) {
        if (e.target.closest('.teaser-close') || e.target.closest('.teaser-btn-action')) return;
        openChat();
      });

      elements.teaser.querySelectorAll('.teaser-btn-action').forEach(btn => {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          openChat();
          const q = btn.getAttribute('data-query');
          if (q) sendMessage(q);
        });
      });
    }

    // Soporte teclado: Escape cierra la ventana
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.isOpen) {
        closeChat();
      }
    });

    // Envío del formulario
    elements.form.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = elements.input.value.trim();
      if (!text || state.isSubmitting) return;
      elements.input.value = '';
      sendMessage(text);
    });

    // Reintento en caso de error
    elements.retryBtn.addEventListener('click', function () {
      const lastUserMsg = [...state.conversation].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        sendMessage(lastUserMsg.content);
      }
    });

    // Sincronización automática de idioma si el usuario cambia el botón del sitio web
    const siteLangToggle = document.querySelector('.lang-selector, [onclick*="toggleLanguage"]');
    if (siteLangToggle) {
      siteLangToggle.addEventListener('click', function () {
        setTimeout(() => {
          const isEn = document.body.classList.contains('lang-en');
          const newLang = isEn ? 'en' : 'es';
          if (newLang !== state.language) {
            state.language = newLang;
            updateTexts();
            persistSession();
          }
        }, 100);
      });
    }
  }

  function toggleLanguage() {
    state.language = state.language === 'es' ? 'en' : 'es';
    updateTexts();
    persistSession();
  }

  function updateTexts() {
    const t = I18N[state.language];
    elements.headerTitle.innerHTML = `${t.assistantName} <span class="assistant-badge">IA</span>`;
    elements.statusLabel.innerText = t.onlineStatus;
    elements.langBtn.innerText = state.language.toUpperCase();
    elements.input.placeholder = t.inputPlaceholder;
    elements.privacyNotice.innerText = t.privacyNotice;
    elements.trigger.setAttribute('aria-label', t.triggerAria);

    // Actualizar teaser si existe
    if (elements.teaser) {
      const title = elements.teaser.querySelector('.teaser-title');
      const text = elements.teaser.querySelector('.teaser-text');
      const btns = elements.teaser.querySelectorAll('.teaser-btn-action');
      if (title) title.innerText = t.teaserTitle;
      if (text) text.innerText = t.teaserText;
      if (btns.length >= 2) {
        btns[0].innerText = t.teaserPrompt1;
        btns[1].innerText = t.teaserPrompt2;
      }
    }

    // Si solo hay mensaje de bienvenida, actualizarlo
    if (state.conversation.length === 0) {
      renderConversation();
    }
  }

  function resetChat() {
    state.conversation = [];
    state.stateToken = '';
    state.sessionId = 'cr_' + generateUUID().replace(/-/g, '').slice(0, 24);
    persistSession();
    renderConversation();
    hideError();
  }

  function renderConversation() {
    elements.messagesContainer.innerHTML = '';
    const t = I18N[state.language];

    // Mensaje de bienvenida inicial
    const welcomeBubble = createMessageBubble('assistant', t.welcomeMsg);
    elements.messagesContainer.appendChild(welcomeBubble);

    // Si es inicio de conversación, renderizar la parrilla de tarjetas de inicio rápido
    if (state.conversation.length === 0) {
      const starterGrid = document.createElement('div');
      starterGrid.className = 'crown-starter-grid';
      t.starterCards.forEach(card => {
        const cardBtn = document.createElement('button');
        cardBtn.type = 'button';
        cardBtn.className = 'crown-starter-card';
        cardBtn.innerHTML = `
          <span class="card-icon" aria-hidden="true">${card.icon}</span>
          <div class="card-details">
            <strong class="card-title">${escapeHTML(card.title)}</strong>
            <span class="card-desc">${escapeHTML(card.desc)}</span>
          </div>
          <i class="fas fa-chevron-right card-arrow" aria-hidden="true"></i>
        `;
        cardBtn.addEventListener('click', () => {
          sendMessage(card.query);
        });
        starterGrid.appendChild(cardBtn);
      });
      elements.messagesContainer.appendChild(starterGrid);

      // Chips adicionales de disciplinas
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'crown-quick-chips';
      t.chips.forEach(chip => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-btn';
        btn.innerText = chip.label;
        btn.addEventListener('click', () => {
          sendMessage(chip.query);
        });
        chipsContainer.appendChild(btn);
      });
      elements.messagesContainer.appendChild(chipsContainer);
    }

    // Historial acumulado
    state.conversation.forEach(msg => {
      const bubble = createMessageBubble(msg.role, msg.content, msg.extra);
      elements.messagesContainer.appendChild(bubble);
    });

    scrollToBottom();
  }

  function createMessageBubble(role, content, extra = null) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role}`;

    const textNode = document.createElement('div');
    textNode.innerText = content;
    bubble.appendChild(textNode);

    // Renderizar tarjetas de disciplinas recomendadas si existen
    if (extra && Array.isArray(extra.recommended_classes) && extra.recommended_classes.length > 0) {
      const cardsBox = document.createElement('div');
      cardsBox.className = 'crown-card-recommendations';
      extra.recommended_classes.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'rec-card';
        card.innerHTML = `
          <div class="rec-title"><i class="fas fa-crown"></i> ${escapeHTML(rec.name)}</div>
          <div class="rec-reason">${escapeHTML(rec.reason)}</div>
        `;
        cardsBox.appendChild(card);
      });
      bubble.appendChild(cardsBox);
    }

    // Renderizar botón de derivación a WhatsApp si corresponde
    if (extra && extra.handoff && extra.handoff.required) {
      const waLink = document.createElement('a');
      waLink.className = 'chip-btn';
      waLink.style.display = 'inline-flex';
      waLink.style.alignItems = 'center';
      waLink.style.gap = '6px';
      waLink.style.marginTop = '10px';
      waLink.style.borderColor = '#25D366';
      waLink.style.color = '#25D366';
      waLink.target = '_blank';
      waLink.rel = 'noopener noreferrer';
      waLink.href = extra.handoff.custom_whatsapp_url || CONFIG.whatsappBaseUrl;
      waLink.innerHTML = `<i class="fab fa-whatsapp"></i> ${I18N[state.language].whatsappEscalateText}`;
      bubble.appendChild(waLink);
    }

    // Renderizar formulario de captura / clase de prueba con consentimiento
    if (extra && (extra.next_action === 'open_lead_form' || extra.next_action === 'request_trial_consent')) {
      const leadForm = createLeadCaptureCard();
      bubble.appendChild(leadForm);
    }

    const time = document.createElement('div');
    time.className = 'message-time';
    time.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    bubble.appendChild(time);

    return bubble;
  }

  function createLeadCaptureCard() {
    const t = I18N[state.language];
    const card = document.createElement('div');
    card.className = 'crown-lead-card';
    card.innerHTML = `
      <h4>${t.leadTitle}</h4>
      <div class="lead-field">
        <label>${t.parentNameLabel}</label>
        <input type="text" class="lead-parent-name" placeholder="${t.parentNamePlaceholder}" required>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div class="lead-field">
          <label>${t.studentAgeLabel}</label>
          <input type="number" class="lead-student-age" placeholder="Ej. 7" min="3" max="99" required>
        </div>
        <div class="lead-field">
          <label>${t.phoneLabel}</label>
          <input type="tel" class="lead-phone" placeholder="${t.phonePlaceholder}" required>
        </div>
      </div>
      <div class="lead-field">
        <label>${t.disciplineLabel}</label>
        <select class="lead-discipline">
          <option value="Baby Ballet">Baby Ballet (3 a 5 años)</option>
          <option value="Ballet Kids">Ballet Kids (6 a 12 años)</option>
          <option value="Hip Hop">Hip Hop</option>
          <option value="Jazz">Jazz</option>
          <option value="Heels">Heels</option>
          <option value="Danza Contemporánea">Danza Contemporánea</option>
          <option value="Danza Aérea en Telas">Danza Aérea en Telas</option>
          <option value="Acrobacia">Acrobacia</option>
        </select>
      </div>
      <div class="lead-field">
        <label>${t.scheduleLabel}</label>
        <input type="text" class="lead-schedule" placeholder="Ej. Lunes y Miércoles 4:00 PM">
      </div>
      <div class="consent-box">
        <input type="checkbox" id="consentCheckbox" required>
        <label for="consentCheckbox">${t.consentLabel}</label>
      </div>
      <button type="button" class="lead-submit-btn">${t.leadSubmitBtn}</button>
    `;

    const btn = card.querySelector('.lead-submit-btn');
    const chk = card.querySelector('#consentCheckbox');
    const pName = card.querySelector('.lead-parent-name');
    const pAge = card.querySelector('.lead-student-age');
    const pPhone = card.querySelector('.lead-phone');
    const pDisc = card.querySelector('.lead-discipline');
    const pSched = card.querySelector('.lead-schedule');

    btn.addEventListener('click', function () {
      if (!chk.checked) {
        alert(state.language === 'en'
          ? 'Please accept the consent checkbox to process your booking.'
          : 'Por favor, autoriza la casilla de consentimiento para agendar tu solicitud.');
        chk.focus();
        return;
      }
      if (!pName.value.trim() || !pPhone.value.trim()) {
        alert(state.language === 'en'
          ? 'Please enter your name and contact phone number.'
          : 'Por favor, ingresa el nombre del adulto/tutor y teléfono de contacto.');
        pName.focus();
        return;
      }

      const leadData = {
        parent_name: pName.value.trim(),
        student_age: parseInt(pAge.value, 10) || null,
        phone: pPhone.value.trim(),
        discipline_interest: pDisc.value,
        preferred_schedule: pSched.value.trim()
      };

      btn.disabled = true;
      btn.innerText = state.language === 'en' ? 'Submitting...' : 'Enviando...';

      submitLeadWithConsent(leadData);
    });

    return card;
  }

  async function submitLeadWithConsent(leadData) {
    const userMessage = state.language === 'en'
      ? `I authorize The Crown Studio to contact me to schedule a trial class for ${leadData.discipline_interest}.`
      : `Autorizo a The Crown Studio a contactarme para agendar mi clase de prueba en ${leadData.discipline_interest}.`;

    state.conversation.push({ role: 'user', content: userMessage });
    elements.messagesContainer.appendChild(createMessageBubble('user', userMessage));
    scrollToBottom();

    await sendMessage(userMessage, true, leadData);
  }

  async function sendMessage(text, consent = false, leadData = null) {
    if (state.isSubmitting) return;
    state.isSubmitting = true;
    elements.sendBtn.disabled = true;
    hideError();

    // Renderizar burbuja del usuario inmediatamente si no proviene de tarjeta de formulario
    if (!leadData) {
      state.conversation.push({ role: 'user', content: text });
      elements.messagesContainer.appendChild(createMessageBubble('user', text));
      scrollToBottom();
    }

    elements.typingIndicator.classList.add('active');
    scrollToBottom();

    const payload = {
      event_id: generateUUID(),
      session_id: state.sessionId,
      message: text,
      language: state.language,
      conversation: state.conversation.slice(-8),
      page_url: window.location.href,
      consent: Boolean(consent),
      state_token: state.stateToken
    };

    if (leadData) {
      payload.lead_data = leadData;
    }

    try {
      const response = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      elements.typingIndicator.classList.remove('active');

      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }

      const data = await response.json();

      // Guardar token firmado del servidor
      if (data.state_token) {
        state.stateToken = data.state_token;
      }

      const replyText = data.reply || (
        state.language === 'en' 
          ? 'Thank you! How else can I assist you? 👑' 
          : '¡Gracias! ¿En qué más podemos ayudarte hoy? 👑'
      );

      state.conversation.push({
        role: 'assistant',
        content: replyText,
        extra: data
      });

      elements.messagesContainer.appendChild(createMessageBubble('assistant', replyText, data));
      persistSession();
      scrollToBottom();

    } catch (err) {
      console.warn('[CrownAssistant Client] Connection error:', err);
      elements.typingIndicator.classList.remove('active');
      showError(I18N[state.language].errorMessage);
    } finally {
      state.isSubmitting = false;
      elements.sendBtn.disabled = false;
    }
  }

  function showError(msg) {
    elements.errorText.innerText = msg;
    elements.errorBanner.classList.add('active');
    scrollToBottom();
  }

  function hideError() {
    elements.errorBanner.classList.remove('active');
  }

  function scrollToBottom() {
    setTimeout(() => {
      elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }, 50);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, function (tag) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag);
    });
  }

  // Inicialización tras carga del DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSession();
      buildDOM();
    });
  } else {
    initSession();
    buildDOM();
  }

})();
