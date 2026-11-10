import { Link } from 'react-router-dom';
import ConditionBadge, { StatusBadge } from './ui/ConditionBadge.jsx';
import { buttonClasses } from './ui/Button.jsx';
import WishlistButton from './WishlistButton.jsx';
import { formatTaka } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function BookCard({ book, className = '' }) {
  const { user } = useAuth();
  const isMine = user?.id === book.sellerId;

  return (
    <article className={`group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
        {!isMine && (
          <div className="absolute right-2 top-2">
            <WishlistButton listingId={book.id} isWishlisted={book.isWishlisted} />
          </div>
        )}
        {book.status !== 'active' && (
          <div className="absolute left-2 top-2"><StatusBadge status={book.status} /></div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold leading-snug text-navy-900" title={book.title}>{book.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{book.author}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <ConditionBadge condition={book.condition} />
          <span className="text-lg font-bold text-navy-900">{formatTaka(book.price)}</span>
        </div>
        <div className="mt-auto pt-3">
          <Link
            to={`/books/${book.id}`}
            className={buttonClasses({ variant: 'blue', size: 'sm', block: true })}
            aria-label={`View details for ${book.title}`}
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
