// Each installation has one question in step 3 and one in step 4.
export const annualConsumptions = ['Meno di 3.000 kWh/anno', '3.000 - 6.000 kWh/anno', 'Oltre 6.000 e fino a 12.000 kWh/anno', 'Oltre 12.000 kWh/anno', 'Non li ho sotto mano'];
export const installationSpaces = ['Tetto a falda', 'Tetto piano', 'Terreno o area libera', 'Copertura aziendale', 'Da verificare con sopralluogo'];
const unknown = 'Non lo so / da valutare';
const question = (id, title, options, hint = 'Scegli la risposta più vicina alla tua situazione. Se hai dubbi, puoi indicare che è da valutare.') => ({ id, title, options, hint });

export const serviceQuestions = {
  'pompe-di-calore': [
    question('riscaldamento-attuale', 'Come riscaldi oggi l’immobile?', ['Caldaia a gas o GPL', 'Caldaia a gasolio', 'Stufa o caldaia a legna / pellet', 'Riscaldamento elettrico', 'Pompa di calore', 'Non c’è ancora un impianto', unknown]),
    question('distribuzione-calore', 'Come viene distribuito il calore negli ambienti?', ['Radiatori / termosifoni', 'Riscaldamento a pavimento', 'Ventilconvettori / fan coil', 'Più sistemi insieme', 'Impianto da realizzare', unknown]),
  ],
  fotovoltaico: [
    question('consumi', 'Qual è il tuo consumo annuo di energia elettrica?', annualConsumptions, 'Una fascia indicativa in kWh è sufficiente. Se non hai una bolletta disponibile, scegli “Non li ho sotto mano”.'),
    question('spazi', 'Dove potrebbe essere installato l’impianto?', installationSpaces, 'Indica la superficie che vorresti valutare per i pannelli, oppure scegli la verifica con sopralluogo.'),
  ],
  condizionatori: [
    question('ambienti', 'Quanti ambienti vuoi climatizzare?', ['Un ambiente', 'Due ambienti', 'Tre ambienti', 'Quattro o più ambienti', unknown]),
    question('intervento', 'Quale intervento di climatizzazione hai in mente?', ['Installare un nuovo impianto', 'Sostituire climatizzatori esistenti', 'Aggiungere climatizzatori a un impianto esistente', unknown]),
  ],
  caldaie: [
    question('generatore-attuale', 'Quale sistema di riscaldamento utilizzi oggi?', ['Caldaia a metano', 'Caldaia a GPL', 'Caldaia a gasolio', 'Stufa o caldaia a legna / pellet', 'Pompa di calore o sistema elettrico', 'Non c’è ancora un impianto', unknown]),
    question('funzioni', 'A cosa dovrà servire la caldaia?', ['Riscaldamento e acqua calda sanitaria', 'Solo riscaldamento', 'Solo acqua calda sanitaria', unknown]),
  ],
  biomassa: [
    question('esigenza', 'Che cosa vuoi riscaldare con legna o pellet?', ['Uno o pochi ambienti con una stufa', 'L’intero immobile tramite l’impianto di riscaldamento', 'Voglio sostituire un generatore a biomassa esistente', unknown]),
    question('spazi', 'Quali spazi potresti destinare all’impianto e al combustibile?', ['Un ambiente interno e uno spazio per legna / pellet', 'Un locale tecnico e uno spazio per legna / pellet', 'Un locale separato dall’immobile da valutare', 'Gli spazi di un impianto a biomassa esistente', unknown]),
  ],
  'solare-termico': [
    question('utilizzo-acqua', 'Per quante persone serve l’acqua calda?', ['1–2 persone', '3–4 persone', '5 o più persone', 'Uso aziendale o produttivo da valutare', unknown]),
    question('spazi', 'Dove potrebbero essere installati i pannelli solari termici?', ['Tetto a falda', 'Tetto piano / terrazzo', 'Copertura aziendale', 'Altra superficie da valutare', 'Da verificare con sopralluogo']),
  ],
  ventilazione: [
    question('esigenza', 'Qual è l’esigenza principale per il ricambio d’aria?', ['Ridurre umidità e condensa', 'Migliorare il ricambio e la qualità dell’aria', 'Prevedere la ventilazione in una costruzione o ristrutturazione', 'Sostituire o integrare una ventilazione esistente', unknown]),
    question('ambienti', 'Quali ambienti vuoi ventilare?', ['Una stanza o pochi locali', 'L’intera abitazione', 'Uffici, negozio o altri locali aziendali', 'Ambienti produttivi', unknown]),
  ],
  'trattamento-acqua': [
    question('utilizzo', 'Quale acqua vuoi trattare?', ['Acqua utilizzata in casa', 'Acqua del circuito di riscaldamento / impianto tecnico', 'Acqua per un’attività o un processo produttivo', 'Più utilizzi da valutare insieme', unknown]),
    question('esigenza', 'Quale problema vuoi affrontare?', ['Calcare e incrostazioni', 'Sapore o odore dell’acqua', 'Sedimenti o impurità da valutare', 'Protezione e corretta gestione dell’impianto', unknown]),
  ],
  'smart-home': [
    question('funzioni', 'Che cosa vorresti controllare o automatizzare?', ['Riscaldamento e climatizzazione', 'Luci e consumi elettrici', 'Tapparelle e altre aperture', 'Sicurezza e accessi', 'Più funzioni insieme', unknown]),
    question('situazione', 'In quale situazione vorresti inserire le automazioni?', ['Nuova costruzione', 'Ristrutturazione con rifacimento degli impianti', 'Immobile con impianti esistenti', 'Ampliamento di un sistema smart già presente', unknown]),
  ],
  'impianti-completi': [
    question('intervento', 'Quale progetto vuoi realizzare?', ['Impianti per una nuova costruzione', 'Ristrutturazione completa', 'Rinnovo coordinato di più impianti esistenti', unknown]),
    question('sistemi', 'Quali impianti vuoi coordinare?', ['Riscaldamento, raffrescamento e acqua calda', 'Impianti elettrici, fotovoltaico e automazioni', 'Impianti idraulici ed elettrici insieme', unknown]),
  ],
};

export const answerName = (service, questionId) => `risposta.${service}.${questionId}`;
