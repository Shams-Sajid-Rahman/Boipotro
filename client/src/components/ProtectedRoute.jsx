import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from './ui/Loader.jsx';

/** Logged-in only (optionally role-restricted). Sends guests to /login and back afterwards. */
export default function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loader fullPage label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Login/register: logged-in users skip straight to where they were going. */
export function GuestOnlyRoute() {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Loader fullPage />;
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  return <Outlet />;
}
