
import React, { useEffect, useMemo, useState } from 'react';
import { obtenerMetadataModelo, predecirRiesgo } from '../services/predictiveMaintenanceService';
import { ModeloMetadata, RiesgoEquipo } from '../types';

type FiltroPrioridad = 'Todos' | 'Alta' | 'Media' | 'Baja';

const COLOR_PRIORIDAD: Record<string, string> = {
  Alta: 'bg-red-100 text-red-700 border-red-200',
  Media: 'bg-amber-100 text-amber-700 border-amber-200',
  Baja: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const COLOR_FILTRO_ACTIVO: Record<FiltroPrioridad, string> = {
  Todos: 'bg-slate-800 text-white border-slate-800',
  Alta: 'bg-red-600 text-white border-red-600',
  Media: 'bg-amber-500 text-white border-amber-500',
  Baja: 'bg-emerald-600 text-white border-emerald-600',
};

interface Metricas {
  totalEquipos: number;
  incidenciasHistoricas: number;
  prioridadAlta: number;
  urgenciasHistoricas: number;
}

interface ConcentracionSede {
  sede: string;
  total: number;
  alta: number;
  media: number;
  baja: number;
  pctAlta: number;
}

function calcularMetricas(resultados: RiesgoEquipo[], totalEquiposApi: number): Metricas {
  let incidenciasHistoricas = 0;
  let prioridadAlta = 0;
  let urgenciasHistoricas = 0;

  for (const r of resultados) {
    incidenciasHistoricas += r.n_fallas_previas || 0;
    if (r.prioridad === 'Alta') prioridadAlta += 1;
    if (r.ratio_urgentes_historico != null) {
      urgenciasHistoricas += Math.round(r.ratio_urgentes_historico * (r.n_fallas_previas || 0));
    }
  }

  return {
    totalEquipos: totalEquiposApi || resultados.length,
    incidenciasHistoricas,
    prioridadAlta,
    urgenciasHistoricas,
  };
}

function calcularConcentracionPorSede(resultados: RiesgoEquipo[]): ConcentracionSede[] {
  const porSede = new Map<string, ConcentracionSede>();

  for (const r of resultados) {
    const sede = r.sede || 'Sin sede';
    if (!porSede.has(sede)) {
      porSede.set(sede, { sede, total: 0, alta: 0, media: 0, baja: 0, pctAlta: 0 });
    }
    const acc = porSede.get(sede)!;
    acc.total += 1;
    if (r.prioridad === 'Alta') acc.alta += 1;
    else if (r.prioridad === 'Media') acc.media += 1;
    else acc.baja += 1;
  }

  return Array.from(porSede.values())
    .map((s) => ({ ...s, pctAlta: s.total ? s.alta / s.total : 0 }))
    .sort((a, b) => b.alta - a.alta || b.pctAlta - a.pctAlta)
    .slice(0, 6);
}

const PredictiveMaintenance: React.FC = () => {
  const [modelo, setModelo] = useState<ModeloMetadata | null>(null);
  const [modeloError, setModeloError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultados, setResultados] = useState<RiesgoEquipo[]>([]);
  const [totalEquipos, setTotalEquipos] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroPrioridad>('Todos');

  useEffect(() => {
    obtenerMetadataModelo()
      .then(setModelo)
      .catch((e: Error) => setModeloError(e.message));
  }, []);

  const metricas = useMemo(() => calcularMetricas(resultados, totalEquipos), [resultados, totalEquipos]);
  const concentracionSedes = useMemo(() => calcularConcentracionPorSede(resultados), [resultados]);
  const planDeAccion = useMemo(
    () =>
      [...resultados]
        .filter((r) => r.prioridad === 'Alta')
        .sort((a, b) => b.probabilidad_riesgo - a.probabilidad_riesgo)
        .slice(0, 8),
    [resultados]
  );
  const resultadosFiltrados = useMemo(
    () => (filtro === 'Todos' ? resultados : resultados.filter((r) => r.prioridad === filtro)),
    [resultados, filtro]
  );

  const handleAnalizar = async () => {
    if (!archivo || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const contenido = await archivo.text();
      const respuesta = await predecirRiesgo([{ nombre: archivo.name, contenido }]);
      setModelo(respuesta.modelo);
      setResultados(respuesta.resultados);
      setTotalEquipos(respuesta.total_equipos);
      setFiltro('Todos');
    } catch (e: any) {
      setError(e.message || 'No se pudo generar la predicción. Verifica el formato del CSV.');
      setResultados([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescargar = () => {
    if (!resultadosFiltrados.length) return;
    const columnas = Object.keys(resultadosFiltrados[0]);
    const filas = resultadosFiltrados.map((r) =>
      columnas.map((c) => JSON.stringify((r as Record<string, unknown>)[c] ?? '')).join(',')
    );
    const csv = [columnas.join(','), ...filas].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riesgo_equipos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="mantenimiento-predictivo" className="py-24 bg-slate-50 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Mantenimiento Predictivo</h2>
          <div className="w-24 h-1.5 bg-sky-500 mx-auto rounded-full"></div>
          <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto">
            Sube tu reporte de incidencias y nuestro modelo de aprendizaje automático estima qué equipos tienen mayor riesgo de fallar próximamente.
          </p>
          {modelo && (
            <div className="mt-6 inline-flex flex-wrap justify-center gap-3 text-xs font-semibold text-sky-700">
              <span className="bg-sky-100 px-3 py-1 rounded-full">Horizonte: {modelo.horizonte_dias} días</span>
              <span className="bg-sky-100 px-3 py-1 rounded-full">Entrenado con {modelo.n_entrenamiento.toLocaleString('es-CO')} registros</span>
              <span className="bg-sky-100 px-3 py-1 rounded-full">Datos: {modelo.rango_fechas[0]} a {modelo.rango_fechas[1]}</span>
            </div>
          )}
          {modeloError && <p className="mt-4 text-sm text-red-500">{modeloError}</p>}
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              className="flex-1 w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-sky-50 file:text-sky-700 file:font-semibold hover:file:bg-sky-100"
            />
            <button
              onClick={handleAnalizar}
              disabled={!archivo || isLoading}
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              {isLoading ? 'Analizando...' : 'Analizar riesgo'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Formato esperado: el mismo CSV del reporte de incidencias (columnas sede, equipos, activo, tipo_falla, tipo_orden, fecha_creación, ...).
          </p>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm">
              {error}
            </div>
          )}
        </div>

        {resultados.length > 0 && (
          <div className="mt-10 space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Equipos evaluados</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{metricas.totalEquipos.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incidencias históricas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{metricas.incidenciasHistoricas.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Prioridad alta</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{metricas.prioridadAlta.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Urgencias históricas</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{metricas.urgenciasHistoricas.toLocaleString('es-CO')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Plan de accion */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">Plan de acción — qué atender primero</h3>
                <p className="text-xs text-slate-400 mb-4">Equipos de prioridad alta ordenados por riesgo</p>
                {planDeAccion.length === 0 ? (
                  <p className="text-sm text-emerald-600 font-medium">Sin equipos de prioridad alta por ahora.</p>
                ) : (
                  <ol className="space-y-3">
                    {planDeAccion.map((r, i) => (
                      <li key={r.clave + i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.equipos}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {r.sede} · {r.ubicacion} · {r.tipo_falla_frecuente_hist || 'falla sin patrón claro'}
                          </p>
                        </div>
                        <span className="flex-shrink-0 text-sm font-bold text-red-600">
                          {(r.probabilidad_riesgo * 100).toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Concentracion por sede */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-1">Concentración de riesgo por sede</h3>
                <p className="text-xs text-slate-400 mb-4">% de equipos en prioridad alta por sede</p>
                <div className="space-y-3">
                  {concentracionSedes.map((s) => (
                    <div key={s.sede}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 truncate pr-2">{s.sede}</span>
                        <span className="text-slate-500 flex-shrink-0">
                          {s.alta}/{s.total} equipos ({(s.pctAlta * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.max(s.pctAlta * 100, s.alta > 0 ? 4 : 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabla filtrable */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <h3 className="font-bold text-slate-800">
                  Mostrando {resultadosFiltrados.length} de {resultados.length} equipos evaluados
                </h3>
                <button onClick={handleDescargar} className="text-sky-600 hover:text-sky-700 text-sm font-semibold">
                  Descargar CSV
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {(['Todos', 'Alta', 'Media', 'Baja'] as FiltroPrioridad[]).map((opcion) => (
                  <button
                    key={opcion}
                    onClick={() => setFiltro(opcion)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      filtro === opcion
                        ? COLOR_FILTRO_ACTIVO[opcion]
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opcion}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto overflow-y-auto max-h-[28rem] rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">Equipo</th>
                      <th className="px-4 py-3 text-left">Sede</th>
                      <th className="px-4 py-3 text-left">Ubicación</th>
                      <th className="px-4 py-3 text-left">Falla frecuente</th>
                      <th className="px-4 py-3 text-right">Riesgo</th>
                      <th className="px-4 py-3 text-center">Prioridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultadosFiltrados.map((r, i) => (
                      <tr key={r.clave + i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{r.equipos}</td>
                        <td className="px-4 py-3 text-slate-600">{r.sede}</td>
                        <td className="px-4 py-3 text-slate-600">{r.ubicacion}</td>
                        <td className="px-4 py-3 text-slate-600">{r.tipo_falla_frecuente_hist || '-'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {(r.probabilidad_riesgo * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${COLOR_PRIORIDAD[r.prioridad] || ''}`}>
                            {r.prioridad}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PredictiveMaintenance;
