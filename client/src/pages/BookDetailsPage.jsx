import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import ConditionBadge, { StatusBadge } from '../components/ui/ConditionBadge.jsx';
import FormField from '../components/ui/FormField.jsx';
import Modal from '../components/ui/Modal.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Loader from '../components/ui/Loader.jsx';
import { ErrorState } from '../components/ui/EmptyState.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { Stars, StarInput } from '../components/ui/StarRating.jsx';
import WishlistButton from '../components/WishlistButton.jsx';
import SafetyTips from '../components/SafetyTips.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  useCreateReview, useListing, useMakeOffer, useReportListing, useSellerReviews, useStartConversation,
} from '../hooks/useApi.js';
import { formatDate, formatTaka, timeAgo } from '../lib/format.js';
import { REPORT_REASONS } from '../lib/constants.js';
import { getErrorMessage, getFieldErrors } from '../lib/api.js';

function Gallery({ images, title }) {
  const [active, setActive] = useState(0);
  const current = images[active] || images[0];
  return (
    <div>
      <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        {current ? (
          <img src={current.url} alt={`${title}, photo ${active + 1} of ${images.length}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">No image</div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Photos">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={`h-20 w-16 overflow-hidden rounded-lg ring-2 focus-visible:outline-2 focus-visible:outline-brand-blue ${i === active ? 'ring-brand-blue' : 'ring-transparent'}`}
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfferModal({ listing, open, onClose }) {
  const toast = useToast();
  const makeOffer = useMakeOffer(listing.id);
  const [amount, setAmount] = useState(String(listing.price));
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) return setErrors({ amount: 'Enter an amount greater than 0' });
    makeOffer.mutate(
      { amount: Number(amount), message },
      {
        onSuccess: () => {
          toast.success('Offer sent! The seller will be notified.');
          onClose();
        },
        onError: (err) => {
          setErrors(getFieldErrors(err));
          toast.error(getErrorMessage(err));
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Make an offer">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-500">Asking price: <strong className="text-navy-900">{formatTaka(listing.price)}</strong></p>
        <FormField label="Your offer (৳)" type="number" min="1" inputMode="numeric" required value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <FormField as="textarea" label="Message (optional)" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} placeholder="e.g. I can meet at the library on Sunday." />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="orange" loading={makeOffer.isPending}>Send offer</Button>
        </div>
      </form>
    </Modal>
  );
}

function ReportModal({ listing, open, onClose }) {
  const toast = useToast();
  const report = useReportListing(listing.id);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!reason) return setError('Choose a reason');
    report.mutate(
      { reason, details },
      {
        onSuccess: () => {
          toast.success('Thanks. Our team will review this listing.');
          onClose();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Report this listing">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField as="select" label="Reason" required value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} error={error}>
          <option value="">Select a reason</option>
          {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </FormField>
        <FormField as="textarea" label="Details (optional)" maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Tell us what's wrong" />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={report.isPending}>Submit report</Button>
        </div>
      </form>
    </Modal>
  );
}

function ReviewForm({ listing }) {
  const toast = useToast();
  const createReview = useCreateReview(listing.id);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Choose a rating from 1 to 5 stars');
    createReview.mutate(
      { rating, comment },
      {
        onSuccess: () => toast.success('Thanks for reviewing the seller!'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-brand-blue/30 bg-brand-sky p-5">
      <h2 className="font-semibold text-navy-900">You bought this book. How was the seller?</h2>
      <StarInput value={rating} onChange={setRating} />
      <FormField as="textarea" label="Comment (optional)" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Button type="submit" loading={createReview.isPending}>Submit review</Button>
    </form>
  );
}

function SellerCard({ seller }) {
  const { data: reviews = [] } = useSellerReviews(seller.id);
  return (
    <section aria-labelledby="seller-title" className="rounded-2xl border border-slate-200 p-5">
      <h2 id="seller-title" className="text-sm font-semibold uppercase tracking-wide text-slate-500">Seller</h2>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={seller.name} src={seller.avatarUrl} size="h-12 w-12" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-navy-900">
            {seller.name}
            {seller.isVerified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                <Icon name="check" className="h-3 w-3" /> Verified
              </span>
            )}
          </p>
          {seller.university && <p className="truncate text-sm text-slate-500">{seller.university}</p>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        {seller.reviewCount > 0 ? (
          <>
            <Stars value={seller.ratingAvg} />
            <span><strong>{Number(seller.ratingAvg).toFixed(1)}</strong> ({seller.reviewCount} review{seller.reviewCount > 1 ? 's' : ''})</span>
          </>
        ) : (
          <span>No reviews yet</span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">Member since {formatDate(seller.joinedAt)}</p>
      {reviews.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {reviews.slice(0, 3).map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-2"><Stars value={r.rating} className="h-3.5 w-3.5" /><span className="text-xs text-slate-400">{r.reviewer.name}</span></div>
              {r.comment && <p className="mt-0.5 text-slate-600">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function BookDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: listing, isLoading, error, refetch } = useListing(id);
  const startChat = useStartConversation();
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (listing) document.title = `${listing.title} | Boipotro`;
  }, [listing]);

  if (isLoading) return <Loader fullPage />;
  if (error?.response?.status === 404 || error?.response?.status === 400) return <NotFoundPage message="This book is no longer listed." />;
  if (error) return <div className="mx-auto max-w-3xl p-8"><ErrorState error={error} onRetry={refetch} /></div>;

  const { viewer } = listing;
  const available = listing.status === 'active';
  const requireLogin = (fn) => () => (user ? fn() : navigate('/login', { state: { from: location } }));

  const openChat = requireLogin(() => {
    if (viewer.conversationId) return navigate(`/messages?c=${viewer.conversationId}`);
    startChat.mutate(listing.id, {
      onSuccess: (conv) => navigate(`/messages?c=${conv.id}`),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  });

  const details = [
    ['Author', listing.author],
    ['ISBN', listing.isbn],
    ['Edition', listing.edition],
    ['Category', listing.category.name],
    ['University', listing.university?.name],
    ['Listed', timeAgo(listing.createdAt)],
    ['Views', listing.viewCount],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-slate-500">
        <Link to="/shop" className="hover:text-brand-blue">Shop</Link>
        <span className="mx-2">/</span>
        <Link to={`/shop?category=${listing.category.slug}`} className="hover:text-brand-blue">{listing.category.name}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Gallery images={listing.images} title={listing.title} />

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ConditionBadge condition={listing.condition} />
              {!available && <StatusBadge status={listing.status} />}
            </div>
            <h1 className="mt-3 text-2xl font-bold text-navy-900 sm:text-3xl">{listing.title}</h1>
            <p className="mt-1 text-slate-500">by {listing.author}</p>
            <p className="mt-4 text-3xl font-extrabold text-brand-orange">{formatTaka(listing.price)}</p>
          </div>

          {viewer.isOwner ? (
            <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-4">
              <p className="w-full text-sm text-slate-600">This is your listing.</p>
              <Button to={`/listings/${listing.id}/edit`} variant="blue"><Icon name="edit" className="h-4 w-4" /> Edit listing</Button>
              <Button to="/my-listings" variant="outline">Manage in My Listings</Button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {viewer.pendingOfferId ? (
                <Button to="/offers" variant="outline">View your pending offer</Button>
              ) : (
                <Button variant="orange" onClick={requireLogin(() => setModal('offer'))} disabled={!available}>
                  <Icon name="tag" className="h-4 w-4" /> Make an Offer
                </Button>
              )}
              <Button variant="blue" onClick={openChat} loading={startChat.isPending}>
                <Icon name="chat" className="h-4 w-4" /> Chat with Seller
              </Button>
              <WishlistButton listingId={listing.id} isWishlisted={viewer.isWishlisted} variant="button" />
              <Button variant="ghost" onClick={requireLogin(() => setModal('report'))}>
                <Icon name="flag" className="h-4 w-4" /> Report
              </Button>
            </div>
          )}

          {viewer.canReview && <ReviewForm listing={listing} />}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-2xl border border-slate-200 p-5 text-sm sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1.5 sm:block sm:border-0">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-navy-900">{value}</dd>
              </div>
            ))}
          </dl>

          {listing.description && (
            <section>
              <h2 className="font-semibold text-navy-900">Description</h2>
              <p className="mt-2 whitespace-pre-line text-slate-600">{listing.description}</p>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <SellerCard seller={listing.seller} />
            <SafetyTips />
          </div>
        </div>
      </div>

      {modal === 'offer' && <OfferModal listing={listing} open onClose={() => setModal(null)} />}
      {modal === 'report' && <ReportModal listing={listing} open onClose={() => setModal(null)} />}
    </div>
  );
}
