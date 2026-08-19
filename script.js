const menu = document.querySelector('.menu-btn');
const links = document.querySelector('.nav-links');
if (menu && links) {
  menu.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('form[data-demo-form]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = form.querySelector('[data-form-status]');
    if (status) status.textContent = 'Success! Your team need has been saved. You can update or edit this information anytime from your Coach Dashboard.';
    form.reset();
  });
});

// Keep Pickup Players visible as a primary site feature.
document.querySelectorAll('.nav-links').forEach((nav) => {
  if (nav.querySelector('a[href="pickup-players.html"]')) return;

  const pickupLink = document.createElement('a');
  pickupLink.href = 'pickup-players.html';
  pickupLink.textContent = 'Pickup Players';

  const teamsLink = nav.querySelector('a[href="teams.html"]');
  if (teamsLink) {
    teamsLink.insertAdjacentElement('afterend', pickupLink);
    return;
  }

  const membershipLink = nav.querySelector('a[href="membership.html"]');
  if (membershipLink) {
    membershipLink.insertAdjacentElement('beforebegin', pickupLink);
    return;
  }

  nav.appendChild(pickupLink);
});

// Vercel Web Analytics for SoftballReady.net™
(() => {
  if (window.__softballReadyVercelAnalyticsLoaded) return;
  window.__softballReadyVercelAnalyticsLoaded = true;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  if (!document.querySelector('script[data-vercel-analytics]')) {
    const analyticsScript = document.createElement('script');
    analyticsScript.defer = true;
    analyticsScript.src = '/_vercel/insights/script.js';
    analyticsScript.setAttribute('data-vercel-analytics', 'true');
    document.head.appendChild(analyticsScript);
  }
})();

// Keep the mobile menu trigger consistent across SoftballReady.net™.
document.querySelectorAll(".menu-btn").forEach((button) => {
  button.textContent = "☰";
  button.setAttribute("aria-label", "Open navigation");
});
