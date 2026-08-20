import { Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';
import content from '../content/es.json';

export function DoctorLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <TopNav userName={user?.name ?? ''} links={[{ to: '/medico', label: content.nav.agenda }]} />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
