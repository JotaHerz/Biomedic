"""
Entrena el modelo de mantenimiento predictivo sobre el histórico de incidencias
y guarda los artefactos (modelo + metadata) para reutilizarlos en predecir.py.

Uso:
    python entrenar_modelo.py --csv "ruta/al/reporte.csv" --horizonte 45
"""
import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score

from preprocesamiento import (
    COLUMNAS_CATEGORICAS,
    COLUMNAS_FEATURES,
    cargar_y_limpiar,
    construir_features_historicos,
)

DIR_MODELO = Path(__file__).parent / "modelo"


def entrenar(rutas_csv, horizonte_dias: int, frac_train: float = 0.8):
    df = cargar_y_limpiar(rutas_csv)
    feats = construir_features_historicos(df, horizonte_dias)

    print(f"Registros utilizables tras limpieza y censura: {len(feats)} de {len(df)}")
    print(f"Tasa de positivos (reincidencia <= {horizonte_dias} dias): {feats['target'].mean():.1%}")

    # split temporal: entrena con el pasado, valida con el futuro
    feats = feats.sort_values("fecha_creacion")
    corte = int(len(feats) * frac_train)
    fecha_corte = feats.iloc[corte]["fecha_creacion"]
    train = feats[feats["fecha_creacion"] < fecha_corte]
    test = feats[feats["fecha_creacion"] >= fecha_corte]
    print(f"Train: {len(train)} registros (hasta {fecha_corte.date()})")
    print(f"Test:  {len(test)} registros (desde {fecha_corte.date()})")

    X_train, y_train = train[COLUMNAS_FEATURES], train["target"]
    X_test, y_test = test[COLUMNAS_FEATURES], test["target"]

    idx_categoricas = [COLUMNAS_FEATURES.index(c) for c in COLUMNAS_CATEGORICAS]
    modelo = HistGradientBoostingClassifier(
        categorical_features=idx_categoricas,
        class_weight="balanced",
        max_iter=300,
        learning_rate=0.05,
        random_state=42,
    )
    modelo.fit(X_train, y_train)

    proba_test = modelo.predict_proba(X_test)[:, 1]
    pred_test = (proba_test >= 0.5).astype(int)
    print("\n--- Evaluación en el periodo más reciente (holdout temporal) ---")
    auc_global = roc_auc_score(y_test, proba_test)
    print(f"ROC AUC global (agregado, referencial): {auc_global:.3f}")
    print(classification_report(y_test, pred_test, target_names=["sin reincidencia", "reincidencia"]))

    # Con varios datasets de origen (real + sintéticos), el AUC global agregado puede
    # verse peor de lo que el modelo realmente discrimina, porque cada población tiene
    # su propia calibración de probabilidad y se entremezclan al hacer un solo ranking.
    # El AUC por origen es la métrica que sí refleja el poder predictivo real.
    auc_por_origen = {}
    if test["_origen"].nunique() > 1:
        print("--- ROC AUC por dataset de origen (métrica real de desempeño) ---")
        test_eval = test.copy()
        test_eval["proba"] = proba_test
        for origen, grupo in test_eval.groupby("_origen"):
            if grupo["target"].nunique() < 2:
                continue
            auc = roc_auc_score(grupo["target"], grupo["proba"])
            auc_por_origen[origen] = round(float(auc), 3)
            print(f"  {origen[:55]:55s} n={len(grupo):5d}  AUC={auc:.3f}")

    # reentrena con TODO el histórico para el modelo final que se guarda
    X_full, y_full = feats[COLUMNAS_FEATURES], feats["target"]
    modelo_final = HistGradientBoostingClassifier(
        categorical_features=idx_categoricas,
        class_weight="balanced",
        max_iter=300,
        learning_rate=0.05,
        random_state=42,
    )
    modelo_final.fit(X_full, y_full)

    DIR_MODELO.mkdir(exist_ok=True)
    joblib.dump(modelo_final, DIR_MODELO / "modelo.joblib")
    metadata = {
        "horizonte_dias": horizonte_dias,
        "columnas_features": COLUMNAS_FEATURES,
        "columnas_categoricas": COLUMNAS_CATEGORICAS,
        "n_entrenamiento": len(feats),
        "roc_auc_holdout_global": round(float(auc_global), 3),
        "roc_auc_holdout_por_origen": auc_por_origen,
        "rango_fechas": [str(df["fecha_creacion"].min().date()), str(df["fecha_creacion"].max().date())],
        "fuentes": sorted(df["_origen"].unique().tolist()),
    }
    with open(DIR_MODELO / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\nModelo guardado en: {DIR_MODELO / 'modelo.joblib'}")
    print(f"Metadata guardada en: {DIR_MODELO / 'metadata.json'}")
    return modelo_final, metadata


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Entrena el modelo de mantenimiento predictivo")
    ap.add_argument("--csv", required=True, nargs="+", help="Ruta(s) al CSV histórico de incidencias")
    ap.add_argument("--horizonte", type=int, default=45, help="Días para considerar 'reincidencia próxima'")
    args = ap.parse_args()
    entrenar(args.csv, args.horizonte)
