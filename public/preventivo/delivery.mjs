import { quoteText } from './data.mjs';

export const delivery = {
  mode: 'handoff',
  label: 'Prepara richiesta',
  note: 'Al termine potrai aprire il riepilogo su email o WhatsApp e completare l’invio a Green Flux.',
};

export function contactLinks(data) {
  const text = quoteText(data);
  return {
    whatsapp: `https://wa.me/393755521420?text=${encodeURIComponent(text)}`,
    email: `mailto:info@green-flux.com?subject=${encodeURIComponent('Richiesta di preventivo — Green Flux')}&body=${encodeURIComponent(text)}`,
  };
}

export async function sendQuote(data) {
  if (delivery.mode === 'handoff') return { handoff: true, links: contactLinks(data) };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/preventivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.accepted !== true) throw new Error(result?.message || 'Non siamo riusciti a inviare la richiesta. I dati sono ancora nel modulo: riprova oppure usa uno dei contatti qui sotto.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('La conferma dell’invio sta impiegando più tempo del previsto. Riprova o contattaci usando il riepilogo qui sotto.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
