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
