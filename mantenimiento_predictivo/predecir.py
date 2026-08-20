"""
Carga el modelo ya entrenado y genera la predicción de mantenimiento (riesgo de
reincidencia) para cada equipo presente en un CSV con la misma estructura del
reporte de incidencias.

Uso:
    python predecir.py --csv "ruta/al/reporte_actualizado.csv" --out "riesgo_equipos.csv"
"""
import argparse
import json
from pathlib import Path

import joblib
import pandas as pd

from preprocesamiento import COLUMNAS_FEATURES, cargar_y_limpiar, construir_estado_actual

DIR_MODELO = Path(__file__).parent / "modelo"

COLUMNAS_SALIDA = [
    "clave", "equipos", "sede", "ubicacion", "_origen", "fecha_creacion",
    "dias_desde_falla_anterior", "n_fallas_previas", "tipo_falla_frecuente_hist",
    "probabilidad_riesgo", "prioridad",
]


def clasificar_prioridad(p: float) -> str:
    if p >= 0.6:
        return "Alta"
    if p >= 0.3:
        return "Media"
    return "Baja"


def predecir(ruta_csv, ruta_salida: str | None = None, top: int = 20, origen: str | None = None) -> pd.DataFrame:
    modelo = joblib.load(DIR_MODELO / "modelo.joblib")
    with open(DIR_MODELO / "metadata.json", encoding="utf-8") as f:
        metadata = json.load(f)

    df = cargar_y_limpiar(ruta_csv)
    estado = construir_estado_actual(df)

    faltantes = [c for c in COLUMNAS_FEATURES if c not in estado.columns]
    if faltantes:
        raise ValueError(f"No se pudieron construir las features {faltantes} a partir de este CSV")

    estado["probabilidad_riesgo"] = modelo.predict_proba(estado[COLUMNAS_FEATURES])[:, 1]
    estado["prioridad"] = estado["probabilidad_riesgo"].apply(clasificar_prioridad)

    if origen:
        estado = estado[estado["_origen"].str.contains(origen, case=False, na=False)]

    resultado = estado.sort_values("probabilidad_riesgo", ascending=False)
    columnas_presentes = [c for c in COLUMNAS_SALIDA if c in resultado.columns]
    resultado = resultado[columnas_presentes]

    print(f"Modelo entrenado con datos {metadata['rango_fechas'][0]} -> {metadata['rango_fechas'][1]}")
    print(f"Horizonte de predicción: próximos {metadata['horizonte_dias']} días")
    if metadata.get("roc_auc_holdout_por_origen"):
        print("ROC AUC en validación temporal (por origen):")
        for origen, auc in metadata["roc_auc_holdout_por_origen"].items():
            print(f"  {origen[:55]:55s} {auc}")
    else:
        print(f"ROC AUC en validación temporal: {metadata.get('roc_auc_holdout_global', metadata.get('roc_auc_holdout'))}")
    print(f"\nEquipos evaluados: {len(resultado)}")
    print(f"\nTop {top} equipos con mayor riesgo de requerir mantenimiento pronto:\n")
    print(resultado.head(top).to_string(index=False))

    if ruta_salida:
        resultado.to_csv(ruta_salida, index=False, encoding="utf-8-sig")
        print(f"\nResultado completo guardado en: {ruta_salida}")

    return resultado


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Genera la predicción de mantenimiento por equipo")
    ap.add_argument("--csv", required=True, nargs="+", help="Ruta(s) al CSV de incidencias (misma estructura)")
    ap.add_argument("--out", default=None, help="Ruta donde guardar el CSV de resultados")
    ap.add_argument("--top", type=int, default=20, help="Cuántos equipos mostrar en consola")
    ap.add_argument("--origen", default=None, help="Filtra el resultado por nombre (parcial) del archivo fuente")
    args = ap.parse_args()
    predecir(args.csv, args.out, args.top, args.origen)
