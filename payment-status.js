'use strict';
const config=window.ELITEBRICKS_PAYMENTS;
const params=new URLSearchParams(location.search);
const order=params.get('order'), access=params.get('access');
const output=document.querySelector('#payment-result');
const refresh=document.querySelector('#refresh-payment');
let pending=false, confirmed=false;
function renderCount(){try{const cart=JSON.parse(localStorage.getItem('elitebricks-cart')||'{}');document.querySelector('#cart-count').textContent=products.reduce((n,p)=>n+(Number.isSafeInteger(cart?.[p.id])&&cart[p.id]>0?Math.min(cart[p.id],p.quantity??99):0),0);}catch{document.querySelector('#cart-count').textContent='0';}}
async function check(){
 if(pending||confirmed)return;
 if(!config?.enabled||!config.apiBase||!order||!access){output.textContent='Es liegt keine prüfbare Zahlungsbestätigung vor. Dein Warenkorb bleibt erhalten.';refresh.hidden=true;return;}
 pending=true;refresh.disabled=true;
 try{
  const url=new URL(config.apiBase.replace(/\/$/,'')+'/status');url.searchParams.set('order',order);url.searchParams.set('access',access);
  const result=await fetch(url);const data=await result.json();if(!result.ok)throw Error('Der Zahlungsstatus konnte noch nicht geprüft werden.');
  if(data.status==='paid'){
   confirmed=true;output.textContent='Deine Testzahlung wurde von Stripe bestätigt. Vielen Dank!';refresh.hidden=true;
   document.querySelector('#payment-total').textContent=`Gesamtbetrag: CHF ${(data.total/100).toFixed(2)}`;
   try{
    const marker='elitebricks-paid-'+order;
    if(!localStorage.getItem(marker)){
     const cart=JSON.parse(localStorage.getItem('elitebricks-cart')||'{}');
     for(const item of data.items||[]){if(!Number.isSafeInteger(item.quantity)||item.quantity<1)continue;const current=Number.isSafeInteger(cart?.[item.id])?cart[item.id]:0;if(current>item.quantity)cart[item.id]=current-item.quantity;else delete cart[item.id];}
     localStorage.setItem('elitebricks-cart',JSON.stringify(cart));localStorage.setItem(marker,'1');sessionStorage.removeItem('elitebricks-stripe-request');
    }
   }catch{}renderCount();
  }else if(['expired','failed'].includes(data.status)){output.textContent='Die Testzahlung wurde nicht abgeschlossen. Dein Warenkorb bleibt erhalten.';}
  else output.textContent='Stripe hat die Zahlung noch nicht bestätigt. Bitte prüfe den Status gleich erneut. Dein Warenkorb bleibt bis dahin erhalten.';
 }catch(error){output.textContent=error.message || 'Der Zahlungsstatus ist derzeit nicht erreichbar.';}
 finally{pending=false;refresh.disabled=false;}
}
refresh.addEventListener('click',check);
document.querySelector('#year').textContent=new Date().getFullYear();renderCount();check();
