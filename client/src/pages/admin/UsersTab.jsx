import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminList, useUniversities } from '../../hooks/useApi.js';
import { formatDate, formatTaka } from '../../lib/format.js';
import { AdminTable, PAGE_SIZE, SearchInput, useAct } from './shared.jsx';

const blankUser = { name: '', email: '', password: '', phone: '', universityId: '', department: '', role: 'student', isVerified: false };

/** Create (no user) or edit (user given). Password optional when editing. */
function UserForm({ user, onDone }) {
  const { data: universities = [] } = useUniversities();
  const { run, pending } = useAct();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(
    user
      ? { ...blankUser, ...user, password: '', phone: user.phone || '', department: user.department || '', universityId: user.university ? String(user.university.id) : '' }
      : blankUser,
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const body = {
      name: form.name, email: form.email, role: form.role, isVerified: form.isVerified,
      phone: form.phone, department: form.department, universityId: form.universityId,
      ...(form.password ? { password: form.password } : {}),
    };
    if (!user) {
      // Create: empty optionals are simply omitted.
      for (const k of ['phone', 'department', 'universityId']) if (!body[k]) delete body[k];
    }
    run(
      user ? { method: 'patch', url: `/users/${user.id}`, body } : { method: 'post', url: '/users', body },
      user ? 'User updated' : 'User created',
      { onSuccess: onDone, onFieldErrors: setErrors },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" required value={form.name} onChange={set('name')} error={errors.name} />
        <FormField label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} />
      </div>
      <FormField
        label={user ? 'New password' : 'Password'}
        type="password"
        required={!user}
        autoComplete="new-password"
        value={form.password}
        onChange={set('password')}
        error={errors.password}
        hint={user ? 'Leave blank to keep the current password. Changing it signs the user out.' : 'At least 8 characters with a letter and a number.'}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+8801XXXXXXXXX" />
        <FormField label="Department" value={form.department} onChange={set('department')} error={errors.department} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField as="select" label="University" value={form.universityId} onChange={set('universityId')} error={errors.universityId}>
          <option value="">None</option>
          {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </FormField>
        <FormField as="select" label="Role" value={form.role} onChange={set('role')} error={errors.role}>
          <option value="student">Student</option>
          <option value="admin">Admin</option>
        </FormField>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={form.isVerified} onChange={set('isVerified')} className="h-4 w-4 rounded border-slate-300" />
        Verified student
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={pending}>{user ? 'Save changes' : 'Create user'}</Button>
      </div>
    </form>
  );
}

function UserDetail({ id, onEdit }) {
  const { data, isLoading } = useAdminList(`users/${id}`, {}, { placeholderData: undefined });
  if (isLoading || !data) return <Loader />;
  const u = data.user;
  const s = u.stats;
  const rows = [
    ['Email', u.email], ['Phone', u.phone || '—'], ['University', u.university?.name || '—'], ['Department', u.department || '—'],
    ['Role', u.role], ['Verified', u.isVerified ? 'Yes' : 'No'], ['Banned', u.isBanned ? 'Yes' : 'No'], ['Joined', formatDate(u.createdAt)],
    ['Active listings', s.activeListings], ['Books sold', s.soldListings], ['Sales value', formatTaka(s.salesValue)],
    ['Books bought', s.purchases], ['Offers made', s.offersMade], ['Messages sent', s.messagesSent],
    ['Seller rating', s.ratingAvg ?? '—'], ['Reports against', s.reportsAgainst],
  ];
  return (
    <div>
      <dl className="grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-slate-100 py-1.5">
            <dt className="text-slate-500">{k}</dt><dd className="font-medium text-navy-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex justify-end"><Button onClick={() => onEdit(u)}>Edit user</Button></div>
    </div>
  );
}

export default function UsersTab() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { type: 'create' | 'edit' | 'view' | 'delete', user }
  const query = useAdminList('users', { q: q || undefined, page, limit: PAGE_SIZE });
  const { run, pending } = useAct();
  const close = () => setModal(null);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} label="Search name or email" />
        <Button variant="orange" onClick={() => setModal({ type: 'create' })}>+ New user</Button>
      </div>
      <AdminTable
        query={query} page={page} setPage={setPage} empty="No users found."
        columns={['Name', 'University', 'Listings', 'Joined', 'Status', 'Actions']}
        renderRow={(u) => (
          <tr key={u.id}>
            <td className="px-4 py-3">
              <button type="button" onClick={() => setModal({ type: 'view', user: u })} className="text-left font-medium text-brand-blue hover:underline">{u.name}</button>
              {u.role === 'admin' && <span className="ml-1 text-xs text-brand-orange">(admin)</span>}
              <p className="text-xs text-slate-500">{u.email}</p>
            </td>
            <td className="px-4 py-3">{u.university || '—'}</td>
            <td className="px-4 py-3">{u.listings}</td>
            <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
            <td className="px-4 py-3">
              {u.isBanned ? <span className="font-semibold text-red-600">Banned</span> : u.isVerified ? <span className="text-green-700">Verified</span> : <span className="text-slate-500">Unverified</span>}
            </td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setModal({ type: 'edit', user: { ...u, university: null } })}>Edit</Button>
                {u.id !== me.id && u.role !== 'admin' && (
                  <Button size="sm" variant="outline" disabled={pending}
                    onClick={() => run({ method: 'patch', url: `/users/${u.id}/ban`, body: { banned: !u.isBanned } }, u.isBanned ? `${u.name} unbanned` : `${u.name} banned`)}>
                    {u.isBanned ? 'Unban' : 'Ban'}
                  </Button>
                )}
                {u.id !== me.id && (
                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setModal({ type: 'delete', user: u })}>Delete</Button>
                )}
              </div>
            </td>
          </tr>
        )}
      />

      <Modal open={modal?.type === 'create'} onClose={close} title="New user">
        {modal?.type === 'create' && <UserForm onDone={close} />}
      </Modal>
      <Modal open={modal?.type === 'edit'} onClose={close} title={`Edit ${modal?.user?.name ?? ''}`}>
        {modal?.type === 'edit' && <EditLoader id={modal.user.id} onDone={close} />}
      </Modal>
      <Modal open={modal?.type === 'view'} onClose={close} title={modal?.user?.name ?? 'User'}>
        {modal?.type === 'view' && <UserDetail id={modal.user.id} onEdit={(u) => setModal({ type: 'edit', user: u })} />}
      </Modal>
      <Modal open={modal?.type === 'delete'} onClose={close} title="Delete this user permanently?">
        <p className="text-sm text-slate-600">
          <strong>{modal?.user?.name}</strong> and all their listings, offers, chats and wishlist will be deleted.
          Reviews they wrote are removed too. This cannot be undone. To keep the history, ban the user instead.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={() => run({ method: 'delete', url: `/users/${modal.user.id}` }, 'User deleted', { onSuccess: close })}>Delete permanently</Button>
        </div>
      </Modal>
    </>
  );
}

/** The list row lacks phone/department, so load full details before editing. */
function EditLoader({ id, onDone }) {
  const { data, isLoading } = useAdminList(`users/${id}`, {}, { placeholderData: undefined });
  if (isLoading || !data) return <Loader />;
  return <UserForm user={data.user} onDone={onDone} />;
}
