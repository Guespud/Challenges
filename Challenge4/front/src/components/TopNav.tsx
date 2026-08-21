import { NavLink } from 'react-router-dom';
import { LogoutButton } from '../features/auth';
import content from '../content/es.json';

interface NavItem {
  to: string;
  label: string;
}

export function TopNav({ links, userName }: { readonly links: NavItem[]; readonly userName: string }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight text-neutral-900">{content.brand.name}</span>
          <nav className="flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-500 sm:inline">{userName}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
