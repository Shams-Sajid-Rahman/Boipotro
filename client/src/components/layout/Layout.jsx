import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  // New page -> start at the top.
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-50 rounded bg-white px-4 py-2 text-navy-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Standard page width + padding + heading. */
export function Page({ title, subtitle, actions, children, narrow = false }) {
  useEffect(() => {
    if (title) document.title = `${title} | Boipotro`;
  }, [title]);
  return (
    <div className={`mx-auto px-4 py-8 sm:px-6 lg:px-8 ${narrow ? 'max-w-2xl' : 'max-w-7xl'}`}>
      {(title || actions) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {title && <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>}
            {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
