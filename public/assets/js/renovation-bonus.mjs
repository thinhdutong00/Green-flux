// Bonus casa: detrazione sulle spese 2026, calcolata al massimo su 96.000 € di spesa
// per unità immobiliare e ripartita in 10 quote annuali. Stima indicativa per la landing.
export const bonusCeiling = 96000;
export const bonusRates = { main: 50, other: 36 };

export function bonusEstimate(spend, rate) {
  const total = Math.min(spend, bonusCeiling) * rate / 100;
  return { total, yearly: total / 10, net: spend - total, capped: spend > bonusCeiling };
}

export const euro = value => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
