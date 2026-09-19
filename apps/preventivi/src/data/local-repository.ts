import Dexie, { type Table } from 'dexie';
import type { AppData, CatalogItem, Category, CompanySettings, Customer, DataRepository, Generation, Quote } from '../domain/types';
import { calculateQuote } from '../domain/money';
import { validateCatalogItem, validateCategory, validateCustomer, validateQuote, validateSettings } from '../domain/validation';
import { createCatalogItem, createQuote, defaultSettings, emptyCustomer, lineFromCatalog } from './defaults';
import demo from './demo-fixture.json';

interface Sequence { key: string; year: number; next: number }
class LocalDatabase extends Dexie {
  categories!: Table<Category, string>; catalog!: Table<CatalogItem, string>; customers!: Table<Customer, string>;
  quotes!: Table<Quote, string>; settings!: Table<CompanySettings, string>; generations!: Table<Generation, string>; metadata!: Table<Sequence, string>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({ categories: 'id,name', catalog: 'id,categoryId,name', customers: 'id,lastName,company', quotes: 'id,&number,date', settings: 'id', generations: 'id,quoteId', metadata: 'key' });
  }
}
const yearNow = () => Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Rome', year: 'numeric' }).format(new Date()));
const copy = <T,>(value: T): T => structuredClone(value);

export class LocalRepository implements DataRepository {
  readonly mode = 'local' as const;
  readonly db: LocalDatabase;
  constructor(dbName = 'green-flux-preventivi-demo-v1') { this.db = new LocalDatabase(dbName); }

  async initialize(): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      if (await this.db.metadata.get('initialized')) return;
      const categories: Category[] = demo.categories.map(name => ({ id: crypto.randomUUID(), name }));
      const catalog: CatalogItem[] = demo.catalog.map(item => ({ ...createCatalogItem(item.vatBps), ...item, kind: item.kind as 'product' | 'service', categoryId: categories.find(category => category.name === item.category)!.id, notes: 'DEMO — prezzo di esempio, non listino Green Flux.' })).map(({ ...item }) => {
        const value = { ...item } as CatalogItem & { category?: string }; delete value.category; return value;
      });
      const customers = demo.customers.map(customer => ({ ...emptyCustomer(), ...customer }));
      const settings = { ...copy(defaultSettings), nextSequence: 4 };
      const now = new Date().toISOString();
      const quotes = [0, 1, 2].map((index): Quote => {
        const quote = createQuote(settings, true);
        quote.customer = copy(customers[index % customers.length]); quote.customerId = quote.customer.id;
        quote.project = { address: quote.customer.address, propertyType: 'Abitazione · DEMO', areaSqm: index === 1 ? 95 : 130, type: index === 1 ? 'Fotovoltaico · DEMO' : 'Pompa di calore · DEMO', notes: 'Dati dimostrativi da sostituire con quelli del progetto reale.' };
        quote.lines = (index === 1 ? [catalog[6], catalog[2], catalog[5]] : catalog.slice(0, 6)).map(lineFromCatalog);
        if (index === 1) quote.lines[0].quantityMilli = 12000;
        quote.number = `DEMO-${settings.numberPrefix}-${yearNow()}-${String(index + 1).padStart(4, '0')}`;
        quote.version = 1; quote.status = index === 0 ? 'generated' : index === 1 ? 'accepted' : 'draft';
        quote.conditions.notes = demo.notice;
        quote.createdAt = now; quote.updatedAt = now;
        if (index !== 2) { quote.generatedAt = now; quote.generatedVersion = 1; }
        quote.totals = calculateQuote(quote.lines, quote.discount, quote.surcharge);
        return quote;
      });
      await this.db.categories.bulkAdd(categories); await this.db.catalog.bulkAdd(catalog); await this.db.customers.bulkAdd(customers);
      await this.db.settings.put(settings); await this.db.quotes.bulkAdd(quotes);
      await this.db.metadata.bulkPut([{ key: 'initialized', year: yearNow(), next: 1 }, { key: 'sequence', year: yearNow(), next: 4 }]);
    });
  }

  async load(): Promise<AppData> {
    return this.db.transaction('r', this.db.tables, async () => {
      const settings = (await this.db.settings.get('company')) ?? copy(defaultSettings);
      const sequence = await this.db.metadata.get('sequence');
      settings.nextSequence = sequence?.year === yearNow() ? sequence.next : 1;
      return { categories: await this.db.categories.toArray(), catalog: await this.db.catalog.toArray(), customers: await this.db.customers.toArray(), quotes: await this.db.quotes.toArray(), settings };
    });
  }
  async saveCategory(value: Category): Promise<void> { validateCategory(value); await this.db.categories.put(copy(value)); }
  async deleteCategory(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.categories, this.db.catalog], async () => { await this.db.catalog.where('categoryId').equals(id).modify({ categoryId: null }); await this.db.categories.delete(id); });
  }
  async saveCatalogItem(value: CatalogItem): Promise<void> { await this.importCatalogItems([value]); }
  async importCatalogItems(values: CatalogItem[]): Promise<void> {
    if (values.length > 5000) throw new Error('Importazione non valida (massimo 5000 voci).');
    if (new Set(values.map(value => value.id)).size !== values.length) throw new Error('L’importazione contiene identificativi duplicati.');
    values.forEach(validateCatalogItem);
    await this.db.transaction('rw', [this.db.catalog, this.db.categories], async () => {
      for (const value of values) if (value.categoryId && !(await this.db.categories.get(value.categoryId))) throw new Error('La categoria selezionata non esiste più.');
      await this.db.catalog.bulkPut(copy(values));
    });
  }
  async deleteCatalogItem(id: string): Promise<void> {
    // Preserve complete snapshots, including historical source references, like Supabase.
    await this.db.catalog.delete(id);
  }
  async saveCustomer(value: Customer): Promise<void> { validateCustomer(value); await this.db.customers.put(copy(value)); }
  async deleteCustomer(id: string): Promise<void> {
    await this.db.customers.delete(id);
  }
  async saveSettings(value: CompanySettings): Promise<void> {
    validateSettings(value);
    await this.db.transaction('rw', [this.db.settings, this.db.metadata], async () => {
      const sequence = await this.db.metadata.get('sequence');
      const next = sequence?.year === yearNow() ? sequence.next : 1;
      if (value.nextSequence < next) throw new Error(`Il prossimo progressivo deve essere almeno ${next}.`);
      await this.db.settings.put(copy(value)); await this.db.metadata.put({ key: 'sequence', year: yearNow(), next: value.nextSequence });
    });
  }
  async saveQuote(value: Quote, expectedVersion: number): Promise<Quote> {
    validateQuote(value);
    return this.db.transaction('rw', [this.db.quotes, this.db.settings, this.db.metadata], async () => {
      const existing = await this.db.quotes.get(value.id);
      if ((existing?.version ?? 0) !== expectedVersion) throw new Error('Il preventivo è stato modificato da un altro utente. Riaprilo per caricare la versione aggiornata.');
      let number = existing?.number;
      if (!number) {
        const settings = (await this.db.settings.get('company')) ?? copy(defaultSettings);
        const current = await this.db.metadata.get('sequence');
        const next = current?.year === yearNow() ? current.next : 1;
        if (next >= 999999999) throw new Error('Progressivo esaurito.');
        number = `DEMO-${settings.numberPrefix}-${yearNow()}-${String(next).padStart(4, '0')}`;
        await this.db.metadata.put({ key: 'sequence', year: yearNow(), next: next + 1 });
        await this.db.settings.put({ ...settings, nextSequence: next + 1 });
      }
      const now = new Date().toISOString();
      const saved: Quote = { ...copy(value), number, version: expectedVersion + 1, createdAt: existing?.createdAt ?? now, updatedAt: now, generatedAt: existing?.generatedAt ?? null, generatedVersion: existing?.generatedVersion ?? null, isDemo: true, totals: calculateQuote(value.lines, value.discount, value.surcharge) };
      await this.db.quotes.put(saved); return saved;
    });
  }
  async deleteQuote(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.quotes, this.db.generations], async () => { await this.db.generations.where('quoteId').equals(id).delete(); await this.db.quotes.delete(id); });
  }
  async markGenerated(id: string, version: number, filename: string): Promise<Quote> {
    if (!filename || filename.length > 250 || /[\/\\\u0000-\u001f]/.test(filename)) throw new Error('Nome file non valido.');
    return this.db.transaction('rw', [this.db.quotes, this.db.generations], async () => {
      const quote = await this.db.quotes.get(id);
      if (!quote || quote.version !== version) throw new Error('Il preventivo è cambiato durante la generazione. Riaprilo e genera nuovamente.');
      validateQuote(quote, true);
      const now = new Date().toISOString();
      const saved: Quote = { ...quote, status: quote.status === 'draft' ? 'generated' : quote.status, generatedAt: now, generatedVersion: version, updatedAt: now };
      await this.db.quotes.put(saved); await this.db.generations.add({ id: crypto.randomUUID(), quoteId: id, version, createdAt: now, filename });
      return saved;
    });
  }
}
