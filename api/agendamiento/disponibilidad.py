"""
Proxy serverless (Vercel) hacia el webhook de n8n que consulta horarios
disponibles en el calendario para una fecha dada.

GET /api/agendamiento/disponibilidad?fecha=YYYY-MM-DD

No depende de librerias externas: reenvia la peticion al webhook configurado
en N8N_DISPONIBILIDAD_WEBHOOK_URL (protegido con el header X-Webhook-Secret,
ver N8N_WEBHOOK_SECRET) y devuelve su respuesta tal cual.
"""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

TIMEOUT_SEGUNDOS = 20
FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _responder(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        fecha = (query.get("fecha") or [""])[0]

        if not FECHA_RE.match(fecha):
            _responder(self, 400, {"error": "Falta el parametro 'fecha' con formato YYYY-MM-DD."})
            return

        webhook = os.environ.get("N8N_DISPONIBILIDAD_WEBHOOK_URL")
        if not webhook:
            _responder(self, 500, {
                "error": "La variable de entorno N8N_DISPONIBILIDAD_WEBHOOK_URL no esta configurada."
            })
            return

        destino = f"{webhook.rstrip('/')}?{urllib.parse.urlencode({'fecha': fecha})}"
        headers = {}
        secreto = os.environ.get("N8N_WEBHOOK_SECRET")
        if secreto:
            headers["X-Webhook-Secret"] = secreto

        req = urllib.request.Request(destino, method="GET", headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEGUNDOS) as resp:
                _responder(self, resp.status, json.loads(resp.read() or b"{}"))
        except urllib.error.HTTPError as e:
            try:
                payload = json.loads(e.read() or b"{}")
            except json.JSONDecodeError:
                payload = {"error": f"El servicio de agendamiento respondio con error {e.code}."}
            _responder(self, e.code, payload)
        except (urllib.error.URLError, TimeoutError):
            _responder(self, 502, {
                "error": "No se pudo consultar la disponibilidad en este momento. Intenta de nuevo en unos minutos."
            })
