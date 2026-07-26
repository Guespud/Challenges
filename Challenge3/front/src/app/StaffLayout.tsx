import { Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { TopNav } from '../components/TopNav';
import content from '../content/es.json';

export function StaffLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav userName={user?.name ?? ''} links={[{ to: '/staff', label: content.nav.admin }]} />
      <Outlet />
    </div>
  );
}
