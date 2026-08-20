
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface RiesgoEquipo {
  clave: string;
  equipos: string;
  sede: string;
  ubicacion: string;
  _origen?: string;
  fecha_creacion: string;
  dias_desde_falla_anterior: number | null;
  n_fallas_previas: number;
  tipo_falla_frecuente_hist: string | null;
  probabilidad_riesgo: number;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

export interface ModeloMetadata {
  horizonte_dias: number;
  columnas_features: string[];
  columnas_categoricas: string[];
  n_entrenamiento: number;
  roc_auc_holdout_global?: number;
  roc_auc_holdout_por_origen?: Record<string, number>;
  rango_fechas: [string, string];
  fuentes: string[];
}

export interface RespuestaPrediccion {
  modelo: ModeloMetadata;
  total_equipos: number;
  resultados: RiesgoEquipo[];
}
