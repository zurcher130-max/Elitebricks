import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{Shop,validateOrder,verifyStripeSignature} from '../src/worker.js';
class Storage {
 constructor(){this.data=new Map();this.queue=Promise.resolve();}
 async get(k){return structuredClone(this.data.get(k));}
 async put(k,v){this.data.set(k,structuredClone(v));}
 async list({prefix,limit}){return new Map([...this.data].filter(([k])=>k.startsWith(prefix)).slice(0,limit));}
 transaction(fn){const r=this.queue.then(async()=>{const before=structuredClone(this.data);try{return await fn(this);}catch(e){this.data=before;throw e;}});this.queue=r.catch(()=>{});return r;}
}
const env=()=>({PAYMENTS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',ADMIN_API_KEY:'fixture-admin-key-with-at-least-32-chars',SITE_ORIGIN:'https://zurcher130-max.github.io',SITE_BASE_URL:'https://zurcher130-max.github.io/Elitebricks/',WAREHOUSE_ADDRESS:'Testlager'});
const input=()=>({items:[{id:'75021',quantity:1,price:1}],shipping:'standard',customer:{firstName:'Test',lastName:'Person',email:'test@example.com',street:'Teststrasse 1',postalCode:'8000',city:'Zürich',country:'CH'}});
function setup(){const storage=new Storage(),e=env();return {storage,e,shop:new Shop({storage},e)};}
const request=(body,key=crypto.randomUUID())=>new Request('https://worker.example/checkout',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
const stripeOK=()=>Response.json({id:'cs_test_fixture',url:'https://checkout.stripe.com/c/pay/cs_test_fixture',livemode:false});
async function sign(body,time=Math.floor(Date.now()/1000)){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('whsec_fixture'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${time}.${body}`)));
 return `t=${time},v1=${Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('')}`;
}
async function event(order,type='checkout.session.completed',changes={}){
 const body=JSON.stringify({livemode:false,type,data:{object:{id:'cs_test_fixture',metadata:{order_id:order.id},client_reference_id:order.id,mode:'payment',livemode:false,currency:'chf',amount_total:order.total,status:type.endsWith('expired')?'expired':'complete',payment_status:'paid',...changes}}});
 return new Request('https://worker.example/webhook',{method:'POST',headers:{'Stripe-Signature':await sign(body)},body});
}
async function create(shop){const key=crypto.randomUUID();assert.equal((await shop.fetch(request(input(),key))).status,200);return key;}
test('trusted prices, shipping and validation',()=>{
 assert.equal(validateOrder(input(),env()).total,32900);assert.equal(validateOrder({...input(),shipping:'priority'},env()).total,33100);assert.equal(validateOrder({...input(),shipping:'warehouse'},env()).total,32000);
 for(const bad of [{...input(),shipping:'shop'},{...input(),shipping:'__proto__'},{...input(),items:[{id:'75021',quantity:2}]},{...input(),items:[...input().items,...input().items]},{...input(),customer:{...input().customer,postalCode:'8'}}])assert.throws(()=>validateOrder(bad,env()));
 assert.throws(()=>validateOrder({...input(),shipping:'warehouse'},{...env(),WAREHOUSE_ADDRESS:''}));
});
test('Stripe uses server amounts and retries reuse the session',async t=>{
 const {shop,storage}=setup();let calls=0,params;const key=crypto.randomUUID();t.mock.method(globalThis,'fetch',async(url,options)=>{calls++;params=new URLSearchParams(options.body);assert.equal(options.headers['Idempotency-Key'],key);return stripeOK();});
 assert.equal((await shop.fetch(request(input(),key))).status,200);assert.equal(params.get('line_items[0][price_data][unit_amount]'),'32000');assert.equal(params.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'),'900');assert.equal(params.get('payment_method_types[0]'),'card');
 assert.equal((await shop.fetch(request(input(),key))).status,200);assert.equal(calls,1);assert.equal((await storage.get('stock:75021')).reserved,1);assert.equal((await shop.fetch(request({...input(),shipping:'priority'},key))).status,409);
});
test('concurrent customers cannot buy the same last set',async t=>{
 const {shop,storage}=setup();t.mock.method(globalThis,'fetch',async()=>stripeOK());const r=await Promise.all([shop.fetch(request(input())),shop.fetch(request(input()))]);assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);assert.deepEqual(await storage.get('stock:75021'),{reserved:1,sold:0});
});
test('definitive rejection releases stock; ambiguous timeout retains stock for retry',async t=>{
 const {shop,storage}=setup();let fail=true;t.mock.method(globalThis,'fetch',async()=>fail?Response.json({error:{}},{status:400}):stripeOK());assert.equal((await shop.fetch(request(input()))).status,502);assert.deepEqual(await storage.get('stock:75021'),{reserved:0,sold:0});
 fail=false;await create(shop);
});
test('timeout retry keeps a single reservation',async t=>{
 const {shop,storage}=setup();let calls=0;t.mock.method(globalThis,'fetch',async()=>{if(++calls===1)throw Error('timeout');return stripeOK();});const key=crypto.randomUUID();assert.equal((await shop.fetch(request(input(),key))).status,500);assert.equal((await storage.get('stock:75021')).reserved,1);assert.equal((await shop.fetch(request(input(),key))).status,200);assert.equal((await storage.get('stock:75021')).reserved,1);
});
test('Stripe signatures verify raw body and reject stale timestamps',async()=>{
 const body='{"test":true}';assert.equal(await verifyStripeSignature(body,await sign(body),'whsec_fixture'),true);assert.equal(await verifyStripeSignature(body+' ',await sign(body),'whsec_fixture'),false);assert.equal(await verifyStripeSignature(body,await sign(body,1),'whsec_fixture'),false);
});
test('verified payment sells stock once and status hides personal data',async t=>{
 const {shop,storage}=setup();t.mock.method(globalThis,'fetch',async()=>stripeOK());const key=await create(shop),order=await storage.get('order:'+key);
 assert.equal((await shop.fetch(await event(order,'checkout.session.completed',{payment_status:'unpaid'}))).status,200);assert.equal((await storage.get('order:'+key)).status,'reserved');
 for(let i=0;i<2;i++)assert.equal((await shop.fetch(await event(order))).status,200);
 assert.deepEqual(await storage.get('stock:75021'),{reserved:0,sold:1});assert.equal((await storage.get('order:'+key)).status,'paid');assert.equal((await shop.fetch(await event(order,'checkout.session.expired'))).status,200);assert.equal((await storage.get('stock:75021')).sold,1);
 const data=await (await shop.fetch(new Request(`https://worker.example/status?order=${key}&access=${order.access}`))).json();assert.equal(data.status,'paid');assert.equal('customer' in data,false);assert.equal('access' in data,false);
});
test('wrong totals and missing signature rejected; expiry releases reservation',async t=>{
 const {shop,storage}=setup();t.mock.method(globalThis,'fetch',async()=>stripeOK());const key=await create(shop),order=await storage.get('order:'+key);
 assert.equal((await shop.fetch(await event(order,'checkout.session.completed',{amount_total:1}))).status,400);assert.equal((await shop.fetch(new Request('https://worker.example/webhook',{method:'POST',body:'{}'}))).status,400);
 assert.equal((await shop.fetch(await event(order,'checkout.session.expired',{payment_status:'unpaid'}))).status,200);assert.deepEqual(await storage.get('stock:75021'),{reserved:0,sold:0});assert.equal((await shop.fetch(request(input()))).status,200);
});
test('access token required; disabled payments and live keys fail closed',async t=>{
 const {shop,storage,e}=setup();t.mock.method(globalThis,'fetch',async()=>stripeOK());const key=await create(shop);assert.equal((await shop.fetch(new Request(`https://worker.example/status?order=${key}&access=wrong`))).status,404);
 e.PAYMENTS_ENABLED='false';assert.equal((await shop.fetch(request(input()))).status,503);e.PAYMENTS_ENABLED='true';e.STRIPE_SECRET_KEY='sk_live_fixture';assert.equal((await shop.fetch(request(input()))).status,503);
});
test('CORS and merchant authentication',async()=>{
 const {shop,e}=setup();e.SHOP={idFromName:()=>1,get:()=>({fetch:r=>shop.fetch(r)})};assert.equal((await worker.fetch(new Request('https://worker.example/checkout',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}),e)).status,403);
 const r=await worker.fetch(new Request('https://worker.example/checkout',{method:'OPTIONS',headers:{Origin:e.SITE_ORIGIN}}),e);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),e.SITE_ORIGIN);
 assert.equal((await worker.fetch(new Request('https://worker.example/orders'),e)).status,401);assert.equal((await worker.fetch(new Request('https://worker.example/orders',{headers:{Authorization:'Bearer '+e.ADMIN_API_KEY}}),e)).status,200);
});
