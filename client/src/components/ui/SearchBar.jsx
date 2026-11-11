import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icons.jsx';

/**
 * Title / author / ISBN search. By default navigates to /shop?q=…;
 * pass onSearch to handle it yourself (e.g. the shop page keeps other filters).
 */
export default function SearchBar({ initialValue = '', placeholder = 'Search by title, author or ISBN', onSearch, size = 'md', variant = 'text' }) {
  const [value, setValue] = useState(initialValue);
  const navigate = useNavigate();

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const submit = (e) => {
    e.preventDefault();
    const q = value.trim();
    if (onSearch) onSearch(q);
    else navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const big = size === 'lg';

  // Design variant: white pill with a small orange magnifier button inside.
  if (variant === 'icon') {
    return (
      <form role="search" onSubmit={submit} className="flex w-full items-center rounded-lg bg-white p-1.5 shadow-lg">
        <label htmlFor={`search-${size}`} className="sr-only">Search textbooks</label>
        <input
          id={`search-${size}`}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-base"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-orange text-white transition-colors hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          <Icon name="search" />
        </button>
      </form>
    );
  }

  return (
    <form role="search" onSubmit={submit} className="flex w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
      <label htmlFor={`search-${size}`} className="sr-only">Search textbooks</label>
      <span className="flex items-center pl-4 text-slate-400">
        <Icon name="search" />
      </span>
      <input
        id={`search-${size}`}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent px-3 text-slate-800 placeholder:text-slate-400 focus:outline-none ${big ? 'py-4 text-base' : 'py-2.5 text-sm'}`}
      />
      <button
        type="submit"
        className={`bg-brand-orange font-semibold text-white transition-colors hover:bg-brand-orange-dark focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white ${big ? 'px-6 sm:px-8' : 'px-4 text-sm'}`}
      >
        Search
      </button>
    </form>
  );
}
