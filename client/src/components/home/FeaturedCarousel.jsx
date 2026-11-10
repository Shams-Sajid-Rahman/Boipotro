import { useCallback, useEffect, useRef, useState } from 'react';
import BookCard from '../BookCard.jsx';
import { BookCardSkeleton } from '../ui/Loader.jsx';
import { ErrorState } from '../ui/EmptyState.jsx';
import { Icon } from '../ui/Icons.jsx';
import Button from '../ui/Button.jsx';
import { useFeaturedListings } from '../../hooks/useApi.js';

const ITEM = 'w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23%] xl:w-[19%]';

/** Native horizontal scroll (touch swipe for free) + scroll-snap + arrow buttons. */
export default function FeaturedCarousel({ content }) {
  const { data: books, isLoading, error, refetch } = useFeaturedListings('popular');
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [books, updateEdges]);

  const scroll = (dir) => {
    const el = trackRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrow = 'flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-navy-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-blue disabled:opacity-40';

  return (
    <section aria-labelledby="featured-title" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id="featured-title" className="text-2xl font-bold text-navy-900 sm:text-3xl">{content?.title}</h2>
          {content?.subtitle && <p className="mt-1 text-slate-500">{content.subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className={arrow} onClick={() => scroll(-1)} disabled={edges.start} aria-label="Previous books">
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className={arrow} onClick={() => scroll(1)} disabled={edges.end} aria-label="Next books">
            <Icon name="chevronRight" />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <div
          ref={trackRef}
          onScroll={updateEdges}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="region"
          aria-label="Featured textbooks"
          tabIndex={0}
        >
          {isLoading
            ? Array.from({ length: 5 }, (_, i) => <div key={i} className={ITEM}><BookCardSkeleton /></div>)
            : books.map((book) => (
                <div key={book.id} className={ITEM}>
                  <BookCard book={book} className="h-full" />
                </div>
              ))}
        </div>
      )}
      <div className="mt-4 text-center">
        <Button to="/shop" variant="outline">Browse all textbooks</Button>
      </div>
    </section>
  );
}
