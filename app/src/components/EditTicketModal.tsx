import { useEffect, useState, type FormEvent } from 'react';
import { Modal, SegGroup } from './Modal';
import { useCatalog } from '../hooks/useCatalog';
import { updateTicket } from '../hooks/useTickets';
import { useToast } from '../hooks/useToast';
import type { PaymentMethod, TicketWithRelations } from '../types/db';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'bizum', label: 'Bizum' },
];

export function EditTicketModal({
  ticket,
  onClose,
  onUpdated,
}: {
  ticket: TicketWithRelations | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { barbers, services } = useCatalog();
  const { show } = useToast();
  const [client, setClient] = useState('');
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!ticket) return;
    setClient(ticket.client ?? '');
    setBarberId(ticket.barber_id);
    setServiceId(ticket.service_id);
    setAmount(String(Number(ticket.amount)));
    setMethod(ticket.method);
  }, [ticket]);

  function pickService(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc && svc.price > 0) setAmount(String(svc.price));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    if (!barberId) return show('Elige un peluquero');
    if (!serviceId) return show('Elige un servicio');
    if (!method) return show('Elige método de pago');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return show('Importe inválido');

    setSubmitting(true);
    const { error } = await updateTicket(ticket.id, {
      barber_id: barberId,
      service_id: serviceId,
      amount: amt,
      method,
      client: client.trim() || null,
    });
    setSubmitting(false);
    if (error) return show(error.message);
    show('Ticket actualizado ✓');
    onUpdated();
    onClose();
  }

  return (
    <Modal open={Boolean(ticket)} onClose={onClose} title="EDITAR TICKET" subtitle="Corregir cobro">
      <form onSubmit={onSubmit}>
        <div className="fg">
          <label>Cliente (opcional)</label>
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Nombre del cliente"
          />
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
            onChange={pickService}
          />
        </div>
        <div className="fg">
          <label>Importe (€)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
          {selectedService && selectedService.price > 0 && (
            <div className="price-hint">Precio configurado: {selectedService.price} €</div>
          )}
        </div>
        <div className="fg">
          <label>Método de pago</label>
          <SegGroup options={METHODS} value={method} onChange={setMethod} />
        </div>
        <button type="submit" className="btn-submit" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </Modal>
  );
}
