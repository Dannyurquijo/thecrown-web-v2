# PROCEDIMIENTO DE ROLLBACK (PLAN DE CONTINGENCIA)
## The Crown Dance Studio - Crown Assistant AI Chatbot

Este documento describe las acciones inmediatas para revertir cualquier cambio en caso de fallo crítico en producción.

---

### Escenario 1: Fallo en el Servidor n8n o Proveedor de IA
Si tu servidor n8n entra en mantenimiento o la API del proveedor de IA experimenta una caída global:

**Comportamiento Automático de Respaldo**:
El proxy (`netlify/functions/chat.js` o `server.js`) cuenta con un **Mecanismo de Degradación Elegante (*Graceful Fallback*)**.
Si n8n no responde en 10 segundos o devuelve error 500:
1. El usuario **nunca** verá un error de servidor ni la página colapsará.
2. El chatbot le responderá amablemente:
   *"En este momento estoy experimentando alta demanda, pero nuestro equipo humano de recepción te puede atender de inmediato por WhatsApp para clases, horarios y pruebas gratuitas. 👑✨"*
3. Mostrará un botón directo para continuar por WhatsApp con un solo clic.

**Acción Requerida**: Ninguna inmediata a nivel de código. Atender las consultas entrantes por WhatsApp mientras se restablece n8n.

---

### Escenario 2: Desactivación Inmediata del Widget Web (Desconexión de Emergencia)
Si necesitas ocultar el widget del sitio web en segundos:

1. **Opción A (En caliente vía CSS en Netlify / Servidor Web)**:
   Añade esta regla al final de `css/base.css` o `chatbot/widget/chat-widget.css`:
   ```css
   .crown-chat-trigger, .crown-chat-widget { display: none !important; }
   ```
2. **Opción B (Remover enlaces en `index.html`)**:
   Comenta o elimina las dos líneas añadidas en `index.html`:
   - `<link rel="stylesheet" href="chatbot/widget/chat-widget.css">`
   - `<script src="chatbot/widget/chat-widget.js" defer></script>`
   Haz commit y push:
   ```bash
   git commit -am "chore: deshabilitar temporalmente widget de chatbot"
   git push origin main
   ```

---

### Escenario 3: Rollback de Despliegue en Netlify (1 Clic)
Si un nuevo despliegue causa comportamientos no deseados:
1. Ingresa a [app.netlify.com](https://app.netlify.com).
2. Selecciona el proyecto de **The Crown Dance Studio**.
3. Ve a la pestaña **Deploys**.
4. Ubica el despliegue anterior que funcionaba correctamente.
5. Haz clic en **Publish deploy**. Netlify revertirá el sitio a la versión anterior de forma instantánea.

---

### Escenario 4: Revertir Cambios en Git Localmente
Para regresar el repositorio local exactamente al estado anterior a la integración del chatbot:

```bash
# Ver últimos commits
git log --oneline -n 5

# Revertir el último commit de forma segura (creando un commit inverso)
git revert HEAD --no-edit

# O si no se ha hecho commit aún y se desea descartar cambios locales:
git checkout HEAD -- index.html
```

---

### Escenario 5: Rollback del Workflow en n8n
Si realizaste modificaciones en los nodos de n8n y deseas restaurar la versión original certificada:
1. En el panel de n8n, abre el workflow.
2. Haz clic en el menú (**⋮**) > **Import from File**.
3. Selecciona la copia de seguridad original:
   `chatbot/n8n/thecrown_n8n_chatbot_workflow.json`
4. Guarda y activa (**Active**).
