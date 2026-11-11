import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../../components/ui/EmptyState.jsx';
import { useAdminList } from '../../hooks/useApi.js';
import { formatTaka, formatDate } from '../../lib/format.js';
import { BarChart, RankBars, StatCard, selectClass } from './shared.jsx';

const RANGES = [7, 30, 90, 365];

export default function SalesTab() {
  const [days, setDays] = useState(30);
  const { data, isLoading, error, refetch } = useAdminList('sales', { days });

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const t = data?.totals;
  const p = data?.pipeline;

  return (
    <div className="space-y-6">
      {/* Filters sit in one row above the charts. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Profit = <strong>{data?.commissionPercent ?? '…'}%</strong> commission on each sale’s final price
          (accepted offer, else asking price). Change the rate in <em>Settings</em>.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Period</span>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={selectClass}>
            {RANGES.map((d) => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </label>
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard loading={isLoading} icon="tag" label="Profit (commission)" value={t && formatTaka(t.earnings)} hint={data && `All time: ${formatTaka(data.allTime.earnings)}`} />
        <StatCard loading={isLoading} icon="check" label="Books sold" value={t?.sold} hint={data && `All time: ${data.allTime.sold}`} />
        <StatCard loading={isLoading} icon="grid" label="Sales value" value={t && formatTaka(t.gmv)} hint={data && `All time: ${formatTaka(data.allTime.gmv)}`} />
        <StatCard loading={isLoading} icon="book" label="Average sale price" value={t && formatTaka(t.avgPrice)} />
      </dl>

      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart title="Profit per day" data={data.daily} valueKey="earnings" format={formatTaka} />
            <BarChart title="Books sold per day" data={data.daily} valueKey="sold" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-semibold text-navy-900">Sales progress</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['Active listings', p.active], ['Reserved (offer accepted)', p.reserved], ['Sold', p.sold], ['Removed', p.removed],
                  ['Pending offers', p.offersPending], ['Accepted offers', p.offersAccepted], ['Rejected offers', p.offersRejected],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-slate-100 pb-1.5">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-semibold tabular-nums text-navy-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-semibold text-navy-900">Sales value by category</h3>
              <RankBars rows={data.byCategory} valueKey="gmv" format={formatTaka} />
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-4 font-semibold text-navy-900">Top sellers</h3>
              <RankBars rows={data.topSellers} valueKey="gmv" format={formatTaka} />
            </section>
          </div>

          <section>
            <h3 className="mb-3 font-semibold text-navy-900">Recent sales</h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>{['Book', 'Seller', 'Buyer', 'Asking', 'Sold for', 'Profit', 'Date'].map((c) => <th key={c} scope="col" className="px-4 py-3">{c}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No sales yet.</td></tr>
                  ) : data.recent.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3"><Link to={`/books/${r.id}`} className="font-medium text-brand-blue hover:underline">{r.title}</Link></td>
                      <td className="px-4 py-3">{r.seller}</td>
                      <td className="px-4 py-3">{r.buyer || <span className="text-slate-400">Outside app</span>}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-500">{formatTaka(r.askingPrice)}</td>
                      <td className="px-4 py-3 tabular-nums font-medium">{formatTaka(r.soldPrice)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold text-green-700">{formatTaka(r.commission)}</td>
                      <td className="px-4 py-3">{r.soldAt ? formatDate(r.soldAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
