import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useToggleWishlist } from '../hooks/useApi.js';
import { getErrorMessage } from '../lib/api.js';
import { Icon } from './ui/Icons.jsx';

/** Heart toggle. Anonymous users are sent to login first. */
export default function WishlistButton({ listingId, isWishlisted, variant = 'icon' }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const toggle = useToggleWishlist();

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate('/login', { state: { from: location } });
    toggle.mutate(
      { listingId, add: !isWishlisted },
      {
        onSuccess: () => toast.success(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist'),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  const label = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist';
  const heart = <Icon name="heart" filled={isWishlisted} className={`h-5 w-5 ${isWishlisted ? 'text-red-500' : ''}`} />;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={toggle.isPending}
        aria-pressed={isWishlisted}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-blue disabled:opacity-60"
      >
        {heart}
        {isWishlisted ? 'In Wishlist' : 'Add to Wishlist'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-label={label}
      aria-pressed={isWishlisted}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:text-red-500 focus-visible:outline-2 focus-visible:outline-brand-blue"
    >
      {heart}
    </button>
  );
}
