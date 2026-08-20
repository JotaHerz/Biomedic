
import React, { useEffect, useState } from 'react';
import { obtenerMetadataModelo, predecirRiesgo } from '../services/predictiveMaintenanceService';
import { ModeloMetadata, RiesgoEquipo } from '../types';

const COLOR_PRIORIDAD: Record<string, string> = {
  Alta: 'bg-red-100 text-red-700 border-red-200',
  Media: 'bg-amber-100 text-amber-700 border-amber-200',
  Baja: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PredictiveMaintenance: React.FC = () => {
  const [modelo, setModelo] = useState<ModeloMetadata | null>(null);
  const [modeloError, setModeloError] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultados, setResultados] = useState<RiesgoEquipo[]>([]);
  const [totalEquipos, setTotalEquipos] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerMetadataModelo()
      .then(setModelo)
      .catch((e: Error) => setModeloError(e.message));
  }, []);

  const handleAnalizar = async () => {
    if (!archivo || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const contenido = await archivo.text();
      const respuesta = await predecirRiesgo([{ nombre: archivo.name, contenido }], { top: 50 });
      setModelo(respuesta.modelo);
      setResultados(respuesta.resultados);
      setTotalEquipos(respuesta.total_equipos);
    } catch (e: any) {
      setError(e.message || 'No se pudo generar la predicción. Verifica el formato del CSV.');
      setResultados([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescargar = () => {
    if (!resultados.length) return;
    const columnas = Object.keys(resultados[0]);
    const filas = resultados.map((r) =>
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

          {resultados.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <h3 className="font-bold text-slate-800">
                  Top {resultados.length} de {totalEquipos} equipos evaluados
                </h3>
                <button onClick={handleDescargar} className="text-sky-600 hover:text-sky-700 text-sm font-semibold">
                  Descargar CSV completo
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
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
                    {resultados.map((r, i) => (
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
          )}
        </div>
      </div>
    </section>
  );
};

export default PredictiveMaintenance;
