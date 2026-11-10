import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../components/layout/Layout.jsx';
import FormField from '../components/ui/FormField.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import { ErrorState } from '../components/ui/EmptyState.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCategories, useListing, useSaveListing, useUniversities } from '../hooks/useApi.js';
import { CONDITIONS, IMAGE_TYPES, MAX_IMAGES, MAX_IMAGE_MB } from '../lib/constants.js';
import { getErrorMessage, getFieldErrors } from '../lib/api.js';

const EMPTY = { title: '', author: '', isbn: '', edition: '', categoryId: '', universityId: '', condition: '', price: '', description: '' };

function validate(form, imageCount) {
  const e = {};
  if (form.title.trim().length < 2) e.title = 'Enter the book title';
  if (form.author.trim().length < 2) e.author = 'Enter the author';
  if (form.isbn && !/^(\d{9}[\dXx]|\d{13})$/.test(form.isbn.replace(/[\s-]/g, ''))) e.isbn = 'ISBN must be 10 or 13 digits';
  if (!form.categoryId) e.categoryId = 'Choose a category';
  if (!form.condition) e.condition = 'Choose the condition';
  if (!(Number(form.price) > 0)) e.price = 'Enter a price greater than 0';
  if (imageCount === 0) e.images = 'Add at least one photo of the book';
  return e;
}

/** Existing photos (edit mode) + new files with local previews. */
function ImagePicker({ existing, onRemoveExisting, files, setFiles, error }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const total = existing.length + files.length;
  const addFiles = (list) => {
    const accepted = [];
    for (const file of list) {
      if (!IMAGE_TYPES.includes(file.type)) toast.error(`${file.name}: only JPG, PNG or WEBP images`);
      else if (file.size > MAX_IMAGE_MB * 1024 * 1024) toast.error(`${file.name} is larger than ${MAX_IMAGE_MB} MB`);
      else accepted.push(file);
    }
    const room = MAX_IMAGES - total;
    if (accepted.length > room) toast.error(`You can add up to ${MAX_IMAGES} photos`);
    setFiles((f) => [...f, ...accepted.slice(0, Math.max(room, 0))]);
  };

  const tile = 'relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200';
  const removeBtn = 'absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow focus-visible:outline-2 focus-visible:outline-brand-blue';

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">Photos <span className="text-red-500">*</span></legend>
      <p className="mb-3 text-xs text-slate-500">Up to {MAX_IMAGES} photos (JPG, PNG or WEBP, max {MAX_IMAGE_MB} MB each). The first one is the cover.</p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {existing.map((img, i) => (
          <li key={img.id} className={tile}>
            <img src={img.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" className={removeBtn} onClick={() => onRemoveExisting(img.id)} aria-label={`Remove photo ${i + 1}`}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </li>
        ))}
        {previews.map((url, i) => (
          <li key={url} className={tile}>
            <img src={url} alt={`New photo ${i + 1}`} className="h-full w-full object-cover" />
            <button type="button" className={removeBtn} onClick={() => setFiles((f) => f.filter((_, j) => j !== i))} aria-label={`Remove new photo ${i + 1}`}>
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </li>
        ))}
        {total < MAX_IMAGES && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); addFiles([...e.dataTransfer.files]); }}
              className={`flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm text-slate-500 hover:border-brand-blue hover:text-brand-blue focus-visible:outline-2 focus-visible:outline-brand-blue ${error ? 'border-red-400' : 'border-slate-300'}`}
            >
              <Icon name="upload" className="h-6 w-6" />
              Add photo
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { addFiles([...e.target.files]); e.target.value = ''; }}
      />
      {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
    </fieldset>
  );
}

export default function SellPage() {
  const { id } = useParams(); // present on /listings/:id/edit
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const { data: universities = [] } = useUniversities();
  const { data: listing, isLoading, error } = useListing(id);
  const save = useSaveListing(id);

  const [form, setForm] = useState({ ...EMPTY, universityId: user?.university?.id ? String(user.university.id) : '' });
  const [files, setFiles] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [errors, setErrors] = useState({});

  // Fill the form once when editing.
  useEffect(() => {
    if (!listing) return;
    setForm({
      title: listing.title, author: listing.author, isbn: listing.isbn || '', edition: listing.edition || '',
      categoryId: String(listing.category.id), universityId: listing.university ? String(listing.university.id) : '',
      condition: listing.condition, price: String(listing.price), description: listing.description || '',
    });
  }, [listing]);

  if (isEdit && isLoading) return <Loader fullPage />;
  if (isEdit && error) return <Page title="Edit listing"><ErrorState error={error} /></Page>;
  if (isEdit && listing && !listing.viewer.canEdit) return <Page title="Edit listing"><ErrorState error={{ message: 'You can only edit your own listings.' }} /></Page>;

  const existing = (listing?.images || []).filter((img) => !removedIds.includes(img.id));
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const clientErrors = validate(form, existing.length + files.length);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    const data = new FormData();
    for (const [k, v] of Object.entries(form)) data.append(k, v.trim());
    files.forEach((f) => data.append('images', f));
    if (removedIds.length) data.append('removeImageIds', removedIds.join(','));

    save.mutate(data, {
      onSuccess: (saved) => {
        toast.success(isEdit ? 'Listing updated' : 'Your book is listed!');
        navigate(`/books/${saved.id}`);
      },
      onError: (err) => {
        setErrors(getFieldErrors(err));
        toast.error(getErrorMessage(err));
      },
    });
  };

  return (
    <Page title={isEdit ? 'Edit listing' : 'Sell your book'} subtitle={isEdit ? undefined : 'List a textbook in under a minute.'} narrow>
      <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <ImagePicker
          existing={existing}
          onRemoveExisting={(imgId) => setRemovedIds((ids) => [...ids, imgId])}
          files={files}
          setFiles={(f) => { setFiles(f); setErrors((er) => ({ ...er, images: undefined })); }}
          error={errors.images}
        />
        <FormField label="Title" required value={form.title} onChange={set('title')} error={errors.title} placeholder="e.g. Introduction to Algorithms" />
        <FormField label="Author" required value={form.author} onChange={set('author')} error={errors.author} placeholder="e.g. Thomas H. Cormen" />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="ISBN" value={form.isbn} onChange={set('isbn')} error={errors.isbn} hint="Optional, 10 or 13 digits" inputMode="numeric" />
          <FormField label="Edition" value={form.edition} onChange={set('edition')} error={errors.edition} placeholder="e.g. 3rd" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField as="select" label="Category" required value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId}>
            <option value="">Select a category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FormField>
          <FormField as="select" label="University" value={form.universityId} onChange={set('universityId')} error={errors.universityId} hint="Where buyers can pick it up">
            <option value="">Not specified</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </FormField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField as="select" label="Condition" required value={form.condition} onChange={set('condition')} error={errors.condition}>
            <option value="">Select condition</option>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </FormField>
          <FormField label="Price (৳)" type="number" min="1" inputMode="numeric" required value={form.price} onChange={set('price')} error={errors.price} />
        </div>
        <FormField as="textarea" label="Description" maxLength={2000} value={form.description} onChange={set('description')} error={errors.description} placeholder="Condition details, highlights, where to meet…" />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" variant="orange" size="lg" loading={save.isPending}>{isEdit ? 'Save changes' : 'Publish listing'}</Button>
        </div>
      </form>
    </Page>
  );
}
