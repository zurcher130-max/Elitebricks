'use strict';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const formatPrice = price => `CHF ${price.toFixed(2)}`;
let cart = {};
try { const saved = JSON.parse(localStorage.getItem('elitebricks-cart') || '{}'); if (saved && typeof saved === 'object') for (const product of products) if (Number.isSafeInteger(saved[product.id]) && saved[product.id] > 0 && saved[product.id] <= 99) cart[product.id] = Math.min(saved[product.id], product.quantity ?? 99); } catch {}
const shop = document.body.dataset.shop || 'home';
const form = document.querySelector('#catalog-filters');
let homeFilter = 'all';
function renderProducts() {
  let visible = products.filter(p => shop === 'home' ? p.shop === 'sets' && (homeFilter === 'all' || p.theme === homeFilter) : p.shop === shop);
  if (shop === 'home') visible = visible.slice(0, 3);
  if (form) {
    const query = form.elements.search.value.trim().toLocaleLowerCase('de');
    const category = form.elements.category.value;
    const detail = form.elements.detail.value;
    const price = form.elements.price.value;
    visible = visible.filter(p => (!query || `${escapeHTML(p.name)} ${p.id} ${p.itemNumber || ""} ${escapeHTML(p.label)} ${escapeHTML(p.meta)} ${p.description || ""}`.toLocaleLowerCase('de').includes(query)) && (category === 'all' || (shop === 'einzelteile' ? p.category : p.theme) === category) && (detail === 'all' || p.detail === detail) && (price === 'all' || (price === 'under10' && p.price <= 10) || (price === '10to50' && p.price > 10 && p.price <= 50) || (price === 'over50' && p.price > 50)));
    const sort = document.querySelector('#sort').value;
    if (sort === 'price-asc') visible.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') visible.sort((a,b) => b.price - a.price);
    if (sort === 'name') visible.sort((a,b) => a.name.localeCompare(b.name, 'de'));
    document.querySelector('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'Produkt' : 'Produkte'}`;
    document.querySelector('#empty-results').hidden = visible.length !== 0;
    const status = document.querySelector('#inventory-status');
    if (status) status.hidden = products.some(p => p.shop === shop);
  }
  document.querySelector('#products').innerHTML = visible.map(p => `<article class="product-card" data-product-id="${p.id}" data-price="${p.price}"><div class="product-image${p.example === false ? " product-photo" : ""}">${p.tag ? `<span class="product-tag">${escapeHTML(p.tag)}</span>` : ""}${p.image ? `<img class="${p.example === false ? "real-product-image" : ""}" src="assets/${p.image}" alt="${p.example === false ? "Produktbild" : "Symbolbild"} für ${escapeHTML(p.name)}" loading="lazy">` : `<div class="image-pending"><span>${p.itemNumber ? p.itemNumber.split("-")[0] : ""}</span><p>Produktbild folgt</p></div>`}</div>${p.imageKind === "official-catalog" ? `<p class="image-credit">LEGO-Katalogbild</p>` : ""}<div class="product-meta">${escapeHTML(p.label)} · ${escapeHTML(p.meta)}${p.example === false ? "" : " · Beispiel"}</div><h3>${escapeHTML(p.name)}</h3>${p.description ? `<p class="product-description">${escapeHTML(p.description)}</p>` : ""}${p.quantity != null ? `<p class="product-stock">${p.condition === "new" ? "Neu" : "Gebraucht"}${p.subcondition === "S" ? " · Versiegelt" : p.subcondition === "I" ? " · Unvollständig" : ""} · ${p.quantity} Stück im Inventar</p>` : ""}<div class="product-bottom"><span>${formatPrice(p.price)}</span><button class="add-button" data-add="${p.id}" aria-label="${escapeHTML(p.name)} zum Warenkorb hinzufügen" ${cart[p.id] >= (p.quantity ?? 99) ? "disabled" : ""}>+</button></div></article>`).join('');
}
if (form) {
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('input', renderProducts);
  form.addEventListener('reset', () => {document.querySelector('#sort').value = 'featured'; setTimeout(renderProducts, 0);});
  document.querySelector('#sort').addEventListener('change', renderProducts);
  document.querySelector('#reset-empty').addEventListener('click', () => form.reset());
}
function renderCart() {
  let count = 0, total = 0;
  const rows = products.filter(p => cart[p.id]).map(p => { count += cart[p.id]; total += cart[p.id] * p.price; return `<div class="cart-row"><div>${escapeHTML(p.name)}<small>${cart[p.id]} × ${formatPrice(p.price)}</small></div><button data-remove="${p.id}" aria-label="Ein Exemplar von ${escapeHTML(p.name)} entfernen">− Entfernen</button></div>`; });
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-items').innerHTML = rows.join('') || '<p>Hier ist noch Platz für deine nächste Idee.</p>';
  document.querySelector('#cart-total').textContent = formatPrice(total);
  document.querySelector('#checkout').disabled = count === 0;
  document.querySelector('#checkout-note').textContent = '';
  try {localStorage.setItem('elitebricks-cart', JSON.stringify(cart));} catch {}
}
let toastTimer;
document.querySelector('#products').addEventListener('click', e => { const button = e.target.closest('[data-add]'); if (!button) return; const id = button.dataset.add; const product = products.find(p => p.id === id); if (!product || (cart[id] || 0) >= (product.quantity ?? 99)) return; cart[id] = (cart[id] || 0) + 1; renderCart(); renderProducts(); const toast = document.querySelector('#toast'); toast.textContent = 'Deine Idee liegt im Demo-Warenkorb.'; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach(b => {b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button));}); homeFilter = button.dataset.filter; renderProducts(); }));
const dialog = document.querySelector('#cart-dialog');
document.querySelector('#open-cart').addEventListener('click', () => dialog.showModal());
document.querySelector('#close-cart').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {if (e.target === dialog) {const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();}});
document.querySelector('#cart-items').addEventListener('click', e => {const button = e.target.closest('[data-remove]'); if (!button) return; const id = button.dataset.remove; if (--cart[id] <= 0) delete cart[id]; renderCart(); renderProducts();});
document.querySelector('#checkout').addEventListener('click', () => {document.querySelector('#checkout-note').textContent = 'Dies ist eine Shop-Demo. Für echte Bestellungen müssen Shop-System, Zahlungsanbieter und rechtliche Angaben eingerichtet werden.';});
document.querySelector('#year').textContent = new Date().getFullYear();
renderProducts(); renderCart();

// Keep an already open tab in sync with cart changes made on another page.
window.addEventListener('storage', e => {if (e.key !== 'elitebricks-cart') return; try {const saved = JSON.parse(e.newValue || '{}'); cart = {}; for (const p of products) if (Number.isSafeInteger(saved?.[p.id]) && saved[p.id] > 0 && saved[p.id] <= 99) cart[p.id] = Math.min(saved[p.id], p.quantity ?? 99); renderCart(); renderProducts();} catch {}});
