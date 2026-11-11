import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { StatusBadge } from '../../components/ui/ConditionBadge.jsx';
import { useAdminList } from '../../hooks/useApi.js';
import { formatTaka, formatDate } from '../../lib/format.js';
import { AdminTable, PAGE_SIZE, SearchInput, selectClass, useAct } from './shared.jsx';

export default function ListingsTab() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const query = useAdminList('listings', { q: q || undefined, status: status || undefined, page, limit: PAGE_SIZE });
  const { run, pending } = useAct();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} label="Search title or author" />
          <label className="sr-only" htmlFor="admin-listing-status">Status</label>
          <select id="admin-listing-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={selectClass}>
            <option value="">All statuses</option><option value="active">Active</option><option value="reserved">Reserved</option>
            <option value="sold">Sold</option><option value="removed">Removed</option>
          </select>
        </div>
        <Button to="/sell" variant="orange">+ New listing</Button>
      </div>

      <AdminTable
        query={query} page={page} setPage={setPage} empty="No listings found."
        columns={['Title', 'Seller', 'Price', 'Status', 'Reports', 'Listed', 'Actions']}
        renderRow={(l) => (
          <tr key={l.id}>
            <td className="px-4 py-3"><Link to={`/books/${l.id}`} className="font-medium text-brand-blue hover:underline">{l.title}</Link><p className="text-xs text-slate-500">{l.author}</p></td>
            <td className="px-4 py-3">{l.seller.name}</td>
            <td className="px-4 py-3 tabular-nums">{formatTaka(l.price)}</td>
            <td className="px-4 py-3">
              {l.status === 'removed' ? (
                <StatusBadge status="removed" />
              ) : (
                <>
                  <label className="sr-only" htmlFor={`st-${l.id}`}>Status of {l.title}</label>
                  <select id={`st-${l.id}`} value={l.status} disabled={pending} className={selectClass}
                    onChange={(e) => run({ method: 'patch', url: `/listings/${l.id}/status`, body: { status: e.target.value } }, `Marked ${e.target.value}`)}>
                    <option value="active">Active</option><option value="reserved">Reserved</option><option value="sold">Sold</option>
                  </select>
                </>
              )}
            </td>
            <td className="px-4 py-3">{l.openReports > 0 ? <span className="font-semibold text-red-600">{l.openReports}</span> : 0}</td>
            <td className="px-4 py-3">{formatDate(l.createdAt)}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {l.status === 'removed' ? (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ method: 'post', url: `/listings/${l.id}/restore` }, 'Listing restored')}>Restore</Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" to={`/listings/${l.id}/edit`}>Edit</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ method: 'delete', url: `/listings/${l.id}` }, 'Listing hidden (can be restored)')}>Hide</Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setToDelete(l)}>Delete</Button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete listing permanently?">
        <p className="text-sm text-slate-600">
          “{toDelete?.title}” and its photos, offers, chats and reports will be deleted for good. Sales history for it is lost.
          Use <strong>Hide</strong> instead if you may want it back.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={() => run({ method: 'delete', url: `/listings/${toDelete.id}/permanent` }, 'Listing deleted', { onSuccess: () => setToDelete(null) })}>Delete permanently</Button>
        </div>
      </Modal>
    </>
  );
}
