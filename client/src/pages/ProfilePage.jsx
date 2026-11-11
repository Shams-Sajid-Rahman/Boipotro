import { useState } from 'react';
import { Page } from '../components/layout/Layout.jsx';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { Stars } from '../components/ui/StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSellerReviews, useUniversities, useUpdateProfile } from '../hooks/useApi.js';
import { formatDate } from '../lib/format.js';
import { getErrorMessage, getFieldErrors } from '../lib/api.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: universities = [] } = useUniversities();
  const { data: reviews = [] } = useSellerReviews(user.id);
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ? user.phone.replace(/^\+88/, '') : '',
    department: user.department || '',
    universityId: user.university ? String(user.university.id) : '',
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    update.mutate(form, {
      onSuccess: (u) => {
        setErrors({});
        toast.success(u.isVerified ? 'Profile saved' : 'Profile saved. Your email does not match this university, so you are not verified.');
      },
      onError: (err) => {
        setErrors(getFieldErrors(err));
        toast.error(getErrorMessage(err));
      },
    });
  };

  return (
    <Page title="Profile">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <div className="flex justify-center"><Avatar name={user.name} src={user.avatarUrl} size="h-20 w-20" /></div>
          <h2 className="mt-3 text-lg font-semibold text-navy-900">{user.name}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="mt-3">
            {user.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"><Icon name="check" className="h-3.5 w-3.5" />Verified student</span>
            ) : (
              <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Not verified</span>
            )}
          </p>
          <p className="mt-3 text-xs text-slate-400">Member since {formatDate(user.createdAt)}</p>
        </section>

        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <h2 className="font-semibold text-navy-900">Edit details</h2>
          <FormField label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField as="select" label="University" value={form.universityId} onChange={set('universityId')} error={errors.universityId}>
              <option value="">Not specified</option>
              {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </FormField>
            <FormField label="Department" value={form.department} onChange={set('department')} error={errors.department} />
          </div>
          <FormField label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Never shown publicly. Buyers contact you through chat." placeholder="01XXXXXXXXX" />
          <Button type="submit" loading={update.isPending}>Save changes</Button>
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-3">
          <h2 className="font-semibold text-navy-900">Reviews from buyers ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No reviews yet. Complete a sale to get your first one.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {reviews.map((r) => (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><Stars value={r.rating} /><span className="font-medium">{r.reviewer.name}</span><span className="text-slate-400">· {r.listing?.title}</span></div>
                  {r.comment && <p className="mt-1 text-slate-600">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  );
}
