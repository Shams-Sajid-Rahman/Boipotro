import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useUniversities } from '../../hooks/useApi.js';
import { getErrorMessage, getFieldErrors } from '../../lib/api.js';

const EMPTY = { name: '', email: '', password: '', universityId: '', department: '', phone: '' };

/** Same rules as the server's zod schema, for instant feedback. */
function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address';
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errors.password = 'Use at least one letter and one number';
  if (form.phone && !/^(\+?88)?01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) errors.phone = 'Enter a valid number like 01712345678';
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: universities = [] } = useUniversities();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const selectedUni = useMemo(() => universities.find((u) => String(u.id) === form.universityId), [universities, form.universityId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    setErrors(clientErrors);
    setFormError('');
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const user = await register({ ...form, universityId: form.universityId || undefined });
      toast.success(
        user.isVerified
          ? 'Account created. Your university email is verified!'
          : 'Account created. Use your university email to get a verified badge.',
      );
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Join students across Bangladesh buying and selling textbooks.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <FormField label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
        <FormField as="select" label="University" value={form.universityId} onChange={set('universityId')} error={errors.universityId}>
          <option value="">Select your university</option>
          {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </FormField>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          hint={selectedUni?.emailDomain ? `Use your @${selectedUni.emailDomain} email to get a verified badge.` : undefined}
        />
        <FormField label="Password" type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters with a letter and a number." />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Department" value={form.department} onChange={set('department')} error={errors.department} placeholder="e.g. CSE" />
          <FormField label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="01XXXXXXXXX" />
        </div>
        <Button type="submit" block size="lg" variant="orange" loading={submitting}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-brand-blue hover:underline">Log in</Link>
      </p>
    </AuthCard>
  );
}
