import { z } from 'zod';
import { calculateQuote, MAX_AMOUNT_CENTS } from './money';
import type { CatalogItem, Category, CompanySettings, Customer, Quote } from './types';

// Canonical lowercase UUIDs prevent case aliases between IndexedDB string keys and PostgreSQL uuid keys.
const id = z.uuid({ error: 'Identificativo non valido.' }).regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'Identificativo UUID non canonico.');
const text = (max = 500) => z.string().max(max, `Massimo ${max} caratteri.`);
const required = (max = 500) => text(max).refine(v => v.trim().length > 0, 'Campo obbligatorio.');
const integer = (max: number) => z.number().int().min(0).max(max);
const cents = integer(MAX_AMOUNT_CENTS);
const rate = integer(10000);
const image = text(2000).refine(v => !v || /^https?:\/\//i.test(v) || /^\/assets\//.test(v), 'Usa un URL http(s) per l’immagine.');
export const categorySchema = z.object({ id, name: required(120) }).strict();
export const catalogItemSchema = z.object({ id, categoryId: id.nullable(), sku: text(120), name: required(300), brand: text(200), model: text(200), description: text(30000), unit: required(40), priceCents: cents, vatBps: rate, active: z.boolean(), notes: text(10000), kind: z.enum(['product', 'service']), featured: z.boolean(), imageUrl: image }).strict();
export const customerSchema = z.object({ id, firstName: text(200), lastName: text(200), company: text(300), email: text(300).refine(v => !v || z.email().safeParse(v).success, 'Email non valida.'), phone: text(80), address: text(500), postalCode: text(20), city: text(150), province: text(80) }).strict();
export const settingsSchema = z.object({ id: z.literal('company'), legalName: required(300), phone: text(80), email: text(300).refine(v => !v || z.email().safeParse(v).success, 'Email non valida.'), website: text(500).refine(v => !v || /^https?:\/\//i.test(v), 'Il sito deve iniziare con https:// o http://.'), address: text(500), vatNumber: text(40), representative: text(200), validityDays: integer(3650).min(1), paymentTerms: text(30000), deliveryTerms: text(30000), warrantyTerms: text(30000), notes: text(50000), defaultVatBps: rate, numberPrefix: z.string().regex(/^[A-Za-z0-9_-]{1,16}$/, 'Prefisso: 1–16 lettere, numeri, trattini.'), nextSequence: integer(999999999).min(1) }).strict();
export const quoteLineSchema = z.object({ id, catalogItemId: id.nullable(), kind: z.enum(['product', 'service']), sku: text(120), name: required(300), brand: text(200), model: text(200), description: text(30000), unit: required(40), quantityMilli: integer(1000000000).min(1), unitPriceCents: cents, discountBps: rate, vatBps: rate, featured: z.boolean(), includeInScope: z.boolean(), imageUrl: image }).strict();
const adjustment = z.object({ kind: z.enum(['percent', 'amount']), value: cents }).strict();
export const quoteSchema = z.object({ id, number: text(100), version: integer(999999999), status: z.enum(['draft', 'generated', 'sent', 'accepted', 'rejected']), date: z.iso.date(), validityDays: integer(3650).min(1), representative: text(200), customerId: id.nullable(), customer: customerSchema, project: z.object({ address: text(500), propertyType: text(200), areaSqm: z.number().finite().min(0).max(1000000000).nullable(), type: text(300), notes: text(50000) }).strict(), lines: z.array(quoteLineSchema).max(1000), discount: adjustment, surcharge: adjustment, conditions: z.object({ paymentTerms: text(30000), deliveryTerms: text(30000), warrantyTerms: text(30000), notes: text(50000) }).strict(), companySnapshot: settingsSchema, totals: z.unknown(), createdAt: text(100), updatedAt: text(100), generatedAt: text(100).nullable(), generatedVersion: integer(999999999).nullable(), isDemo: z.boolean() }).strict();

function validate(schema: z.ZodType, value: unknown): void {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n'));
}
export const validateCategory = (value: Category) => validate(categorySchema, value);
export const validateCatalogItem = (value: CatalogItem) => validate(catalogItemSchema, value);
export function validateCustomer(value: Customer): void {
  validate(customerSchema, value);
  if (!`${value.firstName}${value.lastName}${value.company}`.trim()) throw new Error('Inserisci il nome del cliente o la ragione sociale.');
}
export const validateSettings = (value: CompanySettings) => validate(settingsSchema, value);
export function validateQuote(value: Quote, forGeneration = false): void {
  validate(quoteSchema, value);
  if (new Set(value.lines.map(line => line.id)).size !== value.lines.length) throw new Error('Le righe devono avere identificativi distinti.');
  calculateQuote(value.lines, value.discount, value.surcharge);
  if (forGeneration) {
    validateCustomer(value.customer);
    if (!value.lines.length) throw new Error('Aggiungi almeno una voce prima di generare il PowerPoint.');
    if (!value.project.type.trim()) throw new Error('Inserisci la tipologia di progetto.');
  }
}
