#!/usr/bin/env python3
"""
Crown Assistant - Secure Python Proxy Server
The Crown Dance Studio

Native Python 3 implementation with zero external dependencies.
Ideal for Linux VPS, Docker containers, or local testing.
"""

import os
import sys
import json
import time
import hmac
import hashlib
import re
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(os.environ.get('PORT', '3000'))
N8N_WEBHOOK_URL = os.environ.get('N8N_CROWN_WEBHOOK_URL', '')
N8N_API_KEY = os.environ.get('N8N_CROWN_API_KEY', '')
STATE_SECRET = os.environ.get('CROWN_STATE_SECRET', os.urandom(32).hex()).encode('utf-8')
WHATSAPP_URL = os.environ.get('CROWN_WHATSAPP_URL', '')
ALLOWED_ORIGINS = [o.strip().lower() for o in os.environ.get('CROWN_ALLOWED_ORIGINS', '').split(',') if o.strip()]

RATE_LIMIT_WINDOW = 60.0
MAX_PER_IP = 25
MAX_PER_SESSION = 35

ip_cache = {}
session_cache = {}

def check_rate_limit(key, cache, max_count):
    now = time.time()
    if key not in cache or (now - cache[key]['timestamp'] > RATE_LIMIT_WINDOW):
        cache[key] = {'count': 1, 'timestamp': now}
        return True
    if cache[key]['count'] >= max_count:
        return False
    cache[key]['count'] += 1
    return True

def clean_cache(cache):
    now = time.time()
    expired = [k for k, v in cache.items() if now - v['timestamp'] > RATE_LIMIT_WINDOW]
    for k in expired:
        del cache[k]

def generate_state_token(session_id, lang, consent):
    payload = f"{session_id}|{lang}|{'1' if consent else '0'}"
    token_hmac = hmac.new(STATE_SECRET, payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload}.{token_hmac}"

def verify_state_token(token, session_id):
    if not token or not isinstance(token, str):
        return False
    parts = token.split('.')
    if len(parts) != 2:
        return False
    payload, received_hmac = parts
    expected = hmac.new(STATE_SECRET, payload.encode('utf-8'), hashlib.sha256).hexdigest()
    if hmac.compare_digest(received_hmac, expected):
        t_session = payload.split('|')[0]
        return t_session == session_id
    return False

def sanitize_text(text, max_len=1000):
    if not isinstance(text, str):
        return ""
    text = re.sub(r'[<>]', '', text)
    text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
    return text.strip()[:max_len]

def get_graceful_fallback(lang, session_id, state_token):
    is_en = (lang == 'en')
    return {
        "reply": (
            "I'm temporarily experiencing high traffic, but our reception team is available right now via WhatsApp to assist you with classes, schedules, and trial bookings! 👑✨"
            if is_en else
            "En este momento estoy experimentando alta demanda, pero nuestro equipo humano de recepción te puede atender de inmediato por WhatsApp para clases, horarios y pruebas gratuitas. 👑✨"
        ),
        "language": "en" if is_en else "es",
        "intent": "human_support",
        "recommended_classes": [],
        "next_action": "escalate_whatsapp",
        "lead": {"should_capture": False, "missing_fields": []},
        "handoff": {
            "required": True,
            "channel": "whatsapp",
            "custom_whatsapp_url": WHATSAPP_URL
        },
        "session_id": session_id,
        "state_token": state_token
    }

class CrownProxyHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self, status=200):
        origin = self.headers.get('Origin', '').lower()
        is_allowed = (not origin or origin in ALLOWED_ORIGINS or 'localhost' in origin or '127.0.0.1' in origin or origin.endswith('.netlify.app'))
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        fallback_origin = ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else '*'
        self.send_header('Access-Control-Allow-Origin', origin if (is_allowed and origin) else fallback_origin)
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-requested-with')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.end_headers()

    def do_OPTIONS(self):
        self._send_cors_headers(204)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ['/health', '/api/health']:
            self._send_cors_headers(200)
            res = json.dumps({'status': 'ok', 'service': 'The Crown Chatbot Proxy', 'time': time.time()})
            self.wfile.write(res.encode('utf-8'))
        elif parsed.path in ['/api/chat', '/chat']:
            self._send_cors_headers(405)
            self.wfile.write(json.dumps({'error': 'Method Not Allowed'}).encode('utf-8'))
        else:
            self._send_cors_headers(404)
            self.wfile.write(json.dumps({'error': 'Not Found'}).encode('utf-8'))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ['/api/chat', '/chat']:
            self._send_cors_headers(404)
            self.wfile.write(json.dumps({'error': 'Endpoint not found'}).encode('utf-8'))
            return

        content_type = self.headers.get('Content-Type', '').lower()
        if 'application/json' not in content_type:
            self._send_cors_headers(415)
            self.wfile.write(json.dumps({'error': 'Unsupported Media Type: expected application/json'}).encode('utf-8'))
            return

        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            content_length = 0

        if content_length > 16384:
            self._send_cors_headers(413)
            self.wfile.write(json.dumps({'error': 'Payload Too Large: max 16KB'}).encode('utf-8'))
            return

        clean_cache(ip_cache)
        clean_cache(session_cache)
        client_ip = self.headers.get('X-Forwarded-For', self.client_address[0]).split(',')[0].strip()

        if not check_rate_limit(client_ip, ip_cache, MAX_PER_IP):
            self._send_cors_headers(429)
            resp = {
                'error': 'Too Many Requests',
                'reply': 'Has enviado varios mensajes seguidos. Por favor, espera un minuto o contáctanos por WhatsApp.',
                'handoff': {'required': True, 'channel': 'whatsapp', 'custom_whatsapp_url': WHATSAPP_URL}
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        raw_data = self.rfile.read(content_length).decode('utf-8', errors='ignore')
        try:
            body = json.loads(raw_data) if raw_data else {}
        except Exception:
            self._send_cors_headers(400)
            self.wfile.write(json.dumps({'error': 'Invalid JSON payload'}).encode('utf-8'))
            return

        # Honeypot antispam check
        if body.get('hp_website_token', '').strip() != '':
            self._send_cors_headers(200)
            silent = {
                'reply': 'Gracias por tu mensaje.',
                'language': 'es',
                'intent': 'greeting',
                'recommended_classes': [],
                'next_action': 'none',
                'lead': {'should_capture': False, 'missing_fields': []},
                'handoff': {'required': False, 'channel': None},
                'session_id': body.get('session_id', 'cr_bot'),
                'state_token': ''
            }
            self.wfile.write(json.dumps(silent).encode('utf-8'))
            return

        event_id = body.get('event_id')
        session_id = body.get('session_id')
        message = body.get('message')

        if not event_id or not isinstance(event_id, str):
            self._send_cors_headers(400)
            self.wfile.write(json.dumps({'error': 'Missing or invalid event_id'}).encode('utf-8'))
            return

        if not session_id or not isinstance(session_id, str) or not re.match(r'^cr_[a-zA-Z0-9_-]{10,64}$', session_id):
            self._send_cors_headers(400)
            self.wfile.write(json.dumps({'error': 'Missing or invalid session_id format'}).encode('utf-8'))
            return

        if not message or not isinstance(message, str) or not message.strip():
            self._send_cors_headers(400)
            self.wfile.write(json.dumps({'error': 'Message cannot be empty'}).encode('utf-8'))
            return

        if not check_rate_limit(session_id, session_cache, MAX_PER_SESSION):
            self._send_cors_headers(429)
            resp = {
                'error': 'Too Many Requests for session',
                'reply': 'Sesión saturada temporalmente. Puedes comunicarte directamente por WhatsApp.',
                'handoff': {'required': True, 'channel': 'whatsapp', 'custom_whatsapp_url': WHATSAPP_URL}
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        lang = 'en' if body.get('language') == 'en' else 'es'
        consent = bool(body.get('consent'))
        clean_msg = sanitize_text(message, 1000)
        clean_url = sanitize_text(body.get('page_url', 'https://thecrowndancestudio.com/'), 300)
        new_state_token = generate_state_token(session_id, lang, consent)

        conversation = []
        if isinstance(body.get('conversation'), list):
            for c in body['conversation'][-8:]:
                if isinstance(c, dict):
                    conversation.append({
                        'role': 'assistant' if c.get('role') == 'assistant' else 'user',
                        'content': sanitize_text(c.get('content', ''), 800)
                    })

        sanitized_payload = {
            'event_id': sanitize_text(event_id, 100),
            'session_id': session_id,
            'message': clean_msg,
            'language': lang,
            'page_url': clean_url,
            'consent': consent,
            'conversation': conversation,
            'state_token': new_state_token
        }

        lead_data = body.get('lead_data')
        if lead_data and isinstance(lead_data, dict) and consent:
            age = lead_data.get('student_age')
            sanitized_payload['lead_data'] = {
                'parent_name': sanitize_text(lead_data.get('parent_name', ''), 100),
                'email': sanitize_text(lead_data.get('email', ''), 120),
                'phone': sanitize_text(lead_data.get('phone', ''), 20),
                'student_age': int(age) if (isinstance(age, int) and 3 <= age <= 99) else None,
                'discipline_interest': sanitize_text(lead_data.get('discipline_interest', ''), 80),
                'level': sanitize_text(lead_data.get('level', ''), 40),
                'preferred_schedule': sanitize_text(lead_data.get('preferred_schedule', ''), 100),
                'notes': sanitize_text(lead_data.get('notes', ''), 500)
            }

        if not N8N_WEBHOOK_URL:
            self._send_cors_headers(200)
            fallback = get_graceful_fallback(lang, session_id, new_state_token)
            self.wfile.write(json.dumps(fallback).encode('utf-8'))
            return

        try:
            req_data = json.dumps(sanitized_payload).encode('utf-8')
            gemini_key = os.environ.get('AI_PROVIDER_API_KEY', '')
            req = urllib.request.Request(
                N8N_WEBHOOK_URL,
                data=req_data,
                headers={
                    'Content-Type': 'application/json',
                    'x-crown-apikey': N8N_API_KEY,
                    'x-gemini-key': gemini_key,
                    'User-Agent': 'TheCrown-PythonProxy/1.0'
                }
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode('utf-8')
                data = json.loads(res_body)

            final_output = {
                'reply': data.get('reply', '¡Hola! Te damos la bienvenida a The Crown Dance Studio. 👑'),
                'language': data.get('language', lang),
                'intent': data.get('intent', 'greeting'),
                'recommended_classes': data.get('recommended_classes', []),
                'next_action': data.get('next_action', 'none'),
                'lead': data.get('lead', {'should_capture': False, 'missing_fields': []}),
                'handoff': data.get('handoff', {'required': False, 'channel': None}),
                'session_id': session_id,
                'state_token': new_state_token
            }
            self._send_cors_headers(200)
            self.wfile.write(json.dumps(final_output).encode('utf-8'))

        except Exception as err:
            sys.stderr.write(f"[CrownPythonProxy] Error contacting n8n: {err}\n")
            self._send_cors_headers(200)
            fallback = get_graceful_fallback(lang, session_id, new_state_token)
            self.wfile.write(json.dumps(fallback).encode('utf-8'))

def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, CrownProxyHandler)
    print(f"Crown Python Proxy running on port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping proxy server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
