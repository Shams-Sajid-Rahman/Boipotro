import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../Logo.jsx';
import Avatar from '../ui/Avatar.jsx';
import { Icon } from '../ui/Icons.jsx';
import { buttonClasses } from '../ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useUnreadCount } from '../../hooks/useApi.js';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop Textbooks' },
  { to: '/sell', label: 'Sell Books' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${
    isActive ? 'text-brand-orange' : 'text-slate-200 hover:text-white'
  }`;

function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span className="ml-auto rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
      <span className="sr-only"> unread messages</span>
    </span>
  );
}

function UserMenu({ user, unread, onLogout, isAdmin }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const items = [
    { to: '/my-listings', label: 'My Listings', icon: 'grid' },
    { to: '/offers', label: 'Offers', icon: 'tag' },
    { to: '/wishlist', label: 'Wishlist', icon: 'heart' },
    { to: '/messages', label: 'Messages', icon: 'chat', badge: unread },
    { to: '/profile', label: 'Profile', icon: 'user' },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: 'shield' }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="relative">
          <Avatar name={user.name} src={user.avatarUrl} size="h-8 w-8" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-orange ring-2 ring-navy-900" />}
        </span>
        <span className="max-w-28 truncate text-sm font-medium">{user.name.split(' ')[0]}</span>
        <Icon name="chevronDown" className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-100 focus-visible:outline-none"
            >
              <Icon name={item.icon} className="h-4 w-4 text-slate-400" />
              {item.label}
              <UnreadBadge count={item.badge} />
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); onLogout(); }}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
          >
            <Icon name="logout" className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, status, logout, isAdmin } = useAuth();
  const { data: unread = 0 } = useUnreadCount();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On the homepage the bar floats transparently over the hero photo until you scroll.
  const overHero = location.pathname === '/' && !scrolled && !mobileOpen;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.info('You have been logged out');
    navigate('/');
  };

  return (
    <header className={`sticky top-0 z-30 transition-colors duration-300 ${overHero ? 'bg-transparent' : 'bg-navy-900 shadow-md'}`}>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Boipotro home" className="rounded focus-visible:outline-2 focus-visible:outline-white">
          <Logo light />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.to}><NavLink to={l.to} end={l.end} className={navLinkClass}>{l.label}</NavLink></li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          {status === 'loading' ? (
            <span className="h-8 w-24 animate-pulse rounded-full bg-white/10" aria-hidden="true" />
          ) : user ? (
            <UserMenu user={user} unread={unread} onLogout={handleLogout} isAdmin={isAdmin} />
          ) : (
            <>
              <Link to="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-white hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-white">Login</Link>
              <Link to="/register" className={buttonClasses({ variant: 'orange', size: 'sm' })}>Register</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="relative rounded-md p-2 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <Icon name={mobileOpen ? 'x' : 'menu'} className="h-6 w-6" />
          {unread > 0 && !mobileOpen && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-brand-orange" />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className="border-t border-white/10 bg-navy-900 px-4 pb-4 lg:hidden">
          <ul className="flex flex-col py-2">
            {NAV_LINKS.map((l) => (
              <li key={l.to}><NavLink to={l.to} end={l.end} className={(s) => `block ${navLinkClass(s)}`}>{l.label}</NavLink></li>
            ))}
          </ul>
          <div className="border-t border-white/10 pt-3">
            {user ? (
              <ul className="flex flex-col">
                {[
                  ['/my-listings', 'My Listings'], ['/offers', 'Offers'], ['/wishlist', 'Wishlist'],
                  ['/messages', 'Messages'], ['/profile', 'Profile'], ...(isAdmin ? [['/admin', 'Admin']] : []),
                ].map(([to, label]) => (
                  <li key={to}>
                    <NavLink to={to} className={(s) => `flex items-center ${navLinkClass(s)}`}>
                      {label}
                      {to === '/messages' && <UnreadBadge count={unread} />}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={handleLogout} className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-300 hover:text-red-200">
                    Logout
                  </button>
                </li>
              </ul>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className={buttonClasses({ variant: 'light', size: 'sm', block: true })}>Login</Link>
                <Link to="/register" className={buttonClasses({ variant: 'orange', size: 'sm', block: true })}>Register</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
