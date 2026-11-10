import { useId } from 'react';

const inputBase =
  'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:bg-slate-100';

const borderFor = (error) => (error ? 'border-red-400' : 'border-slate-300');

/**
 * Label + control + hint/error, wired with htmlFor / aria-describedby / aria-invalid.
 * `as` = 'input' | 'select' | 'textarea'.
 */
export default function FormField({ label, error, hint, as = 'input', required, className = '', children, ...props }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Control = as;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <Control
        id={id}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${borderFor(error)} ${as === 'textarea' ? 'min-h-28' : ''}`}
        {...props}
      >
        {children}
      </Control>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
