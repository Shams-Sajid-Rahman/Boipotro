import { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Loader from '../../components/ui/Loader.jsx';
import { useCategories, useUniversities } from '../../hooks/useApi.js';
import { useAct } from './shared.jsx';

/** Generic inline-editable list: each row toggles into a small form. */
function EditableList({ title, items, fields, toBody, endpoint, describe, canDelete }) {
  const { run, pending } = useAct();
  const empty = Object.fromEntries(fields.map((f) => [f.key, '']));
  const [newItem, setNewItem] = useState(empty);
  const [editing, setEditing] = useState(null); // { id, values }
  const [errors, setErrors] = useState({});

  const create = (e) => {
    e.preventDefault();
    run({ method: 'post', url: endpoint, body: toBody(newItem) }, `${title.slice(0, -1)} added`, {
      onSuccess: () => { setNewItem(empty); setErrors({}); },
      onFieldErrors: setErrors,
    });
  };
  const save = (e) => {
    e.preventDefault();
    run({ method: 'patch', url: `${endpoint}/${editing.id}`, body: toBody(editing.values) }, 'Saved', { onSuccess: () => setEditing(null) });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-navy-900">{title}</h3>
      <form onSubmit={create} noValidate className="mt-4 grid items-end gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {fields.map((f) => (
          <FormField key={f.key} label={f.label} required={f.required} value={newItem[f.key]} error={errors[f.key]} placeholder={f.placeholder}
            onChange={(e) => setNewItem((v) => ({ ...v, [f.key]: e.target.value }))} />
        ))}
        <Button type="submit" variant="orange" loading={pending}>Add</Button>
      </form>

      <ul className="mt-5 divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="py-2.5">
            {editing?.id === item.id ? (
              <form onSubmit={save} className="flex flex-wrap items-end gap-2">
                {fields.map((f) => (
                  <FormField key={f.key} label={f.label} className="min-w-36 flex-1" value={editing.values[f.key] ?? ''}
                    onChange={(e) => setEditing((ed) => ({ ...ed, values: { ...ed.values, [f.key]: e.target.value } }))} />
                ))}
                <Button type="submit" size="sm" loading={pending}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 text-sm">{describe(item)}</div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ id: item.id, values: Object.fromEntries(fields.map((f) => [f.key, item[f.key] ?? ''])) })}>Edit</Button>
                  {canDelete(item) && (
                    <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" disabled={pending}
                      onClick={() => window.confirm(`Delete "${item.name}"?`) && run({ method: 'delete', url: `${endpoint}/${item.id}` }, 'Deleted')}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CatalogTab() {
  const { data: categories, isLoading: lc } = useCategories();
  const { data: universities, isLoading: lu } = useUniversities();
  if (lc || lu) return <Loader />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EditableList
        title="Categories"
        endpoint="/categories"
        items={categories}
        fields={[
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Law' },
          { key: 'slug', label: 'Slug', placeholder: 'auto from name' },
        ]}
        toBody={(v) => ({ name: v.name, ...(v.slug ? { slug: v.slug } : {}) })}
        describe={(c) => <><span className="font-medium text-navy-900">{c.name}</span> <span className="text-slate-400">/{c.slug} · {c.activeListings} active</span></>}
        canDelete={(c) => c.activeListings === 0}
      />
      <EditableList
        title="Universities"
        endpoint="/universities"
        items={universities}
        fields={[
          { key: 'name', label: 'Name', required: true },
          { key: 'emailDomain', label: 'Email domain', placeholder: 'e.g. iub.edu.bd' },
          { key: 'city', label: 'City', required: true },
        ]}
        toBody={(v) => ({ name: v.name, city: v.city, ...(v.emailDomain ? { emailDomain: v.emailDomain } : {}) })}
        describe={(u) => <><span className="font-medium text-navy-900">{u.name}</span> <span className="text-slate-400">· {u.city}{u.emailDomain && ` · @${u.emailDomain}`}</span></>}
        canDelete={() => true}
      />
    </div>
  );
}
