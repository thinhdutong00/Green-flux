import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderOpen } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</header>;
}
export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}{hint && <small className="muted">{hint}</small>}{error && <small className="field-error">{error}</small>}</label>;
}
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null); const id = useId(); const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement; const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') ?? [])].filter(el => el.getClientRects().length > 0);
    const timer = setTimeout(() => (focusables().find(el => el.tagName === 'INPUT') ?? focusables()[0] ?? ref.current)?.focus(), 0);
    const keydown = (e: KeyboardEvent) => {
      if([...document.querySelectorAll('[aria-modal="true"]')].at(-1)!==ref.current)return;
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      if (e.key === 'Tab') {
        const els = focusables(); const first = els[0]; const last = els.at(-1);
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { clearTimeout(timer); document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return createPortal(<div className="modal-overlay"><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1} className={`modal ${wide ? 'modal-wide' : ''}`}><div className="modal-heading"><h2 id={id}>{title}</h2><button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Chiudi finestra"><X size={20}/></button></div>{children}</div></div>, document.body);
}
export function ConfirmDialog({ title, message, onConfirm, onCancel, busy = false }: { title: string; message: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  return <Modal title={title} onClose={onCancel}><p className="dialog-message">{message}</p><div className="dialog-actions"><button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Annulla</button><button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Attendi…' : 'Conferma'}</button></div></Modal>;
}
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon ?? <FolderOpen/>}</div><h3>{title}</h3>{description && <p>{description}</p>}{action}</div>;
}
export function IconButton({ children, label, onClick, disabled, className = '' }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean; className?: string }) {
  return <button type="button" className={`btn btn-icon btn-ghost ${className}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}>{children}</button>;
}
export function BrandLogo() { return <div className="brand-logo" role="img" aria-label="Green Flux · impianti tecnologici"><img src="/brand/logo-on-white.png" alt=""/></div>; }
export function Loading({ text = 'Caricamento…' }: { text?: string }) { return <div className="loading-state" role="status"><span className="spinner"/>{text}</div>; }
