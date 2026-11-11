import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { Icon } from '../../components/ui/Icons.jsx';
import { useAdminList } from '../../hooks/useApi.js';
import { formatTime, formatDate, timeAgo } from '../../lib/format.js';
import { AdminTable, BarChart, PAGE_SIZE, SearchInput, StatCard } from './shared.jsx';

function Transcript({ id }) {
  const { data, isLoading } = useAdminList(`chats/${id}`, {}, { placeholderData: undefined, staleTime: 0 });
  if (isLoading || !data) return <Loader />;
  const c = data.conversation;
  const nameOf = (senderId) => (senderId === c.buyer.id ? c.buyer.name : c.seller.name);
  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        About <Link to={`/books/${c.listing.id}`} className="text-brand-blue hover:underline">{c.listing.title}</Link> ·
        buyer <strong>{c.buyer.name}</strong>, seller <strong>{c.seller.name}</strong>
      </p>
      <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-xl bg-brand-sky/60 p-3">
        {c.messages.length === 0 && <p className="text-center text-sm text-slate-500">No messages.</p>}
        {c.messages.map((m) => {
          const fromSeller = m.senderId === c.seller.id;
          return (
            <div key={m.id} className={`flex ${fromSeller ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${fromSeller ? 'bg-brand-blue text-white' : 'bg-white text-slate-800'}`}>
                <p className="text-[11px] font-semibold opacity-80">{nameOf(m.senderId)}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-0.5 text-right text-[10px] opacity-70">{formatDate(m.createdAt)} {formatTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ChatsTab() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const { data: stats, isLoading } = useAdminList('chats/stats', { days: 30 });
  const query = useAdminList('chats', { q: q || undefined, page, limit: PAGE_SIZE });

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
        Chats are private. Open a conversation only for moderation or a support request. Every view is recorded in the Audit log.
      </p>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard loading={isLoading} icon="chat" label="Conversations" value={stats?.conversations} />
        <StatCard loading={isLoading} icon="send" label="Messages (24h)" value={stats?.messages24h} hint={stats && `${stats.messages} all time`} />
        <StatCard loading={isLoading} icon="users" label="Active chats (7 days)" value={stats?.activeConversations7d} />
        <StatCard loading={isLoading} icon="eye" label="Unread messages" value={stats?.unread} />
      </dl>
      {stats && <BarChart title="Messages per day (last 30 days)" data={stats.daily} valueKey="messages" />}

      <div>
        <div className="mb-4"><SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} label="Search book or user" /></div>
        <AdminTable
          query={query} page={page} setPage={setPage} empty="No conversations."
          columns={['Book', 'Buyer', 'Seller', 'Messages', 'Last activity', '']}
          renderRow={(c) => (
            <tr key={c.id}>
              <td className="px-4 py-3"><Link to={`/books/${c.listing.id}`} className="font-medium text-brand-blue hover:underline">{c.listing.title}</Link></td>
              <td className="px-4 py-3">{c.buyer.name}</td>
              <td className="px-4 py-3">{c.seller.name}</td>
              <td className="px-4 py-3 tabular-nums">{c.messageCount}</td>
              <td className="px-4 py-3">{timeAgo(c.lastMessageAt)}</td>
              <td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => setOpenId(c.id)}>View chat</Button></td>
            </tr>
          )}
        />
      </div>

      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="Conversation (read-only)">
        {openId && <Transcript id={openId} />}
      </Modal>
    </div>
  );
}
