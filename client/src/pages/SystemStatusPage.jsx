import { useQuery } from '@tanstack/react-query';
import { api, getErrorMessage } from '../lib/api.js';
import Logo from '../components/Logo.jsx';

const fetchHealth = () => api.get('/health').then((r) => r.data);

// Phase 0 placeholder: proves client -> API -> PostgreSQL wiring works.
// Replaced by the real homepage in Phase 3.
export default function SystemStatusPage() {
  const { data, error, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-navy-900">System status</h1>

        <div className="mt-4 rounded-lg bg-brand-sky p-4 text-sm">
          {isLoading && <p>Checking API…</p>}
          {error && <p className="text-red-600">API error: {getErrorMessage(error)}</p>}
          {data && (
            <>
              <p className="text-green-700">API: {data.status}</p>
              {data.database.status === 'connected' ? (
                <p className="text-green-700">
                  Database: connected ({new Date(data.database.time).toLocaleString()})
                </p>
              ) : (
                <p className="text-amber-700">Database: unavailable ({data.database.error})</p>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-60"
          >
            {isFetching ? 'Checking…' : 'Re-check'}
          </button>
          <span className="rounded-lg bg-brand-orange px-4 py-2 font-semibold text-white">Accent</span>
        </div>
      </div>
    </main>
  );
}
