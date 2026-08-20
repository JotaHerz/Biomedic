import { DisponibilidadResponse, SolicitudAuditoria } from '../types';

export async function consultarDisponibilidad(fecha: string): Promise<DisponibilidadResponse> {
  const res = await fetch(`/api/agendamiento/disponibilidad?fecha=${encodeURIComponent(fecha)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'No se pudo consultar la disponibilidad de horarios.');
  }
  return data as DisponibilidadResponse;
}

export async function enviarSolicitudAuditoria(payload: SolicitudAuditoria): Promise<void> {
  const res = await fetch('/api/agendamiento/solicitar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'No se pudo enviar la solicitud. Intenta de nuevo.');
  }
}
