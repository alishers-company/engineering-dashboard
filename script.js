document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-testid="mobile-nav-toggle"]');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      navLinks.classList.toggle('open');
    });
  }

  /* GLM will implement all interactivity for: Primary CTA flow, Metric details interactions, Historical trends interactions, Mobile navigation */
});