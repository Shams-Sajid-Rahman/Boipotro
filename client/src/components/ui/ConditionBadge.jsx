import { conditionLabel, LISTING_STATUSES } from '../../lib/constants.js';

const CONDITION_STYLES = {
  new: 'bg-emerald-100 text-emerald-800',
  near_new: 'bg-sky-100 text-sky-800',
  used: 'bg-amber-100 text-amber-800',
  heavily_used: 'bg-rose-100 text-rose-800',
};

export default function ConditionBadge({ condition, className = '' }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONDITION_STYLES[condition] || 'bg-slate-100'} ${className}`}>
      {conditionLabel(condition)}
    </span>
  );
}

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800',
  reserved: 'bg-amber-100 text-amber-800',
  sold: 'bg-slate-200 text-slate-700',
  removed: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
  open: 'bg-red-100 text-red-700',
  reviewing: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }) {
  const label = LISTING_STATUSES[status] || status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || 'bg-slate-100'}`}>{label}</span>;
}
