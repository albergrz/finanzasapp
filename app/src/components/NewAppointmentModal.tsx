import { useState, type FormEvent } from 'react';
import { Modal, SegGroup } from './Modal';
import { useCatalog } from '../hooks/useCatalog';
import { insertAppointment } from '../hooks/useAppointments';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../lib/auth';
import { dateKey, DAYS_ES, MONTHS_ES } from '../lib/format';

export function NewAppointmentModal({
  open,
  onClose,
  date,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  date: Date;
  onCreated: () => void;
}) {
  const { barbers, services } = useCatalog();
  const { profile } = useAuth();
  const { show } = useToast();
  const [time, setTime] = useState('');
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [client, setClient] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subtitle = `${DAYS_ES[date.getDay()]} ${date.getDate()} de ${MONTHS_ES[date.getMonth()].toLowerCase()}`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!time) return show('Indica la hora');
    if (!barberId) return show('Elige un peluquero');
    if (!serviceId) return show('Elige un servicio');

    setSubmitting(true);
    const { error } = await insertAppointment({
      barber_id: barberId,
      service_id: serviceId,
      appt_date: dateKey(date),
      appt_time: time + ':00',
      client: client.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    if (error) return show(error.message);
    show('Cita añadida ✓');
    setTime('');
    setBarberId(null);
    setServiceId(null);
    setClient('');
    onCreated();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NUEVA CITA" subtitle={subtitle}>
      <form onSubmit={onSubmit}>
        <div className="fg">
          <label>Hora</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} step={300} />
        </div>
        <div className="fg">
          <label>Peluquero</label>
          <SegGroup
            options={barbers.map((b) => ({ value: b.id, label: b.name }))}
            value={barberId}
            onChange={setBarberId}
          />
        </div>
        <div className="fg">
          <label>Servicio</label>
          <SegGroup
            options={services.map((s) => ({ value: s.id, label: s.name }))}
            value={serviceId}
            onChange={setServiceId}
          />
        </div>
        <div className="fg">
          <label>Cliente (opcional)</label>
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Nombre del cliente"
          />
        </div>
        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? 'Añadiendo…' : 'Añadir cita'}
        </button>
      </form>
    </Modal>
  );
}
