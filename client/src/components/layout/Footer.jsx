import { Link } from 'react-router-dom';
import Logo from '../Logo.jsx';
import { Icon } from '../ui/Icons.jsx';
import { useSiteContent } from '../../hooks/useApi.js';

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop Textbooks' },
  { to: '/sell', label: 'Sell Books' },
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
];

const SOCIAL_NAMES = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube' };

export default function Footer() {
  const { data: content } = useSiteContent();
  const footer = content?.footer;
  const contact = content?.contact;

  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <Logo light />
          {footer?.about && <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{footer.about}</p>}
        </div>

        <nav aria-label="Quick links">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.to}><Link to={l.to} className="hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-white">{l.label}</Link></li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white">Social Media</h2>
          <ul className="mt-4 flex gap-3">
            {footer?.social?.map((s) => (
              <li key={s.platform}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Boipotro on ${SOCIAL_NAMES[s.platform] || s.platform}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-orange focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Icon name={s.platform} className="h-5 w-5" />
                </a>
              </li>
            ))}
          </ul>
          {contact?.email && (
            <p className="mt-4 flex items-center gap-2 text-sm">
              <Icon name="mail" className="h-4 w-4" />
              <a href={`mailto:${contact.email}`} className="hover:text-brand-orange">{contact.email}</a>
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {footer?.copyright}
        </p>
      </div>
    </footer>
  );
}
