import { useState } from 'react';
import { Page } from '../components/layout/Layout.jsx';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSendContact, useSiteContent } from '../hooks/useApi.js';
import { getErrorMessage, getFieldErrors } from '../lib/api.js';

export default function ContactPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: content } = useSiteContent();
  const send = useSendContact();
  const empty = { name: user?.name || '', email: user?.email || '', subject: '', message: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const contact = content?.contact;

  const onSubmit = (e) => {
    e.preventDefault();
    send.mutate(form, {
      onSuccess: () => {
        toast.success('Message sent. We will get back to you soon.');
        setForm(empty);
        setErrors({});
      },
      onError: (err) => {
        setErrors(getFieldErrors(err));
        toast.error(getErrorMessage(err));
      },
    });
  };

  return (
    <Page title={contact?.title || 'Contact'} subtitle={contact?.description}>
      <div className="grid gap-8 lg:grid-cols-3">
        {contact && (
          <ul className="space-y-4 text-sm">
            {[
              ['mail', contact.email, `mailto:${contact.email}`],
              ['phone', contact.phone, `tel:${contact.phone.replace(/[^\d+]/g, '')}`],
              ['map', contact.address],
            ].map(([icon, text, href]) => (
              <li key={icon} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-sky text-brand-blue"><Icon name={icon} /></span>
                {href ? <a href={href} className="mt-2 font-medium text-navy-900 hover:text-brand-blue">{text}</a> : <span className="mt-2 font-medium text-navy-900">{text}</span>}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
            <FormField label="Email" type="email" required value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
          </div>
          <FormField label="Subject" required value={form.subject} onChange={set('subject')} error={errors.subject} />
          <FormField as="textarea" label="Message" required value={form.message} onChange={set('message')} error={errors.message} maxLength={3000} />
          <Button type="submit" variant="orange" loading={send.isPending}>Send message</Button>
        </form>
      </div>
    </Page>
  );
}
