import { Page } from '../components/layout/Layout.jsx';
import BookCard from '../components/BookCard.jsx';
import Button from '../components/ui/Button.jsx';
import { BookGridSkeleton } from '../components/ui/Loader.jsx';
import EmptyState, { ErrorState } from '../components/ui/EmptyState.jsx';
import { useWishlist } from '../hooks/useApi.js';

export default function WishlistPage() {
  const { data: books, isLoading, error, refetch } = useWishlist();
  return (
    <Page title="Wishlist" subtitle="Books you've saved for later.">
      {isLoading ? (
        <BookGridSkeleton count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : books.length === 0 ? (
        <EmptyState icon="heart" title="Your wishlist is empty" message="Tap the heart on any book to save it here." action={<Button to="/shop">Browse books</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => <BookCard key={b.id} book={b} />)}
        </div>
      )}
    </Page>
  );
}
