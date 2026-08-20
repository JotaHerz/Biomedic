"""
Proxy serverless (Vercel) hacia el servicio externo de mantenimiento predictivo.

Las dependencias reales de inferencia (numpy + scipy + pandas + scikit-learn)
exceden el limite de 225 MB por funcion serverless de Vercel, asi que la
prediccion corre en un servicio aparte (servicio_prediccion/app.py, pensado
para desplegarse en una plataforma sin ese limite, p.ej. Render o Railway) y
esta funcion solo reenvia la peticion. Por eso no tiene dependencias fuera de
la libreria estandar.

Configura la URL de ese servicio en la variable de entorno
PREDICCION_SERVICE_URL del proyecto de Vercel (ej:
https://biomedics-prediccion.onrender.com).
"""
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

TIMEOUT_SEGUNDOS = 45


def _responder(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _url_servicio():
    base = os.environ.get("PREDICCION_SERVICE_URL")
    if not base:
        raise RuntimeError(
            "La variable de entorno PREDICCION_SERVICE_URL no esta configurada en este proyecto de Vercel."
        )
    return base.rstrip("/")


def _reenviar(handler, metodo, cuerpo=None):
    try:
        destino = _url_servicio()
    except RuntimeError as e:
        _responder(handler, 500, {"error": str(e)})
        return

    headers = {"Content-Type": "application/json"} if cuerpo else {}
    req = urllib.request.Request(destino, data=cuerpo, method=metodo, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SEGUNDOS) as resp:
            _responder(handler, resp.status, json.loads(resp.read() or b"{}"))
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read() or b"{}")
        except json.JSONDecodeError:
            payload = {"error": f"El servicio de prediccion respondio con error {e.code}."}
        _responder(handler, e.code, payload)
    except (urllib.error.URLError, TimeoutError):
        _responder(handler, 502, {
            "error": "No se pudo contactar al servicio de mantenimiento predictivo. "
                     "Si es la primera peticion en un rato puede estar reactivandose (cold start); intenta de nuevo."
        })


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        _reenviar(self, "GET")

    def do_POST(self):
        largo = int(self.headers.get("Content-Length", 0) or 0)
        cuerpo = self.rfile.read(largo) if largo else b"{}"
        _reenviar(self, "POST", cuerpo)
