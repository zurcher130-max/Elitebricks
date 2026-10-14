'use strict';
const products = [
  {id:'city', name:'Deine kleine Großstadt', category:'architecture', label:'Architektur', pieces:864, price:69.90, color:'cream', background:'#f4f4f4', tag:'Neue Perspektiven'},
  {id:'road', name:'Bereit für neue Wege', category:'vehicles', label:'Fahrzeuge', pieces:512, price:49.90, color:'blue', background:'#f4f4f4', tag:'Für Entdecker'},
  {id:'ideas', name:'Eine Box voller Möglichkeiten', category:'creative', label:'Kreativ-Set', pieces:1000, price:39.90, color:'orange', background:'#f4f4f4', tag:'Freie Fantasie'}
];
const formatPrice = price => `CHF ${price.toFixed(2)}`;
let cart = {};
try { const saved = JSON.parse(localStorage.getItem('elitebricks-cart') || '{}'); if (saved && typeof saved === 'object') for (const product of products) if (Number.isSafeInteger(saved[product.id]) && saved[product.id] > 0 && saved[product.id] <= 99) cart[product.id] = saved[product.id]; } catch {}
function renderProducts(filter = 'all') {
  document.querySelector('#products').innerHTML = products.filter(p => filter === 'all' || p.category === filter).map(p => `<article class="product-card"><div class="product-image" style="background:${p.background}"><span class="product-tag">${p.tag}</span><img src="assets/brick-${p.color}.svg" alt="Symbolbild für ${p.name}" loading="lazy"></div><div class="product-meta">${p.label.toUpperCase()} · ${p.pieces} TEILE · BEISPIEL</div><h3>${p.name}</h3><div class="product-bottom"><span>${formatPrice(p.price)}</span><button class="add-button" data-add="${p.id}" aria-label="${p.name} zum Warenkorb hinzufügen">+</button></div></article>`).join('');
}
function renderCart() {
  let count = 0, total = 0;
  const rows = products.filter(p => cart[p.id]).map(p => { count += cart[p.id]; total += cart[p.id] * p.price; return `<div class="cart-row"><div>${p.name}<small>${cart[p.id]} × ${formatPrice(p.price)}</small></div><button data-remove="${p.id}" aria-label="Ein Exemplar von ${p.name} entfernen">− Entfernen</button></div>`; });
  document.querySelector('#cart-count').textContent = count;
  document.querySelector('#cart-items').innerHTML = rows.join('') || '<p>Hier ist noch Platz für deine nächste Idee.</p>';
  document.querySelector('#cart-total').textContent = formatPrice(total);
  document.querySelector('#checkout').disabled = count === 0;
  document.querySelector('#checkout-note').textContent = '';
  try {localStorage.setItem('elitebricks-cart', JSON.stringify(cart));} catch {}
}
let toastTimer;
document.querySelector('#products').addEventListener('click', e => { const button = e.target.closest('[data-add]'); if (!button) return; const id = button.dataset.add; cart[id] = Math.min((cart[id] || 0) + 1, 99); renderCart(); const toast = document.querySelector('#toast'); toast.textContent = 'Deine Idee liegt im Demo-Warenkorb.'; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-filter]').forEach(b => {b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button));}); renderProducts(button.dataset.filter); }));
const dialog = document.querySelector('#cart-dialog');
document.querySelector('#open-cart').addEventListener('click', () => dialog.showModal());
document.querySelector('#close-cart').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => {if (e.target === dialog) {const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();}});
document.querySelector('#cart-items').addEventListener('click', e => {const button = e.target.closest('[data-remove]'); if (!button) return; const id = button.dataset.remove; if (--cart[id] <= 0) delete cart[id]; renderCart();});
document.querySelector('#checkout').addEventListener('click', () => {document.querySelector('#checkout-note').textContent = 'Dies ist eine Shop-Demo. Für echte Bestellungen müssen Shop-System, Zahlungsanbieter und rechtliche Angaben eingerichtet werden.';});
document.querySelector('#year').textContent = new Date().getFullYear();
renderProducts(); renderCart();
