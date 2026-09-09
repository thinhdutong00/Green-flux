document.documentElement.classList.add('js');

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#mobile-menu');
const desktop = window.matchMedia('(min-width: 981px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let closingMenu = false;
let finishMenuClose = null;
let closeTimer;

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
  if (currentScrollY <= header.offsetHeight + 32 || menu.open || keyboardFocusInHeader) {
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

document.getElementById('year').textContent = new Date().getFullYear();
