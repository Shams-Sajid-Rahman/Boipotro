import { useState } from 'react';
import Pagination from '../../components/ui/Pagination.jsx';
import { Skeleton } from '../../components/ui/Loader.jsx';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { Icon } from '../../components/ui/Icons.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAdminAction } from '../../hooks/useApi.js';
import { getErrorMessage, getFieldErrors } from '../../lib/api.js';

export const PAGE_SIZE = 20;

/** Run an admin API call with toast feedback. `run(req, msg, { onSuccess, onFieldErrors })`. */
export function useAct() {
  const toast = useToast();
  const action = useAdminAction();
  const run = (req, message, { onSuccess, onFieldErrors } = {}) =>
    action.mutate(req, {
      onSuccess: (res) => {
        if (message) toast.success(message);
        onSuccess?.(res);
      },
      onError: (e) => {
        onFieldErrors?.(getFieldErrors(e));
        toast.error(getErrorMessage(e));
      },
    });
  return { run, pending: action.isPending };
}

export function StatCard({ label, value, icon, hint, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <dt className="flex items-center gap-2 text-sm text-slate-500">
        {icon && <Icon name={icon} className="h-4 w-4" />}
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">{loading ? <Skeleton className="h-8 w-20" /> : value}</dd>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Table shell with loading / error / empty states and pagination. */
export function AdminTable({ query, columns, renderRow, page, setPage, empty }) {
  const { data, isLoading, error, refetch } = query;
  if (isLoading) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!data.data.length) return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{empty}</p>;
  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>{columns.map((c) => <th key={c} scope="col" className="px-4 py-3 font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{data.data.map(renderRow)}</tbody>
        </table>
      </div>
      {setPage && <Pagination page={page} totalPages={Math.ceil(data.total / PAGE_SIZE)} onChange={setPage} />}
    </>
  );
}

export function SearchInput({ value, onChange, label }) {
  return (
    <label className="block w-full max-w-sm">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
      />
    </label>
  );
}

export const selectClass =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30';

const shortDay = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * Single-series column chart (one brand hue, so no legend needed: the title names it).
 * Hover/focus a column for an exact-value tooltip; "Show table" gives the accessible table view.
 */
export function BarChart({ title, data, valueKey, format = String, height = 180 }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 0);
  const total = data.reduce((s, d) => s + Number(d[valueKey]), 0);
  // Label roughly 6 dates along the x-axis.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-navy-900">{title}</span>
        <span className="text-sm text-slate-500">
          Total <strong className="text-navy-900">{format(total)}</strong>
          <button type="button" onClick={() => setShowTable((s) => !s)} className="ml-3 text-brand-blue hover:underline">
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        </span>
      </figcaption>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1">Date</th><th className="py-1 text-right">{title}</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-slate-100"><td className="py-1">{shortDay(d.day)}</td><td className="py-1 text-right tabular-nums">{format(d[valueKey])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : max === 0 ? (
        <p className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>No activity in this period</p>
      ) : (
        <div>
          <div className="relative flex items-end gap-0.5 border-b border-slate-200" style={{ height }} onMouseLeave={() => setActive(null)}>
            {/* Recessive gridline at the max value */}
            <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" aria-hidden="true" />
            <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[10px] text-slate-400" aria-hidden="true">{format(max)}</span>
            {data.map((d, i) => {
              const v = Number(d[valueKey]);
              return (
                <button
                  key={d.day}
                  type="button"
                  className="group relative flex h-full flex-1 items-end focus-visible:outline-none"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${shortDay(d.day)}: ${format(v)}`}
                >
                  <span
                    className={`w-full rounded-t-[4px] transition-colors ${active === i ? 'bg-brand-blue-dark' : 'bg-brand-blue'} group-focus-visible:ring-2 group-focus-visible:ring-navy-900`}
                    style={{ height: v ? `${Math.max((v / max) * 100, 2)}%` : 0 }}
                  />
                  {active === i && (
                    <span role="tooltip" className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy-900 px-2 py-1 text-xs text-white shadow">
                      {shortDay(d.day)} · <strong>{format(v)}</strong>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex gap-0.5 text-[10px] text-slate-400" aria-hidden="true">
            {data.map((d, i) => (
              <span key={d.day} className="flex w-0 flex-1 justify-center overflow-visible whitespace-nowrap">{i % labelEvery === 0 ? shortDay(d.day) : ''}</span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}

/** Horizontal single-hue bars for ranked breakdowns (e.g. sales by category). */
export function RankBars({ rows, valueKey, labelKey = 'name', format = String }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey])), 0);
  if (!rows.length) return <p className="text-sm text-slate-400">No sales in this period</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r[labelKey]} className="text-sm">
          <div className="mb-1 flex justify-between gap-2">
            <span className="truncate text-slate-700">{r[labelKey]}</span>
            <span className="shrink-0 tabular-nums font-medium text-navy-900">{format(r[valueKey])}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-blue" style={{ width: `${max ? (Number(r[valueKey]) / max) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
