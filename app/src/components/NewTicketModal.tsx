import { useState, type FormEvent } from 'react';
import { Modal, SegGroup } from './Modal';
import { useCatalog } from '../hooks/useCatalog';
import { insertTicket } from '../hooks/useTickets';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../lib/auth';
import { fmt } from '../lib/format';
import type { Barber, PaymentMethod, Service } from '../types/db';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'bizum', label: 'Bizum' },
];

export function NewTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { barbers, services } = useCatalog();
  const { profile } = useAuth();
  const { show } = useToast();
  const [client, setClient] = useState('');
  const [barberId, setBarberId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = services.find((s) => s.id === serviceId);
  const selectedBarber = barbers.find((b) => b.id === barberId);
  const parsedAmount = parseFloat(amount);
  const payLabel = parsedAmount > 0 ? fmt(parsedAmount) : '— €';

  function pickService(id: string) {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc && svc.price > 0) setAmount(String(svc.price));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!barberId) return show('Elige un peluquero');
    if (!serviceId) return show('Elige un servicio');
    if (!method) return show('Elige método de pago');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return show('Importe inválido');

    setSubmitting(true);
    const { error } = await insertTicket({
      barber_id: barberId,
      service_id: serviceId,
      amount: amt,
      method,
      client: client.trim() || null,
      created_by: profile?.id ?? null,
    });
    setSubmitting(false);
    if (error) return show(error.message);
    const barberName = barbers.find((b) => b.id === barberId)?.name ?? 'Peluquero';
    const serviceName = selectedService?.name ?? 'Servicio';
    show({
      title: 'Cobro registrado',
      amount: fmt(amt),
      detail: `${barberName} · ${serviceName} · ${method}`,
    });
    setClient('');
    setBarberId(null);
    setServiceId(null);
    setAmount('');
    setMethod(null);
    onCreated();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="NUEVO COBRO" subtitle="Caja rápida">
      <form onSubmit={onSubmit} className="pay-form">
        <div className="pay-hero">
          <div className="pay-hero-label">Total a cobrar</div>
          <div className="pay-hero-amount">{payLabel}</div>
          <div className="pay-hero-meta">
            {[selectedBarber?.name, selectedService?.name, method].filter(Boolean).join(' · ') || 'Selecciona peluquero, servicio y pago'}
          </div>
        </div>

        <div className="fg">
          <label>Peluquero</label>
          <BarberGrid barbers={barbers} value={barberId} onChange={setBarberId} />
        </div>
        <div className="fg">
          <label>Servicio</label>
          <ServiceGrid services={services} value={serviceId} onChange={pickService} />
        </div>
        <div className="fg">
          <label>Ajustar importe (€)</label>
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
          {submitting ? 'Guardando…' : `Cobrar ${payLabel}`}
        </button>
      </form>
    </Modal>
  );
}

function BarberGrid({
  barbers,
  value,
  onChange,
}: {
  barbers: Barber[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="choice-grid barber-choice-grid">
      {barbers.map((barber) => (
        <button
          key={barber.id}
          type="button"
          className={`choice-tile barber-choice${value === barber.id ? ' selected' : ''}`}
          onClick={() => onChange(barber.id)}
        >
          <span className="choice-initial">{barber.name[0]}</span>
          <span className="choice-name">{barber.name}</span>
        </button>
      ))}
    </div>
  );
}

function ServiceGrid({
  services,
  value,
  onChange,
}: {
  services: Service[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="choice-grid service-choice-grid">
      {services.map((service) => (
        <button
          key={service.id}
          type="button"
          className={`choice-tile service-choice${value === service.id ? ' selected' : ''}`}
          onClick={() => onChange(service.id)}
        >
          <span className="choice-name">{service.name}</span>
          <span className="choice-price">{fmt(Number(service.price))}</span>
        </button>
      ))}
    </div>
  );
}
