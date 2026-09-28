# CHECKLIST DE PRODUCCIÓN Y AUDITORÍA DE SEGURIDAD
## The Crown Dance Studio - Crown Assistant AI Chatbot

Antes de certificar la salida a producción, verifica el cumplimiento de cada uno de los siguientes puntos:

---

### 1. Seguridad de Secretos y Credenciales
- [x] **Cero secretos en frontend**: Ni `N8N_CROWN_WEBHOOK_URL`, ni `N8N_CROWN_API_KEY`, ni `AI_PROVIDER_API_KEY` aparecen en ningún archivo JS, CSS o HTML accesible al público.
- [x] **Protección de Webhook en n8n**: El webhook solo acepta peticiones autenticadas con la cabecera `x-crown-apikey`. Peticiones directas sin clave reciben HTTP 401.
- [x] **HMAC State Token**: Las sesiones llevan firma criptográfica en el proxy con `CROWN_STATE_SECRET` para prevenir manipulación del estado y consentimiento.
- [x] **Honeypot Antispam**: El campo `hp_website_token` descarta silenciosamente envíos automatizados de bots.
- [x] **Esquema Cerrado**: Tanto el proxy como el nodo n8n rechazan campos desconocidos en el payload (`additionalProperties: false`).
- [x] **Límite de tamaño de Payload**: Restricción a un máximo de 16 KB en servidor web, proxy y n8n.
- [x] **Rate Limiting**: Límites configurados por IP (máximo 25 req/min) y por sesión (máximo 35 req/sesión).
- [x] **Whitelist de Orígenes (CORS)**: Solo se aceptan peticiones procedentes de los dominios autorizados de The Crown Dance Studio.

---

### 2. Privacidad y Cumplimiento Legal (Protección de Menores y Consentimiento)
- [x] **Protección estricta a menores**: Cuando la consulta o inscripción involucre a menores de 18 años, el formulario y el chatbot solicitan exclusivamente el nombre y teléfono del padre, madre o tutor legal.
- [x] **Consentimiento obligatorio**: Los datos de prospección NUNCA se transmiten a n8n sin la confirmación explícita del checkbox:
  *"¿Autorizas que The Crown Dance Studio utilice estos datos para responder tu solicitud y dar seguimiento a tu clase de prueba?"*
- [x] **No persistencia indefinida**: Las conversaciones no se guardan permanentemente en el navegador (se utiliza `sessionStorage` que expira al cerrar la pestaña).
- [x] **Redacción de PII en logs**: Los números de teléfono, correos y nombres se enmascaran en las trazas técnicas.

---

### 3. Calidad de Respuestas y Control de IA (Grounding)
- [x] **Sin alucinación de precios o cupos**: El modelo informa que los precios varían según el número de clases semanales y ofrece cotización por WhatsApp o contacto con consentimiento.
- [x] **Sin diagnósticos médicos**: Ante reportes de dolor o lesiones, el asistente recomienda acudir con un profesional de la salud.
- [x] **Concisión (< 100 palabras)**: Respuestas breves, directas, elegantes y enfocadas en guiar al usuario a una clase de prueba.
- [x] **13 Intenciones cubiertas**: Cobertura completa de las 13 intenciones del sistema.
- [x] **Soporte bilingüe verificado**: Respuestas fluidas y naturales en español e inglés según el idioma del visitante.

---

### 4. Experiencia de Usuario y Accesibilidad
- [x] **Diseño Dark Neumorphic**: Alineado con la paleta visual de The Crown (Negro, Rosa Neón `#FF66C4`, Dorado `#C19A51`).
- [x] **Totalmente Responsive**: Optimizado para pantallas móviles (Android e iOS) y escritorio.
- [x] **Accesibilidad WCAG**: Atributos `aria-label`, `aria-expanded`, `aria-haspopup="dialog"`, `role="log"`, navegación completa por teclado (ESC para cerrar, Enter para enviar).
- [x] **Respeto a `prefers-reduced-motion`**: Las animaciones se desactivan si el usuario tiene activada la reducción de movimiento en su sistema operativo.
- [x] **Indicador de escritura animado**: Feedback visual inmediato mientras el asistente procesa la respuesta.
- [x] **Botón de reinicio**: Permite reiniciar la conversación en cualquier momento con un solo clic.

---

### 5. Resiliencia y Monitoreo
- [x] **Degradación Elegante (Graceful Fallback)**: Si n8n o la API de IA fallan o demoran más de 10 segundos, el usuario recibe una respuesta amable con enlace directo a WhatsApp.
- [x] **Idempotencia**: Prevención de duplicados mediante `event_id` y caché de 10 minutos en el flujo.
- [x] **Suite de pruebas pasando al 100%**: 24/24 pruebas automatizadas verificadas con `test_suite.py`.
