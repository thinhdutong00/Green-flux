import { describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { createDemoQuote } from '../scripts/generate-demo';
import { calculateQuote } from '../src/domain/money';
import { generateQuotePptx, quoteFilename } from '../src/pptx';
import { wrapText } from '../src/pptx/template';

const allSlides = async (zip: JSZip) => Promise.all(Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/(\d+)\.xml/)![1]) - Number(b.match(/(\d+)\.xml/)![1])).map(name => zip.file(name)!.async('string')));
const unescape = (value: string) => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const slideText = (xml: string) => [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(match => unescape(match[1])).join(' ');
const compact = (value: string) => value.replace(/\s/g, '');

function assertBounds(xml: string) {
  const width = 12192000;
  const height = 6858000;
  for (const transform of xml.matchAll(/<[ap]:xfrm[^>]*>([\s\S]*?)<\/[ap]:xfrm>/g)) {
    const position = transform[1].match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const size = transform[1].match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    if (!position || !size) continue;
    const [x, y, w, h] = [Number(position[1]), Number(position[2]), Number(size[1]), Number(size[2])];
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(width + 10);
    expect(y + h).toBeLessThanOrEqual(height + 10);
  }
}

describe('PowerPoint editable and complete', () => {
  it('generates a real 22-line branded presentation with native tables and all eight sections', async () => {
    const quote = createDemoQuote();
    const blob = await generateQuotePptx(quote);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
    for (const match of contentTypes.matchAll(/PartName="([^"]+)"/g)) expect(zip.file(match[1].slice(1))).not.toBeNull();
    const presentation = await zip.file('ppt/presentation.xml')!.async('string');
    expect(presentation).toContain('cx="12192000" cy="6858000"');
    const slides = await allSlides(zip);
    expect(slides.length).toBeGreaterThan(8);
    const text = slides.map(slideText).join(' ');
    for (const title of ['Proposta per il tuo impianto', 'Una soluzione costruita sul tuo progetto', 'I sistemi del tuo impianto', 'Cosa comprende l’intervento', 'I componenti della proposta', 'Il dettaglio dell’investimento', 'Le condizioni della proposta', 'Energia, comfort e impianti integrati']) expect(text).toContain(title);
    expect(text).toContain('Mario Rossi');
    expect(text).toContain(quote.number);
    expect(text).not.toContain('NOTA INTERNA');
    for (const line of quote.lines) {
      expect(compact(text)).toContain(compact(line.name));
      expect(compact(text)).toContain(compact(line.description));
    }
    const tables = slides.filter(xml => xml.includes('<a:tbl>'));
    expect(tables.length).toBeGreaterThan(2);
    const money = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
    expect(compact(text)).toContain(compact(money.format(quote.totals.totalCents / 100)));
    for (const slide of slides) { assertBounds(slide); expect(slide).toContain('Arial'); expect(slide).toContain('193E40'); }
  });

  it('paginates long client, title, conditions and unbroken product fields without dropping their tails', async () => {
    const quote = createDemoQuote();
    quote.customer.company = `${'Ragione sociale estesa '.repeat(11)}FINECLIENTE`;
    quote.project.type = `${'Impianto integrato '.repeat(14)}FINEPROGETTO`;
    quote.project.notes = `${'Requisito tecnico completo senza tagli. '.repeat(95)}FINEINTERVENTO`;
    quote.conditions.notes = `${'Condizione commerciale da conservare integralmente. '.repeat(120)}FINECONDIZIONI`;
    quote.companySnapshot.address = `${'Sede aziendale e recapito '.repeat(18)}FINESEDE`;
    quote.lines = quote.lines.slice(0, 2);
    quote.lines[0].description = `${'W'.repeat(220)} ${'Dettaglio esteso della configurazione. '.repeat(100)}FINEDESCRIZIONE`;
    quote.lines[1].name = 'W'.repeat(299);
    quote.totals = calculateQuote(quote.lines, quote.discount, quote.surcharge);
    const zip = await JSZip.loadAsync(await (await generateQuotePptx(quote)).arrayBuffer());
    const slides = await allSlides(zip);
    const text = slides.map(slideText).join(' ');
    for (const marker of ['FINECLIENTE', 'FINEPROGETTO', 'FINEINTERVENTO', 'FINECONDIZIONI', 'FINESEDE', 'FINEDESCRIZIONE']) expect(compact(text)).toContain(marker);
    const descriptions = slides.flatMap(xml => [...xml.matchAll(/<a:tr[^>]*>([\s\S]*?)<\/a:tr>/g)].map(row => slideText(row[1].match(/<a:tc>([\s\S]*?)<\/a:tc>/)?.[1] || '')).filter(value => value !== 'Descrizione')).join(' ');
    expect(compact(descriptions)).toContain(compact(quote.lines[0].description));
    expect(slides.length).toBeGreaterThan(18);
    slides.forEach(assertBounds);
  });

  it('rejects unsaved snapshots and stale totals, and sanitizes filenames', async () => {
    const quote = createDemoQuote();
    quote.customer.company = '../Mario <Rossi>: / €';
    expect(quoteFilename(quote)).toBe('Preventivo_GreenFlux_Mario_Rossi_2026-09-19.pptx');
    quote.number = '';
    await expect(generateQuotePptx(quote)).rejects.toThrow('Salva');
    quote.number = 'GF-2026-0001';
    quote.totals.totalCents++;
    await expect(generateQuotePptx(quote)).rejects.toThrow('totali');
  });

  it('uses the native placeholder when a product image response is invalid', async () => {
    const quote = createDemoQuote();
    quote.lines = quote.lines.slice(0, 1);
    quote.lines[0].imageUrl = 'https://images.example.com/unavailable.png';
    quote.totals = calculateQuote(quote.lines, quote.discount, quote.surcharge);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not a PNG file', { headers: { 'content-type': 'image/png' } }));
    try {
      const file = await generateQuotePptx(quote);
      expect(file.size).toBeGreaterThan(1000);
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally { fetchMock.mockRestore(); }
  });

  it('respects explicit highlight and scope flags, including products selected for scope', async () => {
    const quote = createDemoQuote();
    quote.lines = quote.lines.slice(0, 3);
    quote.lines.forEach(line => { line.featured = false; line.includeInScope = false; });
    quote.lines[0].includeInScope = true;
    quote.totals = calculateQuote(quote.lines, quote.discount, quote.surcharge);
    const slides = await allSlides(await JSZip.loadAsync(await (await generateQuotePptx(quote)).arrayBuffer()));
    const plain = slides.map(slideText);
    const solution = plain.filter(value => value.includes('SOLUZIONE PROPOSTA')).join(' ');
    const supply = plain.filter(value => value.includes('FORNITURA')).join(' ');
    const scope = plain.filter(value => value.includes('ATTIVITÀ INCLUSE')).join(' ');
    for (const section of [solution, supply]) {
      expect(section).toContain('Il dettaglio completo della fornitura è riportato nel riepilogo economico.');
      expect(section).not.toContain(quote.lines[0].name);
      expect(section).not.toContain(quote.lines[1].name);
    }
    expect(scope).toContain(quote.lines[0].name);
    expect(scope).not.toContain(quote.lines[2].name);
    expect(plain.join(' ')).toContain(quote.lines[2].name);
    for (const slide of plain) expect(slide).toContain('DEMO: DATI E PREZZI NON REALI');
  });

  it('omits commercial terms left empty without inventing conditions or removing the section', async () => {
    const quote = createDemoQuote();
    quote.conditions = { paymentTerms: '', deliveryTerms: '', warrantyTerms: '', notes: '' };
    quote.representative = '';
    const slides = await allSlides(await JSZip.loadAsync(await (await generateQuotePptx(quote)).arrayBuffer()));
    const conditions = slides.map(slideText).filter(value => value.includes('Le condizioni della proposta')).join(' ');
    expect(conditions).toContain('30 giorni dalla data del preventivo');
    for (const unwanted of ['PAGAMENTO', 'TEMPISTICHE INDICATIVE', 'GARANZIE E CONDIZIONI', 'NOTE COMMERCIALI', 'REFERENTE GREEN FLUX', 'Da concordare', 'conferma d’ordine']) expect(conditions).not.toContain(unwanted);
  });

  it('preserves long unbroken values during wrapping', () => {
    const long = 'M'.repeat(1500);
    expect(wrapText(long, 3, 17).join('')).toBe(long);
  });
});
