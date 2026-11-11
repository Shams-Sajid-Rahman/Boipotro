import { useEffect } from 'react';
import Button from '../components/ui/Button.jsx';
import { Icon } from '../components/ui/Icons.jsx';

export default function NotFoundPage({ message = "The page you're looking for doesn't exist or has moved." }) {
  useEffect(() => {
    document.title = 'Page not found | Boipotro';
  }, []);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-sky text-brand-blue"><Icon name="book" className="h-8 w-8" /></span>
      <p className="mt-4 text-5xl font-extrabold text-navy-900">404</p>
      <h1 className="mt-2 text-xl font-semibold text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-slate-500">{message}</p>
      <div className="mt-6 flex gap-3">
        <Button to="/">Go home</Button>
        <Button to="/shop" variant="outline">Browse books</Button>
      </div>
    </div>
  );
}

/** Shown by the error boundary when a page crashes while rendering. */
export function CrashPage({ onReset }) {
  return (
    <div role="alert" className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Icon name="alert" className="h-12 w-12 text-red-500" />
      <h1 className="mt-4 text-xl font-semibold text-navy-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-500">An unexpected error occurred. Please try again.</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={onReset}>Try again</Button>
        <Button to="/" variant="outline" onClick={onReset}>Go home</Button>
      </div>
    </div>
  );
}
