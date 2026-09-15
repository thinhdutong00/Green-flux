import { mobileHeaderMarkup } from './mobile-header-template.mjs';

export function setupMobileHeader() {
  // The focused quote flow has its own header and close control.
  if (!document.querySelector('section.header') || document.querySelector('.gf-mobile-header')) return;
  document.body.insertAdjacentHTML('afterbegin', mobileHeaderMarkup);
  const header = document.querySelector('.gf-mobile-header');
  const toggle = header.querySelector('.gf-mobile-toggle');
  const menu = document.querySelector('#gf-mobile-menu');
  const desktop = matchMedia('(min-width: 992px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const sections = [...menu.querySelectorAll('details')];
  let closing = false;
  let closeTimer;
  let lastScrollY = getScrollY();
  let scrollTravel = 0;
  let scheduled = false;

  function getScrollY() {
    return Math.min(Math.max(0, document.documentElement.scrollHeight - innerHeight), Math.max(0, scrollY));
  }

  function resetMenu() {
    clearTimeout(closeTimer);
    closing = false;
    document.documentElement.classList.remove('gf-menu-open');
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu');
    sections.forEach(section => { section.open = false; });
    menu.querySelector('.gf-mobile-menu-scroll').scrollTop = 0;
    header.classList.remove('is-hidden');
    lastScrollY = getScrollY();
    scrollTravel = 0;
  }

  function finishClose() {
    menu.close();
    resetMenu();
    const target = desktop.matches ? document.querySelector('section.header .brand-logo') : toggle;
    target?.focus({ preventScroll: true });
  }

  function closeMenu(immediate = false) {
    if (!menu.open) return;
    if (closing && !immediate) return;
    closing = true;
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
    if (immediate || reducedMotion.matches) finishClose();
    else closeTimer = setTimeout(finishClose, 400);
  }

  toggle.addEventListener('click', () => {
    if (desktop.matches || menu.open) return;
    header.classList.remove('is-hidden');
    menu.showModal();
    document.documentElement.classList.add('gf-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Chiudi il menu');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (menu.open && !closing) menu.classList.add('is-open');
    }));
  });
  menu.querySelector('.gf-menu-close').addEventListener('click', () => closeMenu());
  menu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  menu.addEventListener('close', resetMenu);
  menu.addEventListener('transitionend', event => {
    if (closing && event.target === menu && event.propertyName === 'transform') finishClose();
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) { closeMenu(true); return; }
    if (event.target !== menu) return;
    const bounds = menu.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
  });
  sections.forEach(section => section.addEventListener('toggle', () => {
    if (section.open) sections.forEach(other => { if (other !== section) other.open = false; });
  }));
  desktop.addEventListener('change', event => { if (event.matches) closeMenu(true); });
  window.addEventListener('pagehide', () => { if (menu.open) { menu.close(); resetMenu(); } });

  // Restore the original reveal-on-scroll-up behavior on mobile only.
  function syncHeader() {
    scheduled = false;
    const current = getScrollY();
    const delta = current - lastScrollY;
    lastScrollY = current;
    const keyboardFocus = header.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (desktop.matches || current <= header.offsetHeight + 32 || menu.open || keyboardFocus) {
      header.classList.remove('is-hidden');
      scrollTravel = 0;
      return;
    }
    if (!delta) return;
    scrollTravel = Math.sign(delta) === Math.sign(scrollTravel) ? scrollTravel + delta : delta;
    if (Math.abs(scrollTravel) >= 8) header.classList.toggle('is-hidden', scrollTravel > 0);
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(syncHeader); }
  }, { passive: true });
  window.addEventListener('resize', () => {
    header.classList.remove('is-hidden');
    lastScrollY = getScrollY();
    scrollTravel = 0;
  });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  document.documentElement.classList.add('gf-mobile-ready');
}
