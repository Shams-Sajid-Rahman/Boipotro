import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Avatar from '../components/ui/Avatar.jsx';
import Button from '../components/ui/Button.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import Loader, { Skeleton } from '../components/ui/Loader.jsx';
import EmptyState, { ErrorState } from '../components/ui/EmptyState.jsx';
import { StatusBadge } from '../components/ui/ConditionBadge.jsx';
import SafetyTips from '../components/SafetyTips.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConversations, useMessages } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatTaka, formatTime, timeAgo } from '../lib/format.js';

function ConversationList({ conversations, activeId, onSelect, userId }) {
  return (
    <ul className="divide-y divide-slate-100" aria-label="Conversations">
      {conversations.map((c) => {
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              aria-current={active ? 'true' : undefined}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue ${active ? 'bg-brand-sky' : 'hover:bg-slate-50'}`}
            >
              <Avatar name={c.otherUser.name} src={c.otherUser.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-sm ${c.unreadCount ? 'font-bold text-navy-900' : 'font-semibold text-slate-800'}`}>{c.otherUser.name}</p>
                  {c.lastMessage && <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(c.lastMessage.createdAt)}</span>}
                </div>
                <p className="truncate text-xs text-brand-blue">{c.listing.title}</p>
                <div className="flex items-center gap-2">
                  <p className={`flex-1 truncate text-xs ${c.unreadCount ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                    {c.lastMessage ? `${c.lastMessage.senderId === userId ? 'You: ' : ''}${c.lastMessage.body}` : 'No messages yet'}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {c.unreadCount}<span className="sr-only"> unread</span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ChatWindow({ conversation, onBack }) {
  const { user } = useAuth();
  const socket = useSocket();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(conversation.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef(0);

  // Oldest -> newest across all loaded pages.
  const messages = data ? [...data.pages].reverse().flatMap((p) => p.data) : [];
  const lastId = messages.at(-1)?.id;

  const markRead = () => {
    if (socket?.connected) socket.emit('conversation:read', { conversationId: conversation.id });
    else api.post(`/conversations/${conversation.id}/read`).catch(() => {});
  };

  // Live messages for this conversation go straight into the cache.
  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (msg) => {
      if (msg.conversationId !== conversation.id) return;
      queryClient.setQueryData(['messages', conversation.id], (old) => {
        if (!old) return old;
        if (old.pages.some((p) => p.data.some((m) => m.id === msg.id))) return old;
        const [newest, ...rest] = old.pages;
        return { ...old, pages: [{ ...newest, data: [...newest.data, msg] }, ...rest] };
      });
      if (msg.senderId !== user.id) markRead();
    };
    const onRead = ({ conversationId, readerId }) => {
      if (conversationId !== conversation.id || readerId === user.id) return;
      queryClient.setQueryData(['messages', conversation.id], (old) =>
        old && { ...old, pages: old.pages.map((p) => ({ ...p, data: p.data.map((m) => (m.senderId === user.id && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)) })) },
      );
    };
    socket.on('message:new', onNew);
    socket.on('conversation:read', onRead);
    return () => {
      socket.off('message:new', onNew);
      socket.off('conversation:read', onRead);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, conversation.id, queryClient, user.id]);

  // Opening a chat marks it read.
  useEffect(() => {
    if (conversation.unreadCount > 0) markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, socket]);

  // Scroll: stay at the bottom for new messages; keep position when older ones load above.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
    else el.scrollTop += el.scrollHeight - prevHeight.current;
    prevHeight.current = el.scrollHeight;
  }, [messages.length, lastId]);

  const onScroll = () => {
    const el = scrollRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    prevHeight.current = el.scrollHeight;
    if (el.scrollTop < 60 && hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const send = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    stickToBottom.current = true;
    setSending(true);

    const done = (res) => {
      setSending(false);
      if (res?.ok) setDraft('');
      else toast.error(res?.error || 'Message not sent');
    };

    if (socket?.connected) {
      socket.timeout(8000).emit('message:send', { conversationId: conversation.id, body }, (err, res) => done(err ? { ok: false, error: 'Connection timed out' } : res));
    } else {
      // Socket down: REST fallback (server still broadcasts to the other user).
      api.post(`/conversations/${conversation.id}/messages`, { body })
        .then(({ data: d }) => {
          queryClient.setQueryData(['messages', conversation.id], (old) =>
            old && { ...old, pages: [{ ...old.pages[0], data: [...old.pages[0].data, d.message] }, ...old.pages.slice(1)] });
          done({ ok: true });
        })
        .catch(() => done({ ok: false }));
    }
  };

  const { listing, otherUser } = conversation;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-navy-900 px-4 py-3 text-white">
        <button type="button" onClick={onBack} className="rounded p-1 hover:bg-white/10 md:hidden" aria-label="Back to conversations">
          <Icon name="chevronLeft" />
        </button>
        <Avatar name={otherUser.name} src={otherUser.avatarUrl} size="h-9 w-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{otherUser.name}{otherUser.isVerified && <Icon name="check" className="ml-1 inline h-3.5 w-3.5 text-green-400" title="Verified" />}</p>
          <Link to={`/books/${listing.id}`} className="block truncate text-xs text-slate-300 hover:text-brand-orange">
            {listing.title} · {formatTaka(listing.price)}
          </Link>
        </div>
        {listing.status !== 'active' && <StatusBadge status={listing.status} />}
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-brand-sky/50 px-4 py-4" aria-live="polite" aria-label="Messages">
        <SafetyTips compact />
        {isFetchingNextPage && <Loader label="Loading older messages…" />}
        {isLoading ? (
          <Loader />
        ) : error ? (
          <ErrorState error={error} />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Say hello and ask about the book!</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'rounded-br-sm bg-brand-blue text-white' : 'rounded-bl-sm bg-white text-slate-800'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}>
                    {formatTime(m.createdAt)}
                    {mine && <span className="ml-1">{m.readAt ? '✓✓' : '✓'}<span className="sr-only">{m.readAt ? ' read' : ' sent'}</span></span>}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3">
        <label htmlFor="message-input" className="sr-only">Type a message</label>
        <textarea
          id="message-input"
          rows={1}
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          placeholder="Type a message…"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
        <Button type="submit" variant="orange" className="h-10 w-10 !rounded-full !p-0" disabled={!draft.trim()} loading={sending} aria-label="Send message">
          {!sending && <Icon name="send" className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data: conversations, isLoading, error, refetch } = useConversations();
  const activeId = Number(params.get('c')) || null;
  const active = conversations?.find((c) => c.id === activeId);

  useEffect(() => {
    document.title = 'Messages | Boipotro';
  }, []);

  const select = (id) => setParams(id ? { c: String(id) } : {});

  return (
    <div className="mx-auto max-w-7xl px-0 py-0 sm:px-6 sm:py-6 lg:px-8">
      <h1 className="sr-only">Messages</h1>
      <div className="grid h-[calc(100vh-4rem)] overflow-hidden bg-white sm:h-[calc(100vh-7rem)] sm:rounded-2xl sm:shadow-sm sm:ring-1 sm:ring-slate-200 md:grid-cols-[20rem_1fr]">
        <aside className={`min-h-0 overflow-y-auto border-r border-slate-200 ${active ? 'hidden md:block' : 'block'}`}>
          <h2 className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 font-semibold text-navy-900">Messages</h2>
          {isLoading ? (
            <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : error ? (
            <div className="p-4"><ErrorState error={error} onRetry={refetch} /></div>
          ) : conversations.length === 0 ? (
            <div className="p-4">
              <EmptyState icon="chat" title="No conversations yet" message="Open a book and tap “Chat with Seller” to start." action={<Button to="/shop">Browse books</Button>} />
            </div>
          ) : (
            <ConversationList conversations={conversations} activeId={activeId} onSelect={select} userId={user.id} />
          )}
        </aside>

        <section className={`min-h-0 ${active ? 'block' : 'hidden md:block'}`} aria-label="Chat">
          {active ? (
            <ChatWindow key={active.id} conversation={active} onBack={() => select(null)} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-slate-500">
              <div>
                <Icon name="chat" className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3">{activeId && !isLoading ? 'Conversation not found.' : 'Select a conversation to start chatting.'}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
