import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function Layout() {
  const { pathname } = useLocation();
  const subtitleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/agenda': 'Agenda',
    '/historico': 'Histórico',
    '/ajustes': 'Ajustes',
  };
  const subtitle = subtitleMap[pathname] ?? 'Dashboard';
  const showPeriodTabs = pathname === '/';

  return (
    <>
      <Header subtitle={subtitle} showPeriodTabs={showPeriodTabs} />
      <main>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
