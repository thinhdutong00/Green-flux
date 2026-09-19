import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Copy, Download, Package, Pencil, Plus, Search, Tags, Trash2, Upload } from 'lucide-react';
import { useApp } from '../components/AppProvider';
import { EmptyState, Field, Modal, PageHeader, ConfirmDialog } from '../components/ui';
import { useUnsavedChanges } from '../components/useUnsavedChanges';
import { formatMoney, formatScaled, parseScaled } from '../domain/money';
import { exportCatalogCsv, parseCatalogCsv, type CsvPreview } from '../domain/csv';
import type { CatalogItem, Category } from '../domain/types';

type ItemDraft = Omit<CatalogItem, 'priceCents' | 'vatBps'> & { price: string; vat: string };
const decimal = (value: number) => formatScaled(value, 2).replace('.', ',');
const toDraft = (item: CatalogItem): ItemDraft => { const { priceCents, vatBps, ...rest } = item; return { ...rest, price: decimal(priceCents), vat: decimal(vatBps) }; };
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Operazione non riuscita. Riprova.';

export default function Catalog() {
  const { data, repo, refresh, notify } = useApp();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [baseline, setBaseline] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<CatalogItem | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState({ id: '', name: '' });
  const [categoryOriginal, setCategoryOriginal] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [categoryDeleting, setCategoryDeleting] = useState<Category | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [importName, setImportName] = useState('');
  const [importError, setImportError] = useState('');
  const [discard, setDiscard] = useState<'item' | 'categories' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const itemDirty = !!draft && JSON.stringify(draft) !== baseline;
  const categoryDirty = categoriesOpen && categoryDraft.name !== categoryOriginal;
  const leavePrompt = useUnsavedChanges(itemDirty || categoryDirty);
  const visible = useMemo(() => data.catalog.filter(item => {
    const text = `${item.name} ${item.sku} ${item.brand} ${item.model} ${item.description}`.toLocaleLowerCase('it-IT');
    return text.includes(query.trim().toLocaleLowerCase('it-IT')) && (!categoryFilter || (categoryFilter === 'none' ? !item.categoryId : item.categoryId === categoryFilter)) && (activeFilter === 'all' || item.active === (activeFilter === 'active'));
  }).sort((a, b) => sort === 'price-up' ? a.priceCents - b.priceCents : sort === 'price-down' ? b.priceCents - a.priceCents : a.name.localeCompare(b.name, 'it')), [data.catalog, query, categoryFilter, activeFilter, sort]);
  const change = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => setDraft(current => current ? { ...current, [key]: value } : null);
  const openItem = (item?: CatalogItem, duplicate = false) => {
    const value: ItemDraft = item ? { ...toDraft(item), ...(duplicate ? { id: crypto.randomUUID(), sku: '', name: `${item.name} — copia` } : {}) } : {
      id: crypto.randomUUID(), categoryId: categoryFilter && categoryFilter !== 'none' ? categoryFilter : null, sku: '', name: '', brand: '', model: '', description: '', unit: 'pz', price: '', vat: decimal(data.settings.defaultVatBps), active: true, notes: '', kind: 'product', featured: false, imageUrl: '',
    };
    setDraft(value); setBaseline(JSON.stringify(value)); setFormError('');
  };
  const closeItem = () => itemDirty ? setDiscard('item') : setDraft(null);
  const closeCategories = () => categoryDirty ? setDiscard('categories') : setCategoriesOpen(false);
  async function saveItem(event: FormEvent) {
    event.preventDefault(); if (!draft) return;
    setBusy(true); setFormError('');
    try {
      const { price, vat, ...rest } = draft;
      const priceCents = parseScaled(price, 2), vatBps = parseScaled(vat, 2);
      if (!draft.name.trim() || !draft.unit.trim()) throw new Error('Inserisci nome e unità di misura.');
      if (priceCents < 0 || vatBps < 0 || vatBps > 10000) throw new Error('Il prezzo non può essere negativo. L’IVA deve essere compresa tra 0 e 100%.');
      if (draft.sku.trim() && data.catalog.some(item => item.id !== draft.id && item.sku.trim().toLowerCase() === draft.sku.trim().toLowerCase())) throw new Error('Questo codice è già assegnato a un’altra voce.');
      if (draft.imageUrl) { const url = new URL(draft.imageUrl); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Inserisci un URL immagine http o https.'); }
      await repo.saveCatalogItem({ ...rest, name: rest.name.trim(), sku: rest.sku.trim(), unit: rest.unit.trim(), priceCents, vatBps });
      await refresh(); setDraft(null); notify('Voce di listino salvata.');
    } catch (error) { setFormError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function saveCategory(event: FormEvent) {
    event.preventDefault(); setBusy(true); setCategoryError('');
    try {
      const name = categoryDraft.name.trim();
      if (!name) throw new Error('Inserisci il nome della categoria.');
      if (data.categories.some(category => category.id !== categoryDraft.id && category.name.toLowerCase() === name.toLowerCase())) throw new Error('Questa categoria esiste già.');
      await repo.saveCategory({ id: categoryDraft.id || crypto.randomUUID(), name }); await refresh(); setCategoryDraft({ id: '', name: '' }); setCategoryOriginal(''); notify('Categoria salvata.');
    } catch (error) { setCategoryError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function deleteItem() {
    if (!deleting) return; setBusy(true);
    try { await repo.deleteCatalogItem(deleting.id); await refresh(); setDeleting(null); notify('Voce eliminata. I preventivi esistenti conservano i loro dati.'); }
    catch (error) { notify(errorMessage(error), 'error'); } finally { setBusy(false); }
  }
  async function deleteCategory() {
    if (!categoryDeleting) return; setBusy(true);
    try { await repo.deleteCategory(categoryDeleting.id); await refresh(); if (categoryFilter === categoryDeleting.id) setCategoryFilter(''); setCategoryDeleting(null); notify('Categoria eliminata.'); }
    catch (error) { setCategoryError(errorMessage(error)); setCategoryDeleting(null); } finally { setBusy(false); }
  }
  function downloadCsv(template = false) {
    const url = URL.createObjectURL(new Blob([exportCatalogCsv(template ? [] : visible, data.categories)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = template ? 'Modello_listino_GreenFlux.csv' : 'Listino_GreenFlux.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify(template ? 'Modello CSV scaricato.' : `${visible.length} ${visible.length === 1 ? 'voce esportata' : 'voci esportate'} in CSV.`);
  }
  async function readCsv(file: File) {
    setImportError(''); setImportName(file.name);
    try {
      if (file.size > 2_000_000) throw new Error('Il file supera 2 MB. Dividilo in file più piccoli.');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      setPreview(parseCatalogCsv(text, data.categories, data.catalog));
    } catch (error) { notify(errorMessage(error), 'error'); }
  }
  async function confirmImport() {
    if (!preview?.valid) return; setBusy(true); setImportError('');
    try { await repo.importCatalogItems(preview.rows.map(row => row.item!)); await refresh(); notify(`${preview.rows.length} ${preview.rows.length === 1 ? 'nuova voce importata' : 'nuove voci importate'}.`); setPreview(null); }
    catch (error) { setImportError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <>
    <PageHeader eyebrow="IL TUO CATALOGO" title="Listino" description="Prodotti, servizi e prezzi sempre sotto il tuo controllo." actions={<button className="btn btn-primary" onClick={() => openItem()}><Plus size={18} /> Aggiungi voce</button>} />
    <div className="card">
      <div className="toolbar"><div className="search-field"><Search size={18} /><input aria-label="Cerca nel listino" placeholder="Cerca nome, codice o marca…" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <select className="input" aria-label="Filtra per categoria" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="">Tutte le categorie</option><option value="none">Senza categoria</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
        <select className="input" aria-label="Filtra per stato" value={activeFilter} onChange={event => setActiveFilter(event.target.value)}><option value="all">Tutte le voci</option><option value="active">Attive</option><option value="inactive">Non attive</option></select>
        <select className="input" aria-label="Ordina il listino" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Nome A–Z</option><option value="price-up">Prezzo crescente</option><option value="price-down">Prezzo decrescente</option></select>
      </div>
      <div className="toolbar"><span className="muted">{visible.length} {visible.length === 1 ? 'voce' : 'voci'}</span><button className="btn btn-secondary btn-sm" onClick={() => { setCategoriesOpen(true); setCategoryError(''); }}><Tags size={16} /> Categorie</button><button className="btn btn-secondary btn-sm" onClick={() => downloadCsv()}><Download size={16} /> Esporta CSV</button><button className="btn btn-secondary btn-sm" onClick={() => downloadCsv(true)}><Download size={16} /> Modello CSV</button><button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Upload size={16} /> Importa CSV</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void readCsv(file); event.target.value = ''; }} /></div>
      {!visible.length ? <EmptyState icon={<Package />} title={data.catalog.length ? 'Nessuna voce trovata' : 'Costruisci il tuo listino'} description={data.catalog.length ? 'Prova a cambiare ricerca o filtri.' : 'Aggiungi prodotti e servizi con i prezzi della tua azienda.'} action={<button className="btn btn-primary" onClick={() => openItem()}>Aggiungi una voce</button>} /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Prodotto / servizio</th><th>Categoria</th><th>Prezzo unitario</th><th>IVA</th><th>Stato</th><th><span className="sr-only">Azioni</span></th></tr></thead><tbody>{visible.map(item => <tr key={item.id}>
        <td><button className="text-button" onClick={() => openItem(item)}>{item.name}</button><div className="muted">{[item.sku, item.brand, item.model].filter(Boolean).join(' · ') || (item.kind === 'service' ? 'Servizio' : 'Prodotto')}</div></td>
        <td>{data.categories.find(category => category.id === item.categoryId)?.name ?? '—'}</td><td className="numeric">{formatMoney(item.priceCents)} <span className="muted">/ {item.unit}</span></td><td className="numeric">{decimal(item.vatBps)}%</td><td><span className={`status-pill ${item.active ? 'status-accepted' : 'status-draft'}`}>{item.active ? 'Attiva' : 'Non attiva'}</span></td>
        <td><div className="row-actions"><button className="btn btn-icon" title={`Modifica ${item.name}`} aria-label={`Modifica ${item.name}`} onClick={() => openItem(item)}><Pencil size={16} /></button><button className="btn btn-icon" title={`Duplica ${item.name}`} aria-label={`Duplica ${item.name}`} onClick={() => openItem(item, true)}><Copy size={16} /></button><button className="btn btn-icon" title={`Elimina ${item.name}`} aria-label={`Elimina ${item.name}`} onClick={() => setDeleting(item)}><Trash2 size={16} /></button></div></td>
      </tr>)}</tbody></table></div>}
    </div>
    {draft && <Modal title={data.catalog.some(item => item.id === draft.id) ? 'Modifica voce' : 'Nuova voce di listino'} onClose={busy ? () => {} : closeItem}><form onSubmit={saveItem}>
      {formError && <div className="error-banner" role="alert">{formError}</div>}
      <div className="form-grid"><Field label="Nome prodotto o servizio *" className="span-2"><input className="input" required maxLength={160} value={draft.name} onChange={event => change('name', event.target.value)} autoFocus /></Field>
        <Field label="Categoria"><select className="input" value={draft.categoryId ?? ''} onChange={event => change('categoryId', event.target.value || null)}><option value="">Senza categoria</option>{data.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        <Field label="Tipo"><select className="input" value={draft.kind} onChange={event => change('kind', event.target.value as CatalogItem['kind'])}><option value="product">Prodotto</option><option value="service">Servizio</option></select></Field>
        <Field label="Codice / SKU"><input className="input" maxLength={80} value={draft.sku} onChange={event => change('sku', event.target.value)} /></Field><Field label="Unità di misura *"><input className="input" required maxLength={20} value={draft.unit} placeholder="pz, ore, m, forfait" onChange={event => change('unit', event.target.value)} /></Field>
        <Field label="Marca"><input className="input" maxLength={120} value={draft.brand} onChange={event => change('brand', event.target.value)} /></Field><Field label="Modello"><input className="input" maxLength={120} value={draft.model} onChange={event => change('model', event.target.value)} /></Field>
        <Field label="Prezzo di listino, IVA esclusa (€) *"><input className="input" inputMode="decimal" required placeholder="0,00" value={draft.price} onChange={event => change('price', event.target.value)} /></Field><Field label="Aliquota IVA (%) *"><input className="input" inputMode="decimal" required value={draft.vat} onChange={event => change('vat', event.target.value)} /></Field>
        <Field label="Descrizione" className="span-2" hint="Comparirà nel preventivo e nel PowerPoint; potrai personalizzarla per ogni proposta."><textarea className="input" rows={4} maxLength={5000} value={draft.description} onChange={event => change('description', event.target.value)} /></Field>
        <Field label="Note interne" className="span-2" hint="Non vengono inserite nel PowerPoint."><textarea className="input" rows={2} maxLength={5000} value={draft.notes} onChange={event => change('notes', event.target.value)} /></Field>
        <Field label="URL immagine (facoltativo)" className="span-2" hint="Per la scheda prodotto. Senza immagine viene utilizzata una sagoma del settore."><input className="input" type="url" placeholder="https://…" value={draft.imageUrl} onChange={event => change('imageUrl', event.target.value)} /></Field>
        <label className="checkbox-field"><input type="checkbox" checked={draft.active} onChange={event => change('active', event.target.checked)} /> Voce attiva</label><label className="checkbox-field"><input type="checkbox" checked={draft.featured} onChange={event => change('featured', event.target.checked)} /> In evidenza nella soluzione proposta</label>
      </div><div className="dialog-actions"><button type="button" className="btn btn-secondary" onClick={closeItem} disabled={busy}>Annulla</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvataggio…' : 'Salva voce'}</button></div>
    </form></Modal>}
    {categoriesOpen && <Modal title="Categorie del listino" onClose={busy ? () => {} : closeCategories}>
      <p className="muted">Organizza liberamente prodotti e servizi. Le categorie non modificano i preventivi già salvati.</p>
      {categoryError && <div className="error-banner" role="alert">{categoryError}</div>}
      <form onSubmit={saveCategory}><div className="toolbar"><Field label={categoryDraft.id ? 'Rinomina categoria' : 'Nuova categoria'}><input className="input" required maxLength={80} placeholder="Nome categoria" value={categoryDraft.name} onChange={event => setCategoryDraft({ ...categoryDraft, name: event.target.value })} /></Field><button className="btn btn-primary" disabled={busy}>{categoryDraft.id ? 'Salva nome' : 'Aggiungi'}</button>{categoryDraft.id && <button type="button" className="btn btn-secondary" onClick={() => { setCategoryDraft({ id: '', name: '' }); setCategoryOriginal(''); }}>Annulla</button>}</div></form>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Categoria</th><th>Voci</th><th>Azioni</th></tr></thead><tbody>{data.categories.map(category => <tr key={category.id}><td>{category.name}</td><td>{data.catalog.filter(item => item.categoryId === category.id).length}</td><td><div className="row-actions"><button className="btn btn-icon" aria-label={`Rinomina ${category.name}`} onClick={() => { setCategoryDraft(category); setCategoryOriginal(category.name); }}><Pencil size={16} /></button><button className="btn btn-icon" aria-label={`Elimina categoria ${category.name}`} onClick={() => setCategoryDeleting(category)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>
      {!data.categories.length && <p className="muted">Non hai ancora creato categorie.</p>}
    </Modal>}
    {preview && <Modal title="Anteprima importazione CSV" onClose={busy ? () => {} : () => setPreview(null)}><p><strong>{importName}</strong> · {preview.rows.length} {preview.rows.length === 1 ? 'nuova voce' : 'nuove voci'}</p><p className="muted">File UTF-8, separatore punto e virgola e decimali con virgola. Le categorie devono già esistere. I codici presenti nel listino non vengono sovrascritti. Il pulsante “Modello CSV” nel listino scarica le intestazioni da compilare.</p>{[...preview.errors, importError].filter(Boolean).map((error, index) => <div className="error-banner" role="alert" key={index}>{error}</div>)}<div className="table-wrap"><table className="data-table"><thead><tr><th>Riga</th><th>Nome</th><th>Prezzo</th><th>Verifica</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.row}><td>{row.row}</td><td>{row.name || '—'}</td><td>{row.item ? formatMoney(row.item.priceCents) : '—'}</td><td>{row.errors.length ? row.errors.join(' ') : 'Pronta'}</td></tr>)}</tbody></table></div>{!preview.valid && <p className="muted">Correggi gli errori nel file e importalo di nuovo. Nessuna voce è stata salvata.</p>}<div className="dialog-actions"><button className="btn btn-secondary" onClick={() => setPreview(null)} disabled={busy}>Annulla</button><button className="btn btn-primary" onClick={() => void confirmImport()} disabled={busy || !preview.valid}>{busy ? 'Importazione…' : preview.rows.length === 1 ? 'Importa nuova voce' : 'Importa nuove voci'}</button></div></Modal>}
    {deleting && <ConfirmDialog title="Eliminare la voce?" message={`“${deleting.name}” verrà rimossa dal listino. I preventivi esistenti conserveranno la voce e il prezzo salvati.`} onConfirm={deleteItem} onCancel={() => setDeleting(null)} busy={busy} />}
    {categoryDeleting && <ConfirmDialog title="Eliminare la categoria?" message={`Le voci in “${categoryDeleting.name}” resteranno nel listino senza categoria.`} onConfirm={deleteCategory} onCancel={() => setCategoryDeleting(null)} busy={busy} />}
    {discard && <ConfirmDialog title="Scartare le modifiche?" message="Le modifiche non salvate verranno perse." onConfirm={() => { if (discard === 'item') setDraft(null); else { setCategoriesOpen(false); setCategoryDraft({ id: '', name: '' }); setCategoryOriginal(''); } setDiscard(null); }} onCancel={() => setDiscard(null)} />}
    {leavePrompt}
  </>;
}
