import { ModeloMetadata, RespuestaPrediccion } from '../types';

const ENDPOINT = '/api/predecir';

export async function obtenerMetadataModelo(): Promise<ModeloMetadata> {
  const res = await fetch(ENDPOINT);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'No se pudo consultar el estado del modelo predictivo.');
  }
  return data.modelo as ModeloMetadata;
}

export async function predecirRiesgo(
  archivos: { nombre: string; contenido: string }[],
  opts: { top?: number; origen?: string } = {}
): Promise<RespuestaPrediccion> {
  // Sin 'top' el backend devuelve todos los equipos evaluados: las metricas
  // del dashboard (totales, prioridad alta, concentracion por sede) necesitan
  // el conjunto completo, no solo una vista recortada.
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archivos, top: opts.top, origen: opts.origen }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Error al generar la predicción de mantenimiento.');
  }
  return data as RespuestaPrediccion;
}
