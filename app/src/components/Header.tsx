import { DAYS_ES, MONTHS_ES } from '../lib/format';
import { usePeriod } from '../lib/period';
import type { Period } from '../lib/format';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'all', label: 'Total' },
];

export function Header({ subtitle, showPeriodTabs }: { subtitle: string; showPeriodTabs: boolean }) {
  const now = new Date();
  const dateLine = `${DAYS_ES[now.getDay()]}<br>${now.getDate()} ${MONTHS_ES[now.getMonth()].slice(0, 3)}`;
  const { period, setPeriod } = usePeriod();

  return (
    <header>
      <div className="hdr-top">
        <div className="logo">
          <div className="logo-ring">
            <div className="logo-ring-t">·CLAB·</div>
            <div className="logo-ring-m">CLAB</div>
          </div>
          <div>
            <div className="logo-txt-name">COLISEUM</div>
            <div className="logo-txt-sub">{subtitle}</div>
          </div>
        </div>
        <div className="hdr-date" dangerouslySetInnerHTML={{ __html: dateLine }} />
      </div>
      {showPeriodTabs && (
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`ptab${period === p.id ? ' active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
