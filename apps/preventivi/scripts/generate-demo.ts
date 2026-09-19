import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCatalogItem, createQuote, defaultSettings, lineFromCatalog } from '../src/data/defaults';
import { calculateQuote } from '../src/domain/money';
import { generateQuotePptx, quoteFilename } from '../src/pptx';
import type { Quote } from '../src/domain/types';

/** Only this explicit DEMO fixture contains example prices. It is never imported by the app. */
export function createDemoQuote(): Quote {
  const quote = createQuote(defaultSettings, true);
  quote.number = 'GF-2026-0001';
  quote.version = 1;
  quote.date = '2026-09-19';
  quote.createdAt = quote.updatedAt = '2026-09-19T09:00:00.000Z';
  quote.customer = { ...quote.customer, firstName: 'Mario', lastName: 'Rossi', email: 'mario.rossi@example.com', address: 'Via Esempio, 12', postalCode: '35121', city: 'Padova', province: 'PD', phone: '+39 000 0000000' };
  quote.project = { address: 'Via Esempio, 12, Padova', propertyType: 'Abitazione indipendente', areaSqm: 145, type: 'Pompa di calore e integrazione impianto', notes: 'DEMO. Proposta dimostrativa per riscaldamento e produzione di acqua calda sanitaria. La descrizione consente di verificare la presentazione dei dati del cliente e dell’intervento. Nessun prezzo o impegno commerciale qui riportato rappresenta un’offerta reale Green Flux.' };
  const names = ['Pompa di calore Test', 'Accumulo ACS DEMO', 'Installazione DEMO', 'Smaltimento DEMO', 'Kit collegamento DEMO', 'Servizio tecnico DEMO'];
  quote.lines = Array.from({ length: 22 }, (_, index) => {
    const item = createCatalogItem(index % 3 ? 2200 : 1000);
    item.name = index < names.length ? names[index] : `Accessorio impianto DEMO ${index + 1}`;
    item.sku = `DEMO-${String(index + 1).padStart(3, '0')}`;
    item.brand = 'Esempio DEMO';
    item.model = `Serie ${index + 1}`;
    item.description = index === 0
      ? 'Pompa di calore dimostrativa per il collaudo del preventivatore. La voce consente di verificare un prezzo unitario di 8.500 euro, quantità personalizzate, applicazione dello sconto di riga e mantenimento dei dati nello storico. Le specifiche tecniche definitive devono essere inserite dall’utente nel listino aziendale.'
      : `Descrizione completa della voce ${index + 1}. Dato dimostrativo modificabile nel listino. La fornitura e le attività effettive saranno definite dall’azienda per il singolo progetto. ${index % 5 === 0 ? 'Il testo esteso verifica il passaggio automatico fra le pagine e la conservazione integrale delle descrizioni senza riduzioni del carattere. Collegamenti, verifiche e accessori devono essere dettagliati nella proposta finale.' : ''}`;
    item.priceCents = index === 0 ? 850000 : index === 1 ? 125000 : 1500 + index * 6750;
    item.featured = index < 2;
    item.kind = [2, 3, 5].includes(index) ? 'service' : 'product';
    item.notes = 'NOTA INTERNA DEMO: non deve comparire nel PowerPoint.';
    const line = lineFromCatalog(item);
    line.quantityMilli = index === 0 ? 1000 : index === 2 ? 2500 : (index % 3 + 1) * 1000;
    line.discountBps = index === 0 ? 500 : index === 2 ? 750 : 0;
    return line;
  });
  quote.discount = { kind: 'percent', value: 250 };
  quote.surcharge = { kind: 'amount', value: 15000 };
  quote.conditions = { paymentTerms: 'DEMO. Le modalità di pagamento saranno concordate e compilate nel preventivo definitivo.', deliveryTerms: 'DEMO. Tempistiche da confermare in base al sopralluogo e alla disponibilità dei componenti.', warrantyTerms: 'DEMO. Condizioni e garanzie da specificare dall’azienda per prodotti e prestazioni effettivamente proposti.', notes: 'Documento di collaudo del software. Tutti i dati economici sono dimostrativi e non costituiscono un listino o un’offerta Green Flux.' };
  quote.totals = calculateQuote(quote.lines, quote.discount, quote.surcharge);
  return quote;
}

async function main() {
  const quote = createDemoQuote();
  const blob = await generateQuotePptx(quote);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const target = resolve(root, 'output', quoteFilename(quote));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, new Uint8Array(await blob.arrayBuffer()));
  await writeFile(resolve(root, 'output/demo-snapshot.json'), JSON.stringify(quote, null, 2));
  console.log(JSON.stringify({ file: target, bytes: blob.size, lines: quote.lines.length, totalCents: quote.totals.totalCents }, null, 2));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
