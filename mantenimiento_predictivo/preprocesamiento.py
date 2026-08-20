"""
Limpieza y construcción de features compartida entre entrenamiento y predicción.
Espera un CSV con la misma estructura del reporte de incidencias:
sede, ubicación, Equipos, activo, serie, tipo_falla, description, tipo_orden,
estado, fecha_ejecución, observacion, reporte, evaluation, comentario, fecha_creación
"""
import collections
import re
import unicodedata
from pathlib import Path

import pandas as pd

CODIGOS_INVALIDOS = {
    "na", "n/a", "n.a", "n.a.", "si", "s.i", "s.i.", "s i",
    "no", "no tiene", ".", "-", "", "null",
}

COLUMNAS_CATEGORICAS = [
    "equipo_norm", "sede_norm", "tipo_falla_norm", "tipo_orden_norm",
    "tipo_falla_frecuente_hist",
]
COLUMNAS_NUMERICAS = [
    "n_fallas_previas", "dias_desde_falla_anterior", "antiguedad_dias",
    "ratio_urgentes_historico",
]
COLUMNAS_FEATURES = COLUMNAS_CATEGORICAS + COLUMNAS_NUMERICAS


def _moda_expandida_previa(df: pd.DataFrame, col_grupo: str, col_valor: str) -> pd.Series:
    """Para cada fila: el valor más frecuente de `col_valor` entre las filas
    ANTERIORES del mismo grupo (evita fuga de información del futuro)."""
    resultado = pd.Series(index=df.index, dtype=object)
    for _, idxs in df.groupby(col_grupo).groups.items():
        conteo = collections.Counter()
        moda_actual = "sin_historial"
        for idx in idxs:
            resultado.loc[idx] = moda_actual
            conteo[df.loc[idx, col_valor]] += 1
            moda_actual = conteo.most_common(1)[0][0]
    return resultado


def _normalizar_col(nombre: str) -> str:
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    return s.strip().lower()


def _normalizar_txt(valor) -> str:
    if pd.isna(valor):
        return ""
    s = str(valor).strip().lower()
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def cargar_y_limpiar(rutas_csv) -> pd.DataFrame:
    """Carga uno o varios CSV de incidencias (misma estructura) y normaliza
    columnas, texto, fechas y la clave de equipo. Si se pasa una lista de
    rutas, las combina en un solo dataset antes de construir features."""
    if isinstance(rutas_csv, (str, bytes)):
        rutas_csv = [rutas_csv]

    partes = []
    for ruta in rutas_csv:
        parte = pd.read_csv(ruta, encoding="utf-8")
        parte.columns = [_normalizar_col(c) for c in parte.columns]
        parte["_origen"] = Path(ruta).name
        partes.append(parte)
    df = pd.concat(partes, ignore_index=True, sort=False)

    requeridas = {"sede", "equipos", "activo", "tipo_falla", "tipo_orden", "fecha_creacion"}
    faltantes = requeridas - set(df.columns)
    if faltantes:
        raise ValueError(f"El CSV no tiene la estructura esperada. Faltan columnas: {faltantes}")

    df["fecha_creacion"] = pd.to_datetime(df["fecha_creacion"], errors="coerce", format="mixed")
    df = df.dropna(subset=["fecha_creacion"]).copy()

    df["equipo_norm"] = df["equipos"].apply(_normalizar_txt)
    df["sede_norm"] = df["sede"].apply(_normalizar_txt)
    df["tipo_falla_norm"] = df["tipo_falla"].apply(_normalizar_txt)
    df["tipo_orden_norm"] = df["tipo_orden"].apply(_normalizar_txt)

    activo_norm = df["activo"].apply(_normalizar_txt).str.replace(r"\s+", "", regex=True)
    # reconoce formatos tipo "eb0890" (archivo real) y "bio-rio1-01047" (archivo sintético)
    activo_valido = activo_norm.apply(
        lambda x: x not in CODIGOS_INVALIDOS
        and len(x) >= 5
        and any(ch.isdigit() for ch in x)
        and bool(re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", x))
    )
    df["activo_norm"] = activo_norm
    df["activo_valido"] = activo_valido

    # clave de identificación del equipo:
    # - con código de activo válido: activo + equipo + sede. El código solo no basta,
    #   porque puede repetirse por coincidencia entre datasets de distinto origen
    #   (ej. "eb1001" es un torniquete en el archivo real y una camilla en uno de los
    #   sintéticos); en cambio, cuando el mismo código SÍ corresponde al mismo equipo+sede
    #   en varios archivos (ej. datasets sintéticos que exportan el mismo activo en
    #   distintos cortes), esta clave los une correctamente en un solo historial.
    # - sin código de activo confiable: se agrupa por equipo + sede + archivo de origen,
    #   para no mezclar la dinámica de instituciones distintas bajo un nombre de sede
    #   genérico que coincide por casualidad (ej. "Centro").
    df["clave"] = df.apply(
        lambda r: f"{r['activo_norm']}|{r['equipo_norm']}|{r['sede_norm']}"
        if r["activo_valido"]
        else f"{r['_origen']}::{r['equipo_norm']}|{r['sede_norm']}",
        axis=1,
    )

    return df.sort_values(["clave", "fecha_creacion"]).reset_index(drop=True)


def construir_features_historicos(df: pd.DataFrame, horizonte_dias: int) -> pd.DataFrame:
    """
    Para entrenamiento: por cada incidencia calcula features usando SOLO información
    conocida hasta ese momento (sin fuga de información del futuro), y arma el target
    = 1 si el mismo equipo vuelve a generar una incidencia dentro de `horizonte_dias`.

    Se descartan los registros censurados: la última incidencia de un equipo cuando
    todavía no pasó suficiente tiempo (horizonte_dias) desde esa fecha hasta el máximo
    del dataset, porque no se puede saber con certeza si iba a reincidir o no.
    """
    df = df.copy()
    g = df.groupby("clave")

    df["n_fallas_previas"] = g.cumcount()
    df["dias_desde_falla_anterior"] = g["fecha_creacion"].diff().dt.days
    df["antiguedad_dias"] = (df["fecha_creacion"] - g["fecha_creacion"].transform("min")).dt.days

    df["ratio_urgentes_historico"] = (
        g.apply(lambda x: (x["tipo_orden_norm"] == "urgente").astype(int).shift().expanding().mean())
        .reset_index(level=0, drop=True)
    )

    df["tipo_falla_frecuente_hist"] = _moda_expandida_previa(df, "clave", "tipo_falla_norm")

    df["dias_hasta_siguiente"] = g["fecha_creacion"].diff(-1).dt.days.abs()
    df["target"] = (df["dias_hasta_siguiente"] <= horizonte_dias).astype(int)

    max_fecha = df["fecha_creacion"].max()
    censurado = df["dias_hasta_siguiente"].isna() & (
        (max_fecha - df["fecha_creacion"]).dt.days < horizonte_dias
    )
    df = df.loc[~censurado].copy()

    for col in COLUMNAS_CATEGORICAS:
        df[col] = df[col].astype("category")

    return df


def construir_estado_actual(df: pd.DataFrame, fecha_referencia=None) -> pd.DataFrame:
    """
    Para predicción: una fila por equipo (clave) con su estado más reciente conocido,
    para estimar el riesgo de reincidencia desde `fecha_referencia` (por defecto, la
    fecha más reciente presente en el CSV cargado).
    """
    df = df.copy()
    if fecha_referencia is None:
        fecha_referencia = df["fecha_creacion"].max()

    g = df.groupby("clave")
    ultimo = df.loc[g["fecha_creacion"].idxmax()].copy()

    conteos = g.size().rename("n_fallas_previas")
    ratio_urgentes = g["tipo_orden_norm"].apply(lambda x: (x == "urgente").mean()).rename("ratio_urgentes_historico")
    primera_fecha = g["fecha_creacion"].min().rename("_primera_fecha")
    moda_falla = g["tipo_falla_norm"].agg(lambda x: x.mode().iat[0] if len(x.dropna()) else "sin_historial")
    moda_falla = moda_falla.rename("tipo_falla_frecuente_hist")

    ultimo = ultimo.merge(conteos, on="clave").merge(ratio_urgentes, on="clave")
    ultimo = ultimo.merge(primera_fecha, on="clave").merge(moda_falla, on="clave")

    ultimo["dias_desde_falla_anterior"] = (fecha_referencia - ultimo["fecha_creacion"]).dt.days
    ultimo["antiguedad_dias"] = (fecha_referencia - ultimo["_primera_fecha"]).dt.days

    for col in COLUMNAS_CATEGORICAS:
        ultimo[col] = ultimo[col].astype("category")

    ultimo["fecha_referencia"] = fecha_referencia
    return ultimo.reset_index(drop=True)
