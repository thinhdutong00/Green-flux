export const landingRequestAlreadySent = 'La tua richiesta è già stata inviata. Per aggiungere un dettaglio, scrivi a info@green-flux.com: non serve compilare di nuovo.';

const messages = {
  validation: 'Controlla i campi del modulo, attendi qualche secondo e riprova.',
  rate_limit: 'Hai effettuato diversi tentativi. Attendi qualche minuto e riprova.',
  unavailable: 'Il modulo non è disponibile al momento. Riprova più tardi oppure scrivi a info@green-flux.com.',
  network_or_timeout: 'La conferma dell’invio non è arrivata. Controlla la connessione e riprova: i dati sono ancora nel modulo.',
};

export function landingRequestError(error) {
  return messages[error?.category] || 'La conferma dell’invio non è arrivata. I dati sono ancora nel modulo: riprova oppure scrivi a info@green-flux.com.';
}
