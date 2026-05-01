import { useEffect, useState, type FormEvent } from 'react';
import { Modal, SegGroup } from './Modal';
import { insertTicket } from '../hooks/useTickets';
import { markAppointmentDone } from '../hooks/useAppointments';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../lib/auth';
import { fmt } from '../lib/format';
import type { AppointmentWithRelations, PaymentMethod } from '../types/db';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'bizum', label: 'Bizum' },
];

export function CobrarModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: AppointmentWithRelations | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { profile } = useAuth();
  const { show } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appointment?.service.price && appointment.service.price > 0) {
      setAmount(String(appointment.service.price));
    } else {
      setAmount('');
    }
    setMethod(null);
  }, [appointment]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!appointment) return;
    if (!method) return show('Elige método de pago');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return show('Importe inválido');

    setSubmitting(true);
    const ticketRes = await insertTicket({
      barber_id: appointment.barber_id,
      service_id: appointment.service_id,
      amount: amt,
      method,
      client: appointment.client,
      appointment_id: appointment.id.startsWith('google:') ? null : appointment.id,
      created_by: profile?.id ?? null,
    });
    if (ticketRes.error) {
      setSubmitting(false);
      return show(ticketRes.error.message);
    }
    await markAppointmentDone(appointment.id, ticketRes.data!.id);
    setSubmitting(false);
    show({
      title: 'Cita cobrada',
      amount: fmt(amt),
      detail: `${appointment.barber.name} · ${appointment.service.name} · ${method}`,
    });
    onDone();
    onClose();
  }

  return (
    <Modal open={!!appointment} onClose={onClose} title="COBRAR CITA" subtitle="Confirmar pago">
      {appointment && (
        <>
          <div className="cobrar-info">
            <div className="cobrar-svc">
              {appointment.service.name}
              {appointment.client ? ' · ' + appointment.client : ''}
            </div>
            <div className="cobrar-meta">
              {appointment.barber.name} · {appointment.appt_time.slice(0, 5)}
            </div>
          </div>
          <form onSubmit={onSubmit}>
            <div className="fg">
              <label>Importe (€)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="fg">
              <label>Método de pago</label>
              <SegGroup options={METHODS} value={method} onChange={setMethod} />
            </div>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Confirmar cobro'}
            </button>
          </form>
        </>
      )}
    </Modal>
  );
}
