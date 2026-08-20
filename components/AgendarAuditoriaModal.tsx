
import React, { useEffect, useState } from 'react';
import { consultarDisponibilidad, enviarSolicitudAuditoria } from '../services/agendamientoService';
import { SERVICIOS_BIOMEDICS } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type EstadoDisponibilidad = 'idle' | 'cargando' | 'lista' | 'error';
type EstadoEnvio = 'idle' | 'enviando' | 'confirmado' | 'error';

function esFinDeSemana(fechaISO: string): boolean {
  const dia = new Date(fechaISO + 'T00:00:00').getDay();
  return dia === 0 || dia === 6;
}

function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const estadoInicial = {
  nombre: '',
  correo: '',
  empresa: '',
  servicio: SERVICIOS_BIOMEDICS[0],
  fecha: '',
  hora: '',
  mensaje: '',
};

const AgendarAuditoriaModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [form, setForm] = useState(estadoInicial);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [estadoDisponibilidad, setEstadoDisponibilidad] = useState<EstadoDisponibilidad>('idle');
  const [errorDisponibilidad, setErrorDisponibilidad] = useState<string | null>(null);
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio>('idle');
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm(estadoInicial);
      setHorarios([]);
      setEstadoDisponibilidad('idle');
      setErrorDisponibilidad(null);
      setEstadoEnvio('idle');
      setErrorEnvio(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFechaChange = async (fecha: string) => {
    setForm((f) => ({ ...f, fecha, hora: '' }));
    setHorarios([]);
    setErrorDisponibilidad(null);

    if (!fecha) {
      setEstadoDisponibilidad('idle');
      return;
    }
    if (esFinDeSemana(fecha)) {
      setEstadoDisponibilidad('error');
      setErrorDisponibilidad('No agendamos auditorías en fin de semana. Elige un día entre lunes y viernes.');
      return;
    }

    setEstadoDisponibilidad('cargando');
    try {
      const respuesta = await consultarDisponibilidad(fecha);
      setHorarios(respuesta.horarios_disponibles);
      setEstadoDisponibilidad('lista');
      if (respuesta.horarios_disponibles.length === 0) {
        setErrorDisponibilidad('No quedan horarios libres ese día. Prueba con otra fecha.');
      }
    } catch (e: any) {
      setEstadoDisponibilidad('error');
      setErrorDisponibilidad(e.message || 'No se pudo consultar la disponibilidad.');
    }
  };

  const formularioValido =
    form.nombre.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.correo) &&
    form.empresa.trim().length > 0 &&
    form.servicio.trim().length > 0 &&
    form.fecha.length > 0 &&
    form.hora.length > 0 &&
    form.mensaje.trim().length >= 20;

  const handleSubmit = async () => {
    if (!formularioValido || estadoEnvio === 'enviando') return;
    setEstadoEnvio('enviando');
    setErrorEnvio(null);
    try {
      await enviarSolicitudAuditoria(form);
      setEstadoEnvio('confirmado');
    } catch (e: any) {
      setEstadoEnvio('error');
      setErrorEnvio(e.message || 'No se pudo enviar la solicitud.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-sky-600 px-6 py-5 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg">Agendar Auditoría</h3>
            <p className="text-sky-100 text-sm">Cuéntanos tu necesidad y reservamos el espacio en el calendario.</p>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition-colors flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto chat-scrollbar">
          {estadoEnvio === 'confirmado' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Solicitud recibida</h4>
              <p className="text-slate-600 max-w-sm mx-auto">
                Te enviaremos la confirmación de tu auditoría el <strong>{form.fecha}</strong> a las{' '}
                <strong>{form.hora}</strong>, junto con un plan de trabajo preliminar, al correo{' '}
                <strong>{form.correo}</strong>.
              </p>
              <button
                onClick={onClose}
                className="mt-6 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold transition-all"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Correo</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Empresa</label>
                  <input
                    type="text"
                    value={form.empresa}
                    onChange={(e) => setForm((f) => ({ ...f, empresa: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    placeholder="Institución de salud"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Servicio</label>
                  <select
                    value={form.servicio}
                    onChange={(e) => setForm((f) => ({ ...f, servicio: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-white"
                  >
                    {SERVICIOS_BIOMEDICS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fecha</label>
                <input
                  type="date"
                  min={manana()}
                  value={form.fecha}
                  onChange={(e) => handleFechaChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </div>

              {form.fecha && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Horario disponible</label>
                  {estadoDisponibilidad === 'cargando' && (
                    <p className="text-sm text-slate-400">Consultando disponibilidad...</p>
                  )}
                  {errorDisponibilidad && (
                    <p className="text-sm text-red-500">{errorDisponibilidad}</p>
                  )}
                  {estadoDisponibilidad === 'lista' && horarios.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {horarios.map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, hora: h }))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                            form.hora === h
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                          }`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Describe tu necesidad
                </label>
                <textarea
                  value={form.mensaje}
                  onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
                  placeholder="Ej: Necesitamos calibrar 12 monitores de signos vitales antes de fin de mes..."
                />
                <p className="text-[11px] text-slate-400 mt-1">Mínimo 20 caracteres ({form.mensaje.trim().length}/20)</p>
              </div>

              {errorEnvio && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
                  {errorEnvio}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!formularioValido || estadoEnvio === 'enviando'}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                {estadoEnvio === 'enviando' ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgendarAuditoriaModal;
