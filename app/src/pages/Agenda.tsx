import { useState } from 'react';
import { useAppointmentsForDate, cancelAppointment } from '../hooks/useAppointments';
import { useToast } from '../hooks/useToast';
import { DAYS_ES, MONTHS_ES } from '../lib/format';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import { CobrarModal } from '../components/CobrarModal';
import type { AppointmentWithRelations } from '../types/db';

export function Agenda() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const { appointments, refresh } = useAppointmentsForDate(date);
  const { show } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [cobrar, setCobrar] = useState<AppointmentWithRelations | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();
  const dayLabel = isToday
    ? 'HOY'
    : `${date.getDate()} ${MONTHS_ES[date.getMonth()].slice(0, 3).toUpperCase()}`;
  const sub = `${DAYS_ES[date.getDay()]} ${date.getDate()} ${MONTHS_ES[date.getMonth()].toLowerCase()}`;

  function shift(days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  }

  const counts = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    done: appointments.filter((a) => a.status === 'done').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  };

  async function onCancel(id: string) {
    if (!confirm('¿Cancelar esta cita?')) return;
    const { error } = await cancelAppointment(id);
    if (error) return show(error.message);
    show('Cita cancelada');
    refresh();
  }

  return (
    <div className="page">
      <div className="agenda-nav">
        <button className="agenda-nav-btn" onClick={() => shift(-1)} aria-label="Día anterior">‹</button>
        <div>
          <div className="agenda-date-label">{dayLabel}</div>
          <div className="agenda-date-sub">{sub}</div>
        </div>
        <button className="agenda-nav-btn" onClick={() => shift(1)} aria-label="Día siguiente">›</button>
      </div>

      <div className="agenda-summary">
        <span className="asumchip total">{counts.total} cita{counts.total !== 1 ? 's' : ''}</span>
        <span className="asumchip pendientes">{counts.pending} pendiente{counts.pending !== 1 ? 's' : ''}</span>
        <span className="asumchip cobradas">{counts.done} cobrada{counts.done !== 1 ? 's' : ''}</span>
        {counts.cancelled > 0 && (
          <span className="asumchip canceladas">{counts.cancelled} cancelada{counts.cancelled !== 1 ? 's' : ''}</span>
        )}
      </div>

      {appointments.length ? (
        appointments.map((a) => (
          <div key={a.id} className={`aitem ${a.status}`}>
            <div className={`atime ${a.status}`}>{a.appt_time.slice(0, 5)}</div>
            <div className="ainfo">
              <div className="asvc">{a.service.name}</div>
              {a.client && <div className="aclient">{a.client}</div>}
            </div>
            <div className="abarber">{a.barber.name[0]}</div>
            {a.status === 'pending' && (
              <>
                <button className="abtn" onClick={() => setCobrar(a)}>Cobrar</button>
                <button className="abtn cancel-btn" onClick={() => onCancel(a.id)} aria-label="Cancelar">×</button>
              </>
            )}
            {a.status === 'done' && <span className="abadge done">Cobrada</span>}
            {a.status === 'cancelled' && <span className="abadge cancelled">Cancelada</span>}
          </div>
        ))
      ) : (
        <div className="empty-state agenda-empty">
          <div className="empty-title">{isToday ? 'No hay citas para hoy' : 'No hay citas este día'}</div>
          <button className="empty-action" onClick={() => setShowNew(true)}>Añadir cita</button>
        </div>
      )}

      <button className="fab" onClick={() => setShowNew(true)} aria-label="Nueva cita">
        <span className="fab-plus">+</span>
      </button>
      <NewAppointmentModal open={showNew} onClose={() => setShowNew(false)} date={date} onCreated={refresh} />
      <CobrarModal appointment={cobrar} onClose={() => setCobrar(null)} onDone={refresh} />
    </div>
  );
}
