const hero = document.querySelector('.hp-hero');
const dialog = document.querySelector('[data-hp-quiz]');
const frame = dialog?.querySelector('[data-hp-quiz-frame]');
let opener;

if (hero) {
  const updateHeader = () => document.body.classList.toggle('is-scrolled', window.scrollY > hero.offsetHeight - 110);
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();
}

if (dialog && frame && typeof dialog.showModal === 'function') {
  document.querySelectorAll('[data-hp-open]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      if (!frame.hasAttribute('src')) frame.src = '/preventivo/?servizio=pompe-di-calore&embed=1';
      dialog.showModal();
      document.body.classList.add('hp-quiz-open');
    });
  });
  dialog.querySelector('[data-hp-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('hp-quiz-open');
    opener?.focus({ preventScroll: true });
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'green-flux:close-quiz' && dialog.open) dialog.close();
  });
}
