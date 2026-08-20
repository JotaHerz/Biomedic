"""
Proxy serverless (Vercel) hacia el webhook de n8n que dispara la
automatizacion de agendamiento (Google Calendar + analisis IA + correo).

POST /api/agendamiento/solicitar

Valida el payload del formulario y lo reenvia al webhook configurado en
N8N_AGENDAMIENTO_WEBHOOK_URL (protegido con el header X-Webhook-Secret, ver
N8N_WEBHOOK_SECRET). El webhook de n8n debe responder de inmediato (modo
"Respond Immediately"): el resto del flujo (agendar, analizar, enviar
correo) corre en background dentro de n8n, no aqui.
"""
import json
import os
import re
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

TIMEOUT_SEGUNDOS = 20
FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HORA_RE = re.compile(r"^\d{2}:\d{2}$")
CORREO_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

CAMPOS_TEXTO_REQUERIDOS = ("nombre", "correo", "empresa", "servicio", "mensaje")


def _responder(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _validar(datos):
    if not isinstance(datos, dict):
        return "El body debe ser un objeto JSON."

    for campo in CAMPOS_TEXTO_REQUERIDOS:
        valor = datos.get(campo)
        if not isinstance(valor, str) or not valor.strip():
            return f"Falta el campo '{campo}'."

    if len(datos["nombre"].strip()) < 2:
        return "El nombre es demasiado corto."
    if not CORREO_RE.match(datos["correo"].strip()):
        return "El correo no tiene un formato valido."
    if len(datos["mensaje"].strip()) < 20:
        return "Describe tu necesidad con al menos 20 caracteres."

    fecha = datos.get("fecha")
    if not isinstance(fecha, str) or not FECHA_RE.match(fecha):
        return "La fecha debe tener formato YYYY-MM-DD."

    hora = datos.get("hora")
    if not isinstance(hora, str) or not HORA_RE.match(hora):
        return "La hora debe tener formato HH:MM."

    return None


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        largo = int(self.headers.get("Content-Length", 0) or 0)
        crudo = self.rfile.read(largo) if largo else b"{}"
        try:
            datos = json.loads(crudo or b"{}")
        except json.JSONDecodeError:
            _responder(self, 400, {"error": "El body no es un JSON valido."})
            return

        error = _validar(datos)
        if error:
            _responder(self, 400, {"error": error})
            return

        webhook = os.environ.get("N8N_AGENDAMIENTO_WEBHOOK_URL")
        if not webhook:
            _responder(self, 500, {
                "error": "La variable de entorno N8N_AGENDAMIENTO_WEBHOOK_URL no esta configurada."
            })
            return

        headers = {"Content-Type": "application/json"}
        secreto = os.environ.get("N8N_WEBHOOK_SECRET")
        if secreto:
            headers["X-Webhook-Secret"] = secreto

        payload = {
            "nombre": datos["nombre"].strip(),
            "correo": datos["correo"].strip(),
            "empresa": datos["empresa"].strip(),
            "servicio": datos["servicio"].strip(),
            "fecha": datos["fecha"],
            "hora": datos["hora"],
            "mensaje": datos["mensaje"].strip(),
        }

        req = urllib.request.Request(
            webhook, data=json.dumps(payload).encode("utf-8"), method="POST", headers=headers
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_SEGUNDOS) as resp:
                cuerpo = resp.read()
                try:
                    data = json.loads(cuerpo or b"{}")
                except json.JSONDecodeError:
                    data = {"ok": True}
                _responder(self, resp.status, data)
        except urllib.error.HTTPError as e:
            try:
                data = json.loads(e.read() or b"{}")
            except json.JSONDecodeError:
                data = {"error": f"El servicio de agendamiento respondio con error {e.code}."}
            _responder(self, e.code, data)
        except (urllib.error.URLError, TimeoutError):
            _responder(self, 502, {
                "error": "No se pudo enviar la solicitud en este momento. Intenta de nuevo en unos minutos."
            })
