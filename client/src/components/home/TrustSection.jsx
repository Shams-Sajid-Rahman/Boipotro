import { Icon } from '../ui/Icons.jsx';

export default function TrustSection({ content }) {
  if (!content) return null;
  return (
    <section aria-labelledby="trust-title" className="py-14">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="text-center lg:text-left">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-navy-900 text-brand-orange lg:mx-0">
            <Icon name="shield" className="h-11 w-11" />
          </span>
          <h2 id="trust-title" className="mt-5 text-2xl font-bold text-navy-900 sm:text-3xl">{content.title}</h2>
          <p className="mt-3 text-slate-600">{content.description}</p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {content.points.map((p) => (
            <li key={p.title} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-navy-900">
                <Icon name="check" className="h-5 w-5 text-brand-orange" />
                {p.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
