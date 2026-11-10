import { Link } from 'react-router-dom';
import { Spinner } from './Loader.jsx';

const VARIANTS = {
  blue: 'bg-brand-blue text-white hover:bg-brand-blue-dark focus-visible:outline-brand-blue',
  orange: 'bg-brand-orange text-white hover:bg-brand-orange-dark focus-visible:outline-brand-orange',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-brand-blue',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:outline-brand-blue',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  light: 'bg-white text-navy-900 hover:bg-slate-100 focus-visible:outline-white',
};
const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const buttonClasses = ({ variant = 'blue', size = 'md', block = false, className = '' } = {}) =>
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    block ? 'w-full' : '',
    className,
  ].join(' ');

/** Renders a <Link> when `to` is given, otherwise a <button>. */
export default function Button({ to, variant, size, block, className, loading = false, children, type = 'button', ...props }) {
  const classes = buttonClasses({ variant, size, block, className });
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} disabled={loading || props.disabled} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
