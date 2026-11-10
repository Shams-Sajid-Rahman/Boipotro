import { Icon } from './Icons.jsx';

/** Read-only stars, e.g. <Stars value={4.3} /> */
export function Stars({ value = 0, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" filled={n <= Math.round(value)} className={`${className} ${n <= Math.round(value) ? 'text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

/** Keyboard-accessible 1–5 picker (radio group). */
export function StarInput({ value, onChange, name = 'rating' }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">Rating</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" />
            <span className="sr-only">{n} star{n > 1 ? 's' : ''}</span>
            <Icon name="star" filled={n <= value} className={`h-8 w-8 rounded peer-focus-visible:outline-2 peer-focus-visible:outline-brand-blue ${n <= value ? 'text-amber-400' : 'text-slate-300'}`} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
