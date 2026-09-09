document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-menu');
const desktop = window.matchMedia('(min-width: 981px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let closingMenu = false;
let finishMenuClose = null;
let closeTimer;

const desktopMenus = [...document.querySelectorAll('[data-desktop-menu]')].map(nav => ({
  nav,
  trigger: nav.querySelector('.services-nav-trigger'),
  panel: nav.querySelector('.services-menu'),
  closeTimer: null,
  openedByHover: false,
}));

function setDesktopMenuOpen(item, open, restoreFocus = false) {
  clearTimeout(item.closeTimer);
  item.openedByHover = false;
  const isOpen = open && desktop.matches;
  if (isOpen) {
    desktopMenus.forEach(other => {
      if (other !== item && other.nav.classList.contains('is-open')) {
        setDesktopMenuOpen(other, false, other.panel.contains(document.activeElement));
      }
    });
  }
  item.nav.classList.toggle('is-open', isOpen);
  item.trigger.setAttribute('aria-expanded', String(isOpen));
  if (!isOpen && restoreFocus) item.trigger.focus({ preventScroll: true });
  item.panel.inert = !isOpen;
  if (isOpen) header.classList.remove('is-hidden');
}

const closeDesktopMenus = () => desktopMenus.forEach(item => setDesktopMenuOpen(item, false));

desktopMenus.forEach(item => {
  const { nav, trigger, panel } = item;
  trigger.addEventListener('click', () => setDesktopMenuOpen(item, item.openedByHover || !nav.classList.contains('is-open')));
  trigger.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    setDesktopMenuOpen(item, true);
    panel.querySelector('a').focus({ preventScroll: true });
  });
  nav.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(item.closeTimer);
    if (!nav.classList.contains('is-open')) {
      setDesktopMenuOpen(item, true);
      item.openedByHover = true;
    }
  });
  nav.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'mouse') return;
    item.closeTimer = setTimeout(() => {
      const focused = document.activeElement;
      if (nav.contains(focused) && focused.matches(':focus-visible')) return;
      setDesktopMenuOpen(item, false, panel.contains(focused));
    }, 180);
  });
  nav.addEventListener('focusin', () => clearTimeout(item.closeTimer));
  nav.addEventListener('focusout', event => {
    if (!nav.contains(event.relatedTarget)) setDesktopMenuOpen(item, false);
  });
  panel.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destination = link.getAttribute('href');
    const target = document.getElementById(destination.slice(1));
    if (!target) return;
    event.preventDefault();
    setDesktopMenuOpen(item, false);
    if (window.location.hash !== destination) history.pushState(null, '', destination);
    target.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    const temporaryTabIndex = !target.hasAttribute('tabindex') && !target.matches('a, button');
    if (temporaryTabIndex) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (temporaryTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const item = desktopMenus.find(item => item.nav.classList.contains('is-open'));
  if (!item) return;
  event.preventDefault();
  setDesktopMenuOpen(item, false, item.nav.contains(document.activeElement));
});
document.addEventListener('pointerdown', event => {
  desktopMenus.forEach(item => {
    if (!item.nav.contains(event.target)) setDesktopMenuOpen(item, false);
  });
});
desktop.addEventListener('change', closeDesktopMenus);
window.addEventListener('hashchange', closeDesktopMenus);

function openMenu() {
  if (desktop.matches || menu.open) return;
  header.classList.remove('is-hidden');
  document.documentElement.classList.add('menu-open');
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Chiudi il menu');
  menu.showModal();
  // Render the starting position before sliding the panel into view.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (menu.open && !closingMenu) menu.classList.add('is-open');
  }));
}

function closeMenu({ immediate = false, destination = null } = {}) {
  if (!menu.open) return;
  if (closingMenu) {
    if (immediate) finishMenuClose();
    return;
  }
  closingMenu = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Apri il menu');
  menu.classList.remove('is-open');

  finishMenuClose = () => {
    clearTimeout(closeTimer);
    finishMenuClose = null;
    menu.close();
    document.documentElement.classList.remove('menu-open');
    menu.querySelectorAll('details[open]').forEach(section => { section.open = false; });
    menu.querySelector('.mobile-menu-scroll').scrollTop = 0;
    closingMenu = false;
    lastScrollY = getScrollY();
    scrollTravel = 0;
    header.classList.remove('is-hidden');

    if (destination) {
      const target = document.getElementById(destination.slice(1));
      if (target) {
        if (window.location.hash !== destination) window.location.hash = destination;
        target.scrollIntoView({ block: 'start' });
        // Move keyboard focus along with the in-page navigation.
        const temporaryTabIndex = !target.hasAttribute('tabindex') && !target.matches('a, button');
        if (temporaryTabIndex) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        if (temporaryTabIndex) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
      }
    } else {
      (desktop.matches ? header.querySelector('.brand') : toggle).focus({ preventScroll: true });
    }
  };

  if (immediate || reducedMotion.matches) finishMenuClose();
  else closeTimer = setTimeout(() => finishMenuClose?.(), 400);
}

toggle.addEventListener('click', openMenu);
menu.querySelector('.menu-close').addEventListener('click', () => closeMenu());
menu.addEventListener('cancel', event => {
  event.preventDefault();
  closeMenu();
});
menu.addEventListener('transitionend', event => {
  if (event.target === menu && event.propertyName === 'transform') finishMenuClose?.();
});
menu.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link) {
    const destination = link.getAttribute('href');
    if (destination.startsWith('#')) {
      event.preventDefault();
      closeMenu({ destination });
    } else closeMenu();
    return;
  }
  // Clicks in the panel padding must not count as backdrop clicks.
  if (event.target === menu) {
    const bounds = menu.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
  }
});
const menuSections = [...menu.querySelectorAll('details')];
menuSections.forEach(section => {
  section.addEventListener('toggle', () => {
    if (section.open) menuSections.forEach(other => {
      if (other !== section) other.open = false;
    });
  });
});
desktop.addEventListener('change', event => {
  if (event.matches) closeMenu({ immediate: true });
});
window.addEventListener('hashchange', () => closeMenu());

// Accumulate travel in each direction so small movements do not flicker.
function getScrollY() {
  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return Math.min(maxScrollY, Math.max(0, window.scrollY));
}
let lastScrollY = getScrollY();
let scrollTravel = 0;
let scrollScheduled = false;

function syncHeader() {
  scrollScheduled = false;
  const currentScrollY = getScrollY();
  const delta = currentScrollY - lastScrollY;
  lastScrollY = currentScrollY;
  header.classList.toggle('is-scrolled', currentScrollY > 12);

  const keyboardFocusInHeader = header.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
  if (currentScrollY <= header.offsetHeight + 32 || menu.open || desktopMenus.some(item => item.nav.classList.contains('is-open')) || keyboardFocusInHeader) {
    header.classList.remove('is-hidden');
    scrollTravel = 0;
    return;
  }
  if (delta === 0) return;
  scrollTravel = Math.sign(delta) === Math.sign(scrollTravel) ? scrollTravel + delta : delta;
  if (Math.abs(scrollTravel) >= 8) header.classList.toggle('is-hidden', scrollTravel > 0);
}

window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(syncHeader);
}, { passive: true });
window.addEventListener('resize', () => {
  header.classList.remove('is-hidden');
  lastScrollY = getScrollY();
  scrollTravel = 0;
  syncHeader();
});
header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
syncHeader();

function setupSectionReveals() {
  const elements = document.querySelectorAll('main .reveal');
  if (reducedMotion.matches || typeof window.IntersectionObserver !== 'function') return;

  const show = element => {
    element.classList.add('is-visible');
    observer.unobserve(element);
  };
  // Match the one-time section entrances in the Mago System project.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) show(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px' });

  document.documentElement.classList.add('reveal-ready');
  elements.forEach(element => observer.observe(element));

  // Keyboard navigation must never land on an invisible link or anchor.
  document.querySelector('main').addEventListener('focusin', event => {
    const element = event.target.closest('.reveal');
    if (element) show(element);
  });
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    elements.forEach(show);
    observer.disconnect();
    document.documentElement.classList.remove('reveal-ready');
  });
}

setupSectionReveals();

document.getElementById('year').textContent = new Date().getFullYear();

function setupWhatsAppButton() {
  const widget = document.querySelector('[data-whatsapp-floating-widget]');
  if (!widget) return;
  const message = widget.querySelector('[data-whatsapp-message]');
  const badge = widget.querySelector('[data-whatsapp-badge]');

  const showMessage = (text, count) => {
    message.textContent = text;
    message.removeAttribute('aria-hidden');
    badge.textContent = String(count);
    widget.classList.add('has-notification', 'is-message-visible');
  };

  // Keep the appearance and message timing of the supplied reference.
  window.setTimeout(() => {
    widget.classList.add('is-visible');
    widget.removeAttribute('aria-hidden');
  }, 5000);
  window.setTimeout(() => showMessage('Ciao, come possiamo aiutarti?', 1), 8000);
  window.setTimeout(() => showMessage("Hai un dubbio o un'urgenza? Scrivicelo su whatsapp!", 2), 18000);
  window.setTimeout(() => {
    widget.classList.remove('is-message-visible');
    message.setAttribute('aria-hidden', 'true');
  }, 28000);
}

setupWhatsAppButton();

// Load the questionnaire only on request; normal links remain usable without JS
// and with Ctrl/Cmd-click. The existing URL also supports direct entry.
const quoteDialog = document.getElementById('quote-dialog');
const quoteLoading = quoteDialog.querySelector('.quote-dialog-loading');
let quoteFrame;
let quoteTrigger;
function closeQuote() { if (quoteDialog.open) quoteDialog.close(); }
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || quoteDialog.contains(link)) return;
  const url = new URL(link.href);
  if (url.origin !== window.location.origin || url.pathname !== '/preventivo/') return;
  event.preventDefault();
  event.stopPropagation();
  quoteTrigger = menu.contains(link) ? toggle : link;
  closeMenu({ immediate: true });
  quoteLoading.hidden = false;
  quoteFrame = document.createElement('iframe');
  quoteFrame.className = 'quote-dialog-frame';
  quoteFrame.title = 'Preventivo Green Flux — modulo in sei passaggi';
  quoteFrame.hidden = true;
  url.searchParams.set('embed', '1');
  quoteFrame.src = url.href;
  quoteFrame.addEventListener('load', () => {
    if (!quoteDialog.open || !quoteFrame?.contentDocument?.getElementById('quote-form')) return;
    quoteLoading.hidden = true;
    quoteFrame.hidden = false;
    quoteFrame.focus({ preventScroll: true });
  });
  quoteDialog.append(quoteFrame);
  document.documentElement.classList.add('quote-open');
  quoteDialog.showModal();
}, true);
quoteDialog.addEventListener('close', () => {
  document.documentElement.classList.remove('quote-open');
  quoteFrame?.remove();
  quoteFrame = null;
  quoteTrigger?.focus({ preventScroll: true });
});
document.getElementById('quote-dialog-close').addEventListener('click', closeQuote);
window.addEventListener('message', event => {
  if (event.origin === window.location.origin && event.source === quoteFrame?.contentWindow && event.data?.type === 'greenflux:close-quote') closeQuote();
});
