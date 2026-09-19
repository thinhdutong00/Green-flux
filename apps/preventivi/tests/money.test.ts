import { describe, expect, it } from 'vitest';
import { allocateCents, calculateQuote, formatMoney, formatScaled, parseScaled } from '../src/domain/money';
import { createCatalogItem, lineFromCatalog } from '../src/data/defaults';
const line = (price: number, vatBps = 2200) => ({ ...lineFromCatalog(createCatalogItem(vatBps)), unitPriceCents: price, name: 'Test' });
const zero = { kind: 'percent' as const, value: 0 };
describe('exact monetary calculation', () => {
  it('allocates fixed adjustments and VAT using persistent row order for ties', () => {
    const result = calculateQuote([line(10000, 1000), line(10000), line(10000)], { kind: 'amount', value: 100 }, { kind: 'amount', value: 100 });
    expect(result.lines.map(v => v.discountCents)).toEqual([34, 33, 33]);
    expect(result.lines.map(v => v.surchargeCents)).toEqual([33, 34, 33]);
    expect(result.lines.map(v => v.netCents)).toEqual([9999, 10001, 10000]);
    expect(result.vatGroups).toEqual([{ rateBps: 1000, taxableCents: 9999, vatCents: 1000 }, { rateBps: 2200, taxableCents: 20001, vatCents: 4400 }]);
    expect(result.totalCents).toBe(35400);
  });
  it('supports 100% discount and amount surcharge using the pre-discount weights', () => {
    const result = calculateQuote([line(10000, 1000), line(20000)], { kind: 'percent', value: 10000 }, { kind: 'amount', value: 1000 });
    expect(result.lines.map(v => v.netCents)).toEqual([333, 667]);
    expect(result.vatCents).toBe(180); expect(result.totalCents).toBe(1180);
  });
  it('matches the 8500 EUR user scenario with fractional quantities and percentage adjustments', () => {
    const result = calculateQuote([{ ...line(850000), quantityMilli: 2000, discountBps: 1000 }], { kind: 'percent', value: 500 }, { kind: 'percent', value: 200 });
    expect(result.taxableCents).toBe(1482570); expect(result.vatCents).toBe(326165); expect(result.totalCents).toBe(1808735);
    expect(calculateQuote([{ ...line(199), quantityMilli: 1500 }], zero, zero).subtotalCents).toBe(299);
  });
  it('rounds percentage targets once and exactly reconciles every cent', () => {
    const result = calculateQuote([line(1), line(1), line(1)], { kind: 'percent', value: 5000 }, zero);
    expect(result.discountCents).toBe(2); expect(result.lines.map(v => v.discountCents)).toEqual([1, 1, 0]);
    expect(result.taxableCents).toBe(1);
    for (let amount = 0; amount < 500; amount++) {
      const allocated = allocateCents(BigInt(amount), [1n, 1n, 13n, 0n]);
      expect(allocated.reduce((a, b) => a + b, 0n)).toBe(BigInt(amount)); expect(allocated[3]).toBe(0n);
    }
  });
  it('handles zero values and rejects invalid economics instead of producing NaN', () => {
    expect(calculateQuote([], zero, zero).totalCents).toBe(0);
    expect(calculateQuote([line(0)], zero, { kind: 'percent', value: 5000 }).totalCents).toBe(0);
    expect(() => calculateQuote([line(0)], zero, { kind: 'amount', value: 1 })).toThrow('voce personalizzata');
    expect(() => calculateQuote([line(100)], { kind: 'amount', value: 101 }, zero)).toThrow('superare');
    expect(() => calculateQuote([{ ...line(100), quantityMilli: 0 }], zero, zero)).toThrow('quantità');
    expect(() => calculateQuote([line(Number.NaN)], zero, zero)).toThrow();
    expect(() => calculateQuote([{ ...line(100), discountBps: 10001 }], zero, zero)).toThrow('100%');
  });
});
describe('decimal parsing and presentation', () => {
  it('parses decimals exactly, accepting Italian input without hidden rounding', () => {
    expect(parseScaled('8500,99', 2)).toBe(850099); expect(parseScaled('1.125', 3)).toBe(1125);
    expect(parseScaled(' 12 ', 2)).toBe(1200); expect(formatScaled(1, 3)).toBe('0.001');
    expect(formatScaled(850000, 2)).toBe('8500.00'); expect(formatMoney(1245000)).toBe('€ 12.450,00');
    expect(formatMoney(850000)).toBe('€ 8.500,00'); expect(formatMoney(596580)).toBe('€ 5.965,80');
    for (const text of ['1.000,50', '1e3', '-1', 'NaN', '', '1,005']) expect(() => parseScaled(text, 2)).toThrow();
  });
});
