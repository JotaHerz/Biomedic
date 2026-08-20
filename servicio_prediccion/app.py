"""
Servicio standalone del modulo de mantenimiento predictivo.

Corre fuera de Vercel (p.ej. en Render o Railway) porque las dependencias de
scikit-learn (numpy + scipy + pandas) exceden el limite de 225 MB por funcion
serverless de Vercel. El endpoint api/predecir.py en Vercel es un proxy que
reenvia las peticiones aqui (ver la variable de entorno PREDICCION_SERVICE_URL).

GET  /            -> metadata del modelo entrenado
POST /            -> ejecuta la prediccion sobre uno o varios CSV de incidencias
                      (mismo contrato que antes: ver api/predecir.py)

Uso local:
    PORT=8000 python servicio_prediccion/app.py
"""
import importlib.util
import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import numpy as np
import pandas as pd

MODULO_DIR = Path(__file__).resolve().parent.parent / "mantenimiento_predictivo"
sys.path.insert(0, str(MODULO_DIR))


def _cargar_modulo_motor():
    # Carga mantenimiento_predictivo/predecir.py bajo un nombre distinto al de
    # este archivo para evitar colisiones de sys.modules si algun dia se
    # ejecuta desde el mismo proceso que otro modulo llamado "predecir".
    spec = importlib.util.spec_from_file_location("motor_predecir", MODULO_DIR / "predecir.py")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


motor = _cargar_modulo_motor()
DIR_MODELO = MODULO_DIR / "modelo"


def _cargar_metadata():
    with open(DIR_MODELO / "metadata.json", encoding="utf-8") as f:
        return json.load(f)


def _a_json_serializable(valor):
    if isinstance(valor, pd.Timestamp):
        return valor.isoformat()
    if isinstance(valor, np.floating):
        return float(valor)
    if isinstance(valor, np.integer):
        return int(valor)
    try:
        if pd.isna(valor):
            return None
    except (TypeError, ValueError):
        pass
    return valor


def _responder(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.rstrip("/") == "/salud":
            _responder(self, 200, {"estado": "ok"})
            return
        try:
            _responder(self, 200, {"modelo": _cargar_metadata()})
        except Exception as e:
            _responder(self, 500, {"error": f"No se pudo leer la metadata del modelo: {e}"})

    def do_POST(self):
        try:
            largo = int(self.headers.get("Content-Length", 0) or 0)
            crudo = self.rfile.read(largo) if largo else b"{}"
            body = json.loads(crudo or b"{}")
        except json.JSONDecodeError:
            _responder(self, 400, {"error": "El body no es un JSON valido."})
            return

        archivos = body.get("archivos") or []
        if not archivos:
            _responder(self, 400, {"error": "Debes adjuntar al menos un archivo CSV en 'archivos'."})
            return

        top = body.get("top")
        top = int(top) if top else None
        origen = body.get("origen") or None

        try:
            with tempfile.TemporaryDirectory() as tmp:
                rutas = []
                for archivo in archivos:
                    nombre = archivo.get("nombre") or "reporte.csv"
                    contenido = archivo.get("contenido") or ""
                    ruta = Path(tmp) / nombre
                    ruta.write_text(contenido, encoding="utf-8")
                    rutas.append(str(ruta))

                # top=5 solo limita lo que la funcion imprime en logs; el DataFrame
                # devuelto por motor.predecir siempre trae todos los equipos evaluados.
                resultado = motor.predecir(rutas, ruta_salida=None, top=5, origen=origen)

            registros = resultado.to_dict(orient="records")
            registros = [{k: _a_json_serializable(v) for k, v in fila.items()} for fila in registros]
            if top:
                registros = registros[:top]

            _responder(self, 200, {
                "modelo": _cargar_metadata(),
                "total_equipos": len(resultado),
                "resultados": registros,
            })
        except ValueError as e:
            _responder(self, 400, {"error": str(e)})
        except Exception as e:
            _responder(self, 500, {"error": f"Error interno generando la prediccion: {e}"})

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Servicio de mantenimiento predictivo escuchando en 0.0.0.0:{port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
