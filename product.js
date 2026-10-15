'use strict';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = value => `CHF ${value.toFixed(2)}`;
const categories = {sets:'Sets',minifiguren:'Minifiguren',einzelteile:'Einzelteile'};
const id = new URLSearchParams(location.search).get('id');
const product = products.find(p=>p.id===id);
let cart = {};
function readCart() {
  cart = {};
  try {
    const saved = JSON.parse(localStorage.getItem('elitebricks-cart') || '{}');
    for (const p of products) if (Number.isSafeInteger(saved?.[p.id]) && saved[p.id] > 0) {
      const qty = Math.min(saved[p.id],p.quantity ?? 99,99);
      if (qty>0) cart[p.id]=qty;
    }
  } catch {}
}
function remaining() { return product ? Math.max(0,Math.min(product.quantity ?? 99,99)-(cart[product.id] || 0)) : 0; }
function updateCartView() {
  document.querySelector('#cart-count').textContent = Object.values(cart).reduce((a,b)=>a+b,0);
  if (!product) return;
  const available=remaining();
  const input=document.querySelector('#product-quantity');
  input.max=String(Math.max(1,available));input.disabled=available===0;
  input.value=String(Math.max(1,Math.min(Number(input.value)||1,Math.max(1,available))));
  document.querySelector('#product-add').disabled=available===0;
  document.querySelector('#product-add').textContent=available ? 'In den Warenkorb' : 'Bereits vollständig im Warenkorb';
  document.querySelector('#product-cart-note').textContent=cart[product.id] ? `${cart[product.id]} Stück dieses Artikels sind bereits in deinem Warenkorb.` : '';
}
readCart();
document.querySelector('#year').textContent=new Date().getFullYear();
if (!product) {
  document.title='Artikel nicht gefunden · Elite Bricks';
  document.querySelector('#product-detail').innerHTML='<section class="product-not-found"><div class="eyebrow">ARTIKEL NICHT VERFÜGBAR</div><h1>Diesen Artikel finden wir gerade nicht.</h1><p>Der Link ist möglicherweise unvollständig oder der Artikel ist nicht mehr im aktuellen Sortiment.</p><a class="button" href="sets.html">Sets entdecken</a><a href="minifiguren.html">Minifiguren entdecken</a></section>';
} else {
  const p=product;
  document.title=`${p.name} · Elite Bricks`;
  document.querySelector('meta[name="description"]').content=`${p.name} – ${p.label}. ${p.description || ''} ${money(p.price)}.`;
  const category=categories[p.shop] || 'Sortiment';
  document.querySelector('#product-breadcrumb').innerHTML=`<a href="index.html">Startseite</a><span>/</span><a href="${p.shop}.html">${category}</a><span>/</span><span>${escapeHTML(p.itemNumber || p.name)}</span>`;
  const condition=p.condition==='new'?'Neu':'Gebraucht';
  const completeness=p.subcondition==='I'?'Unvollständig':p.subcondition==='S'?'Versiegelt':p.subcondition==='C'?'Komplett':'';
  const credit=p.imageKind==='official-catalog'?'LEGO-Katalogbild':p.imageKind==='merlins-catalog'?'<a href="https://www.merlinssteine.de/setdb/minifigs/" target="_blank" rel="noopener noreferrer">Katalogbild · Merlins Steine</a>':'';
  document.querySelector('#product-detail').innerHTML=`<section class="product-detail-layout"><div class="product-gallery">${p.image?`<img class="detail-photo" src="assets/${p.image}" alt="${escapeHTML(p.name)}" fetchpriority="high">`:`<div class="detail-image-pending"><span>${escapeHTML(p.itemNumber)}</span><p>Produktbild folgt</p></div>`}${credit?`<p class="detail-image-credit">${credit}<br>Die Angaben zum Zustand deines Exemplars findest du in der Beschreibung.</p>`:''}</div><div class="product-information"><div class="eyebrow">${category.toUpperCase()} / ${escapeHTML(p.label.toUpperCase())}</div><h1>${escapeHTML(p.name)}</h1><div class="detail-badges"><span>${condition}</span>${completeness?`<span>${completeness}</span>`:''}</div><p class="detail-price">${money(p.price)}</p><p class="detail-price-note">Preis pro Stück · zzgl. Versand</p><div class="detail-description"><h2>Beschreibung</h2><p>${escapeHTML(p.description || 'Weitere Angaben zu diesem Artikel folgen.')}</p></div><dl class="product-facts"><div><dt>Artikelnummer</dt><dd>${escapeHTML(p.itemNumber)}</dd></div><div><dt>Themenwelt</dt><dd>${escapeHTML(p.label)}</dd></div><div><dt>Zustand</dt><dd>${condition}</dd></div><div><dt>Bestand im Inventar</dt><dd>${p.quantity ?? 0} Stück</dd></div></dl><form id="product-add-form" class="product-purchase"><label for="product-quantity">Menge<input id="product-quantity" type="number" min="1" max="${p.quantity ?? 99}" step="1" value="1" inputmode="numeric" required></label><button id="product-add" class="button" type="submit">In den Warenkorb</button></form><p id="product-cart-note" class="checkout-small"></p><p id="product-status" role="status" aria-live="polite"></p><a class="detail-cart-link" href="warenkorb.html">Warenkorb ansehen & Adresse ergänzen →</a><div class="detail-shipping"><h2>Versand & Abholung</h2><p>PostPac Standard: CHF 9.00 · Priority: CHF 11.00<br>Lagerabholung: kostenlos · Shopabholung: momentan nicht verfügbar</p><small>Versand innerhalb der Schweiz. Versandkosten fallen einmal pro Warenkorb an. Bestand laut Inventar-Import; noch keine verbindliche Bestellung.</small></div><a class="back-to-category" href="${p.shop}.html">Zurück zu ${category}</a></div></section>`;
  document.querySelector('#product-add-form').addEventListener('submit',event=>{
    event.preventDefault();
    const quantity=Number(document.querySelector('#product-quantity').value);
    // Re-read before committing to account for changes in another tab.
    readCart();
    if (!Number.isSafeInteger(quantity)||quantity<1||quantity>remaining()) {
      updateCartView();document.querySelector('#product-status').textContent='Bitte wähle eine Menge innerhalb des verfügbaren Bestands.';return;
    }
    cart[p.id]=(cart[p.id]||0)+quantity;
    try {localStorage.setItem('elitebricks-cart',JSON.stringify(cart));} catch {}
    updateCartView();document.querySelector('#product-status').textContent=`${quantity} ${quantity===1?'Stück wurde':'Stück wurden'} zum Warenkorb hinzugefügt.`;
  });
}
updateCartView();
window.addEventListener('storage',event=>{if(event.key==='elitebricks-cart'||event.key===null){readCart();updateCartView();}});
