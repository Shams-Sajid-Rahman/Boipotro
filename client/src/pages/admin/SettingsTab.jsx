import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useSiteContent } from '../../hooks/useApi.js';
import { useAct } from './shared.jsx';

const SECTIONS = {
  hero: 'Homepage hero', featured: 'Featured section', howItWorks: 'How It Works', messaging: 'Messaging section',
  trust: 'Trust & Safety', footer: 'Footer', about: 'About page', contact: 'Contact page',
};

function CommissionForm({ current }) {
  const { run, pending } = useAct();
  const [value, setValue] = useState(String(current ?? 0));
  useEffect(() => {
    setValue(String(current ?? 0));
  }, [current]);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); run({ method: 'put', url: '/site-content/fees', body: { value: { commissionPercent: Number(value) } } }, 'Commission updated'); }}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h3 className="font-semibold text-navy-900">Platform commission</h3>
      <p className="mt-1 text-sm text-slate-500">
        Applied to each book when it is marked sold. Past sales keep the rate they were sold at.
      </p>
      <div className="mt-4 flex items-end gap-2">
        <FormField label="Commission (%)" type="number" min="0" max="50" step="0.5" value={value} onChange={(e) => setValue(e.target.value)} className="w-40" />
        <Button type="submit" loading={pending}>Save</Button>
      </div>
    </form>
  );
}

/** Edits one site_content section as formatted JSON (keeps every section editable without a custom form each). */
function ContentEditor({ content }) {
  const { run, pending } = useAct();
  const [key, setKey] = useState('hero');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setText(JSON.stringify(content[key] ?? {}, null, 2));
    setError('');
  }, [key, content]);

  const save = (e) => {
    e.preventDefault();
    let value;
    try {
      value = JSON.parse(text);
    } catch (err) {
      return setError(`Invalid JSON: ${err.message}`);
    }
    if (typeof value !== 'object' || Array.isArray(value) || value === null) return setError('The section must be a JSON object { … }');
    run({ method: 'put', url: `/site-content/${key}`, body: { value } }, `${SECTIONS[key]} updated`);
  };

  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-navy-900">Website text & images</h3>
      <p className="mt-1 text-sm text-slate-500">Edit the text shown on the public pages. Keep the same field names; change only the values.</p>
      <FormField as="select" label="Section" className="mt-4 max-w-xs" value={key} onChange={(e) => setKey(e.target.value)}>
        {Object.entries(SECTIONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </FormField>
      <FormField as="textarea" label="Content (JSON)" className="mt-4" value={text} onChange={(e) => { setText(e.target.value); setError(''); }} error={error}
        spellCheck={false} rows={16} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
      <div className="mt-3 flex gap-2">
        <Button type="submit" loading={pending}>Save section</Button>
        <Button variant="ghost" onClick={() => setText(JSON.stringify(content[key] ?? {}, null, 2))}>Reset</Button>
      </div>
    </form>
  );
}

export default function SettingsTab() {
  const { data: content, isLoading } = useSiteContent();
  if (isLoading || !content) return <Loader />;
  return (
    <div className="space-y-6">
      <CommissionForm current={content.fees?.commissionPercent} />
      <ContentEditor content={content} />
    </div>
  );
}
