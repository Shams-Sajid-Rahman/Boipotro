import { Icon } from '../ui/Icons.jsx';
import Button from '../ui/Button.jsx';

function PhoneMockup({ demo }) {
  return (
    <div className="mx-auto w-64 rounded-[2.5rem] border-[10px] border-navy-900 bg-navy-900 shadow-2xl sm:w-72" aria-hidden="true">
      <div className="overflow-hidden rounded-[1.8rem] bg-white">
        <div className="flex items-center gap-3 bg-navy-900 px-4 pb-3 pt-5 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-orange text-sm font-bold">
            {demo.contactName[0]}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{demo.contactName}</p>
            <p className="truncate text-[11px] text-slate-300">{demo.bookTitle}</p>
          </div>
        </div>
        <div className="space-y-2 bg-brand-sky/60 px-3 py-4">
          {demo.messages.map((m, i) => (
            <p
              key={i}
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                m.from === 'me' ? 'ml-auto rounded-br-sm bg-brand-blue text-white' : 'rounded-bl-sm bg-white text-slate-700 shadow-sm'
              }`}
            >
              {m.text}
            </p>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2">
          <span className="flex-1 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] text-slate-400">Type a message…</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-white">
            <Icon name="send" className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MessagingSection({ content }) {
  if (!content) return null;
  return (
    <section aria-labelledby="messaging-title" className="bg-brand-sky py-14">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
        <div className="order-2 md:order-1">
          {content.demo && <PhoneMockup demo={content.demo} />}
        </div>
        <div className="order-1 md:order-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue text-white">
            <Icon name="chat" className="h-6 w-6" />
          </span>
          <h2 id="messaging-title" className="mt-4 text-2xl font-bold text-navy-900 sm:text-3xl">{content.title}</h2>
          <p className="mt-3 text-slate-600">{content.description}</p>
          <ul className="mt-5 space-y-2">
            {content.points.map((p) => (
              <li key={p} className="flex items-center gap-2 text-slate-700">
                <Icon name="check" className="h-5 w-5 text-brand-blue" />
                {p}
              </li>
            ))}
          </ul>
          <Button to="/messages" variant="blue" className="mt-6">Open Messages</Button>
        </div>
      </div>
    </section>
  );
}
