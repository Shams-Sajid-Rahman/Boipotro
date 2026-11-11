import { useSearchParams } from 'react-router-dom';
import { Page } from '../../components/layout/Layout.jsx';
import { Icon } from '../../components/ui/Icons.jsx';
import { useAdminStats } from '../../hooks/useApi.js';
import { StatCard } from './shared.jsx';
import SalesTab from './SalesTab.jsx';
import UsersTab from './UsersTab.jsx';
import ListingsTab from './ListingsTab.jsx';
import ReportsTab from './ReportsTab.jsx';
import ChatsTab from './ChatsTab.jsx';
import CatalogTab from './CatalogTab.jsx';
import SettingsTab from './SettingsTab.jsx';
import AuditTab from './AuditTab.jsx';

const TABS = [
  { key: 'sales', label: 'Sales & Profit', icon: 'tag', Component: SalesTab },
  { key: 'users', label: 'Users', icon: 'users', Component: UsersTab },
  { key: 'listings', label: 'Listings', icon: 'book', Component: ListingsTab },
  { key: 'reports', label: 'Reports', icon: 'flag', Component: ReportsTab },
  { key: 'chats', label: 'Chats', icon: 'chat', Component: ChatsTab },
  { key: 'catalog', label: 'Categories & Universities', icon: 'grid', Component: CatalogTab },
  { key: 'settings', label: 'Settings & Content', icon: 'edit', Component: SettingsTab },
  { key: 'audit', label: 'Audit log', icon: 'shield', Component: AuditTab },
];

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const { data: stats, isLoading } = useAdminStats();
  const active = TABS.find((t) => t.key === params.get('tab')) || TABS[0];

  return (
    <Page title="Admin dashboard">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard loading={isLoading} icon="users" label="Users" value={stats?.users} hint={stats && `${stats.bannedUsers} banned`} />
        <StatCard loading={isLoading} icon="book" label="Active listings" value={stats?.activeListings} />
        <StatCard loading={isLoading} icon="check" label="Sold listings" value={stats?.soldListings} />
        <StatCard loading={isLoading} icon="flag" label="Open reports" value={stats?.openReports} />
      </dl>

      <div role="tablist" aria-label="Admin sections" className="-mx-4 mb-6 mt-8 flex gap-1 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active.key === t.key}
            onClick={() => setParams({ tab: t.key })}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand-blue ${
              active.key === t.key ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
            {t.key === 'reports' && stats?.openReports > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{stats.openReports}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={active.label}>
        <active.Component />
      </div>
    </Page>
  );
}
