import { useAuth } from '../shared/auth-context';
import content from '../../../content/es.json';

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button
      onClick={logout}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3.5 py-2 text-sm font-medium text-neutral-600 transition hover:bg-red-50 hover:text-red-600"
    >
      <LogoutIcon />
      {content.common.logout}
    </button>
  );
}
