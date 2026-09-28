# GUÍA DE INSTALACIÓN EN SERVIDOR N8N PROPIO
## The Crown Dance Studio - Crown Assistant con Google Gemini
**Servidor de Destino**: `https://n8n.dupixelcode.com/`

Esta guía detalla los pasos exactos para configurar Google Gemini, importar el workflow en `n8n.dupixelcode.com` y enlazarlo con el sitio web de The Crown Dance Studio.

---

### Paso 1: Obtener la API Key de Google Gemini

1. Ve a la consola oficial de Google AI Studio:
   👉 **https://aistudio.google.com/app/apikey**
2. Inicia sesión con tu cuenta de Google.
3. Haz clic en el botón azul **"Create API key"** (Crear clave de API).
4. Elige un proyecto de Google Cloud existente o selecciona **"Create API key in new project"**.
5. Copia la clave generada (comienza usualmente con `AIzaSy...`).
6. **Importante**: Guarda esta clave en un lugar seguro. Nunca la coloques en archivos públicos de JavaScript o en el repositorio Git.

---

### Paso 2: Configurar Variables de Entorno en tu Servidor `n8n.dupixelcode.com`

En el servidor donde corre tu n8n (vía Docker, Docker Compose o archivo `.env`):

Añade las siguientes variables de entorno:

```env
# Dominio de n8n
N8N_HOST=n8n.dupixelcode.com
WEBHOOK_URL=https://n8n.dupixelcode.com/

# Clave compartida entre el sitio web (Proxy) y n8n (mínimo 32 caracteres)
N8N_CROWN_API_KEY=crown_sec_live_9a7b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e

# Tu clave de Google Gemini obtenida en el Paso 1
AI_PROVIDER_API_KEY=AIzaSy_tu_clave_de_gemini_aqui

# WhatsApp oficial de The Crown Dance Studio
CROWN_WHATSAPP_URL=https://wa.me/524423479755

# Zona horaria oficial del estudio
GENERIC_TIMEZONE=America/Mexico_City
```

Si usas Docker Compose en tu VPS:
```bash
docker compose down && docker compose up -d
```

---

### Paso 3: Importar el Workflow en `n8n.dupixelcode.com`

1. Abre tu navegador e ingresa a:
   **https://n8n.dupixelcode.com/**
2. Inicia sesión con tus credenciales de n8n.
3. En el menú lateral izquierdo, haz clic en **Workflows** y luego en **Add Workflow** (o el botón **+**).
4. En el lienzo en blanco, haz clic en el menú de tres puntos (**⋮**) situado en la esquina superior derecha.
5. Selecciona **Import from File**.
6. Selecciona el archivo JSON ubicado en:
   ```
   chatbot/n8n/thecrown_n8n_chatbot_workflow.json
   ```
7. El workflow cargará los 15 nodos preconfigurados:
   - **Webhook Inbound (Secure)**: Escucha en `/webhook/crown-chat-v1`.
   - **Check Authentication**: Valida la cabecera `x-crown-apikey`.
   - **Validate Schema & Check Idempotency**: Valida campos permitidos y previene duplicados.
   - **Prepare Context & AI Payload**: Inyecta la base de conocimiento oficial de The Crown (horarios 2026, disciplinas, ubicación y Festival 2026).
   - **Call AI Model (HTTP Request)**: Conecta con el endpoint de Google Gemini (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`) utilizando el modelo ultra-rápido y multimodal `gemini-2.0-flash`.
   - **Parse & Validate AI JSON**: Procesa la respuesta JSON estructurada con fallback.
   - **Switch by Intent**: Enruta las 13 intenciones del asistente.
   - **Consent & Lead Provided?**: Verifica consentimiento explícito antes de registrar prospectos.
   - **Secure Webhook Response**: Devuelve la respuesta estricta 200 OK al navegador.

---

### Paso 4: Activar el Workflow en n8n

1. En la parte superior derecha de la pantalla del workflow, cambia el interruptor de **Inactive** a **Active** (debe quedar en color verde).
2. Haz clic en **Save** (Guardar).
3. Tu Webhook oficial de producción queda activo en:
   ```
   https://n8n.dupixelcode.com/webhook/crown-chat-v1
   ```

---

### Paso 5: Configurar las Variables en Netlify (Producción Web)

Dado que el sitio web de The Crown Dance Studio está alojado en Netlify, la función serverless segura (`netlify/functions/chat.js`) actúa como escudo intermediario entre el navegador y tu n8n:

1. Entra a tu panel de control en [app.netlify.com](https://app.netlify.com).
2. Selecciona el proyecto de **The Crown Dance Studio**.
3. Ve a **Site configuration** > **Environment variables**.
4. Haz clic en **Add a variable** y añade las siguientes variables:

| Variable | Valor Recomendado |
|---|---|
| `AI_PROVIDER_API_KEY` | `AIzaSy_tu_clave_de_gemini_aqui` |
| `N8N_CROWN_WEBHOOK_URL` | `https://tu-dominio-n8n.com/webhook/crown-chat-v1` |
| `N8N_CROWN_API_KEY` | `tu_clave_secreta_api_32_caracteres` |
| `CROWN_STATE_SECRET` | `tu_clave_secreta_hmac_32_caracteres` |
| `CROWN_WHATSAPP_URL` | `https://wa.me/tu_numero_aqui` |
| `CROWN_ALLOWED_ORIGINS` | `https://thecrowndancestudio.com` |

5. Haz clic en **Save**.
6. Ve a la pestaña **Deploys** y haz clic en **Trigger deploy** > **Deploy site** para que las variables surtan efecto.

---

### Paso 6: Prueba de Conectividad en Tiempo Real

Puedes comprobar que el webhook y Gemini responden correctamente ejecutando este comando en tu terminal (PowerShell o Bash):

```bash
curl -X POST https://n8n.dupixelcode.com/webhook/crown-chat-v1 \
  -H "Content-Type: application/json" \
  -H "x-crown-apikey: tu_clave_secreta_api_32_caracteres" \
  -d '{
    "event_id": "test-uuid-live-001",
    "session_id": "cr_test_live_session_123",
    "message": "Hola, tengo 19 años y busco una clase urbana o con tacones. ¿Qué me recomiendas?",
    "language": "es",
    "consent": false,
    "page_url": "https://thecrowndancestudio.com/"
  }'
```

**Respuesta JSON esperada**:
```json
{
  "reply": "Para tu edad y estilo, te recomiendo Heels Choreography (Viernes 7:00 PM) para explorar postura, fuerza y empoderamiento en tacones, o Hip Hop Multinivel para ritmo y presencia escénica. 👑✨ ¿Te gustaría agendar una clase de prueba?",
  "language": "es",
  "intent": "class_recommendation",
  "recommended_classes": [
    {
      "name": "Heels Choreography",
      "reason": "Desarrolla fuerza, postura, balance en tacones y presencia escénica para adultos."
    },
    {
      "name": "Hip Hop Multinivel",
      "reason": "Excelente para trabajar ritmo urbano, coreografía y soltura corporal."
    }
  ],
  "next_action": "ask_schedule",
  "lead": {
    "should_capture": false,
    "missing_fields": []
  },
  "handoff": {
    "required": false,
    "channel": null
  },
  "session_id": "cr_test_live_session_123",
  "state_token": ""
}
```
