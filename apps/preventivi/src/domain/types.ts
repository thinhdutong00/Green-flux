export type ItemKind = 'product' | 'service';
export type QuoteStatus = 'draft' | 'generated' | 'sent' | 'accepted' | 'rejected';
export interface Category { id: string; name: string }
export interface CatalogItem {
  id: string; categoryId: string | null; sku: string; name: string; brand: string; model: string;
  description: string; unit: string; priceCents: number; vatBps: number; active: boolean;
  notes: string; kind: ItemKind; featured: boolean; imageUrl: string;
}
export interface Customer {
  id: string; firstName: string; lastName: string; company: string; email: string; phone: string;
  address: string; postalCode: string; city: string; province: string;
}
export interface CompanySettings {
  id: 'company'; legalName: string; phone: string; email: string; website: string; address: string;
  vatNumber: string; representative: string; validityDays: number; paymentTerms: string;
  deliveryTerms: string; warrantyTerms: string; notes: string; defaultVatBps: number;
  numberPrefix: string; nextSequence: number;
}
export interface QuoteLine {
  id: string; catalogItemId: string | null; kind: ItemKind; sku: string; name: string;
  brand: string; model: string; description: string; unit: string; quantityMilli: number;
  unitPriceCents: number; discountBps: number; vatBps: number; featured: boolean;
  includeInScope: boolean; imageUrl: string;
}
/** percent values are basis points; amount values are EUR cents. */
export interface Adjustment { kind: 'percent' | 'amount'; value: number }
export interface LineTotals {
  id: string; baseCents: number; discountCents: number; surchargeCents: number; netCents: number;
}
export interface VatGroup { rateBps: number; taxableCents: number; vatCents: number }
export interface QuoteTotals {
  subtotalCents: number; discountCents: number; surchargeCents: number;
  taxableCents: number; vatCents: number; totalCents: number;
  lines: LineTotals[]; vatGroups: VatGroup[];
}
export interface Quote {
  id: string; number: string; version: number; status: QuoteStatus; date: string;
  validityDays: number; representative: string; customerId: string | null; customer: Customer;
  project: { address: string; propertyType: string; areaSqm: number | null; type: string; notes: string };
  lines: QuoteLine[]; discount: Adjustment; surcharge: Adjustment;
  conditions: { paymentTerms: string; deliveryTerms: string; warrantyTerms: string; notes: string };
  companySnapshot: CompanySettings; totals: QuoteTotals; createdAt: string; updatedAt: string;
  generatedAt: string | null; generatedVersion: number | null; isDemo: boolean;
}
export interface Generation { id: string; quoteId: string; version: number; createdAt: string; filename: string }
export interface AppData { categories: Category[]; catalog: CatalogItem[]; customers: Customer[]; quotes: Quote[]; settings: CompanySettings }
export interface DataRepository {
  mode: 'local' | 'supabase';
  initialize(): Promise<void>;
  load(): Promise<AppData>;
  saveCategory(value: Category): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  saveCatalogItem(value: CatalogItem): Promise<void>;
  importCatalogItems(values: CatalogItem[]): Promise<void>;
  deleteCatalogItem(id: string): Promise<void>;
  saveCustomer(value: Customer): Promise<void>;
  deleteCustomer(id: string): Promise<void>;
  saveSettings(value: CompanySettings): Promise<void>;
  saveQuote(value: Quote, expectedVersion: number): Promise<Quote>;
  deleteQuote(id: string): Promise<void>;
  markGenerated(id: string, version: number, filename: string): Promise<Quote>;
}
