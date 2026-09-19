import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalRepository } from '../src/data/local-repository';
import { createCatalogItem, createQuote, duplicateQuote, lineFromCatalog } from '../src/data/defaults';
let repo: LocalRepository;
beforeEach(async () => { repo = new LocalRepository(`test-${crypto.randomUUID()}`); await repo.initialize(); });
afterEach(async () => { await repo.db.delete(); });
describe('persistent demo repository', () => {
  it('seeds only once and persists edited prices across repository instances', async () => {
    const data = await repo.load(); expect(data.catalog.length).toBeGreaterThanOrEqual(6); expect(data.quotes).toHaveLength(3);
    const product = { ...data.catalog[0], priceCents: 850000, name: 'Pompa di calore Test' };
    await repo.saveCatalogItem(product); await repo.initialize();
    const next = new LocalRepository(repo.db.name); await next.initialize();
    expect((await next.load()).catalog.find(v => v.id === product.id)?.priceCents).toBe(850000); next.db.close();
  });
  it('makes snapshot copies and recomputes canonical totals on save', async () => {
    const data = await repo.load(); const quote = createQuote(data.settings, true);
    quote.customer = structuredClone(data.customers[0]); quote.customerId = quote.customer.id; quote.project.type = 'Pompa di calore';
    quote.lines = [lineFromCatalog({ ...data.catalog[0], priceCents: 850000 })]; quote.totals.totalCents = 1;
    const saved = await repo.saveQuote(quote, 0);
    expect(saved.totals.totalCents).toBe(1037000); expect(saved.number).toMatch(/^DEMO-GF-\d{4}-0004$/);
    await repo.saveCatalogItem({ ...data.catalog[0], priceCents: 790000 });
    await repo.deleteCatalogItem(data.catalog[0].id); await repo.deleteCustomer(quote.customerId!);
    const historical = (await repo.load()).quotes.find(v => v.id === quote.id)!;
    expect(historical.lines[0].unitPriceCents).toBe(850000); expect(historical.customer).toEqual(quote.customer);
    const copy = await repo.saveQuote(duplicateQuote(saved), 0); expect(copy.number).not.toBe(saved.number); expect(copy.status).toBe('draft');
  });
  it('assigns distinct numbers on concurrent creation and rejects stale edits', async () => {
    const data = await repo.load();
    const quotes = await Promise.all(Array.from({ length: 8 }, () => repo.saveQuote(createQuote(data.settings, true), 0)));
    expect(new Set(quotes.map(q => q.number)).size).toBe(8);
    await repo.saveQuote({ ...quotes[0], representative: 'Nuovo referente' }, 1);
    await expect(repo.saveQuote(quotes[0], 1)).rejects.toThrow('altro utente');
    await expect(repo.saveSettings({ ...data.settings, nextSequence: 1 })).rejects.toThrow('almeno');
  });
  it('imports atomically and unassigns deleted categories', async () => {
    const data = await repo.load(); const category = data.categories[0];
    const item = { ...createCatalogItem(), name: 'Test', categoryId: category.id };
    await expect(repo.importCatalogItems([item, { ...createCatalogItem(), name: 'Invalid', categoryId: crypto.randomUUID() }])).rejects.toThrow('categoria');
    expect((await repo.load()).catalog.some(v => v.id === item.id)).toBe(false);
    await repo.saveCatalogItem(item); await repo.deleteCategory(category.id);
    expect((await repo.load()).catalog.find(v => v.id === item.id)?.categoryId).toBeNull();
    await expect(repo.importCatalogItems([item, { ...item, name: 'Duplicate' }])).rejects.toThrow('duplicati');
  });
  it('records successful generation without downgrading accepted status', async () => {
    const quote = (await repo.load()).quotes.find(q => q.status === 'accepted')!;
    const generated = await repo.markGenerated(quote.id, quote.version, 'Preventivo_DEMO.pptx');
    expect(generated.status).toBe('accepted'); expect(generated.generatedVersion).toBe(quote.version);
    expect(await repo.db.generations.count()).toBe(1);
    await expect(repo.markGenerated(quote.id, 99, 'x.pptx')).rejects.toThrow('cambiato');
  });
  it('shows the new annual sequence before the first save after New Year', async () => {
    const currentYear = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Rome', year: 'numeric' }).format(new Date()));
    await repo.db.quotes.toCollection().modify(quote => { quote.number = quote.number.replace(`-${currentYear}-`, `-${currentYear - 1}-`); });
    await repo.db.metadata.put({ key: 'sequence', year: currentYear - 1, next: 99 });
    const data = await repo.load(); expect(data.settings.nextSequence).toBe(1);
    const saved = await repo.saveQuote(createQuote(data.settings, true), 0);
    expect(saved.number).toMatch(/0001$/);
  });
});
