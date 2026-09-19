import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useApp } from '../components/AppProvider';
import { ConfirmDialog, EmptyState, Field, Modal, PageHeader } from '../components/ui';
import { useUnsavedChanges } from '../components/useUnsavedChanges';
import { formatMoney } from '../domain/money';
import { validateCustomer } from '../domain/validation';
import type { Customer, QuoteStatus } from '../domain/types';

const customerName = (customer: Customer) => customer.company || `${customer.firstName} ${customer.lastName}`.trim();
const statusLabel: Record<QuoteStatus, string> = { draft: 'Bozza', generated: 'Generato', sent: 'Inviato', accepted: 'Accettato', rejected: 'Rifiutato' };
const fields: { key: keyof Omit<Customer, 'id'>; label: string; type?: string; max: number }[] = [
  { key: 'firstName', label: 'Nome', max: 200 }, { key: 'lastName', label: 'Cognome', max: 200 },
  { key: 'company', label: 'Ragione sociale', max: 300 }, { key: 'email', label: 'Email', type: 'email', max: 300 },
  { key: 'phone', label: 'Telefono', type: 'tel', max: 80 }, { key: 'address', label: 'Indirizzo', max: 500 },
  { key: 'postalCode', label: 'CAP', max: 20 }, { key: 'city', label: 'Comune', max: 150 }, { key: 'province', label: 'Provincia', max: 80 },
];

export default function Customers() {
  const { data, repo, refresh, notify } = useApp();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Customer | null>(null);
  const [baseline, setBaseline] = useState('');
  const [detail, setDetail] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [discard, setDiscard] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  const leavePrompt = useUnsavedChanges(dirty);
  const visible = useMemo(() => data.customers.filter(customer => Object.values(customer).join(' ').toLocaleLowerCase('it-IT').includes(query.trim().toLocaleLowerCase('it-IT'))).sort((a, b) => customerName(a).localeCompare(customerName(b), 'it')), [data.customers, query]);
  const relatedQuotes = detail ? data.quotes.filter(quote => quote.customerId === detail.id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  function openEdit(customer?: Customer) {
    const value = customer ? { ...customer } : { id: crypto.randomUUID(), firstName: '', lastName: '', company: '', email: '', phone: '', address: '', postalCode: '', city: '', province: '' };
    setDraft(value); setBaseline(JSON.stringify(value)); setError(''); setDetail(null);
  }
  function closeEdit() { if (dirty) setDiscard(true); else setDraft(null); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft) return; setBusy(true); setError('');
    try {
      const value = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as unknown as Customer;
      validateCustomer(value); await repo.saveCustomer(value); await refresh(); setDraft(null); notify('Cliente salvato.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Impossibile salvare il cliente. Riprova.'); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return; setBusy(true);
    try { await repo.deleteCustomer(deleting.id); await refresh(); setDeleting(null); notify('Cliente eliminato. I preventivi conservano i dati salvati.'); }
    catch (error) { notify(error instanceof Error ? error.message : 'Impossibile eliminare il cliente.', 'error'); } finally { setBusy(false); }
  }
  return <>
    <PageHeader eyebrow="LE TUE RELAZIONI" title="Clienti" description="I recapiti da ritrovare subito, per ogni nuova proposta." actions={<button className="btn btn-primary" onClick={() => openEdit()}><Plus size={18} /> Nuovo cliente</button>} />
    <div className="card"><div className="toolbar"><div className="search-field"><Search size={18} /><input aria-label="Cerca clienti" placeholder="Cerca nome, azienda, email o comune…" value={query} onChange={event => setQuery(event.target.value)} /></div><span className="muted">{visible.length} {visible.length === 1 ? 'cliente' : 'clienti'}</span></div>
      {!visible.length ? <EmptyState icon={<Users />} title={data.customers.length ? 'Nessun cliente trovato' : 'Tutti i tuoi clienti, in un posto'} description={data.customers.length ? 'Prova a cercare un altro nome o recapito.' : 'Salva un contatto e ritrovalo quando crei il prossimo preventivo.'} action={<button className="btn btn-primary" onClick={() => openEdit()}>Aggiungi cliente</button>} /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Cliente</th><th>Recapiti</th><th>Località</th><th>Preventivi</th><th><span className="sr-only">Azioni</span></th></tr></thead><tbody>{visible.map(customer => <tr key={customer.id}>
        <td><button className="text-button" onClick={() => setDetail(customer)}>{customerName(customer)}</button>{customer.company && <div className="muted">{`${customer.firstName} ${customer.lastName}`.trim()}</div>}</td>
        <td>{customer.email ? <a href={`mailto:${customer.email}`}>{customer.email}</a> : '—'}{customer.phone && <div className="muted"><a href={`tel:${customer.phone.replace(/[^+\d]/g, '')}`}>{customer.phone}</a></div>}</td>
        <td>{[customer.city, customer.province].filter(Boolean).join(' · ') || '—'}</td><td>{data.quotes.filter(quote => quote.customerId === customer.id).length}</td>
        <td><div className="row-actions"><button className="btn btn-icon" title={`Apri ${customerName(customer)}`} aria-label={`Apri ${customerName(customer)}`} onClick={() => setDetail(customer)}><ArrowUpRight size={16} /></button><button className="btn btn-icon" title={`Modifica ${customerName(customer)}`} aria-label={`Modifica ${customerName(customer)}`} onClick={() => openEdit(customer)}><Pencil size={16} /></button><button className="btn btn-icon" title={`Elimina ${customerName(customer)}`} aria-label={`Elimina ${customerName(customer)}`} onClick={() => setDeleting(customer)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table></div>}
    </div>
    {draft && <Modal title={data.customers.some(customer => customer.id === draft.id) ? 'Modifica cliente' : 'Nuovo cliente'} onClose={busy ? () => {} : closeEdit}><form onSubmit={save}><p className="muted">Compila almeno il nome del cliente o la ragione sociale. I recapiti possono essere completati in seguito.</p>{error && <div role="alert" className="error-banner">{error}</div>}<div className="form-grid">{fields.map(field => <Field key={field.key} label={field.label} className={field.key === 'company' || field.key === 'address' ? 'span-2' : undefined}><input className="input" type={field.type ?? 'text'} maxLength={field.max} autoComplete={field.key === 'email' ? 'email' : field.key === 'phone' ? 'tel' : 'off'} autoFocus={field.key === 'firstName'} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} /></Field>)}</div><div className="dialog-actions"><button type="button" className="btn btn-secondary" onClick={closeEdit} disabled={busy}>Annulla</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva cliente'}</button></div></form></Modal>}
    {detail && <Modal title={customerName(detail)} onClose={() => setDetail(null)}><div className="form-grid">{fields.filter(field => detail[field.key]).map(field => <div key={field.key} className={field.key === 'address' ? 'span-2' : undefined}><span className="muted">{field.label}</span><p>{detail[field.key]}</p></div>)}</div><div className="section-heading"><h3>Preventivi del cliente</h3><span className="muted">{relatedQuotes.length} proposte</span></div>{relatedQuotes.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Numero</th><th>Data</th><th>Totale</th><th>Stato</th></tr></thead><tbody>{relatedQuotes.map(quote => <tr key={quote.id}><td><Link to={`/preventivi/${quote.id}`} className="text-link">{quote.number}</Link></td><td>{new Date(`${quote.date}T12:00:00`).toLocaleDateString('it-IT')}</td><td className="numeric">{formatMoney(quote.totals.totalCents)}</td><td><span className={`status-pill status-${quote.status}`}>{statusLabel[quote.status]}</span></td></tr>)}</tbody></table></div> : <p className="muted">Non ci sono ancora preventivi collegati a questo cliente.</p>}<p className="muted">I dati del cliente in un preventivo già salvato restano quelli della proposta.</p><div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setDetail(null)}>Chiudi</button><button className="btn btn-primary" onClick={() => openEdit(detail)}><Pencil size={16} /> Modifica cliente</button></div></Modal>}
    {deleting && <ConfirmDialog title="Eliminare il cliente?" message={`“${customerName(deleting)}” verrà rimosso dalla rubrica. I suoi dati resteranno nei preventivi già salvati.`} onConfirm={remove} onCancel={() => setDeleting(null)} busy={busy} />}
    {discard && <ConfirmDialog title="Scartare le modifiche?" message="I dati del cliente non ancora salvati verranno persi." onConfirm={() => { setDraft(null); setDiscard(false); }} onCancel={() => setDiscard(false)} />}
    {leavePrompt}
  </>;
}
