import { useEffect, useState, type FormEvent } from 'react';
import { Building2, FileText, Hash, Save } from 'lucide-react';
import { useApp } from '../components/AppProvider';
import { ConfirmDialog, Field, PageHeader } from '../components/ui';
import { useUnsavedChanges } from '../components/useUnsavedChanges';
import { formatScaled, parseScaled } from '../domain/money';
import { validateSettings } from '../domain/validation';
import type { CompanySettings } from '../domain/types';

type SettingsDraft = Omit<CompanySettings, 'validityDays' | 'defaultVatBps' | 'nextSequence'> & { validity: string; vat: string; sequence: string };
function toDraft(settings: CompanySettings): SettingsDraft {
  const { validityDays, defaultVatBps, nextSequence, ...rest } = settings;
  return { ...rest, validity: String(validityDays), vat: formatScaled(defaultVatBps, 2).replace('.', ','), sequence: String(nextSequence) };
}
function wholeNumber(value: string, label: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error(`${label}: inserisci un numero intero positivo.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${label}: inserisci un numero intero positivo.`);
  return number;
}

export default function Settings() {
  const { data, repo, refresh, notify } = useApp();
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(data.settings));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(data.settings)));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(draft) !== baseline;
  const leavePrompt = useUnsavedChanges(dirty);
  useEffect(() => {
    if (!dirty) { const next = toDraft(data.settings); setDraft(next); setBaseline(JSON.stringify(next)); }
  }, [data.settings, dirty]);
  const change = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { validity, vat, sequence, ...rest } = draft;
      const settings: CompanySettings = {
        ...rest, legalName: rest.legalName.trim(), email: rest.email.trim(), website: rest.website.trim(), numberPrefix: rest.numberPrefix.trim(),
        validityDays: wholeNumber(validity, 'Validità'), defaultVatBps: parseScaled(vat, 2), nextSequence: wholeNumber(sequence, 'Prossimo progressivo'),
      };
      validateSettings(settings);
      if (settings.nextSequence < data.settings.nextSequence) throw new Error(`Il prossimo progressivo deve essere almeno ${data.settings.nextSequence}: i numeri già assegnati non si riutilizzano.`);
      await repo.saveSettings(settings);
      await refresh();
      const savedDraft = toDraft(settings); setDraft(savedDraft); setBaseline(JSON.stringify(savedDraft));
      notify('Impostazioni salvate. Saranno utilizzate nei nuovi preventivi.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Impossibile salvare le impostazioni. Riprova.'); } finally { setBusy(false); }
  }
  const year = new Intl.DateTimeFormat('it-IT', { year: 'numeric', timeZone: 'Europe/Rome' }).format(new Date());
  return <>
    <PageHeader eyebrow="SU MISURA PER GREEN FLUX" title="Impostazioni" description="Identità aziendale e condizioni da usare nelle nuove proposte." actions={<button form="settings-form" type="submit" className="btn btn-primary" disabled={busy || !dirty}><Save size={18} />{busy ? 'Salvataggio…' : 'Salva impostazioni'}</button>} />
    {error && <div role="alert" className="error-banner">{error}</div>}
    <form id="settings-form" onSubmit={save} className="settings-form">
      <section className="card"><div className="section-heading"><div><h2><Building2 size={20} /> Dati aziendali</h2><p className="muted">Questi dati compaiono nella chiusura del PowerPoint.</p></div></div><div className="form-grid">
        <Field label="Ragione sociale *" className="span-2"><input className="input" required maxLength={300} value={draft.legalName} onChange={event => change('legalName', event.target.value)} /></Field>
        <Field label="Telefono"><input className="input" type="tel" maxLength={80} value={draft.phone} onChange={event => change('phone', event.target.value)} /></Field>
        <Field label="Email"><input className="input" type="email" maxLength={300} value={draft.email} onChange={event => change('email', event.target.value)} /></Field>
        <Field label="Sito web"><input className="input" type="url" maxLength={500} placeholder="https://www.green-flux.com" value={draft.website} onChange={event => change('website', event.target.value)} /></Field>
        <Field label="Partita IVA"><input className="input" maxLength={40} value={draft.vatNumber} onChange={event => change('vatNumber', event.target.value)} /></Field>
        <Field label="Indirizzo completo" className="span-2"><input className="input" maxLength={500} value={draft.address} onChange={event => change('address', event.target.value)} /></Field>
        <Field label="Referente Green Flux" className="span-2"><input className="input" maxLength={200} placeholder="Nome e cognome" value={draft.representative} onChange={event => change('representative', event.target.value)} /></Field>
      </div></section>
      <section className="card"><div className="section-heading"><div><h2><FileText size={20} /> Condizioni della proposta</h2><p className="muted">Testi precompilati, modificabili anche nel singolo preventivo. Lascia vuoto ciò che non vuoi includere.</p></div></div><div className="form-grid">
        <Field label="Validità standard (giorni) *"><input className="input" type="number" min={1} max={3650} step={1} required value={draft.validity} onChange={event => change('validity', event.target.value)} /></Field>
        <Field label="IVA predefinita (%) *" hint="Valore iniziale per nuove voci. L’aliquota resta modificabile per ogni prodotto e preventivo."><input className="input" inputMode="decimal" required value={draft.vat} onChange={event => change('vat', event.target.value)} /></Field>
        <Field label="Modalità di pagamento" className="span-2"><textarea className="input" rows={3} maxLength={30000} placeholder="Inserisci le modalità concordate dall’azienda." value={draft.paymentTerms} onChange={event => change('paymentTerms', event.target.value)} /></Field>
        <Field label="Tempistiche indicative" className="span-2"><textarea className="input" rows={3} maxLength={30000} placeholder="Inserisci le condizioni relative a consegna e installazione." value={draft.deliveryTerms} onChange={event => change('deliveryTerms', event.target.value)} /></Field>
        <Field label="Garanzie e condizioni" className="span-2"><textarea className="input" rows={4} maxLength={30000} placeholder="Inserisci esclusivamente le condizioni applicate dalla tua azienda." value={draft.warrantyTerms} onChange={event => change('warrantyTerms', event.target.value)} /></Field>
        <Field label="Note standard" className="span-2"><textarea className="input" rows={3} maxLength={50000} value={draft.notes} onChange={event => change('notes', event.target.value)} /></Field>
      </div></section>
      <section className="card"><div className="section-heading"><div><h2><Hash size={20} /> Numerazione dei preventivi</h2><p className="muted">Il numero viene assegnato al primo salvataggio. I numeri esistenti restano invariati.</p></div></div><div className="form-grid">
        <Field label="Prefisso *" hint="Da 1 a 16 lettere, numeri, trattini o underscore."><input className="input" required maxLength={16} pattern="[A-Za-z0-9_\-]{1,16}" value={draft.numberPrefix} onChange={event => change('numberPrefix', event.target.value)} /></Field>
        <Field label="Prossimo progressivo *" hint={`Minimo disponibile: ${data.settings.nextSequence}.`}><input className="input" type="number" min={data.settings.nextSequence} max={999999999} step={1} required value={draft.sequence} onChange={event => change('sequence', event.target.value)} /></Field>
      </div><div className="number-preview"><span className="muted">Anteprima del prossimo numero</span><strong>{repo.mode === 'local' ? 'DEMO-' : ''}{draft.numberPrefix || 'GF'}-{year}-{(draft.sequence || '1').padStart(4, '0')}</strong></div></section>
      <div className="settings-save-bar"><span className="muted" role="status">{dirty ? 'Hai modifiche non salvate.' : 'Tutte le impostazioni sono aggiornate.'}</span><div className="dialog-actions"><button type="button" className="btn btn-secondary" disabled={busy || !dirty} onClick={() => setDiscard(true)}>Annulla modifiche</button><button type="submit" className="btn btn-primary" disabled={busy || !dirty}><Save size={18} />{busy ? 'Salvataggio…' : 'Salva impostazioni'}</button></div></div>
    </form>
    {discard && <ConfirmDialog title="Annullare le modifiche?" message="Verranno ripristinate le ultime impostazioni salvate." onConfirm={() => { const value = toDraft(data.settings); setDraft(value); setBaseline(JSON.stringify(value)); setError(''); setDiscard(false); }} onCancel={() => setDiscard(false)} />}
    {leavePrompt}
  </>;
}
