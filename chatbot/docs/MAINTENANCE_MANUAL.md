# MANUAL DE MANTENIMIENTO Y OPERACIÓN CONTINUA
## The Crown Dance Studio - Crown Assistant AI Chatbot

Este manual está diseñado para que el equipo técnico y de administración de The Crown Dance Studio pueda realizar actualizaciones rutinarias en el chatbot de manera sencilla y segura.

---

### 1. Cómo Actualizar Horarios de Clases
Cuando cambie el semestre o se añadan nuevos turnos:

1. **En la Base de Conocimiento del Workflow (`chatbot/n8n/crown_knowledge_base.md` y nodo n8n)**:
   - Abre el workflow en n8n.
   - Haz doble clic en el nodo **Prepare Context & AI Payload**.
   - En el objeto `knowledgeBase.published_schedules`, actualiza o añade las líneas correspondientes (por ejemplo, nuevos grupos de Jazz o Danza Aérea).
   - Haz clic en **Save** en n8n.

2. **En el PDF descargable**:
   - Reemplaza el archivo `horarios2026.pdf` en la raíz del proyecto con la nueva versión oficial.

---

### 2. Cómo Añadir o Modificar Disciplinas
Si The Crown Dance Studio incorpora una nueva disciplina (por ejemplo, *K-Pop Teens* o *Flamenco*):

1. En el nodo **Prepare Context & AI Payload** de n8n:
   Añade el elemento al arreglo `knowledgeBase.disciplines`:
   ```javascript
   {
     name: 'K-Pop Teens',
     category: 'Urbano',
     age: '11 a 17 años',
     focus: 'Coreografías oficiales de los grupos más populares, sincronización y ritmo.'
   }
   ```
2. En el archivo `chatbot/widget/chat-widget.js`:
   Añade la opción en el `<select class="lead-discipline">` del formulario de clase de prueba.
3. Guarda y publica los cambios.

---

### 3. Cómo Actualizar el Enlace o Número de WhatsApp Oficial
Si el número de WhatsApp de recepción cambia (por ejemplo de `524423479755` a un nuevo número comercial):

1. En el archivo `.env` del servidor proxy o Netlify:
   - Modifica `CROWN_WHATSAPP_URL=https://wa.me/52XXXXXXXXXX`.
2. En `chatbot/widget/chat-widget.js`:
   - Modifica la propiedad por defecto `whatsappBaseUrl`.
3. En el nodo **Prepare Context & AI Payload** de n8n:
   - Actualiza `knowledgeBase.whatsapp_url`.

---

### 4. Monitoreo y Diagnóstico de Incidentes

#### Monitoreo del Endpoint de Salud
Puedes verificar el estado operativo del proxy ejecutando una petición GET:
```bash
curl -I https://thecrowndancestudio.com/api/health
# Debe devolver HTTP 200 OK con payload: {"status":"ok","service":"The Crown Chatbot Proxy"}
```

#### Monitoreo de Ejecuciones en n8n
1. Entra a tu panel de n8n > **Executions**.
2. Filtra por estado:
   - **Success (Verde)**: Solicitudes procesadas normalmente.
   - **Error (Rojo)**: Permite inspeccionar en qué nodo ocurrió la falla y qué mensaje envió el usuario, facilitando la depuración inmediata.
3. Observa que las trazas de datos de prospectos se imprimen sanitizadas, cumpliendo con la política de no exposición de datos sensibles.

---

### 5. Copias de Seguridad (Backups)
Se recomienda realizar un respaldo mensual de:
- El archivo de flujo JSON exportado de n8n.
- Las variables de entorno de Netlify / servidor VPS.
- El volumen de datos de n8n (`/home/node/.n8n`).
