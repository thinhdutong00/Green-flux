// Landing ristrutturazione: intestazione e barra contatti. Nessun evento di misurazione delle pompe di calore.
const hero = document.querySelector('.hp-hero');
const sticky = document.querySelector('[data-hp-sticky]');

// Il telefono risponde dal lunedì al venerdì, 8:00–18:00 (Europe/Rome): fuori orario la barra propone WhatsApp.
if (sticky) {
  const updateHours = () => {
    try {
      const parts = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', hour: 'numeric', hour12: false }).formatToParts(new Date());
      const weekday = parts.find(part => part.type === 'weekday')?.value || '';
      const hour = Number(parts.find(part => part.type === 'hour')?.value);
      const open = !/^(sab|dom)/i.test(weekday) && hour >= 8 && hour < 18;
      sticky.toggleAttribute('data-closed', !open);
      const call = sticky.querySelector('[data-hp-sticky-call] span:last-child');
      if (call) call.textContent = open ? 'Chiama' : 'Chiama lun–ven';
    } catch { /* Senza Intl la barra conserva le etichette predefinite. */ }
  };
  updateHours();
  setInterval(updateHours, 60000);
}

if (hero) {
  const updateHeader = () => document.body.classList.toggle('is-scrolled', window.scrollY > hero.offsetHeight - 110);
  window.addEventListener('scroll', updateHeader, { passive: true });
  window.addEventListener('resize', updateHeader);
  updateHeader();
}
