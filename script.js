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


(function addLegalFooterLinks(){
  const footer = document.querySelector(".footer");
  if (!footer || footer.querySelector("[data-legal-links]")) return;
  const container = footer.querySelector(".container:last-of-type") || footer.querySelector(".container") || footer;
  const row = document.createElement("div");
  row.setAttribute("data-legal-links", "");
  row.style.cssText = "display:flex;gap:16px;flex-wrap:wrap;justify-content:center;padding:14px 0 2px;font-size:13px;";
  row.innerHTML = '<a href="privacy.html" style="color:inherit">Privacy Policy</a><a href="terms.html" style="color:inherit">Terms of Service</a><a href="community-standards.html" style="color:inherit">Community Standards</a>';
  container.appendChild(row);
})();
