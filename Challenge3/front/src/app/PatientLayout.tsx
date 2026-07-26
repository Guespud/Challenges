import { Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth';
import { TopNav } from '../components/TopNav';
import content from '../content/es.json';

export function PatientLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav
        userName={user?.name ?? ''}
        links={[
          { to: '/paciente', label: content.nav.book },
          { to: '/paciente/citas', label: content.nav.myAppointments },
        ]}
      />
      <Outlet />
    </div>
  );
}
