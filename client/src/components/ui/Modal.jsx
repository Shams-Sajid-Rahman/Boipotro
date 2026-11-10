import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icons.jsx';

/** Accessible dialog: focus moves in, Escape / backdrop closes, focus returns on close. */
export default function Modal({ open, onClose, title, children }) {
  const titleId = useId();
  const panelRef = useRef(null);
  // Ref so an inline onClose prop doesn't re-run the effect (and steal focus) on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Focus the first form control, else the panel.
    const first = panelRef.current?.querySelector('input, select, textarea, button:not([data-close])');
    (first || panelRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl focus:outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-navy-900">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-blue">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
