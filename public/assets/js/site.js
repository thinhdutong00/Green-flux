(() => {
  const ready = (callback) => document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", callback) : callback();

  ready(() => {
    document.querySelectorAll(".menu-button").forEach((button, index) => {
      const header = button.closest(".header") || document;
      const menu = header.querySelector(".nav-menu");
      if (!menu) return;
      menu.id ||= `site-menu-${index}`;
      button.setAttribute("aria-controls", menu.id);
      const closeMenu = () => {
        menu.classList.remove("is-open");
        button.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      };

      closeMenu();
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("type", "button");

      const toggleMenu = () => {
        const open = !menu.classList.contains("is-open");
        menu.classList.toggle("is-open", open);
        button.classList.toggle("is-open", open);
        button.setAttribute("aria-expanded", String(open));
      };
      button.addEventListener("click", toggleMenu);
      if (button.tagName !== "BUTTON") {
        button.setAttribute("role", "button");
        button.setAttribute("tabindex", "0");
        button.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggleMenu();
        });
      }

      menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menu.classList.contains("is-open")) {
          closeMenu();
          button.focus();
        }
      });
    });

    document.querySelectorAll(".single-faq").forEach((item, index) => {
      const trigger = item.querySelector(".faq-question, .faq-title, .heading-4") || item;
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      const answer = item.querySelector(".faq-answer");
      if (!answer) return;
      answer.id ||= `faq-answer-${index}`;
      trigger.setAttribute("aria-controls", answer.id);
      trigger.setAttribute("aria-expanded", String(item.classList.contains("is-open")));
      const toggle = () => {
        const open = item.classList.toggle('is-open');
        trigger.setAttribute("aria-expanded", String(open));
      };
      trigger.addEventListener("click", toggle);
      trigger.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle();
      });
    });

  });
})();
