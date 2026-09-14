// Set to false and redeploy to restore the entire site.
export const maintenanceEnabled = true;

export const maintenancePage = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#123335" />
  <title>Sito in manutenzione | Green Flux</title>
  <meta name="description" content="Il sito Green Flux è temporaneamente in manutenzione. Per informazioni puoi contattarci via telefono, email o WhatsApp." />
  <link rel="icon" href="/assets/favicon.ico" />
  <style>
    @font-face { font-family: Jakarta; src: url('/assets/fonts/plus-jakarta-sans-400.woff2') format('woff2'); font-weight: 400; font-display: swap; }
    @font-face { font-family: Jakarta; src: url('/assets/fonts/plus-jakarta-sans-600.woff2') format('woff2'); font-weight: 600; font-display: swap; }
    @font-face { font-family: Jakarta; src: url('/assets/fonts/plus-jakarta-sans-800.woff2') format('woff2'); font-weight: 800; font-display: swap; }
    :root { color-scheme: dark; font-family: Jakarta, Arial, sans-serif; color: #f8faf6; background: #123335; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100svh; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; }
    body::before { content: ''; position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 100% 0%, rgb(213 237 144 / 9%), transparent 55%); }
    a { color: inherit; text-decoration: none; }
    a:focus-visible { outline: 3px solid #d5ed90; outline-offset: 6px; }
    header, main, footer { position: relative; width: min(1160px, calc(100% - 80px)); margin-inline: auto; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-top: 36px; }
    .brand { position: relative; width: 220px; height: 64px; overflow: hidden; flex: none; }
    .brand img { position: absolute; width: 280px; height: auto; max-width: none; left: -35px; top: -34px; }
    .label { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #c3d2ce; }
    main { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding-block: 72px 88px; }
    .status { display: inline-flex; align-items: center; gap: 10px; margin: 0 0 30px; padding: 10px 16px; border: 1px solid rgb(213 237 144 / 26%); border-radius: 999px; color: #d5ed90; font-size: 12px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; }
    .status::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #d5ed90; }
    h1 { max-width: 800px; margin: 0; font-size: clamp(42px, 6.5vw, 80px); font-weight: 800; line-height: 1.08; letter-spacing: -.055em; text-wrap: balance; }
    h1 span { display: block; color: #d5ed90; }
    .description { max-width: 540px; margin: 28px 0 0; color: #c3d2ce; font-size: 17px; line-height: 1.8; text-wrap: pretty; }
    .contacts { margin-top: 42px; }
    .contacts p { margin: 0 0 18px; color: #c3d2ce; font-size: 14px; }
    .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
    .button { display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 54px; padding: 14px 24px; border: 1px solid rgb(255 255 255 / 25%); border-radius: 999px; font-size: 14px; font-weight: 600; }
    .button:hover { background: rgb(255 255 255 / 8%); border-color: #d5ed90; }
    .primary { background: #d5ed90; border-color: #d5ed90; color: #123335; }
    .primary:hover { background: #e3f4b5; }
    .email { display: inline-flex; align-items: center; min-height: 44px; margin-top: 18px; font-size: 14px; text-underline-offset: 5px; }
    .email:hover { text-decoration: underline; }
    footer { display: flex; justify-content: space-between; gap: 20px; padding-block: 24px 30px; border-top: 1px solid rgb(255 255 255 / 14%); font-size: 12px; line-height: 1.6; color: #aebfbb; }
    footer p { margin: 0; }
    ::selection { background: #d5ed90; color: #123335; }
    @media (max-width: 600px) {
      header, main, footer { width: calc(100% - 40px); }
      header { padding-top: 20px; justify-content: center; }
      header .label { display: none; }
      main { padding-block: 54px 60px; }
      h1 { font-size: clamp(38px, 10vw, 56px); }
      .status { margin-bottom: 24px; font-size: 10px; }
      .description { font-size: 15px; margin-top: 24px; }
      .contacts { width: 100%; margin-top: 32px; }
      .actions { flex-direction: column; align-items: center; }
      .button { width: min(100%, 300px); }
      footer { flex-direction: column; align-items: center; gap: 6px; text-align: center; padding-block: 20px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand"><img src="/assets/logo.png" width="500" height="232" alt="Green Flux, impianti tecnologici" /></div>
    <span class="label">Impianti tecnologici</span>
  </header>
  <main>
    <p class="status">Sito in manutenzione</p>
    <h1>Ci stiamo rinnovando.<span>Torniamo presto.</span></h1>
    <p class="description">Stiamo lavorando al nostro sito per offrirti un’esperienza migliore. Nel frattempo, siamo a tua disposizione per informazioni e richieste.</p>
    <section class="contacts" aria-label="Contatta Green Flux">
      <p>Restiamo in contatto.</p>
      <div class="actions">
        <a class="button primary" href="https://wa.me/393755521420">Scrivici su WhatsApp <span aria-hidden="true">↗</span></a>
        <a class="button" href="tel:+393755521420">Chiama +39 375 552 1420</a>
      </div>
      <a class="email" href="mailto:info@green-flux.com">info@green-flux.com</a>
    </section>
  </main>
  <footer><p>Green Flux · Impianti tecnologici</p><p>Grazie per la pazienza.</p></footer>
</body>
</html>`;
