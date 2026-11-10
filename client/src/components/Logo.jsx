/** Open-book icon + বইপত্র + Boipotro. `light` for dark backgrounds (hero/footer). */
export default function Logo({ light = false, className = '' }) {
  const text = light ? 'text-white' : 'text-navy-900';
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden="true">
        <path
          d="M4 8.5c4-1.4 8-.9 12 1.8 4-2.7 8-3.2 12-1.8v15c-4-1.4-8-.9-12 1.8-4-2.7-8-3.2-12-1.8z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          className="text-brand-orange"
        />
        <path d="M16 10.3v15" stroke="currentColor" strokeWidth="2.2" className="text-brand-orange" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className={`font-bangla text-xl font-bold ${text}`}>বইপত্র</span>
        <span className={`text-xs font-semibold tracking-wide ${light ? 'text-slate-300' : 'text-slate-500'}`}>
          Boipotro
        </span>
      </span>
    </span>
  );
}
