import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, CatalogItem, Category, CompanySettings, Customer, DataRepository, Quote } from '../domain/types';
import { validateCatalogItem, validateCategory, validateCustomer, validateQuote, validateSettings } from '../domain/validation';

export class SupabaseRepository implements DataRepository {
  readonly mode = 'supabase' as const;
  constructor(private readonly client: SupabaseClient) {}
  async initialize(): Promise<void> { /* Schema and bootstrap users are managed by migrations, never the browser. */ }
  private async call<T>(name: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error?.code === '23503') throw new Error('Un elemento collegato è stato modificato contemporaneamente. Aggiorna i dati e riprova.');
    if (error) throw new Error(error.message || 'Impossibile completare l’operazione. Riprova.');
    return data as T;
  }
  async load(): Promise<AppData> { return this.call<AppData>('gf_load'); }
  async saveCategory(value: Category): Promise<void> { validateCategory(value); await this.call('gf_save_entity', { entity: 'category', payload: value }); }
  async deleteCategory(id: string): Promise<void> { await this.call('gf_delete_entity', { entity: 'category', record_id: id }); }
  async saveCatalogItem(value: CatalogItem): Promise<void> { validateCatalogItem(value); await this.call('gf_save_entity', { entity: 'catalog', payload: value }); }
  async importCatalogItems(values: CatalogItem[]): Promise<void> { values.forEach(validateCatalogItem); await this.call('gf_import_catalog', { payload: values }); }
  async deleteCatalogItem(id: string): Promise<void> { await this.call('gf_delete_entity', { entity: 'catalog', record_id: id }); }
  async saveCustomer(value: Customer): Promise<void> { validateCustomer(value); await this.call('gf_save_entity', { entity: 'customer', payload: value }); }
  async deleteCustomer(id: string): Promise<void> { await this.call('gf_delete_entity', { entity: 'customer', record_id: id }); }
  async saveSettings(value: CompanySettings): Promise<void> { validateSettings(value); await this.call('gf_save_entity', { entity: 'settings', payload: value }); }
  async saveQuote(value: Quote, expectedVersion: number): Promise<Quote> { validateQuote(value); return this.call<Quote>('gf_save_quote', { payload: value, expected_version: expectedVersion }); }
  async deleteQuote(id: string): Promise<void> { await this.call('gf_delete_entity', { entity: 'quote', record_id: id }); }
  async markGenerated(id: string, version: number, filename: string): Promise<Quote> { return this.call<Quote>('gf_mark_generated', { record_id: id, expected_version: version, filename }); }
}
