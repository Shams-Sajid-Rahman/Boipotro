import { useState } from 'react';
import { useAdminList } from '../../hooks/useApi.js';
import { formatDate, formatTime } from '../../lib/format.js';
import { AdminTable, PAGE_SIZE } from './shared.jsx';

const label = (action) => action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function AuditTab() {
  const [page, setPage] = useState(1);
  const query = useAdminList('audit', { page, limit: PAGE_SIZE });
  return (
    <>
      <p className="mb-4 text-sm text-slate-500">Every admin change, and every time an admin opens a private chat.</p>
      <AdminTable
        query={query} page={page} setPage={setPage} empty="No admin activity yet."
        columns={['When', 'Admin', 'Action', 'Target', 'Details']}
        renderRow={(a) => (
          <tr key={a.id}>
            <td className="whitespace-nowrap px-4 py-3">{formatDate(a.createdAt)} {formatTime(a.createdAt)}</td>
            <td className="px-4 py-3">{a.adminName ?? 'Deleted admin'}</td>
            <td className="px-4 py-3 font-medium">{label(a.action)}</td>
            <td className="px-4 py-3">{a.targetType}{a.targetId ? ` #${a.targetId}` : ''}</td>
            <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.details ? JSON.stringify(a.details) : ''}</td>
          </tr>
        )}
      />
    </>
  );
}
