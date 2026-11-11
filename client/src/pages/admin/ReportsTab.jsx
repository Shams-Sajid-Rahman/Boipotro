import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import { StatusBadge } from '../../components/ui/ConditionBadge.jsx';
import { useAdminList } from '../../hooks/useApi.js';
import { timeAgo } from '../../lib/format.js';
import { reportReasonLabel } from '../../lib/constants.js';
import { AdminTable, PAGE_SIZE, selectClass, useAct } from './shared.jsx';

export default function ReportsTab() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const query = useAdminList('reports', { status: status || undefined, page, limit: PAGE_SIZE });
  const { run, pending } = useAct();
  const setReport = (id, s, msg) => run({ method: 'patch', url: `/reports/${id}`, body: { status: s } }, msg);

  return (
    <>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-slate-600">Status</span>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
          <option value="">All</option><option value="open">Open</option><option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option><option value="dismissed">Dismissed</option>
        </select>
      </label>
      <AdminTable
        query={query} page={page} setPage={setPage} empty="No reports."
        columns={['Listing', 'Reason', 'Reporter', 'Status', 'Actions']}
        renderRow={(r) => {
          const open = r.status === 'open' || r.status === 'reviewing';
          return (
            <tr key={r.id} className="align-top">
              <td className="px-4 py-3">
                <Link to={`/books/${r.listing.id}`} className="font-medium text-brand-blue hover:underline">{r.listing.title}</Link>
                <p className="text-xs text-slate-500">Seller: {r.seller.name}{r.seller.isBanned && ' (banned)'} · listing {r.listing.status}</p>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{reportReasonLabel(r.reason)}</p>
                {r.details && <p className="max-w-xs text-xs text-slate-500">{r.details}</p>}
                <p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p>
              </td>
              <td className="px-4 py-3">{r.reporter?.name ?? 'Deleted user'}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {open && r.listing.status !== 'removed' && (
                    <Button size="sm" variant="danger" disabled={pending} onClick={() => run({ method: 'delete', url: `/listings/${r.listing.id}` }, 'Listing removed')}>Remove listing</Button>
                  )}
                  {open && !r.seller.isBanned && (
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ method: 'patch', url: `/users/${r.seller.id}/ban`, body: { banned: true } }, `${r.seller.name} banned`)}>Ban seller</Button>
                  )}
                  {open ? (
                    <>
                      {r.status === 'open' && <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReport(r.id, 'reviewing', 'Marked as reviewing')}>Reviewing</Button>}
                      <Button size="sm" disabled={pending} onClick={() => setReport(r.id, 'resolved', 'Report resolved')}>Resolve</Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReport(r.id, 'dismissed', 'Report dismissed')}>Dismiss</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => setReport(r.id, 'open', 'Report reopened')}>Reopen</Button>
                  )}
                </div>
              </td>
            </tr>
          );
        }}
      />
    </>
  );
}
