import { Icon } from '../ui/Icons.jsx';

export default function HowItWorks({ content }) {
  if (!content) return null;
  return (
    <section aria-labelledby="how-title" className="bg-slate-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="how-title" className="text-center text-2xl font-bold text-navy-900 sm:text-3xl">{content.title}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {content.steps.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                <Icon name={step.icon} className="h-8 w-8" />
              </span>
              <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-navy-900"><span className="sr-only">Step {i + 1}: </span>{step.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
