import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getErrorMessage, getFieldErrors } from '../../lib/api.js';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      const user = await login(form);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Log in to Boipotro" subtitle="Buy and sell textbooks with students near you.">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <FormField label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <FormField label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={set('password')} error={errors.password} />
        <Button type="submit" block size="lg" loading={submitting}>Log in</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to Boipotro?{' '}
        <Link to="/register" state={location.state} className="font-semibold text-brand-blue hover:underline">Create an account</Link>
      </p>
    </AuthCard>
  );
}
