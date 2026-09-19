import Papa from 'papaparse';
import type { CatalogItem, Category } from './types';
import { formatScaled, parseScaled } from './money';
import { validateCatalogItem } from './validation';

export const CSV_COLUMNS = ['categoria', 'codice', 'nome', 'marca', 'modello', 'descrizione', 'unita', 'prezzo', 'iva', 'attivo', 'tipo', 'in_evidenza', 'note', 'immagine_url'] as const;
export interface CsvPreviewRow { row: number; name: string; item: CatalogItem | null; errors: string[] }
export interface CsvPreview { rows: CsvPreviewRow[]; errors: string[]; valid: boolean }
const requiredColumns = ['nome', 'unita', 'prezzo', 'iva'];
const normalize = (value: string) => value.trim().toLocaleLowerCase('it-IT');
const booleanValue = (value: string, fallback: boolean) => {
  if (!value.trim()) return fallback;
  if (['si', 'sì', 'true', '1'].includes(normalize(value))) return true;
  if (['no', 'false', '0'].includes(normalize(value))) return false;
  throw new Error('Usa sì/no nei campi attivo e in_evidenza.');
};

export function parseCatalogCsv(text: string, categories: Category[], existing: CatalogItem[]): CsvPreview {
  if (text.length > 2_000_000) return { rows: [], errors: ['Il file supera 2 MB. Dividilo in file più piccoli.'], valid: false };
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ''), { header: true, delimiter: ';', skipEmptyLines: 'greedy', transformHeader: header => normalize(header) });
  const fields = result.meta.fields ?? [];
  const errors = requiredColumns.filter(column => !fields.includes(column)).map(column => `Colonna obbligatoria mancante: ${column}.`);
  if (fields.length !== new Set(fields).size || Object.keys(result.meta.renamedHeaders ?? {}).length) errors.push('Il file contiene intestazioni duplicate.');
  if (result.data.length > 1000) errors.push('Importa al massimo 1.000 voci alla volta.');
  if (!result.data.length) errors.push('Il file non contiene voci da importare.');
  for (const error of result.errors.filter(error => error.row == null)) errors.push(error.message);
  const usedSkus = new Set(existing.filter(item => item.sku.trim()).map(item => normalize(item.sku)));
  const rows = result.data.slice(0, 1000).map((raw, index): CsvPreviewRow => {
    const rowErrors = result.errors.filter(error => error.row === index).map(() => 'Il numero di colonne non corrisponde alle intestazioni.');
    const value = (field: string) => String(raw[field] ?? '').trim();
    const name = value('nome');
    if (!name) rowErrors.push('Nome obbligatorio.');
    if (!value('unita')) rowErrors.push('Unità di misura obbligatoria.');
    if (name.length > 160) rowErrors.push('Nome: massimo 160 caratteri.');
    if (value('descrizione').length > 5000) rowErrors.push('Descrizione: massimo 5.000 caratteri.');
    const category = categories.find(category => normalize(category.name) === normalize(value('categoria')));
    if (value('categoria') && !category) rowErrors.push(`Categoria “${value('categoria')}” non presente: creala prima dell’importazione.`);
    const sku = value('codice');
    if (sku && usedSkus.has(normalize(sku))) rowErrors.push('Codice già presente nel listino o ripetuto nel file.');
    if (sku) usedSkus.add(normalize(sku));
    let priceCents = 0, vatBps = 0, active = true, featured = false;
    try { priceCents = parseScaled(value('prezzo'), 2); if (priceCents < 0) throw new Error(); } catch { rowErrors.push('Prezzo non valido: usa un importo positivo o zero, ad esempio 1250,00.'); }
    try { vatBps = parseScaled(value('iva'), 2); if (vatBps < 0 || vatBps > 10000) throw new Error(); } catch { rowErrors.push('IVA non valida: usa una percentuale tra 0 e 100.'); }
    try { active = booleanValue(value('attivo'), true); featured = booleanValue(value('in_evidenza'), false); } catch (error) { rowErrors.push((error as Error).message); }
    const kind = normalize(value('tipo'));
    if (kind && !['prodotto', 'servizio', 'product', 'service'].includes(kind)) rowErrors.push('Tipo non valido: usa prodotto o servizio.');
    const imageUrl = value('immagine_url');
    if (imageUrl) { try { const url = new URL(imageUrl); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); } catch { rowErrors.push('URL immagine non valido: usa http o https.'); } }
    const item: CatalogItem = { id: crypto.randomUUID(), categoryId: category?.id ?? null, sku, name, brand: value('marca'), model: value('modello'), description: value('descrizione'), unit: value('unita'), priceCents, vatBps, active, notes: value('note'), kind: ['servizio', 'service'].includes(kind) ? 'service' : 'product', featured, imageUrl };
    if (!rowErrors.length) { try { validateCatalogItem(item); } catch (error) { rowErrors.push((error as Error).message); } }
    return { row: index + 2, name, item: rowErrors.length ? null : item, errors: rowErrors };
  });
  return { rows, errors, valid: !errors.length && rows.length > 0 && rows.every(row => !row.errors.length) };
}

/** Leading apostrophes keep spreadsheet apps from executing user-entered formulas. */
export function escapeCsvFormula(value: string): string {
  return /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) || /^[\t\r\n]/u.test(value) ? `'${value}` : value;
}

export function exportCatalogCsv(items: CatalogItem[], categories: Category[]): string {
  const rows = items.map(item => [
    categories.find(category => category.id === item.categoryId)?.name ?? '', item.sku, item.name, item.brand, item.model,
    item.description, item.unit, formatScaled(item.priceCents, 2).replace('.', ','), formatScaled(item.vatBps, 2).replace('.', ','), item.active ? 'sì' : 'no',
    item.kind === 'service' ? 'servizio' : 'prodotto', item.featured ? 'sì' : 'no', item.notes, item.imageUrl,
  ].map(escapeCsvFormula));
  return '\uFEFF' + Papa.unparse({ fields: [...CSV_COLUMNS], data: rows }, { delimiter: ';', newline: '\r\n', quotes: true });
}
