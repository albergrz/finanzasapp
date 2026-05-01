import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets, deleteTicket } from '../hooks/useTickets';
import { useAppointmentsForDate } from '../hooks/useAppointments';
import { useCatalog } from '../hooks/useCatalog';
import { usePeriod } from '../lib/period';
import { fmt, periodRange } from '../lib/format';
import { useToast } from '../hooks/useToast';
import { NewTicketModal } from '../components/NewTicketModal';
import { EditTicketModal } from '../components/EditTicketModal';
import { useAuth } from '../lib/auth';
import type { TicketWithRelations } from '../types/db';

export function Dashboard() {
  const { period } = usePeriod();
  const range = useMemo(() => periodRange(period), [period]);
  const { tickets, refresh } = useTickets(range);
  const { tickets: weekTickets } = useTickets(useMemo(() => periodRange('week'), []));
  const { barbers } = useCatalog();
  const { profile } = useAuth();
  const { appointments: todayAppts } = useAppointmentsForDate(new Date());
  const { show } = useToast();
  const nav = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketWithRelations | null>(null);
  const isJefe = profile?.role === 'jefe';

  const total = tickets.reduce((s, t) => s + Number(t.amount), 0);
  const avg = tickets.length ? total / tickets.length : 0;

  const byMethod = { efectivo: 0, tarjeta: 0, bizum: 0 } as Record<string, number>;
  tickets.forEach((t) => { byMethod[t.method] = (byMethod[t.method] || 0) + Number(t.amount); });

  const byService: Record<string, { name: string; total: number }> = {};
  tickets.forEach((t) => {
    const k = t.service.id;
    if (!byService[k]) byService[k] = { name: t.service.name, total: 0 };
    byService[k].total += Number(t.amount);
  });
  const serviceRanking = Object.values(byService).sort((a, b) => b.total - a.total);
  const maxSvc = serviceRanking[0]?.total ?? 0;

  const pendingToday = todayAppts.filter((a) => a.status === 'pending').length;

  const weekData = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const off = dow === 0 ? -6 : 1 - dow;
    const LBLS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() + off + i);
      d.setHours(0, 0, 0, 0);
      const ds = d.toDateString();
      const tot = weekTickets
        .filter((t) => new Date(t.occurred_at).toDateString() === ds)
        .reduce((s, t) => s + Number(t.amount), 0);
      return { lbl: LBLS[i], tot, isToday: ds === now.toDateString() };
    });
  }, [weekTickets]);
  const wMax = Math.max(...weekData.map((d) => d.tot), 1);

  async function onDelete(id: string) {
    if (!confirm('¿Eliminar este ticket?')) return;
    const { error } = await deleteTicket(id);
    if (error) return show(error.message);
    show('Ticket eliminado');
    refresh();
  }

  return (
    <div className="page">
      {pendingToday > 0 && (
        <div className="alert-banner" onClick={() => nav('/agenda')}>
          <span className="alert-banner-icon">📋</span>
          <span className="alert-banner-text">
            {pendingToday} cita{pendingToday !== 1 ? 's' : ''} pendiente{pendingToday !== 1 ? 's' : ''} hoy
          </span>
          <span className="alert-banner-arrow">→</span>
        </div>
      )}

      <p className="slabel">Caja</p>
      <div className="metrics-grid">
        <div className="mcard gold">
          <div className="mlabel">Caja del periodo</div>
          <div className="mval">{fmt(total)}</div>
          <div className="msub">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="mcard">
          <div className="mlabel">Ticket medio</div>
          <div className="mval" style={{ color: 'var(--white)' }}>{tickets.length ? fmt(avg) : '— €'}</div>
          <div className="msub">por servicio</div>
        </div>
        <div className="mcard" style={{ gridColumn: 'span 2' }}>
          <div className="mlabel">Método de pago</div>
          <div className="pay-row">
            {(['efectivo', 'tarjeta', 'bizum'] as const).map((m) => (
              <span key={m} className={`pchip ${m}`}>
                <span className="cdot" />
                {m.charAt(0).toUpperCase() + m.slice(1)} {fmt(byMethod[m] || 0)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="slabel">Peluqueros</p>
      <div className="barbers-grid">
        {barbers.map((b) => {
          const bt = tickets.filter((t) => t.barber_id === b.id);
          const tot = bt.reduce((s, t) => s + Number(t.amount), 0);
          const pct = total > 0 ? (tot / total) * 100 : 0;
          return (
            <div key={b.id} className="bcard">
              <div className="binitial">{b.name[0]}</div>
              <div className="bname">{b.name}</div>
              <div className="btotal">{fmt(tot)}</div>
              <div className="bmeta">{bt.length} ticket{bt.length !== 1 ? 's' : ''} · {pct.toFixed(0)}%</div>
              <div className="bbar"><div className="bfill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <p className="slabel">Análisis</p>
      <div className="two-col">
        <div className="panel">
          <div className="ptitle">Servicios más vendidos</div>
          {serviceRanking.length ? (
            serviceRanking.map((s) => (
              <div key={s.name} className="svcrow">
                <div className="svcname">{s.name}</div>
                <div className="svcbar-wrap">
                  <div className="svcbar-fill" style={{ width: `${maxSvc > 0 ? (s.total / maxSvc) * 100 : 0}%` }} />
                </div>
                <div className="svcamt">{fmt(s.total)}</div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-title">Aún no hay cobros</div>
              <button className="empty-action" onClick={() => setShowNew(true)}>Crear primer cobro</button>
            </div>
          )}
        </div>
        <div className="panel">
          <div className="ptitle">Esta semana</div>
          <div className="chart-bars">
            {weekData.map((d) => {
              const h = Math.max((d.tot / wMax) * 85, d.tot > 0 ? 5 : 0);
              return (
                <div key={d.lbl} className={`ccol${d.isToday ? ' today' : ''}`}>
                  <div className="camt">{d.tot > 0 ? `${d.tot.toFixed(0)}€` : ''}</div>
                  <div className={`cbar${d.isToday ? ' today' : ''}`} style={{ height: `${h}px` }} />
                  <div className="clbl">{d.lbl}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="slabel">Últimos tickets</p>
      <div className="panel" style={{ padding: '0 14px' }}>
        {tickets.length ? (
          tickets.slice(0, 20).map((t) => (
            <TicketRow
              key={t.id}
              t={t}
              canManage={isJefe}
              onEdit={() => setEditingTicket(t)}
              onDelete={() => onDelete(t.id)}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-title">Aún no hay tickets en este periodo</div>
            <button className="empty-action" onClick={() => setShowNew(true)}>Nuevo cobro</button>
          </div>
        )}
      </div>

      <button className="fab fab-cash" onClick={() => setShowNew(true)} aria-label="Nuevo cobro">
        <span className="fab-plus">+</span>
        <span className="fab-label">Cobrar</span>
      </button>
      <NewTicketModal open={showNew} onClose={() => setShowNew(false)} onCreated={refresh} />
      <EditTicketModal ticket={editingTicket} onClose={() => setEditingTicket(null)} onUpdated={refresh} />
    </div>
  );
}

function TicketRow({
  t,
  canManage,
  onEdit,
  onDelete,
}: {
  t: TicketWithRelations;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const d = new Date(t.occurred_at);
  const ts = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const ds = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  return (
    <div className="titem">
      <div className="tinit">{t.barber.name[0]}</div>
      <div className="tinfo">
        <div className="tsvc">{t.barber.name} · {t.service.name}</div>
        {t.client && <div className="tclient">{t.client}</div>}
        <div className="tmeta">{ds} · {ts}</div>
      </div>
      <div className="tright">
        <span className="tbarber">{t.barber.name}</span>
        <span className={`tmethod ${t.method}`}>{t.method}</span>
        <span className="tamt">{fmt(Number(t.amount))}</span>
        {canManage && (
          <>
            <button className="tedit" onClick={onEdit} aria-label="Editar">Editar</button>
            <button className="tdel" onClick={onDelete} aria-label="Eliminar">×</button>
          </>
        )}
      </div>
    </div>
  );
}
