/**
 * Crown Assistant - Secure Serverless Proxy for Netlify Functions
 * The Crown Dance Studio
 *
 * Architecture:
 * Browser -> /api/chat (Netlify Function) -> Private n8n Webhook (Authenticated)
 */

const crypto = require('crypto');

// Environment variables
const N8N_WEBHOOK_URL = process.env.N8N_CROWN_WEBHOOK_URL || 'https://n8n.dupixelcode.com/webhook/crown-chat-v1';
const N8N_API_KEY = process.env.N8N_CROWN_API_KEY || 'crown_sec_live_9a7b3c2d1e4f5a6b7c8d9e0f1a2b3c4d5e';
const AI_PROVIDER_API_KEY = process.env.AI_PROVIDER_API_KEY || '';
const STATE_SECRET = process.env.CROWN_STATE_SECRET || 'crown_dev_fallback_secret_32bytes_min';
const WHATSAPP_URL = process.env.CROWN_WHATSAPP_URL || 'https://wa.me/524422366997';
const ALLOWED_ORIGINS = (process.env.CROWN_ALLOWED_ORIGINS || 'https://thecrowndancestudio.com,https://www.thecrowndancestudio.com,https://n8n.dupixelcode.com')
  .split(',')
  .map(o => o.trim().toLowerCase());

// In-memory rate limiting cache (per function container instance)
const ipRateLimit = new Map();
const sessionRateLimit = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 25;
const MAX_REQUESTS_PER_SESSION = 35;

// Clean expired rate limit buckets periodically
function cleanRateLimitCache(map) {
  const now = Date.now();
  for (const [key, val] of map.entries()) {
    if (now - val.timestamp > RATE_LIMIT_WINDOW_MS) {
      map.delete(key);
    }
  }
}

function checkRateLimit(key, map, max) {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || (now - entry.timestamp > RATE_LIMIT_WINDOW_MS)) {
    map.set(key, { count: 1, timestamp: now });
    return true;
  }
  if (entry.count >= max) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Redact PII for safe logging
function redactPII(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  if (clone.lead_data) {
    if (clone.lead_data.phone) clone.lead_data.phone = '***REDACTED_PHONE***';
    if (clone.lead_data.email) clone.lead_data.email = '***REDACTED_EMAIL***';
    if (clone.lead_data.parent_name) clone.lead_data.parent_name = '***REDACTED_NAME***';
  }
  return clone;
}

// HMAC State token generator and validator
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

// Text sanitization to prevent control characters and dangerous code
function sanitizeText(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // strip HTML brackets
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // strip unprintable ASCII controls
    .trim()
    .slice(0, maxLength);
}

// Security Response Headers
const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
};

exports.handler = async function (event, context) {
  // CORS check
  const origin = (event.headers['origin'] || event.headers['Origin'] || '').toLowerCase();
  const isAllowedOrigin = !origin || ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.netlify.app');

  const corsHeaders = {
    ...SECURITY_HEADERS,
    'Access-Control-Allow-Origin': isAllowedOrigin && origin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'Content-Type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 1. Handle CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // 2. Reject non-POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // 3. Validate Content-Type
  const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return {
      statusCode: 415,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unsupported Media Type: expected application/json' })
    };
  }

  // 4. Validate Body Size (< 16 KB)
  const rawBody = event.body || '';
  if (rawBody.length > 16384) {
    return {
      statusCode: 413,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Payload Too Large: max 16KB' })
    };
  }

  // 5. Rate Limiting Check
  const clientIp = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown_ip').split(',')[0].trim();
  cleanRateLimitCache(ipRateLimit);
  cleanRateLimitCache(sessionRateLimit);

  if (!checkRateLimit(clientIp, ipRateLimit, MAX_REQUESTS_PER_IP)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Too Many Requests',
        reply: 'Has enviado varios mensajes seguidos. Por favor, espera un minuto o contáctanos por WhatsApp.',
        handoff: { required: true, channel: 'whatsapp', custom_whatsapp_url: WHATSAPP_URL }
      })
    };
  }

  // 6. Parse and Validate JSON
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }

  // 7. Honeypot check (Antispam)
  if (body.hp_website_token && body.hp_website_token.trim() !== '') {
    // Quietly discard bot submissions
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        reply: 'Gracias por tu mensaje.',
        language: 'es',
        intent: 'greeting',
        recommended_classes: [],
        next_action: 'none',
        lead: { should_capture: false, missing_fields: [] },
        handoff: { required: false, channel: null },
        session_id: body.session_id || 'cr_bot',
        state_token: ''
      })
    };
  }

  // 8. Schema validation
  const { event_id, session_id, message, language, conversation, page_url, consent, lead_data, state_token } = body;

  if (!event_id || typeof event_id !== 'string') {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing or invalid event_id' }) };
  }
  if (!session_id || typeof session_id !== 'string' || !/^cr_[a-zA-Z0-9_-]{10,64}$/.test(session_id)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing or invalid session_id format' }) };
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Message cannot be empty' }) };
  }

  // Rate limit per session
  if (!checkRateLimit(session_id, sessionRateLimit, MAX_REQUESTS_PER_SESSION)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Too Many Requests for this session',
        reply: 'Sesión saturada temporalmente. Puedes comunicarte directamente por WhatsApp.',
        handoff: { required: true, channel: 'whatsapp', custom_whatsapp_url: WHATSAPP_URL }
      })
    };
  }

  const cleanLang = (language === 'en' ? 'en' : 'es');
  const cleanConsent = Boolean(consent);
  const cleanMessage = sanitizeText(message, 1000);
  const cleanPageUrl = sanitizeText(page_url || 'https://thecrowndancestudio.com/', 300);

  // Validate state token if already in a multi-turn conversation
  if (state_token && !verifyStateToken(state_token, session_id)) {
    console.warn(`[CrownProxy] State token verification failed for session: ${session_id}`);
    // Generate new token but continue gracefully without crashing
  }

  const newStateToken = generateStateToken(session_id, cleanLang, cleanConsent);

  // Prepare normalized payload for n8n
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

  // 9. Forward to n8n Webhook
  if (!N8N_WEBHOOK_URL) {
    console.warn('[CrownProxy] N8N_CROWN_WEBHOOK_URL not configured. Returning fallback response.');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(getGracefulFallback(cleanLang, session_id, newStateToken))
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s strict timeout

    console.log(`[CrownProxy] Forwarding event ${sanitizedPayload.event_id} to n8n`);

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
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

    if (!n8nResponse.ok) {
      console.error(`[CrownProxy] n8n returned error status: ${n8nResponse.status}`);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(getGracefulFallback(cleanLang, session_id, newStateToken))
      };
    }

    const n8nData = await n8nResponse.json();

    // Ensure output strictly conforms to Contract
    const finalOutput = {
      reply: typeof n8nData.reply === 'string' ? n8nData.reply : (cleanLang === 'en' ? 'Welcome to The Crown! How can I help you today?' : '¡Hola! Te damos la bienvenida a The Crown Dance Studio. ¿En qué podemos orientarte hoy? 👑'),
      language: n8nData.language === 'en' ? 'en' : 'es',
      intent: n8nData.intent || 'greeting',
      recommended_classes: Array.isArray(n8nData.recommended_classes) ? n8nData.recommended_classes : [],
      next_action: n8nData.next_action || 'none',
      lead: n8nData.lead || { should_capture: false, missing_fields: [] },
      handoff: n8nData.handoff || { required: false, channel: null },
      session_id,
      state_token: newStateToken
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(finalOutput)
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[CrownProxy] Request to n8n timed out after 10000ms');
    } else {
      console.error('[CrownProxy] Network or unexpected error calling n8n:', err.message);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(getGracefulFallback(cleanLang, session_id, newStateToken))
    };
  }
};

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
    handoff: {
      required: true,
      channel: 'whatsapp',
      custom_whatsapp_url: WHATSAPP_URL
    },
    session_id: sessionId,
    state_token: stateToken
  };
}
