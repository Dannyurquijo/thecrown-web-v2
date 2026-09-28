# GUÍA DE ROTACIÓN DE SECRETOS Y CREDENCIALES
## The Crown Dance Studio - Crown Assistant AI Chatbot

Esta guía establece el protocolo seguro para rotar credenciales y secretos sin interrumpir el servicio (*Zero Downtime*).

---

### Inventario de Secretos
| Variable | Propósito | Dónde se almacena |
|---|---|---|
| `N8N_CROWN_API_KEY` | Autentica peticiones entre el Proxy y el Webhook de n8n | Servidor Proxy (Netlify / Docker) y Servidor n8n |
| `CROWN_STATE_SECRET` | Firma y valida tokens HMAC de estado conversacional | Servidor Proxy exclusivamente |
| `AI_PROVIDER_API_KEY` | Autentica llamadas a la API del modelo de IA | Servidor n8n exclusivamente |

---

### 1. Rotación de `N8N_CROWN_API_KEY` (Proxy <-> n8n)
Para rotar la clave sin que se pierdan mensajes de usuarios activos:

1. **Paso 1: Generar la nueva clave secreta**
   ```bash
   openssl rand -hex 32
   # Ejemplo resultante: crown_sec_live_d83e9104c8f2b7...
   ```

2. **Paso 2: Actualizar n8n con soporte dual (Transición de 10 minutos)**
   En el nodo de n8n **Check Authentication**, puedes aceptar temporalmente ambas claves:
   ```javascript
   const validKeys = [
     $env.N8N_CROWN_API_KEY_NEW || 'clave_nueva',
     $env.N8N_CROWN_API_KEY || 'clave_anterior'
   ];
   if (!validKeys.includes(receivedApiKey)) {
     // Rechazar
   }
   ```
   O bien, cambiar la variable en el entorno de n8n primero.

3. **Paso 3: Actualizar el Proxy en Netlify o Docker**
   - En Netlify: Ve a **Site configuration** > **Environment variables** > Edita `N8N_CROWN_API_KEY` con el nuevo valor > Haz clic en **Deploy latest changes**.
   - En Docker / VPS: Actualiza el archivo `.env` del proxy y reinicia:
     ```bash
     docker compose restart crown-proxy
     ```

4. **Paso 4: Remover la clave anterior en n8n**
   Una vez que el proxy esté enviando la clave nueva, elimina la referencia de la clave vieja en n8n.

---

### 2. Rotación de `CROWN_STATE_SECRET` (Firma HMAC de Sesión)
El secreto de estado se utiliza para verificar que el cliente no altere su `session_id`, idioma o consentimiento.

1. **Generar nuevo secreto**:
   ```bash
   openssl rand -hex 32
   ```
2. **Actualizar en el Proxy**:
   - Actualiza la variable `CROWN_STATE_SECRET` en Netlify o en tu archivo `.env`.
   - Reinicia el servicio proxy.
   - *Comportamiento esperado*: Si un usuario tiene una sesión activa anterior, el proxy detectará que el token previo no coincide con el nuevo hash, emitirá una advertencia interna y le asignará un nuevo token firmado transparente en su siguiente mensaje sin interrumpir la charla.

---

### 3. Rotación de `AI_PROVIDER_API_KEY` (OpenAI / Gemini)
1. Inicia sesión en la consola del proveedor (OpenAI Platform o Google AI Studio).
2. Genera una nueva API Key restringida (por ejemplo, con cuota mensual asignada para The Crown).
3. En tu servidor n8n:
   - Si usas variables de entorno: edita `.env`, actualiza `AI_PROVIDER_API_KEY` y reinicia el contenedor de n8n:
     ```bash
     docker compose restart crown-n8n
     ```
   - Si usas credenciales de n8n: ve a **Credentials** > selecciona tu credencial OpenAI > sustituye la clave y guarda.
4. Realiza una prueba enviando un mensaje al chatbot en la web.
5. Una vez verificado el funcionamiento, revoca y elimina la API Key antigua en la consola del proveedor.

---

### 4. Checklist de Seguridad tras la Rotación
- [ ] Ningún secreto nuevo fue commiteado en el repositorio Git (`git log -n 3 -p`).
- [ ] Las variables en Netlify y en el servidor n8n coinciden exactamente.
- [ ] La suite de pruebas automatizadas pasa al 100%: `python chatbot/tests/test_suite.py`.
- [ ] Se verificó un intercambio real en la web pública.
