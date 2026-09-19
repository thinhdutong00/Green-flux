import { expect, it } from 'vitest';
import { createCatalogItem, createQuote, defaultSettings, emptyCustomer, lineFromCatalog } from '../src/data/defaults';
import { validateCatalogItem, validateCustomer, validateQuote, validateSettings } from '../src/domain/validation';
it('allows incomplete drafts but requires customer, project and line for generation', () => {
  const quote = createQuote(defaultSettings, true); expect(() => validateQuote(quote)).not.toThrow();
  expect(() => validateQuote(quote, true)).toThrow();
  quote.customer.firstName = 'Mario'; quote.project.type = 'Impianto';
  quote.lines = [lineFromCatalog({ ...createCatalogItem(), name: 'Test' })];
  expect(() => validateQuote(quote, true)).not.toThrow();
  quote.lines.push({ ...quote.lines[0] }); expect(() => validateQuote(quote)).toThrow('identificativi distinti');
});
it('rejects malformed CRUD fields, unsafe image URLs and non-integer money', () => {
  const item = { ...createCatalogItem(), name: 'Test' };
  expect(() => validateCatalogItem(item)).not.toThrow();
  expect(() => validateCatalogItem({ ...item, priceCents: 1.1 })).toThrow();
  expect(() => validateCatalogItem({ ...item, imageUrl: 'javascript:alert(1)' })).toThrow();
  expect(() => validateSettings({ ...defaultSettings, nextSequence: 0 })).toThrow();
  expect(() => validateCustomer({ ...emptyCustomer(), firstName: 'Mario', email: 'not-an-email' })).toThrow();
  expect(() => validateCustomer(emptyCustomer())).toThrow('nome');
});
