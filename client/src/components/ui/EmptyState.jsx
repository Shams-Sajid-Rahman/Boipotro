import { Icon } from './Icons.jsx';
import Button from './Button.jsx';
import { getErrorMessage } from '../../lib/api.js';

export default function EmptyState({ icon = 'book', title, message, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-sky text-brand-blue">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-navy-900">{title}</h2>
      {message && <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <Icon name="alert" className="h-8 w-8 text-red-500" />
      <h2 className="mt-3 font-semibold text-red-800">{title}</h2>
      <p className="mt-1 text-sm text-red-700">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
