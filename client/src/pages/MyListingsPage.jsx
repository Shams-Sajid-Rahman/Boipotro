import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../components/layout/Layout.jsx';
import Button from '../components/ui/Button.jsx';
import ConditionBadge, { StatusBadge } from '../components/ui/ConditionBadge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Skeleton } from '../components/ui/Loader.jsx';
import EmptyState, { ErrorState } from '../components/ui/EmptyState.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDeleteListing, useMyListings, useUpdateListingStatus } from '../hooks/useApi.js';
import { formatTaka, timeAgo } from '../lib/format.js';
import { getErrorMessage } from '../lib/api.js';

const TABS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
];

function ListingRow({ listing, onDelete }) {
  const toast = useToast();
  const updateStatus = useUpdateListingStatus();

  const changeStatus = (status) =>
    updateStatus.mutate(
      { id: listing.id, status },
      {
        onSuccess: () => toast.success(status === 'sold' ? 'Marked as sold' : `Marked as ${status}`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
      <Link to={`/books/${listing.id}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-brand-blue">
        <img src={listing.coverUrl} alt="" className="h-24 w-18 shrink-0 rounded-lg bg-slate-100 object-cover" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{listing.title}</p>
          <p className="truncate text-sm text-slate-500">{listing.author}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-navy-900">{formatTaka(listing.price)}</span>
            <StatusBadge status={listing.status} />
            <ConditionBadge condition={listing.condition} />
          </div>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-400">
            <span>Listed {timeAgo(listing.createdAt)}</span>
            <span className="inline-flex items-center gap-1"><Icon name="eye" className="h-3.5 w-3.5" />{listing.viewCount} views</span>
            {listing.pendingOffers > 0 && (
              <Link to="/offers" className="font-semibold text-brand-orange hover:underline">{listing.pendingOffers} pending offer{listing.pendingOffers > 1 ? 's' : ''}</Link>
            )}
          </p>
        </div>
      </Link>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <label className="sr-only" htmlFor={`status-${listing.id}`}>Status of {listing.title}</label>
        <select
          id={`status-${listing.id}`}
          value={listing.status}
          disabled={updateStatus.isPending}
          onChange={(e) => changeStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="active">Active</option>
          <option value="reserved">Reserved</option>
          <option value="sold">Sold</option>
        </select>
        {listing.status !== 'sold' && (
          <Button size="sm" variant="outline" onClick={() => changeStatus('sold')} disabled={updateStatus.isPending}>
            <Icon name="check" className="h-4 w-4" /> Mark sold
          </Button>
        )}
        <Button size="sm" variant="outline" to={`/listings/${listing.id}/edit`} aria-label={`Edit ${listing.title}`}>
          <Icon name="edit" className="h-4 w-4" /> Edit
        </Button>
        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => onDelete(listing)} aria-label={`Delete ${listing.title}`}>
          <Icon name="trash" className="h-4 w-4" /> Delete
        </Button>
      </div>
    </li>
  );
}

export default function MyListingsPage() {
  const toast = useToast();
  const { data: listings, isLoading, error, refetch } = useMyListings();
  const deleteListing = useDeleteListing();
  const [tab, setTab] = useState('');
  const [toDelete, setToDelete] = useState(null);

  const visible = (listings || []).filter((l) => !tab || l.status === tab);
  const count = (status) => (listings || []).filter((l) => !status || l.status === status).length;

  const confirmDelete = () =>
    deleteListing.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success('Listing deleted');
        setToDelete(null);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });

  return (
    <Page title="My Listings" actions={<Button to="/sell" variant="orange"><Icon name="upload" className="h-4 w-4" /> Sell a book</Button>}>
      <div role="tablist" aria-label="Filter by status" className="mb-5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-blue ${tab === t.value ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t.label} ({count(t.value)})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={tab ? 'Nothing here' : "You haven't listed any books yet"}
          message="Turn last semester's textbooks into cash."
          action={<Button to="/sell" variant="orange">List your first book</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((l) => <ListingRow key={l.id} listing={l} onDelete={setToDelete} />)}
        </ul>
      )}

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete this listing?">
        <p className="text-sm text-slate-600">
          “{toDelete?.title}” will be removed from the shop. Pending offers will be cancelled. This can't be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToDelete(null)}>Keep it</Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteListing.isPending}>Delete</Button>
        </div>
      </Modal>
    </Page>
  );
}
