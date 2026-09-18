// Restore the original card menus for the shared desktop header.
export function setupDesktopMenus() {
  const desktop = matchMedia('(min-width: 992px)');
  const menus = [...document.querySelectorAll('.gf-desktop-header [data-desktop-menu]')].map(nav => ({
    nav,
    trigger: nav.querySelector('.services-nav-trigger'),
    panel: nav.querySelector('.services-menu'),
    closeTimer: null,
    openedByHover: false,
  }));

  function setOpen(item, open, restoreFocus = false) {
    clearTimeout(item.closeTimer);
    item.openedByHover = false;
    const isOpen = open && desktop.matches;
    if (isOpen) menus.forEach(other => {
      if (other !== item && other.nav.classList.contains('is-open')) {
        setOpen(other, false, other.panel.contains(document.activeElement));
      }
    });
    item.nav.classList.toggle('is-open', isOpen);
    item.trigger.setAttribute('aria-expanded', String(isOpen));
    if (!isOpen && restoreFocus) item.trigger.focus({ preventScroll: true });
    item.panel.inert = !isOpen;
  }

  menus.forEach(item => {
    const { nav, trigger, panel } = item;
    nav.classList.add('is-enhanced');
    trigger.addEventListener('click', () => setOpen(item, item.openedByHover || !nav.classList.contains('is-open')));
    trigger.addEventListener('keydown', event => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      setOpen(item, true);
      panel.querySelector('a').focus({ preventScroll: true });
    });
    nav.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !desktop.matches) return;
      clearTimeout(item.closeTimer);
      if (!nav.classList.contains('is-open')) {
        setOpen(item, true);
        item.openedByHover = true;
      }
    });
    nav.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      item.closeTimer = setTimeout(() => {
        const focused = document.activeElement;
        if (nav.contains(focused) && focused.matches(':focus-visible')) return;
        setOpen(item, false, panel.contains(focused));
      }, 180);
    });
    nav.addEventListener('focusin', () => clearTimeout(item.closeTimer));
    nav.addEventListener('focusout', event => {
      if (!nav.contains(event.relatedTarget)) setOpen(item, false);
    });
    panel.addEventListener('click', event => {
      if (event.target.closest('a') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        setOpen(item, false, panel.contains(document.activeElement));
      }
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const item = menus.find(item => item.nav.classList.contains('is-open'));
    if (!item) return;
    event.preventDefault();
    setOpen(item, false, item.nav.contains(document.activeElement));
  });
  document.addEventListener('pointerdown', event => {
    menus.forEach(item => { if (!item.nav.contains(event.target)) setOpen(item, false); });
  });
  const closeAll = () => menus.forEach(item => setOpen(item, false));
  desktop.addEventListener('change', closeAll);
  window.addEventListener('hashchange', closeAll);
  window.addEventListener('pagehide', closeAll);
}
