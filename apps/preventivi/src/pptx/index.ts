import type { Quote, QuoteLine } from '../domain/types';
import { calculateQuote } from '../domain/money';
import { validateQuote } from '../domain/validation';
import { normalizePptxPackage } from './package';
import { C, DeckTemplate, chunks, customerName, date, energyArt, eur, number, text, wrapText, type TextBlock } from './template';

export function quoteFilename(quote: Quote): string {
  const name = customerName(quote).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 90) || 'Cliente';
  const day = quote.date.replace(/[^0-9-]/g, '').slice(0, 10);
  return `Preventivo_GreenFlux_${name}_${day}.pptx`;
}
const itemIdentity = (line: QuoteLine) => [line.name, [line.brand, line.model].filter(Boolean).join(' '), line.sku ? `Codice: ${line.sku}` : ''].filter(Boolean).join('\n');

function cover(deck: DeckTemplate) {
  const q = deck.quote;
  const slide = deck.slide('Proposta commerciale', 'Proposta per il tuo impianto');
  // A generous type-led cover; all dynamic copy has the same pagination guarantees as body slides.
  const rows: TextBlock[] = [
    { label: 'Preparata per', text: customerName(q) },
    { label: 'Progetto', text: q.project.type },
    { label: 'Preventivo', text: `${q.number}\n${date(q.date)}${q.isDemo ? '\nDati dimostrativi. Importi non riferiti al listino Green Flux.' : ''}` },
  ];
  let y = 2.03;
  let overflow = false;
  const remaining: TextBlock[] = [];
  for (const row of rows) {
    const lines = wrapText(row.text, 7.8, 21);
    if (overflow || y + 0.31 + lines.length * 0.38 > 6.5) { overflow = true; remaining.push(row); continue; }
    text(slide, row.label!.toUpperCase(), 0.7, y, 7.8, 0.24, 10.5, { color: C.muted, bold: true });
    y += 0.32;
    text(slide, lines.join('\n'), 0.7, y, 8.0, lines.length * 0.38 + 0.07, 21, { color: C.petrol });
    y += lines.length * 0.38 + 0.39;
  }
  if (remaining.length) deck.flow('Proposta commerciale', 'I dati della proposta', remaining);
}

function project(deck: DeckTemplate) {
  const q = deck.quote;
  const c = q.customer;
  deck.flow('Il progetto', 'Una soluzione costruita sul tuo progetto', [
    { label: 'Cliente', text: [c.company, [c.firstName, c.lastName].filter(Boolean).join(' ')].filter(Boolean).join('\n') },
    { label: 'Recapiti', text: [c.email, c.phone].filter(Boolean).join('\n') },
    { label: 'Indirizzo cliente', text: [c.address, [c.postalCode, c.city, c.province].filter(Boolean).join(' ')].filter(Boolean).join('\n') },
    { label: 'Intervento', text: [q.project.type, q.project.address || c.address, q.project.propertyType, q.project.areaSqm !== null ? `Superficie: ${number(q.project.areaSqm)} m²` : ''].filter(Boolean).join('\n') },
    { label: 'Esigenze e note del progetto', text: q.project.notes },
  ]);
}
function solution(deck: DeckTemplate, featured: QuoteLine[]) {
  const blocks = featured.flatMap(line => [
    { label: 'Sistema proposto', text: itemIdentity(line), keepWithNext: true },
    { label: 'Descrizione', text: line.description },
  ]);
  deck.flow('Soluzione proposta', 'I sistemi del tuo impianto', blocks.length ? blocks : [{ text: 'Il dettaglio completo della fornitura è riportato nel riepilogo economico.' }]);
}
function scope(deck: DeckTemplate) {
  const services = deck.quote.lines.filter(line => line.includeInScope);
  deck.flow('Attività incluse', 'Cosa comprende l’intervento', services.length ? services.flatMap((line, index) => [
    { label: `Attività ${index + 1}`, text: itemIdentity(line), keepWithNext: true },
    { text: line.description },
  ]) : [{ text: 'Le voci comprese nella proposta sono riportate nel dettaglio della fornitura e dell’investimento.' }]);
}

async function imageData(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    if (/^data:image\/(png|jpeg);base64,/.test(url)) return url;
    const response = await fetch(url, { signal: AbortSignal.timeout(4500), credentials: 'omit', referrerPolicy: 'no-referrer' });
    const mime = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !mime || !['image/png', 'image/jpeg'].includes(mime)) return undefined;
    if (Number(response.headers.get('content-length')) > 5_000_000) return undefined;
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > 5_000_000 || buffer.byteLength < 24) return undefined;
    const png = buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71;
    const jpeg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
    if ((mime === 'image/png' && !png) || (mime === 'image/jpeg' && !jpeg)) return undefined;
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(new Blob([buffer], { type: mime }));
      bitmap.close();
    }
    let binary = '';
    for (const part of chunks([...buffer], 8192)) binary += String.fromCharCode(...part);
    return `${mime};base64,${btoa(binary)}`;
  } catch { return undefined; }
}
async function supply(deck: DeckTemplate, featured: QuoteLine[]) {
  const cards = featured.flatMap(line => chunks(wrapText(itemIdentity(line), 4.94, 17), 6).map((lines, page) => ({ line, lines, page })));
  if (!cards.length) { deck.flow('Fornitura', 'I componenti della proposta', [{ text: 'Il dettaglio completo della fornitura è riportato nel riepilogo economico.' }]); return; }
  // Only current, user-supplied image references are read. Failures render a native sector placeholder.
  const images = new Map<string, string | undefined>();
  for (const line of featured) if (line.imageUrl && !images.has(line.imageUrl)) images.set(line.imageUrl, await imageData(line.imageUrl));
  for (const [pageIndex, group] of chunks(cards, 2).entries()) {
    const slide = deck.slide('Fornitura', 'I componenti della proposta', pageIndex > 0);
    for (const [index, card] of group.entries()) {
      const x = 0.7 + index * 6.08;
      slide.addShape('roundRect', { x, y: 2.02, w: 5.82, h: 4.57, line: { color: C.border, width: 0.6 }, fill: { color: C.paper } });
      const photo = images.get(card.line.imageUrl);
      if (photo) {
        slide.addImage({ data: photo, x: x + 0.32, y: 2.25, w: 5.15, h: 1.86, sizing: { type: 'contain', w: 5.15, h: 1.86 }, altText: card.line.name });
      } else energyArt(slide, card.line.kind === 'service' ? 0 : 1, x + 1.84, 2.32, 2.12, 80);
      text(slide, card.page ? 'COMPONENTE / CONTINUA' : 'COMPONENTE', x + 0.3, 4.29, 5.19, 0.25, 10.5, { bold: true, color: C.muted });
      text(slide, card.lines.join('\n'), x + 0.3, 4.65, 5.19, 1.75, 17, { color: C.petrol });
    }
  }
}

type TableRow = { cells: string[]; height: number; continuation: boolean };
function investment(deck: DeckTemplate) {
  const q = deck.quote;
  const widths = [5.93, 0.74, 1.8, 0.83, 0.7, 1.93];
  const header = ['Descrizione', 'Q.tà', 'Prezzo unit.', 'Sc. %', 'IVA %', 'Totale riga'];
  const rows: TableRow[] = q.lines.flatMap((line, index) => {
    const identity = [itemIdentity(line), `Unità: ${line.unit}`, line.description].filter(Boolean).join('\n');
    const cols = [identity, number(line.quantityMilli / 1000), eur(line.unitPriceCents), number(line.discountBps / 100, 2), number(line.vatBps / 100, 2), eur(q.totals.lines[index].baseCents)];
    const wrapped = cols.map((value, col) => wrapText(value, widths[col] - 0.2, col ? 11.5 : 13));
    const maxLines = Math.max(...wrapped.map(lines => lines.length));
    return Array.from({ length: Math.ceil(maxLines / 13) }, (_, part) => {
      const cells = wrapped.map(lines => lines.slice(part * 13, (part + 1) * 13).join('\n'));
      const count = Math.max(...cells.map(cell => cell.split('\n').length));
      return { cells, height: count * 0.235 + 0.22, continuation: part > 0 };
    });
  });
  let page = 0;
  let cursor = 0;
  while (cursor < rows.length) {
    const slide = deck.slide('Investimento', 'Il dettaglio dell’investimento', page++ > 0);
    const group: TableRow[] = [];
    let height = 0.42;
    while (cursor < rows.length && height + rows[cursor].height <= 4.64) { height += rows[cursor].height; group.push(rows[cursor++]); }
    const headerCells = header.map(label => ({ text: label, options: { bold: true, fill: { color: C.petrol }, color: C.white, fontSize: 10.5 } }));
    const body = group.map((row, i) => row.cells.map((value, col) => ({ text: value, options: { fontSize: col ? 11.5 : 13, color: C.ink, fill: { color: i % 2 ? C.white : C.paper }, align: (col ? 'right' : 'left') as 'right' | 'left' } })));
    slide.addTable([headerCells, ...body], { x: 0.7, y: 1.97, w: 11.93, h: height, colW: widths, rowH: [0.42, ...group.map(row => row.height)], fontFace: 'Arial', fontSize: 13, margin: [5, 6, 5, 6], border: { color: C.border, pt: 0.5 }, valign: 'top', autoPage: false });
    text(slide, 'Prezzi IVA esclusa. Totali riga dopo lo sconto di riga; adeguamenti complessivi nel riepilogo.', 0.7, 6.7, 11.9, 0.2, 9, { color: C.muted });
  }
  // VAT groups paginate separately if a quote contains many distinct rates.
  const vat = q.totals.vatGroups;
  const vatGroups = chunks(vat, 8);
  for (const [i, group] of vatGroups.entries()) {
    const last = i === vatGroups.length - 1;
    const slide = deck.slide('Investimento', last ? 'Il tuo investimento' : 'Il riepilogo IVA', i > 0);
    const summary = [
      ['Subtotale dopo gli sconti di riga', eur(q.totals.subtotalCents)],
      ['Sconto complessivo', `− ${eur(q.totals.discountCents)}`],
      ['Maggiorazione', eur(q.totals.surchargeCents)],
      ['Imponibile', eur(q.totals.taxableCents)],
      ...group.map(rate => [`IVA ${number(rate.rateBps / 100, 2)}% su ${eur(rate.taxableCents)}`, eur(rate.vatCents)]),
    ];
    const h = Math.min(4.09, summary.length * 0.315);
    slide.addTable(summary.map(([label, value]) => [{ text: label, options: { color: C.muted } }, { text: value, options: { bold: true, align: 'right' as const, color: C.petrol } }]), { x: 0.7, y: 2.0, w: 11.93, colW: [8.03, 3.9], h, rowH: 0.315, margin: [3, 6, 3, 6], border: { type: 'none' }, fontFace: 'Arial', fontSize: 14, autoPage: false });
    if (last) {
      text(slide, `IVA totale  ${eur(q.totals.vatCents)}`, 0.7, 6.07, 5.4, 0.36, 14, { color: C.muted });
      slide.addShape('roundRect', { x: 6.8, y: 5.91, w: 5.83, h: 0.8, line: { transparency: 100 }, fill: { color: C.lime } });
      text(slide, 'TOTALE IVA INCLUSA', 7.03, 6.03, 2.6, 0.21, 9, { color: C.petrol, bold: true });
      text(slide, eur(q.totals.totalCents), 7.03, 6.29, 5.33, 0.37, 23, { color: C.petrol, bold: true, align: 'right' });
    }
  }
}
function conditions(deck: DeckTemplate) {
  const q = deck.quote;
  deck.flow('Condizioni', 'Le condizioni della proposta', [
    { label: 'Validità', text: `${q.validityDays} giorni dalla data del preventivo (${date(q.date)}).` },
    { label: 'Referente Green Flux', text: q.representative },
    { label: 'Pagamento', text: q.conditions.paymentTerms },
    { label: 'Tempistiche indicative', text: q.conditions.deliveryTerms },
    { label: 'Garanzie e condizioni', text: q.conditions.warrantyTerms },
    { label: 'Note commerciali', text: q.conditions.notes },
  ]);
}
function closing(deck: DeckTemplate) {
  const company = deck.quote.companySnapshot;
  deck.flow('Green Flux', 'Energia, comfort e impianti integrati', [
    { text: 'Un unico interlocutore dalla progettazione all’installazione.' },
    { text: company.legalName },
    { label: 'Contatti', text: [company.phone, company.email, company.website].filter(Boolean).join('\n') },
    { label: 'Sede', text: company.address },
    { label: 'Partita IVA', text: company.vatNumber },
  ], 19);
}

/** Generates only from a persisted, validated snapshot. No AI or composition service is called. */
export async function generateQuotePptx(quote: Quote): Promise<Blob> {
  validateQuote(quote, true);
  if (!quote.number || quote.version < 1) throw new Error('Salva il preventivo prima di generare il PowerPoint.');
  const computed = calculateQuote(quote.lines, quote.discount, quote.surcharge);
  const fields = ['subtotalCents', 'discountCents', 'surchargeCents', 'taxableCents', 'vatCents', 'totalCents'] as const;
  if (fields.some(key => computed[key] !== quote.totals[key])) throw new Error('I totali salvati non corrispondono alle righe. Salva nuovamente il preventivo.');
  const snapshot = structuredClone(quote);
  snapshot.totals = computed;
  const deck = new DeckTemplate(snapshot);
  const products = snapshot.lines.filter(line => line.kind === 'product');
  const featured = products.filter(line => line.featured);
  cover(deck);
  project(deck);
  solution(deck, featured);
  scope(deck);
  await supply(deck, featured);
  investment(deck);
  conditions(deck);
  closing(deck);
  const output = await deck.pptx.write({ outputType: 'blob', compression: true });
  if (!(output instanceof Blob)) throw new Error('Impossibile comporre il file PowerPoint.');
  return normalizePptxPackage(output);
}
