import type { CatalogItem, CompanySettings, Customer, Quote, QuoteLine } from '../domain/types';
import { calculateQuote } from '../domain/money';

/** Company details copied from the verified Green Flux profile, not invented. */
export const defaultSettings: CompanySettings = {
  id: 'company', legalName: 'GREEN FLUX srls', phone: '+39 375 552 1420', email: 'info@green-flux.com',
  website: 'https://www.green-flux.com', address: 'Via Trieste, 19 · 35121 Padova (PD)', vatNumber: '',
  representative: '', validityDays: 30, paymentTerms: '', deliveryTerms: '', warrantyTerms: '', notes: '',
  defaultVatBps: 2200, numberPrefix: 'GF', nextSequence: 1,
};
export function emptyCustomer(): Customer {
  return { id: crypto.randomUUID(), firstName: '', lastName: '', company: '', email: '', phone: '', address: '', postalCode: '', city: '', province: '' };
}
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function createQuote(settings: CompanySettings, isDemo = false): Quote {
  return {
    id: crypto.randomUUID(), number: '', version: 0, status: 'draft', date: today(), validityDays: settings.validityDays,
    representative: settings.representative, customerId: null, customer: emptyCustomer(),
    project: { address: '', propertyType: '', areaSqm: null, type: '', notes: '' }, lines: [],
    discount: { kind: 'percent', value: 0 }, surcharge: { kind: 'percent', value: 0 },
    conditions: { paymentTerms: settings.paymentTerms, deliveryTerms: settings.deliveryTerms, warrantyTerms: settings.warrantyTerms, notes: settings.notes },
    companySnapshot: structuredClone(settings), totals: calculateQuote([], { kind: 'percent', value: 0 }, { kind: 'percent', value: 0 }),
    createdAt: '', updatedAt: '', generatedAt: null, generatedVersion: null, isDemo,
  };
}
export function createCatalogItem(defaultVatBps = 2200): CatalogItem {
  return { id: crypto.randomUUID(), categoryId: null, sku: '', name: '', brand: '', model: '', description: '', unit: 'pz', priceCents: 0, vatBps: defaultVatBps, active: true, notes: '', kind: 'product', featured: false, imageUrl: '' };
}
export function lineFromCatalog(item: CatalogItem): QuoteLine {
  return { id: crypto.randomUUID(), catalogItemId: item.id, kind: item.kind, sku: item.sku, name: item.name, brand: item.brand, model: item.model, description: item.description, unit: item.unit, quantityMilli: 1000, unitPriceCents: item.priceCents, discountBps: 0, vatBps: item.vatBps, featured: item.featured, includeInScope: item.kind === 'service', imageUrl: item.imageUrl };
}
export function duplicateQuote(value: Quote): Quote {
  return { ...structuredClone(value), id: crypto.randomUUID(), number: '', version: 0, status: 'draft', date: today(), lines: value.lines.map(line => ({ ...structuredClone(line), id: crypto.randomUUID() })), createdAt: '', updatedAt: '', generatedAt: null, generatedVersion: null };
}
