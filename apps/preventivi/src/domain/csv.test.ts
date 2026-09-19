import { describe, expect, it } from 'vitest';
import Papa from 'papaparse';
import { escapeCsvFormula, exportCatalogCsv, parseCatalogCsv } from './csv';
import type { CatalogItem, Category } from './types';

const category: Category = { id: 'caf03aa0-dc21-4295-9aac-fc317d01e3d7', name: 'Pompe di calore' };
const product: CatalogItem = { id: '94391401-0352-446c-8fb5-c6d3b65c7c2a', categoryId: category.id, sku: 'DEMO-PDC', name: 'Pompa di calore DEMO', brand: 'DEMO', model: 'Test', description: 'Descrizione con accenti: qualità; efficienza.\nSeconda riga, con "virgolette".', unit: 'pz', priceCents: 850000, vatBps: 2200, active: true, notes: 'Prezzo dimostrativo', kind: 'product', featured: true, imageUrl: '' };

describe('CSV listino', () => {
  it('esporta UTF-8 BOM, decimali italiani e importa senza perdere accenti, multilinea o valori economici', () => {
    const csv = exportCatalogCsv([product], [category]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"8500,00"');
    const preview = parseCatalogCsv(csv, [category], []);
    expect(preview.valid).toBe(true);
    expect(preview.rows[0].item).toEqual({ ...product, id: expect.any(String) });
    expect(preview.rows[0].item?.id).not.toBe(product.id);
  });
  it('blocca codici già presenti e duplicati nel lotto senza sovrascrivere', () => {
    const csv = exportCatalogCsv([product, { ...product, sku: 'demo-pdc' }], [category]);
    const existing = parseCatalogCsv(csv, [category], [product]);
    expect(existing.valid).toBe(false);
    expect(existing.rows.every(row => row.errors.some(error => error.includes('Codice già presente')))).toBe(true);
    const withinFile = parseCatalogCsv(csv, [category], []);
    expect(withinFile.rows[0].item).not.toBeNull();
    expect(withinFile.rows[1].item).toBeNull();
    expect(withinFile.valid).toBe(false);
  });
  it('mostra gli errori per riga e blocca aliquote, importi e categorie non validi', () => {
    const csv = 'categoria;nome;unita;prezzo;iva\nSconosciuta;Esempio;pz;-3,20;101\n;Seconda;pz;12,345;22';
    const preview = parseCatalogCsv(csv, [category], []);
    expect(preview.valid).toBe(false);
    expect(preview.rows[0].row).toBe(2);
    expect(preview.rows[0].errors).toHaveLength(3);
    expect(preview.rows[1].errors.join(' ')).toContain('Prezzo non valido');
  });
  it('blocca file vuoti o intestazioni richieste mancanti', () => {
    expect(parseCatalogCsv('', [], []).valid).toBe(false);
    const preview = parseCatalogCsv('nome;prezzo\nEsempio;10,00', [], []);
    expect(preview.errors).toContain('Colonna obbligatoria mancante: iva.');
  });
  it('neutralizza formule anche precedute da spazi e preserva le celle testuali normali', () => {
    for (const value of ['=HYPERLINK("https://example.test")', '+1+1', '-1+1', '@SUM(A1)', '  =2+2', '\t=2+2']) expect(escapeCsvFormula(value)).toBe(`'${value}`);
    expect(escapeCsvFormula('Pompa di calore')).toBe('Pompa di calore');
    const csv = exportCatalogCsv([{ ...product, name: '=1+1', description: '@SUM(A1)' }], [category]);
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, delimiter: ';' });
    expect(parsed.data[0].nome).toBe("'=1+1");
    expect(parsed.data[0].descrizione).toBe("'@SUM(A1)");
  });
  it('mantiene un modello utilizzabile quando il listino è vuoto', () => {
    const csv = exportCatalogCsv([], []);
    expect(csv).toContain('"nome";"marca"');
    expect(csv).toContain('"prezzo";"iva"');
  });
});
