/**
 * Crown Assistant - Standalone Node.js / Express Proxy Server
 * The Crown Dance Studio
 *
 * Can run via: node server.js or docker container
 */

const http = require('http');
const crypto = require('crypto');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const N8N_WEBHOOK_URL = process.env.N8N_CROWN_WEBHOOK_URL || 'https://n8n.dupixelcode.com/webhook/crown-chat-v1';
const N8N_API_KEY = process.env.N8N_CROWN_API_KEY || 'crown_sec_live_9a7b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e';
const STATE_SECRET = process.env.CROWN_STATE_SECRET || 'crown_dev_fallback_secret_32bytes_min';
const WHATSAPP_URL = process.env.CROWN_WHATSAPP_URL || 'https://wa.me/524422366997';
const ALLOWED_ORIGINS = (process.env.CROWN_ALLOWED_ORIGINS || 'https://thecrowndancestudio.com,https://www.thecrowndancestudio.com,https://n8n.dupixelcode.com,http://localhost:8080,http://127.0.0.1:8080')
  .split(',')
  .map(o => o.trim().toLowerCase());

// In-memory rate limiting
const ipRateLimit = new Map();
const sessionRateLimit = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_IP = 25;
const MAX_REQUESTS_PER_SESSION = 35;

function checkRateLimit(key, map, max) {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || (now - entry.timestamp > RATE_LIMIT_WINDOW_MS)) {
    map.set(key, { count: 1, timestamp: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

function generateStateToken(sessionId, language, consent) {
  const payload = `${sessionId}|${language}|${consent ? '1' : '0'}`;
  const hmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function verifyStateToken(token, sessionId) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, receivedHmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex');
  if (crypto.timingSafeEqual(Buffer.from(receivedHmac), Buffer.from(expectedHmac))) {
    const [tSession] = payload.split('|');
    return tSession === sessionId;
  }
  return false;
}

function sanitizeText(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function getGracefulFallback(lang, sessionId, stateToken) {
  const isEn = lang === 'en';
  return {
    reply: isEn
      ? "I'm temporarily experiencing high traffic, but our reception team is available right now via WhatsApp to assist you with classes, schedules, and trial bookings! 👑✨"
      : "En este momento estoy experimentando alta demanda, pero nuestro equipo humano de recepción te puede atender de inmediato por WhatsApp para clases, horarios y pruebas gratuitas. 👑✨",
    language: isEn ? 'en' : 'es',
    intent: 'human_support',
    recommended_classes: [],
    next_action: 'escalate_whatsapp',
    lead: { should_capture: false, missing_fields: [] },
    handoff: { required: true, channel: 'whatsapp', custom_whatsapp_url: WHATSAPP_URL },
    session_id: sessionId,
    state_token: stateToken
  };
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const origin = (req.headers['origin'] || '').toLowerCase();
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.netlify.app');

  const corsHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': isAllowedOrigin && origin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  // Health check endpoint
  if (req.method === 'GET' && (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/api/health')) {
    res.writeHead(200, corsHeaders);
    return res.end(JSON.stringify({ status: 'ok', service: 'The Crown Chatbot Proxy', timestamp: new Date().toISOString() }));
  }

  if (parsedUrl.pathname !== '/api/chat' && parsedUrl.pathname !== '/chat') {
    res.writeHead(404, corsHeaders);
    return res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  if (req.method !== 'POST') {
    res.writeHead(405, corsHeaders);
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    res.writeHead(415, corsHeaders);
    return res.end(JSON.stringify({ error: 'Unsupported Media Type: expected application/json' }));
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown_ip').split(',')[0].trim();
  if (!checkRateLimit(clientIp, ipRateLimit, MAX_REQUESTS_PER_IP)) {
    res.writeHead(429, corsHeaders);
    return res.end(JSON.stringify({
      error: 'Too Many Requests',
      reply: 'Has enviado varios mensajes seguidos. Por favor, espera un minuto o contáctanos por WhatsApp.',
      handoff: { required: true, channel: 'whatsapp', custom_whatsapp_url: WHATSAPP_URL }
    }));
  }

  // Read Body with size cap (16KB)
  let rawBody = '';
  let size = 0;
  const MAX_SIZE = 16384;

  req.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_SIZE) {
      res.writeHead(413, corsHeaders);
      res.end(JSON.stringify({ error: 'Payload Too Large' }));
      req.destroy();
    } else {
      rawBody += chunk;
    }
  });

  req.on('end', async () => {
    if (size > MAX_SIZE) return;

    let body;
    try {
      body = JSON.parse(rawBody || '{}');
    } catch (e) {
      res.writeHead(400, corsHeaders);
      return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
    }

    if (body.hp_website_token && body.hp_website_token.trim() !== '') {
      res.writeHead(200, corsHeaders);
      return res.end(JSON.stringify({
        reply: 'Gracias por tu mensaje.',
        language: 'es',
        intent: 'greeting',
        recommended_classes: [],
        next_action: 'none',
        lead: { should_capture: false, missing_fields: [] },
        handoff: { required: false, channel: null },
        session_id: body.session_id || 'cr_bot',
        state_token: ''
      }));
    }

    const { event_id, session_id, message, language, conversation, page_url, consent, lead_data, state_token } = body;

    if (!event_id || typeof event_id !== 'string') {
      res.writeHead(400, corsHeaders);
      return res.end(JSON.stringify({ error: 'Missing or invalid event_id' }));
    }
    if (!session_id || typeof session_id !== 'string' || !/^cr_[a-zA-Z0-9_-]{10,64}$/.test(session_id)) {
      res.writeHead(400, corsHeaders);
      return res.end(JSON.stringify({ error: 'Missing or invalid session_id format' }));
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.writeHead(400, corsHeaders);
      return res.end(JSON.stringify({ error: 'Message cannot be empty' }));
    }

    if (!checkRateLimit(session_id, sessionRateLimit, MAX_REQUESTS_PER_SESSION)) {
      res.writeHead(429, corsHeaders);
      return res.end(JSON.stringify({
        error: 'Too Many Requests for session',
        reply: 'Sesión temporalmente saturada. Puedes comunicarte directamente por WhatsApp.',
        handoff: { required: true, channel: 'whatsapp', custom_whatsapp_url: WHATSAPP_URL }
      }));
    }

    const cleanLang = language === 'en' ? 'en' : 'es';
    const cleanConsent = Boolean(consent);
    const cleanMessage = sanitizeText(message, 1000);
    const cleanPageUrl = sanitizeText(page_url || 'https://thecrowndancestudio.com/', 300);
    const newStateToken = generateStateToken(session_id, cleanLang, cleanConsent);

    const sanitizedPayload = {
      event_id: sanitizeText(event_id, 100),
      session_id,
      message: cleanMessage,
      language: cleanLang,
      page_url: cleanPageUrl,
      consent: cleanConsent,
      conversation: Array.isArray(conversation)
        ? conversation.slice(-8).map(c => ({
            role: c.role === 'assistant' ? 'assistant' : 'user',
            content: sanitizeText(c.content || '', 800)
          }))
        : [],
      state_token: newStateToken
    };

    if (lead_data && typeof lead_data === 'object' && cleanConsent) {
      sanitizedPayload.lead_data = {
        parent_name: sanitizeText(lead_data.parent_name || '', 100),
        email: sanitizeText(lead_data.email || '', 120),
        phone: sanitizeText(lead_data.phone || '', 20),
        student_age: Number.isInteger(lead_data.student_age) ? lead_data.student_age : null,
        discipline_interest: sanitizeText(lead_data.discipline_interest || '', 80),
        level: sanitizeText(lead_data.level || '', 40),
        preferred_schedule: sanitizeText(lead_data.preferred_schedule || '', 100),
        notes: sanitizeText(lead_data.notes || '', 500)
      };
    }

    if (!N8N_WEBHOOK_URL) {
      res.writeHead(200, corsHeaders);
      return res.end(JSON.stringify(getGracefulFallback(cleanLang, session_id, newStateToken)));
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const AI_PROVIDER_API_KEY = process.env.AI_PROVIDER_API_KEY || '';
      const n8nResp = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-crown-apikey': N8N_API_KEY,
          'x-gemini-key': AI_PROVIDER_API_KEY,
          'User-Agent': 'TheCrown-Proxy/1.0'
        },
        body: JSON.stringify(sanitizedPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!n8nResp.ok) {
        console.error(`[CrownProxy] n8n returned ${n8nResp.status}`);
        res.writeHead(200, corsHeaders);
        return res.end(JSON.stringify(getGracefulFallback(cleanLang, session_id, newStateToken)));
      }

      const data = await n8nResp.json();
      const finalOutput = {
        reply: typeof data.reply === 'string' ? data.reply : (cleanLang === 'en' ? 'Welcome to The Crown! How can I help you today?' : '¡Hola! Te damos la bienvenida a The Crown Dance Studio. ¿En qué podemos orientarte hoy? 👑'),
        language: data.language === 'en' ? 'en' : 'es',
        intent: data.intent || 'greeting',
        recommended_classes: Array.isArray(data.recommended_classes) ? data.recommended_classes : [],
        next_action: data.next_action || 'none',
        lead: data.lead || { should_capture: false, missing_fields: [] },
        handoff: data.handoff || { required: false, channel: null },
        session_id,
        state_token: newStateToken
      };

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(finalOutput));

    } catch (err) {
      console.error('[CrownProxy] Error communicating with n8n:', err.message);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(getGracefulFallback(cleanLang, session_id, newStateToken)));
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Crown Assistant Proxy running on port ${PORT}`);
  });
}

module.exports = server;
