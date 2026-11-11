import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../components/layout/Layout.jsx';
import Button from '../components/ui/Button.jsx';
import { StatusBadge } from '../components/ui/ConditionBadge.jsx';
import { Skeleton } from '../components/ui/Loader.jsx';
import EmptyState, { ErrorState } from '../components/ui/EmptyState.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useOffers, useUpdateOffer } from '../hooks/useApi.js';
import { formatTaka, timeAgo } from '../lib/format.js';
import { getErrorMessage } from '../lib/api.js';

function OfferRow({ offer, direction }) {
  const toast = useToast();
  const update = useUpdateOffer();
  const act = (status, message) =>
    update.mutate({ id: offer.id, status }, {
      onSuccess: () => toast.success(message),
      onError: (err) => toast.error(getErrorMessage(err)),
    });

  const pending = offer.status === 'pending';
  const other = direction === 'received' ? offer.buyer.name : offer.seller.name;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <Link to={`/books/${offer.listing.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <img src={offer.listing.coverUrl} alt="" className="h-20 w-15 shrink-0 rounded-lg bg-slate-100 object-cover" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{offer.listing.title}</p>
          <p className="text-sm text-slate-500">
            {direction === 'received' ? 'From' : 'To'} {other} · {timeAgo(offer.createdAt)}
          </p>
          <p className="mt-1 text-sm">
            <strong className="text-brand-orange">{formatTaka(offer.amount)}</strong>
            <span className="text-slate-400"> (asking {formatTaka(offer.listing.price)})</span>
          </p>
          {offer.message && <p className="mt-1 text-sm italic text-slate-600">“{offer.message}”</p>}
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={offer.status} />
        {pending && direction === 'received' && (
          <>
            <Button size="sm" onClick={() => act('accepted', 'Offer accepted. The book is now reserved.')} loading={update.isPending}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => act('rejected', 'Offer rejected')} disabled={update.isPending}>Reject</Button>
          </>
        )}
        {pending && direction === 'sent' && (
          <Button size="sm" variant="outline" onClick={() => act('cancelled', 'Offer cancelled')} loading={update.isPending}>Cancel</Button>
        )}
        {offer.status === 'accepted' && direction === 'received' && offer.listing.status === 'reserved' && (
          <Button size="sm" variant="ghost" to="/my-listings">Mark as sold</Button>
        )}
      </div>
    </li>
  );
}

export default function OffersPage() {
  const [direction, setDirection] = useState('received');
  const { data: offers, isLoading, error, refetch } = useOffers(direction);

  return (
    <Page title="Offers" subtitle="Accept an offer to reserve the book, then mark it as sold after you meet.">
      <div role="tablist" className="mb-5 flex gap-1">
        {['received', 'sent'].map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={direction === d}
            onClick={() => setDirection(d)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-brand-blue ${direction === d ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {d}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : offers.length === 0 ? (
        <EmptyState icon="tag" title={direction === 'received' ? 'No offers yet' : "You haven't made any offers"} action={direction === 'sent' && <Button to="/shop">Browse books</Button>} />
      ) : (
        <ul className="space-y-3">{offers.map((o) => <OfferRow key={o.id} offer={o} direction={direction} />)}</ul>
      )}
    </Page>
  );
}
