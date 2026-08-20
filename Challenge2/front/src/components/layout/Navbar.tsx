import { Link } from 'react-router-dom';
import { useAuth, LogoutButton } from '../../features/auth';
import content from '../../content/es.json';

const { brand, nav } = content;

export function Navbar() {
  const { user } = useAuth();
  const homePath = user?.role === 'nutritionist' ? '/nutriologa' : '/paciente';

  return (
    <header className="flex-none border-b border-neutral-200 bg-white">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        <Link to={homePath} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
            {brand.monogram}
          </span>
          <span className="text-base font-bold tracking-tight text-neutral-900">{brand.name}</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-neutral-900">{user.name}</p>
              <p className="text-xs leading-tight text-neutral-500">{nav.roles[user.role]}</p>
            </div>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
