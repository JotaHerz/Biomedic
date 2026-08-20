"""
Endpoint serverless (Vercel Functions) para el modulo de mantenimiento predictivo.

GET  /api/predecir  -> metadata del modelo entrenado (fechas, AUC, horizonte, etc.)
POST /api/predecir  -> ejecuta la prediccion sobre uno o varios CSV de incidencias
                        enviados en el body y devuelve el riesgo por equipo.

Body esperado (POST), JSON:
{
  "archivos": [{ "nombre": "reporte.csv", "contenido": "<texto csv>" }, ...],
  "top": 50,          // opcional, cuantos registros devolver ordenados por riesgo
  "origen": "texto"   // opcional, filtra por nombre (parcial) del archivo fuente
}

Reutiliza directamente mantenimiento_predictivo/ como unica fuente de verdad
(no se duplica el modelo ni la logica de preprocesamiento); vercel.json declara
"includeFiles" para empaquetar esa carpeta junto a esta funcion.
"""
import importlib.util
import json
import sys
import tempfile
from http.server import BaseHTTPRequestHandler
from pathlib import Path

import numpy as np
import pandas as pd

MODULO_DIR = Path(__file__).resolve().parent.parent / "mantenimiento_predictivo"
sys.path.insert(0, str(MODULO_DIR))


def _cargar_modulo_motor():
    # Carga mantenimiento_predictivo/predecir.py bajo un nombre distinto al de
    # este archivo (api/predecir.py): un `import predecir` normal reutilizaria
    # este mismo modulo desde sys.modules por compartir nombre de archivo.
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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
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
