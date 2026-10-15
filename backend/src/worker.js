import catalog from './catalog.json' with {type:'json'};

const inventory=new Map(catalog.map(p=>[p.id,p]));
const shipping={standard:{label:'PostPac Standard',amount:900},priority:{label:'PostPac Priority',amount:1100},warehouse:{label:'Lagerabholung',amount:0}};
const encoder=new TextEncoder();
class CheckoutError extends Error {constructor(message,status=400,definitive=false){super(message);this.status=status;this.definitive=definitive;}}
function response(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
function enabled(env){
  if(env.PAYMENTS_ENABLED!=='true')throw new CheckoutError('Die Online-Zahlung ist noch nicht aktiviert.',503);
  if(!env.ADMIN_API_KEY||env.ADMIN_API_KEY.length<32)throw new CheckoutError('Die Bestellverwaltung ist noch nicht eingerichtet.',503);
  if(!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')||!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw new CheckoutError('Stripe-Testmodus ist noch nicht eingerichtet.',503);
  const site=new URL(env.SITE_BASE_URL);
  if(site.protocol!=='https:'||site.origin!==env.SITE_ORIGIN)throw new CheckoutError('Shop-Adresse ist nicht korrekt eingerichtet.',503);
}
function clean(value,max,required=false){
  if(value==null&&!required)return '';
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new CheckoutError('Bitte prüfe deine Kontakt- und Adressangaben.');
  return value.trim();
}
export function validateOrder(input,env){
  if(!input||typeof input!=='object'||!Array.isArray(input.items)||!input.items.length||input.items.length>100)throw new CheckoutError('Der Warenkorb ist ungültig.');
  const method=typeof input.shipping==='string'&&Object.hasOwn(shipping,input.shipping)?shipping[input.shipping]:null;
  if(!method)throw new CheckoutError('Bitte wähle eine verfügbare Versandart.');
  if(input.shipping==='warehouse'&&!env.WAREHOUSE_ADDRESS?.trim())throw new CheckoutError('Die Lagerabholung muss vor der Online-Zahlung noch eingerichtet werden.');
  const seen=new Set();
  const items=input.items.map(item=>{
    const p=inventory.get(item?.id);
    if(!p||seen.has(p.id)||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>Math.min(p.stock,99))throw new CheckoutError('Ein Artikel oder seine Menge ist nicht mehr verfügbar.',409);
    seen.add(p.id);return {id:p.id,name:p.name,quantity:item.quantity,unitAmount:p.unitAmount};
  });
  const c=input.customer||{};
  const customer={firstName:clean(c.firstName,80,true),lastName:clean(c.lastName,80,true),email:clean(c.email,254,true),phone:clean(c.phone,40),notes:clean(c.notes,1000)};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))throw new CheckoutError('Bitte gib eine gültige E-Mail-Adresse ein.');
  if(input.shipping!=='warehouse'){
    customer.company=clean(c.company,120);customer.street=clean(c.street,160,true);customer.postalCode=clean(c.postalCode,4,true);customer.city=clean(c.city,100,true);customer.country=clean(c.country,2,true);
    if(!/^\d{4}$/.test(customer.postalCode)||customer.country!=='CH')throw new CheckoutError('Versand ist aktuell nur an Schweizer Adressen möglich.');
  }
  return {items,customer,shipping:input.shipping,...(input.shipping==='warehouse'?{pickupAddress:env.WAREHOUSE_ADDRESS.trim()}:{}),shippingAmount:method.amount,total:items.reduce((n,p)=>n+p.unitAmount*p.quantity,0)+method.amount,currency:'chf'};
}
async function fingerprint(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify(value))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function verifyStripeSignature(body,header,secret,now=Date.now()){
  if(!header||!secret)return false;
  const fields=header.split(',').map(s=>s.trim().split('='));
  const timestamp=fields.find(([key])=>key==='t')?.[1];
  if(!/^\d+$/.test(timestamp||'')||Math.abs(now/1000-Number(timestamp))>300)return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  for(const [name,hex] of fields){
    if(name!=='v1'||!/^\w{64}$/.test(hex)||!/^[0-9a-f]+$/i.test(hex))continue;
    const signature=Uint8Array.from(hex.match(/../g),x=>parseInt(x,16));
    if(await crypto.subtle.verify('HMAC',key,signature,encoder.encode(`${timestamp}.${body}`)))return true;
  }
  return false;
}
async function stripeSession(order,env){
  const base=new URL(env.SITE_BASE_URL);
  const success=new URL('zahlung.html',base);success.searchParams.set('order',order.id);success.searchParams.set('access',order.access);
  const cancel=new URL('warenkorb.html',base);cancel.searchParams.set('payment','cancelled');
  const params=new URLSearchParams({mode:'payment',currency:'chf',customer_email:order.customer.email,success_url:success.href,cancel_url:cancel.href,client_reference_id:order.id,'metadata[order_id]':order.id,'payment_intent_data[metadata][order_id]':order.id,'payment_method_types[0]':'card',expires_at:String(Math.floor(order.createdAt/1000)+1860),'shipping_options[0][shipping_rate_data][type]':'fixed_amount','shipping_options[0][shipping_rate_data][fixed_amount][amount]':String(order.shippingAmount),'shipping_options[0][shipping_rate_data][fixed_amount][currency]':'chf','shipping_options[0][shipping_rate_data][display_name]':shipping[order.shipping].label});
  if(order.shipping==='warehouse')params.set('custom_text[submit][message]',`Lagerabholung nach Terminvereinbarung: ${order.pickupAddress}`);
  order.items.forEach((p,i)=>{
    params.set(`line_items[${i}][price_data][currency]`,'chf');params.set(`line_items[${i}][price_data][unit_amount]`,String(p.unitAmount));params.set(`line_items[${i}][price_data][product_data][name]`,p.name);params.set(`line_items[${i}][quantity]`,String(p.quantity));
  });
  const result=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':order.id,'Stripe-Version':'2025-02-24.acacia'},body:params,signal:AbortSignal.timeout(20000)});
  const data=await result.json();
  if(!result.ok)throw new CheckoutError('Die Zahlungsseite konnte nicht erstellt werden. Bitte später erneut versuchen.',502,result.status>=400&&result.status<500);
  if(data.livemode!==false||!data.id||typeof data.url!=='string'||new URL(data.url).origin!=='https://checkout.stripe.com')throw new CheckoutError('Ungültige Antwort des Zahlungsanbieters.',502);
  return {id:data.id,url:data.url};
}
export class Shop {
  constructor(state,env){this.storage=state.storage;this.env=env;}
  async reserve(order){
    return this.storage.transaction(async tx=>{
      const existing=await tx.get(`order:${order.id}`);
      if(existing){if(existing.fingerprint!==order.fingerprint)throw new CheckoutError('Bitte prüfe den aktualisierten Warenkorb erneut.',409);return existing;}
      const updates=[];
      for(const p of order.items){
        const used=(await tx.get(`stock:${p.id}`))||{reserved:0,sold:0};
        if(used.reserved+used.sold+p.quantity>inventory.get(p.id).stock)throw new CheckoutError(`${p.name} ist bereits reserviert oder verkauft.`,409);
        updates.push([p.id,{...used,reserved:used.reserved+p.quantity}]);
      }
      for(const [id,used] of updates)await tx.put(`stock:${id}`,used);
      await tx.put(`order:${order.id}`,order);return order;
    });
  }
  async create(request){
    enabled(this.env);
    if(Number(request.headers.get('Content-Length'))>20000)throw new CheckoutError('Anfrage zu groß.',413);
    const text=await request.text();if(text.length>20000)throw new CheckoutError('Anfrage zu groß.',413);
    let input;try{input=JSON.parse(text);}catch{throw new CheckoutError('Ungültige Anfrage.');}
    const key=request.headers.get('Idempotency-Key');
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key||''))throw new CheckoutError('Ungültige Bestellkennung.');
    const validated=validateOrder(input,this.env);
    let order=await this.reserve({...validated,id:key,access:crypto.randomUUID(),fingerprint:await fingerprint(validated),status:'reserved',createdAt:Date.now()});
    if(order.status==='paid')return response({error:'Diese Bestellung wurde bereits bezahlt.'},409);
    if(order.status==='expired'||order.status==='failed')throw new CheckoutError('Die Reservierung ist abgelaufen. Bitte prüfe deinen Warenkorb erneut.',409);
    if(!order.checkout){
      // A timeout may still have created a Stripe session. Keep the reservation;
      // retries use the same Stripe idempotency key, never duplicate the session.
      let checkout;
      try {checkout=await stripeSession(order,this.env);} catch(error) {
        if(error.definitive)await this.storage.transaction(async tx=>{
          const current=await tx.get(`order:${order.id}`);
          if(current.status!=='reserved'||current.checkout)return;
          for(const item of current.items){const used=await tx.get(`stock:${item.id}`);await tx.put(`stock:${item.id}`,{...used,reserved:used.reserved-item.quantity});}
          current.status='failed';await tx.put(`order:${order.id}`,current);
        });
        throw error;
      }
      order=await this.storage.transaction(async tx=>{
        const current=await tx.get(`order:${order.id}`);current.checkout=checkout;await tx.put(`order:${order.id}`,current);return current;
      });
    }
    return response({url:order.checkout.url,orderId:order.id});
  }
  async webhook(request){
    const body=await request.text();
    if(body.length>1000000||!await verifyStripeSignature(body,request.headers.get('Stripe-Signature'),this.env.STRIPE_WEBHOOK_SECRET))throw new CheckoutError('Invalid signature.',400);
    let event;try{event=JSON.parse(body);}catch{throw new CheckoutError('Invalid event.');}
    if(event.livemode!==false)throw new CheckoutError('Only test events are accepted.');
    const recognized=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired','checkout.session.async_payment_failed'];
    if(!recognized.includes(event.type))return response({received:true});
    const session=event.data?.object;
    const id=session?.metadata?.order_id;
    if(!id)return response({received:true});
    await this.storage.transaction(async tx=>{
      const order=await tx.get(`order:${id}`);if(!order)return;
      if(session.currency!=='chf'||session.amount_total!==order.total||session.client_reference_id!==order.id||session.mode!=='payment'||session.livemode!==false)throw new CheckoutError('Session mismatch.');
      if(order.checkout&&order.checkout.id!==session.id)throw new CheckoutError('Session mismatch.');
      if(order.status==='paid'||order.status==='expired'||order.status==='failed')return;
      const paid=['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&session.payment_status==='paid';
      const expired=event.type==='checkout.session.expired'&&session.status==='expired';
      const failed=event.type==='checkout.session.async_payment_failed';
      if(!paid&&!expired&&!failed)return;
      for(const item of order.items){
        const used=await tx.get(`stock:${item.id}`);
        if(!used||used.reserved<item.quantity)throw new CheckoutError('Reservation mismatch.',500);
        await tx.put(`stock:${item.id}`,{reserved:used.reserved-item.quantity,sold:used.sold+(paid?item.quantity:0)});
      }
      order.status=paid?'paid':expired?'expired':'failed';order.updatedAt=Date.now();if(paid)order.paidAt=Date.now();
      await tx.put(`order:${id}`,order);
    });
    return response({received:true});
  }
  async status(request){
    const url=new URL(request.url);const order=await this.storage.get(`order:${url.searchParams.get('order')}`);
    if(!order||url.searchParams.get('access')!==order.access)throw new CheckoutError('Bestellung nicht gefunden.',404);
    return response({status:order.status,total:order.total,currency:order.currency,...(order.status==='paid'?{items:order.items.map(p=>({id:p.id,quantity:p.quantity}))}:{})});
  }
  async fetch(request){
    try{
      const path=new URL(request.url).pathname;
      if(path==='/checkout'&&request.method==='POST')return await this.create(request);
      if(path==='/webhook'&&request.method==='POST')return await this.webhook(request);
      if(path==='/status'&&request.method==='GET')return await this.status(request);
      if(path==='/orders'&&request.method==='GET'){
        const cursor=new URL(request.url).searchParams.get('cursor');
        const orders=await this.storage.list({prefix:'order:',limit:100,...(cursor?{startAfter:cursor}:{})});
        return response({orders:[...orders.values()].map(({access,fingerprint,checkout,...order})=>order),nextCursor:orders.size===100?[...orders.keys()].at(-1):null});
      }
      return response({error:'Not found.'},404);
    }catch(error){return response({error:error instanceof CheckoutError?error.message:'Die Anfrage konnte nicht verarbeitet werden.',...(error.definitive?{retryNewOrder:true}:{})},error instanceof CheckoutError?error.status:500);}
  }
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);const origin=request.headers.get('Origin');
    if(url.pathname==='/orders'&&request.method==='GET'){
      const expected=env.ADMIN_API_KEY;const supplied=request.headers.get('Authorization');
      if(!expected||expected.length<32||!supplied||await fingerprint(supplied)!==await fingerprint(`Bearer ${expected}`))return response({error:'Unauthorized.'},401);
      return env.SHOP.get(env.SHOP.idFromName('inventory-test-v1')).fetch(request);
    }
    if(url.pathname==='/webhook'&&request.method==='POST')return env.SHOP.get(env.SHOP.idFromName('inventory-test-v1')).fetch(request);
    if(!['/checkout','/status'].includes(url.pathname))return response({error:'Not found.'},404);
    if(origin!==env.SITE_ORIGIN)return response({error:'Origin not allowed.'},403);
    const headers={'Access-Control-Allow-Origin':env.SITE_ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Idempotency-Key','Access-Control-Max-Age':'600','Vary':'Origin','Cache-Control':'no-store'};
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    const result=await env.SHOP.get(env.SHOP.idFromName('inventory-test-v1')).fetch(request);
    const combined=new Headers(result.headers);for(const [key,value] of Object.entries(headers))combined.set(key,value);
    return new Response(result.body,{status:result.status,headers:combined});
  }
};
