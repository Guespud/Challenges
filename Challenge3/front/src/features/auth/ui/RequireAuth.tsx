import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../shared/auth-context';
import { homePathForRole } from '../../../core/role-home';
import type { Role } from '../../../types';

export function RequireAuth({ role }: { readonly role?: Role }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-200 border-t-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
