import type { Adjustment, QuoteLine, QuoteTotals } from './types';

export const MAX_AMOUNT_CENTS = 1_000_000_000_000;
const integer = (value: number, label: string): bigint => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label}: inserisci un numero valido e non negativo.`);
  return BigInt(value);
};
const asNumber = (value: bigint): number => {
  if (value > BigInt(MAX_AMOUNT_CENTS)) throw new Error('Importo troppo elevato.');
  return Number(value);
};
const round = (numerator: bigint, denominator: bigint) => (2n * numerator + denominator) / (2n * denominator);

/** Exact Hamilton allocation. Array order is the persisted quote line order. */
export function allocateCents(amount: bigint, weights: bigint[]): bigint[] {
  if (amount === 0n) return weights.map(() => 0n);
  const sum = weights.reduce((a, b) => a + b, 0n);
  if (sum === 0n) throw new Error('Con un imponibile pari a zero, inserisci la maggiorazione come voce personalizzata e scegli l’IVA.');
  const shares = weights.map(weight => amount * weight / sum);
  const residues = weights.map((weight, index) => ({ index, rest: amount * weight % sum }));
  residues.sort((a, b) => a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1);
  const missing = Number(amount - shares.reduce((a, b) => a + b, 0n));
  for (let i = 0; i < missing; i++) shares[residues[i].index] += 1n;
  return shares;
}

export function calculateQuote(lines: QuoteLine[], discount: Adjustment, surcharge: Adjustment): QuoteTotals {
  const bases = lines.map(line => {
    const quantity = integer(line.quantityMilli, 'Quantità');
    const price = integer(line.unitPriceCents, 'Prezzo');
    const rate = integer(line.discountBps, 'Sconto');
    if (quantity === 0n || quantity > 1_000_000_000n) throw new Error('La quantità deve essere maggiore di zero (massimo 1.000.000).');
    if (price > BigInt(MAX_AMOUNT_CENTS)) throw new Error('Prezzo troppo elevato.');
    if (rate > 10000n) throw new Error('Lo sconto non può superare il 100%.');
    if (integer(line.vatBps, 'IVA') > 10000n) throw new Error('Aliquota IVA non valida.');
    return round(quantity * price * (10000n - rate), 10_000_000n);
  });
  const sum = (values: bigint[]) => values.reduce((a, b) => a + b, 0n);
  const subtotal = sum(bases);
  asNumber(subtotal);
  const adjustment = (value: Adjustment, base: bigint, isDiscount: boolean) => {
    if (value.kind !== 'percent' && value.kind !== 'amount') throw new Error('Tipo di adeguamento non valido.');
    const v = integer(value.value, isDiscount ? 'Sconto complessivo' : 'Maggiorazione');
    if (value.kind === 'percent' && v > (isDiscount ? 10000n : 1_000_000n)) throw new Error('Percentuale non valida.');
    return value.kind === 'percent' ? round(base * v, 10000n) : v;
  };
  const discountTotal = adjustment(discount, subtotal, true);
  if (discountTotal > subtotal) throw new Error('Lo sconto complessivo non può superare l’imponibile.');
  const discounts = allocateCents(discountTotal, bases);
  const afterDiscount = bases.map((value, index) => value - discounts[index]);
  const afterDiscountTotal = sum(afterDiscount);
  const surchargeTotal = adjustment(surcharge, afterDiscountTotal, false);
  asNumber(surchargeTotal);
  const surcharges = allocateCents(surchargeTotal, afterDiscountTotal > 0n ? afterDiscount : bases);
  const finalBases = afterDiscount.map((value, index) => value + surcharges[index]);
  const groups = new Map<number, bigint>();
  lines.forEach((line, index) => groups.set(line.vatBps, (groups.get(line.vatBps) ?? 0n) + finalBases[index]));
  const vatGroups = [...groups].sort(([a], [b]) => a - b).map(([rateBps, taxable]) => ({
    rateBps, taxableCents: asNumber(taxable), vatCents: asNumber(round(taxable * BigInt(rateBps), 10000n)),
  }));
  const taxable = sum(finalBases);
  const vat = vatGroups.reduce((a, b) => a + BigInt(b.vatCents), 0n);
  return {
    subtotalCents: asNumber(subtotal), discountCents: asNumber(discountTotal), surchargeCents: asNumber(surchargeTotal),
    taxableCents: asNumber(taxable), vatCents: asNumber(vat), totalCents: asNumber(taxable + vat),
    lines: lines.map((line, index) => ({ id: line.id, baseCents: asNumber(bases[index]), discountCents: asNumber(discounts[index]), surchargeCents: asNumber(surcharges[index]), netCents: asNumber(finalBases[index]) })),
    vatGroups,
  };
}

/** Accepts ungrouped decimal input with a dot or comma; never silently rounds. */
export function parseScaled(value: string, decimals: number): number {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) throw new Error('Precisione non valida.');
  const text = value.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error('Inserisci un numero senza separatori delle migliaia.');
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  if (fraction.length > decimals) throw new Error(`Sono consentite al massimo ${decimals} cifre decimali.`);
  const amount = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Numero troppo elevato.');
  return Number(amount);
}

export function formatScaled(value: number, decimals: number): string {
  if (!Number.isSafeInteger(value)) throw new Error('Numero non valido.');
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) throw new Error('Precisione non valida.');
  const sign = value < 0 ? '-' : '';
  const digits = Math.abs(value).toString().padStart(decimals + 1, '0');
  return decimals === 0 ? `${sign}${digits}` : `${sign}${digits.slice(0, -decimals)}.${digits.slice(-decimals)}`;
}

export function formatMoney(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Importo non valido.');
  const negative = cents < 0;
  const amount = BigInt(negative ? -cents : cents);
  return `${negative ? '−' : ''}€ ${(amount / 100n).toLocaleString('it-IT', { useGrouping: true })},${(amount % 100n).toString().padStart(2, '0')}`;
}
