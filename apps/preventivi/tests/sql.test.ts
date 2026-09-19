import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AppData, Quote } from '../src/domain/types';
import { calculateQuote } from '../src/domain/money';
import { createCatalogItem, createQuote, defaultSettings, emptyCustomer, lineFromCatalog } from '../src/data/defaults';
const member = crypto.randomUUID(), colleague = crypto.randomUUID(), outsider = crypto.randomUUID();
let db: PGlite;
async function asUser(id: string) { await db.exec('reset role; set role authenticated;'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); }
async function saveQuote(quote: Quote, version = 0): Promise<Quote> { return (await db.query<{ result: Quote }>('select public.gf_save_quote($1::jsonb,$2::integer) as result', [JSON.stringify(quote), version])).rows[0].result; }
async function load(): Promise<AppData> { return (await db.query<{ result: AppData }>('select public.gf_load() as result')).rows[0].result; }
async function entity(kind: string, payload: unknown) { return db.query('select public.gf_save_entity($1,$2::jsonb)', [kind, JSON.stringify(payload)]); }
function quoted(prices = [10000, 10000, 10000], rates = [1000, 2200, 2200]): Quote {
  const q = createQuote(defaultSettings, false); q.customer.firstName = 'Mario'; q.project.type = 'Impianto';
  q.lines = prices.map((price, index) => lineFromCatalog({ ...createCatalogItem(rates[index]), name: `Test ${index}`, priceCents: price }));
  return q;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;");
  await db.exec(readFileSync(new URL('../supabase/migrations/202609190001_green_flux.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users values($1),($2),($3)', [member, colleague, outsider]);
  await db.query('insert into private.app_members(user_id) values($1),($2)', [member, colleague]);
}, 30000);
beforeEach(async () => {
  await db.exec('reset role; set search_path=public; truncate public.gf_categories, public.gf_catalog, public.gf_customers, public.gf_quotes, private.quote_counters cascade;');
  await db.query("update public.gf_settings set document=$1::jsonb where id='company'", [JSON.stringify(defaultSettings)]);
  await asUser(member);
});
afterAll(async () => { await db?.close(); });
describe('Supabase migration executed on PostgreSQL (PGlite)', () => {
  it('matches both exact-money fixtures including mixed VAT, remainder ties and a zero discounted base', async () => {
    const first = quoted(); first.discount = { kind: 'amount', value: 100 }; first.surcharge = { kind: 'amount', value: 100 };
    const a = await saveQuote(first); expect(a.totals).toEqual(calculateQuote(first.lines, first.discount, first.surcharge)); expect(a.totals.totalCents).toBe(35400);
    const second = quoted([10000, 20000], [1000, 2200]); second.discount = { kind: 'percent', value: 10000 }; second.surcharge = { kind: 'amount', value: 1000 };
    const b = await saveQuote(second); expect(b.totals).toEqual(calculateQuote(second.lines, second.discount, second.surcharge)); expect(b.totals.totalCents).toBe(1180);
    const fractional = quoted([850000], [2200]); fractional.lines[0].quantityMilli = 1125; fractional.lines[0].discountBps = 125;
    fractional.discount = { kind: 'percent', value: 333 }; fractional.surcharge = { kind: 'percent', value: 125 };
    expect((await saveQuote(fractional)).totals).toEqual(calculateQuote(fractional.lines, fractional.discount, fractional.surcharge));
  });
  it('denies anonymous users, non-members, direct DML and private helper access', async () => {
    await db.exec('reset role; set role anon;'); await expect(db.query('select public.gf_load()')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from public.gf_quotes')).rejects.toThrow(/permission denied/);
    await asUser(outsider); expect((await db.query('select * from public.gf_quotes')).rows).toHaveLength(0);
    await expect(load()).rejects.toThrow('non autorizzato');
    await expect(entity('category', { id: crypto.randomUUID(), name: 'Test' })).rejects.toThrow('non autorizzato');
    await expect(saveQuote(quoted())).rejects.toThrow('non autorizzato');
    await asUser(member);
    await expect(db.query("insert into public.gf_quotes(id,number,version,document) values(gen_random_uuid(),'fake',1,'{}')")).rejects.toThrow(/permission denied/);
    await expect(db.query("insert into private.app_members(user_id) values($1)", [outsider])).rejects.toThrow(/permission denied/);
    await expect(db.query("select private.calculate_quote('[]','{}','{}')")).rejects.toThrow(/permission denied/);
  });
  it('shares records between authorized members and immediately honors membership revocation', async () => {
    const saved = await saveQuote(quoted()); await asUser(colleague);
    expect((await load()).quotes[0].id).toBe(saved.id);
    const changed = await saveQuote({ ...saved, representative: 'Collega' }, 1); expect(changed.version).toBe(2);
    await db.exec('reset role'); await db.query('update private.app_members set active=false where user_id=$1', [colleague]); await asUser(colleague);
    await expect(load()).rejects.toThrow('non autorizzato'); expect((await db.query('select * from public.gf_quotes')).rows).toHaveLength(0);
    await db.exec('reset role'); await db.query('update private.app_members set active=true where user_id=$1', [colleague]);
  });
  it('discards forged totals, number, timestamps and demo flags and preserves snapshots', async () => {
    const q = quoted(); q.number = 'FORGED'; q.createdAt = '1900-01-01'; q.totals.totalCents = 1; q.isDemo = true;
    const saved = await saveQuote(q); expect(saved.number).toMatch(/^GF-\d{4}-0001$/); expect(saved.totals.totalCents).toBe(35400); expect(saved.isDemo).toBe(false); expect(saved.createdAt).not.toBe(q.createdAt);
    await entity('settings', { ...defaultSettings, legalName: 'Nuovo nome', nextSequence: 2 });
    const loaded = (await load()).quotes[0]; expect(loaded.companySnapshot.legalName).toBe(defaultSettings.legalName);
    expect((await db.query('select * from public.gf_quote_items')).rows).toHaveLength(3);
  });
  it('validates every entity and all nested financial input on the server', async () => {
    const good = { ...createCatalogItem(), name: 'Test' };
    await expect(entity('catalog', { ...good, priceCents: -1 })).rejects.toThrow();
    await expect(entity('catalog', { ...good, vatBps: 2.2 })).rejects.toThrow();
    await expect(entity('catalog', { ...good, active: 'true' })).rejects.toThrow();
    await expect(entity('catalog', { ...good, imageUrl: 'javascript:alert(1)' })).rejects.toThrow();
    await expect(entity('customer', emptyCustomer())).rejects.toThrow();
    await expect(entity('category', { id: crypto.randomUUID(), name: 123 })).rejects.toThrow();
    await expect(entity('settings', { ...defaultSettings, unknown: true })).rejects.toThrow();
    const q = quoted(); q.lines[0].unitPriceCents = 1.5; await expect(saveQuote(q)).rejects.toThrow();
    q.lines[0].unitPriceCents = 100; q.lines[1].id = q.lines[0].id; await expect(saveQuote(q)).rejects.toThrow('duplicato');
    const zero = quoted([0], [2200]); zero.surcharge = { kind: 'amount', value: 1 }; await expect(saveQuote(zero)).rejects.toThrow('voce personalizzata');
    const excessive = quoted([100], [2200]); excessive.discount = { kind: 'amount', value: 101 }; await expect(saveQuote(excessive)).rejects.toThrow('superare');
    expect((await load()).quotes).toHaveLength(0);
  });
  it('imports a complete catalog atomically and preserves quote snapshots on deletes', async () => {
    const category = { id: crypto.randomUUID(), name: 'Impianti' }; await entity('category', category);
    const item = { ...createCatalogItem(), name: 'Test', priceCents: 850000, categoryId: category.id };
    await db.query('select public.gf_import_catalog($1::jsonb)', [JSON.stringify([item])]);
    const invalid = { ...createCatalogItem(), name: 'Invalid', priceCents: -1 };
    const validNew = { ...createCatalogItem(), name: 'Atomic' };
    await expect(db.query('select public.gf_import_catalog($1::jsonb)', [JSON.stringify([validNew, invalid])])).rejects.toThrow();
    expect((await load()).catalog).toHaveLength(1);
    const q = quoted(); q.lines = [lineFromCatalog(item)]; const saved = await saveQuote(q);
    await db.query('select public.gf_delete_entity($1,$2::uuid)', ['category', category.id]); expect((await load()).catalog[0].categoryId).toBeNull();
    await db.query('select public.gf_delete_entity($1,$2::uuid)', ['catalog', item.id]); expect((await load()).quotes[0].lines).toEqual(saved.lines);
  });
  it('reserves unique numbers, checks optimistic versions and prevents sequence rollback', async () => {
    const saved = await Promise.all(Array.from({ length: 8 }, () => saveQuote(quoted())));
    expect(new Set(saved.map(q => q.number)).size).toBe(8);
    const update = await saveQuote(saved[0], 1); expect(update.version).toBe(2);
    await expect(saveQuote(saved[0], 1)).rejects.toThrow('altro utente');
    await expect(entity('settings', { ...defaultSettings, nextSequence: 1 })).rejects.toThrow('almeno');
    await db.query('select public.gf_delete_entity($1,$2::uuid)', ['quote', saved[7].id]);
    expect((await saveQuote(quoted())).number).toMatch(/0009$/);
    const same = quoted();
    const competing = await Promise.allSettled([saveQuote(same), saveQuote(same)]);
    expect(competing.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(competing.filter(result => result.status === 'rejected')).toHaveLength(1);
  });
  it('rejects metadata and search-path impersonation while keeping private routines inaccessible', async () => {
    await asUser(outsider);
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ role: 'authenticated', user_metadata: { role: 'admin', is_member: true }, app_metadata: { company_id: 'company', role: 'owner' } })]);
    await db.exec('create temp table app_members(user_id uuid, active boolean); set search_path=pg_temp,public;');
    await db.query('insert into pg_temp.app_members values($1,true)', [outsider]);
    await expect(load()).rejects.toThrow('non autorizzato');
    await expect(db.query("create function private.attack() returns boolean language sql as $$ select true $$")).rejects.toThrow(/permission denied/);
    expect((await db.query('select * from public.gf_customers')).rows).toHaveLength(0);
  });
  it('enforces global adjustment limits and prevents duplicate imports and dangling category references', async () => {
    const q = quoted(); q.discount = { kind: 'percent', value: 10001 };
    await expect(saveQuote(q)).rejects.toThrow('100%');
    q.discount = { kind: 'amount', value: 10001 }; q.surcharge = { kind: 'percent', value: 1000001 };
    await expect(saveQuote(q)).rejects.toThrow('percentuale');
    q.surcharge = { kind: 'amount', value: 1000001 };
    expect((await saveQuote(q)).totals).toEqual(calculateQuote(q.lines, q.discount, q.surcharge));
    const item = { ...createCatalogItem(), name: 'Legittimo' };
    await entity('catalog', item);
    await expect(db.query('select public.gf_import_catalog($1::jsonb)', [JSON.stringify([{ ...item, name: 'Tampered' }, item])])).rejects.toThrow('duplicati');
    expect((await load()).catalog[0].name).toBe('Legittimo');
    const category = { id: crypto.randomUUID(), name: 'Categoria' }; await entity('category', category);
    await entity('catalog', { ...item, categoryId: category.id });
    await expect(entity('catalog', { ...item, categoryId: crypto.randomUUID() })).rejects.toThrow('categoria');
    await db.exec('reset role;');
    // This is the exact DB guard used if a delete races after the RPC existence check.
    await expect(db.query('delete from public.gf_categories where id=$1', [category.id])).rejects.toThrow(/foreign key/);
    await expect(db.query('update public.gf_catalog set category_id=$1 where id=$2', [crypto.randomUUID(), item.id])).rejects.toThrow(/constraint/);
    await asUser(member);
    await db.query('select public.gf_delete_entity($1,$2::uuid)', ['category', category.id]);
    expect((await load()).catalog[0].categoryId).toBeNull();
  });
  it('records generated files only for a valid current version and preserves accepted status', async () => {
    const q = quoted(); q.status = 'accepted'; const saved = await saveQuote(q);
    const result = await db.query<{ q: Quote }>('select public.gf_mark_generated($1::uuid,$2,$3) as q', [saved.id, 1, 'Preventivo_test.pptx']);
    expect(result.rows[0].q.status).toBe('accepted'); expect(result.rows[0].q.generatedVersion).toBe(1);
    await expect(db.query('select public.gf_mark_generated($1::uuid,$2,$3)', [saved.id, 2, 'test.pptx'])).rejects.toThrow('cambiato');
    await expect(db.query('select public.gf_mark_generated($1::uuid,$2,$3)', [saved.id, 1, '../bad.pptx'])).rejects.toThrow('Nome file');
    expect((await db.query('select * from public.gf_generations')).rows).toHaveLength(1);
  });
});
