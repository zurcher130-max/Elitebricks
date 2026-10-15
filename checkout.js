'use strict';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = cents => `CHF ${(cents / 100).toFixed(2)}`;
const shippingMethods = {
  standard: {label: 'PostPac Standard', cost: 900},
  priority: {label: 'PostPac Priority', cost: 1100},
  warehouse: {label: 'Lagerabholung', cost: 0}
};
const form = document.querySelector('#address-form');
let cart = {};
let reviewedText = '';
let reviewedOrder = null;
let paymentPending = false;
const paymentConfig = window.ELITEBRICKS_PAYMENTS;
const paymentsReady = paymentConfig?.enabled === true && /^https:\/\//.test(paymentConfig.apiBase || '');
function readCart() {
  cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem('elitebricks-cart') || '{}');
    for (const p of products) if (Number.isSafeInteger(saved?.[p.id]) && saved[p.id] > 0) {
      const quantity = Math.min(saved[p.id], p.quantity ?? 99, 99);
      if (quantity > 0) cart[p.id] = quantity;
    }
  } catch {}
}
function selectedShipping() { return shippingMethods[form.elements.shipping.value] || shippingMethods.standard; }
function totals() {
  const subtotal = products.reduce((sum, p) => sum + Math.round(p.price * 100) * (cart[p.id] || 0), 0);
  const count = Object.values(cart).reduce((a,b) => a+b, 0);
  const shipping = count ? selectedShipping().cost : 0;
  return {subtotal, count, shipping, total: subtotal + shipping};
}
function clearReview() {
  document.querySelector('#order-review').hidden = true;
  reviewedText = '';
  reviewedOrder = null;
  document.querySelector('#stripe-checkout').hidden = true;
  document.querySelector('#stripe-status').textContent = '';
}
function renderSummary() {
  const t = totals();
  document.querySelector('#cart-count').textContent = t.count;
  document.querySelector('#summary-count').textContent = t.count;
  document.querySelector('#summary-subtotal').textContent = money(t.subtotal);
  document.querySelector('#summary-shipping-label').textContent = form.elements.shipping.value === 'warehouse' ? 'Lagerabholung' : 'Versand';
  document.querySelector('#summary-shipping').textContent = t.shipping ? money(t.shipping) : 'Kostenlos';
  document.querySelector('#summary-total').textContent = money(t.total);
  document.querySelector('#empty-cart').hidden = t.count !== 0;
  document.querySelector('#filled-cart').hidden = t.count === 0;
}
function renderItems() {
  document.querySelector('#order-items').innerHTML = products.filter(p => cart[p.id]).map(p => `<article class="order-item">${p.image ? `<img src="assets/${p.image}" alt="${escapeHTML(p.name)}" width="90" height="90">` : `<div class="order-image-placeholder">${escapeHTML(p.itemNumber)}</div>`}<div class="order-item-info"><h3><a href="produkt.html?id=${encodeURIComponent(p.id)}">${escapeHTML(p.name)}</a></h3><p>${escapeHTML(p.meta)} · ${money(Math.round(p.price * 100))} / Stück</p><div class="quantity-control"><button type="button" data-delta="-1" data-id="${p.id}" aria-label="Menge von ${escapeHTML(p.name)} verringern" ${cart[p.id] === 1 ? 'disabled' : ''}>−</button><span aria-label="Menge">${cart[p.id]}</span><button type="button" data-delta="1" data-id="${p.id}" aria-label="Menge von ${escapeHTML(p.name)} erhöhen" ${cart[p.id] >= Math.min(p.quantity ?? 99,99) ? 'disabled' : ''}>+</button><button type="button" class="remove-item" data-remove="${p.id}">Entfernen</button></div></div><strong class="item-total">${money(Math.round(p.price * 100) * cart[p.id])}</strong></article>`).join('');
  renderSummary();
}
function saveCart() { try {localStorage.setItem('elitebricks-cart',JSON.stringify(cart));} catch {} }
function shippingChanged() {
  const pickup = form.elements.shipping.value === 'warehouse';
  document.querySelector('#delivery-address').hidden = pickup;
  document.querySelector('#pickup-note').hidden = !pickup;
  for (const name of ['street','postalCode','city']) form.elements[name].required = !pickup;
  // Hidden delivery fields should not block pickup validation.
  for (const field of document.querySelectorAll('#delivery-address input, #delivery-address select')) field.disabled = pickup;
  clearReview();renderSummary();
}
document.querySelector('#order-items').addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button || button.disabled) return;
  const id = button.dataset.remove || button.dataset.id;
  const product = products.find(p => p.id === id); if (!product || !cart[id]) return;
  if (button.dataset.remove) delete cart[id];
  else cart[id] = Math.max(1,Math.min(cart[id]+Number(button.dataset.delta),product.quantity ?? 99,99));
  saveCart();clearReview();renderItems();
  document.querySelector('#cart-status').textContent = 'Warenkorb aktualisiert.';
});
form.addEventListener('input', clearReview);
form.addEventListener('change', event => {if (event.target.name === 'shipping') shippingChanged();});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!totals().count || !form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  for (const name of ['firstName','lastName','email',...(values.shipping === 'warehouse' ? [] : ['street','postalCode','city'])]) {
    if (!String(values[name] || '').trim()) {form.elements[name].setCustomValidity('Bitte dieses Feld ausfüllen.');form.elements[name].reportValidity();form.elements[name].addEventListener('input',()=>form.elements[name].setCustomValidity(''),{once:true});return;}
  }
  const t = totals();
  const contact = `${values.firstName.trim()} ${values.lastName.trim()}\n${values.email.trim()}${values.phone ? '\n'+values.phone : ''}`;
  const address = values.shipping === 'warehouse' ? 'Lagerabholung nach Terminvereinbarung. Adresse und Termin folgen vor Bestellfreigabe.' : [values.company,values.street,`${values.postalCode} ${values.city}`,'Schweiz'].filter(Boolean).join('\n');
  const lines = products.filter(p=>cart[p.id]).map(p=>`${cart[p.id]} × ${p.name}: ${money(Math.round(p.price*100)*cart[p.id])}`);
  reviewedText = ['ELITE BRICKS – ZUSAMMENFASSUNG (NICHT ABGESENDET)','',...lines,'',`Zwischensumme: ${money(t.subtotal)}`,`${selectedShipping().label}: ${money(t.shipping)}`,`Gesamt: ${money(t.total)}`,'','Kontakt:',contact,'',values.shipping === 'warehouse' ? 'Abholung:' : 'Lieferadresse:',address,values.notes ? '\nAnmerkungen:\n'+values.notes : '','\nEs wurde keine Bestellung übermittelt und keine Zahlung ausgelöst.'].join('\n');
  document.querySelector('#review-content').innerHTML = `<h3>Kontakt</h3><p>${escapeHTML(contact).replace(/\n/g,'<br>')}</p><h3>${values.shipping === 'warehouse' ? 'Abholung' : 'Lieferadresse'}</h3><p>${escapeHTML(address).replace(/\n/g,'<br>')}</p><h3>Deine Auswahl</h3><ul>${lines.map(line=>`<li>${escapeHTML(line)}</li>`).join('')}</ul><p>${escapeHTML(selectedShipping().label)}: ${money(t.shipping)}</p><p><strong>Gesamtbetrag: ${money(t.total)}</strong></p>${values.notes ? `<h3>Anmerkungen</h3><p>${escapeHTML(values.notes)}</p>` : ''}`;
  reviewedOrder = {items:products.filter(p=>cart[p.id]).map(p=>({id:p.id,quantity:cart[p.id]})),shipping:values.shipping,customer:{...values}};
  document.querySelector('#stripe-checkout').hidden = !paymentsReady;
  const review = document.querySelector('#order-review');review.hidden=false;review.focus();review.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
document.querySelector('#download-order').addEventListener('click',()=>{
  if (!reviewedText) return;
  const url=URL.createObjectURL(new Blob([reviewedText],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='elitebricks-zusammenfassung.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('storage',event=>{if(event.key==='elitebricks-cart'){readCart();clearReview();renderItems();}});
document.querySelector('#year').textContent=new Date().getFullYear();
readCart();saveCart();renderItems();shippingChanged();

// Stripe Checkout is activated only after configuring the deployed test backend.
document.querySelector('#stripe-checkout').addEventListener('click', async () => {
  if (!paymentsReady || !reviewedOrder || paymentPending) return;
  paymentPending = true;
  form.inert=true;document.querySelector('#order-items').inert=true;
  const button=document.querySelector('#stripe-checkout');button.disabled=true;
  const status=document.querySelector('#stripe-status');status.textContent='Deine Testzahlung wird vorbereitet …';
  try {
    const body=JSON.stringify(reviewedOrder);
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
    const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
    let saved;try {saved=JSON.parse(sessionStorage.getItem('elitebricks-stripe-request') || 'null');} catch {}
    const key=saved?.hash===hash?saved.key:crypto.randomUUID();
    try {sessionStorage.setItem('elitebricks-stripe-request',JSON.stringify({key,hash}));} catch {}
    const result=await fetch(paymentConfig.apiBase.replace(/\/$/,'')+'/checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body});
    const data=await result.json();
    if(!result.ok) {
      if(result.status===409 || data.retryNewOrder===true)try {sessionStorage.removeItem('elitebricks-stripe-request');} catch {}
      throw Error(data.error || 'Die Zahlungsseite ist gerade nicht erreichbar.');
    }
    if(typeof data.url!=='string'||new URL(data.url).origin!=='https://checkout.stripe.com')throw Error('Die Zahlungsseite konnte nicht sicher geöffnet werden.');
    window.location.assign(data.url);
  } catch(error) {status.textContent=error.message || 'Bitte versuche es später erneut.';}
  finally {paymentPending=false;button.disabled=false;form.inert=false;document.querySelector('#order-items').inert=false;}
});
if(new URLSearchParams(location.search).get('payment')==='cancelled') document.querySelector('#cart-status').textContent='Die Zahlung wurde abgebrochen. Dein Warenkorb bleibt erhalten. Bitte beachte: Eine Zahlungsreservierung kann bis zum Ablauf der Stripe-Sitzung bestehen bleiben.';
