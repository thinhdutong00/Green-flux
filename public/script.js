document.documentElement.classList.add('js');

const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#site-navigation');

function closeMenu(returnFocus = false) {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Apri il menu');
  navigation.classList.remove('is-open');
  if (returnFocus) toggle.focus();
}

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
  navigation.classList.toggle('is-open', open);
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
});

document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});

window.matchMedia('(min-width: 981px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

window.addEventListener('hashchange', () => closeMenu());

document.getElementById('year').textContent = new Date().getFullYear();
