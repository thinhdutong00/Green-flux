export const renovationRoute = '/servizi/ristrutturazione-casa/';

export async function renderRenovation({ page, write }) {
  const title = 'Rifacimento degli impianti per chi ristruttura casa a Padova';
  const lead = 'Se sposti un bagno o cambi la disposizione della casa, anche tubazioni, prese e riscaldamento cambiano posto. Raccontaci cosa vuoi ottenere e quali lavori hai già affidato.';
  const body = `
    <section class="gf-section"><div class="gf-wrap gf-intro">
      <div>
        <h2>Prima di aprire il cantiere</h2>
        <p>Una cucina sulla parete opposta richiede nuovi scarichi. Un pavimento radiante richiede spazio sotto il rivestimento. Se queste scelte arrivano dopo il massetto, può essere necessario riaprire ciò che è già stato chiuso.</p>
        <p>Al primo confronto mettiamo insieme le modifiche che hai in mente, gli impianti da conservare e le opere da coordinare. Se hai già un progettista o un’impresa edile, indicacelo. Potremo chiarire con te quali lavorazioni affidare a Green Flux e quali rimangono a chi segue il cantiere.</p>
      </div>
      <aside class="gf-preparation">
        <h2>Cosa raccontarci</h2>
        <ul>
          <li>Il comune, il tipo di immobile e le stanze interessate.</li>
          <li>Se la casa sarà abitata durante i lavori e quando vorresti iniziare.</li>
          <li>Se hai già una planimetria, un capitolato o una data per le demolizioni.</li>
        </ul>
        <p>Puoi fare la richiesta anche se il progetto è ancora da disegnare.</p>
      </aside>
    </div></section>
    <section class="gf-section gf-paper"><div class="gf-wrap">
      <h2>Quali lavori devono incastrarsi?</h2>
      <div class="gf-information-grid gf-three">
        <article class="gf-information-item"><h3>Bagno e cucina</h3><p>La posizione di lavello, doccia ed elettrodomestici determina dove servono acqua, scarichi e prese. Prima dei rivestimenti verifichiamo con te misure, percorsi e punti di collegamento.</p></article>
        <article class="gf-information-item"><h3>Pavimenti e riscaldamento</h3><p>Se rifai i pavimenti, è il momento di confrontare un impianto radiante con il mantenimento dei termosifoni. Contano l’altezza disponibile, il generatore esistente e le stanze che puoi lasciare libere.</p></article>
        <article class="gf-information-item"><h3>Opere edili e finiture</h3><p>Demolizioni, passaggi degli impianti, chiusura delle tracce e posa dei materiali hanno un ordine. Definiamo nel preventivo le attività comprese e quelle che dovrai coordinare con altri professionisti.</p></article>
      </div>
      <p>Vuoi vedere come si passa dalla posa delle tubazioni all’impianto finito? <a href="/lavori/centrale-termica-con-pompa-di-calore/">Guarda le foto del nostro intervento in centrale termica</a>.</p>
      <p class="gf-support-link">Le opere edili sono già affidate e cerchi chi realizzi gli impianti? <a href="/servizi/impianti-completi/">Consulta il servizio impianti completi</a>.</p>
    </div></section>
    <section class="gf-section"><div class="gf-wrap gf-intro">
      <div><h2>Dal sopralluogo al preventivo</h2>
        <p>Lascia il comune e i recapiti nel modulo. Ti richiamiamo per capire in quale fase si trova la ristrutturazione e verificare la disponibilità nella tua zona.</p>
        <p>Durante il sopralluogo confrontiamo la disposizione attuale con quella desiderata. Se è previsto un intervento in condominio, segnaliamo i punti che richiedono un confronto con il tuo tecnico o con l’amministratore.</p>
        <p>La proposta scritta indica lavorazioni, materiali e attività comprese. Prima di decidere puoi verificare chi segue le singole opere, quali documenti servono e come si inserisce la posa degli impianti nel calendario del cantiere.</p>
      </div>
      <aside class="gf-preparation"><h2>Stai ancora decidendo da dove iniziare?</h2>
        <p>La nostra guida spiega quali decisioni prendere prima delle demolizioni, quali predisposizioni lasciare e cosa controllare prima di chiudere le tracce.</p>
        <a class="gf-text-link" href="/guide/impianti-in-ristrutturazione/">Leggi la guida agli impianti in ristrutturazione</a>
      </aside>
    </div></section>`;
  const html = page(renovationRoute, title, lead, body, {
    image: 'images/renovation-systems-1600.webp',
    kicker: 'Ristrutturazioni',
    seoTitle: 'Rifacimento impianti in ristrutturazione a Padova',
    metaDescription: 'Ristrutturi casa a Padova? Valutiamo impianto idraulico, elettrico e riscaldamento insieme alle opere in cantiere. Indica il comune per richiedere un sopralluogo.',
    quoteUrl: '/preventivo/?servizio=impianti-completi&progetto=ristrutturazione',
    quoteLabel: 'Richiedi un sopralluogo per la ristrutturazione',
    ctaTitle: 'Quali stanze vuoi ristrutturare?'
  });
  await write(renovationRoute, html, title);
}
