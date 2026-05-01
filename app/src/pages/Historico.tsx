import { useMemo, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { useCatalog } from '../hooks/useCatalog';
import { fmt, MONTHS_ES } from '../lib/format';

export function Historico() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const range = useMemo(() => ({
    from: new Date(year, 0, 1),
    to: new Date(year + 1, 0, 1),
  }), [year]);
  const { tickets } = useTickets(range);
  const { barbers } = useCatalog();

  const byMonth = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => ({ total: 0, count: 0 }));
    tickets.forEach((t) => {
      const m = new Date(t.occurred_at).getMonth();
      arr[m].total += Number(t.amount);
      arr[m].count += 1;
    });
    return arr;
  }, [tickets]);

  const yearTotal = byMonth.reduce((s, m) => s + m.total, 0);
  const yearCount = byMonth.reduce((s, m) => s + m.count, 0);
  const maxMonth = Math.max(...byMonth.map((m) => m.total), 1);

  const byBarber = useMemo(() => {
    const map: Record<string, number> = {};
    tickets.forEach((t) => {
      map[t.barber_id] = (map[t.barber_id] || 0) + Number(t.amount);
    });
    return barbers
      .map((b) => ({ id: b.id, name: b.name, total: map[b.id] || 0 }))
      .sort((a, b) => b.total - a.total);
  }, [tickets, barbers]);

  return (
    <div className="page">
      <div className="agenda-nav">
        <button className="agenda-nav-btn" onClick={() => setYear(year - 1)} aria-label="Año anterior">‹</button>
        <div className="agenda-date-label">{year}</div>
        <button className="agenda-nav-btn" onClick={() => setYear(year + 1)} aria-label="Año siguiente">›</button>
      </div>

      <div className="metrics-grid">
        <div className="mcard gold">
          <div className="mlabel">Total año</div>
          <div className="mval">{fmt(yearTotal)}</div>
          <div className="msub">{yearCount} ticket{yearCount !== 1 ? 's' : ''}</div>
        </div>
        <div className="mcard">
          <div className="mlabel">Media mensual</div>
          <div className="mval" style={{ color: 'var(--white)' }}>{fmt(yearTotal / 12)}</div>
          <div className="msub">en el año</div>
        </div>
      </div>

      <p className="slabel">Por mes</p>
      <div className="panel">
        <div className="chart-bars">
          {byMonth.map((m, i) => {
            const h = Math.max((m.total / maxMonth) * 85, m.total > 0 ? 5 : 0);
            return (
              <div key={i} className="ccol">
                <div className="camt">{m.total > 0 ? `${m.total.toFixed(0)}` : ''}</div>
                <div className="cbar" style={{ height: `${h}px` }} />
                <div className="clbl">{MONTHS_ES[i].slice(0, 3)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="slabel">Detalle por mes</p>
      <div className="panel" style={{ padding: '0 14px' }}>
        {byMonth.map((m, i) => (
          <div key={i} className="month-row">
            <div className="month-name">{MONTHS_ES[i]}</div>
            <div className="month-count">{m.count} ticket{m.count !== 1 ? 's' : ''}</div>
            <div className="month-total">{fmt(m.total)}</div>
          </div>
        ))}
      </div>

      <p className="slabel">Peluqueros del año</p>
      <div className="barbers-grid">
        {byBarber.map((b) => {
          const pct = yearTotal > 0 ? (b.total / yearTotal) * 100 : 0;
          return (
            <div key={b.id} className="bcard">
              <div className="binitial">{b.name[0]}</div>
              <div className="bname">{b.name}</div>
              <div className="btotal">{fmt(b.total)}</div>
              <div className="bmeta">{pct.toFixed(0)}%</div>
              <div className="bbar"><div className="bfill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
