const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function Avatar({ name, src, size = 'h-10 w-10' }) {
  if (src) return <img src={src} alt="" className={`${size} shrink-0 rounded-full bg-slate-200 object-cover`} />;
  return (
    <span aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white`}>
      {initials(name)}
    </span>
  );
}
