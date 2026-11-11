import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '../components/layout/Layout.jsx';
import BookCard from '../components/BookCard.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { BookGridSkeleton } from '../components/ui/Loader.jsx';
import EmptyState, { ErrorState } from '../components/ui/EmptyState.jsx';
import { useCategories, useListings, useUniversities } from '../hooks/useApi.js';
import { CONDITIONS, SORT_OPTIONS } from '../lib/constants.js';

const FILTER_KEYS = ['q', 'category', 'university', 'condition', 'minPrice', 'maxPrice', 'sort', 'page'];
const PAGE_SIZE = 12;

/** URL search params are the single source of truth for filters (shareable links). */
function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v === undefined || v === null) next.delete(k);
      else next.set(k, String(v));
    }
    // Any filter change resets to page 1.
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const clear = () => setParams(filters.q ? { q: filters.q } : {});
  return { filters, update, clear };
}

function FilterSidebar({ filters, update, clear }) {
  const { data: categories = [] } = useCategories();
  const { data: universities = [] } = useUniversities();
  const [price, setPrice] = useState({ min: filters.minPrice, max: filters.maxPrice });
  useEffect(() => {
    setPrice({ min: filters.minPrice, max: filters.maxPrice });
  }, [filters.minPrice, filters.maxPrice]);

  const conditions = filters.condition ? filters.condition.split(',') : [];
  const toggleCondition = (value) => {
    const next = conditions.includes(value) ? conditions.filter((c) => c !== value) : [...conditions, value];
    update({ condition: next.join(',') });
  };
  const applyPrice = (e) => {
    e.preventDefault();
    update({ minPrice: price.min, maxPrice: price.max });
  };

  return (
    <div className="space-y-6">
      <FormField as="select" label="Category" value={filters.category} onChange={(e) => update({ category: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.slug}>{c.name} ({c.activeListings})</option>)}
      </FormField>

      <FormField as="select" label="University" value={filters.university} onChange={(e) => update({ university: e.target.value })}>
        <option value="">All universities</option>
        {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </FormField>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700">Condition</legend>
        <div className="space-y-2">
          {CONDITIONS.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={conditions.includes(c.value)}
                onChange={() => toggleCondition(c.value)}
                className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <form onSubmit={applyPrice}>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Price range (৳)</legend>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="min-price">Minimum price</label>
            <input id="min-price" type="number" min="0" inputMode="numeric" placeholder="Min" value={price.min} onChange={(e) => setPrice((p) => ({ ...p, min: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
            <span className="text-slate-400">–</span>
            <label className="sr-only" htmlFor="max-price">Maximum price</label>
            <input id="max-price" type="number" min="0" inputMode="numeric" placeholder="Max" value={price.max} onChange={(e) => setPrice((p) => ({ ...p, max: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
        </fieldset>
        <Button type="submit" variant="outline" size="sm" block className="mt-2">Apply price</Button>
      </form>

      <Button variant="ghost" size="sm" block onClick={clear}>Clear all filters</Button>
    </div>
  );
}

export default function ShopPage() {
  const { filters, update, clear } = useFilters();
  const [showFilters, setShowFilters] = useState(false);
  const page = Number(filters.page) || 1;

  const query = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    page,
    limit: PAGE_SIZE,
  };
  const { data, isLoading, isFetching, error, refetch } = useListings(query);

  const goToPage = (p) => {
    update({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Page title="Shop Textbooks" subtitle={filters.q ? `Results for “${filters.q}”` : 'Find used textbooks from students near you.'}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1"><SearchBar initialValue={filters.q} onSearch={(q) => update({ q })} /></div>
        <div className="flex gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="filters">
            <Icon name="filter" className="h-4 w-4" /> Filters
          </Button>
          <label htmlFor="sort" className="sr-only">Sort by</label>
          <select
            id="sort"
            value={filters.sort || 'newest'}
            onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside id="filters" aria-label="Filters" className={`${showFilters ? 'block' : 'hidden'} rounded-2xl border border-slate-200 bg-white p-5 lg:block lg:self-start`}>
          <FilterSidebar filters={filters} update={update} clear={clear} />
        </aside>

        <section aria-label="Results" aria-busy={isFetching}>
          {data && (
            <p className="mb-4 text-sm text-slate-500" aria-live="polite">
              {data.total} {data.total === 1 ? 'book' : 'books'} found
            </p>
          )}
          {isLoading ? (
            <BookGridSkeleton count={PAGE_SIZE} />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : data.data.length === 0 ? (
            <EmptyState
              icon="search"
              title="No books match your search"
              message="Try a different keyword or remove some filters."
              action={<Button variant="outline" onClick={clear}>Clear filters</Button>}
            />
          ) : (
            <>
              <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}>
                {data.data.map((book) => <BookCard key={book.id} book={book} />)}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={goToPage} />
            </>
          )}
        </section>
      </div>
    </Page>
  );
}
