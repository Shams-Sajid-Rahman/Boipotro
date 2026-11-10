import { Icon } from './ui/Icons.jsx';

const TIPS = [
  'Meet on campus, in busy public places like the library or cafeteria.',
  'Check the book (pages, edition, markings) before you pay.',
  'Pay in person or by bKash/Nagad only after you have the book.',
  'Keep the chat in Boipotro and never share passwords or OTP codes.',
];

export default function SafetyTips({ compact = false }) {
  return (
    <aside aria-label="Safety tips" className={`rounded-xl border border-amber-200 bg-amber-50 ${compact ? 'p-3' : 'p-4'}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Icon name="shield" className="h-4 w-4" />
        Safety tips
      </h2>
      <ul className={`mt-2 list-disc space-y-1 pl-5 text-amber-900/90 ${compact ? 'text-xs' : 'text-sm'}`}>
        {(compact ? TIPS.slice(0, 2) : TIPS).map((t) => <li key={t}>{t}</li>)}
      </ul>
    </aside>
  );
}
