import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../catalog.js',import.meta.url),'utf8');
const products=vm.runInNewContext(source+'\nproducts;',Object.create(null),{timeout:1000});
const result=products.map(p=>({id:p.id,name:p.name,unitAmount:Math.round(p.price*100),stock:p.quantity}));
if(new Set(result.map(p=>p.id)).size!==result.length||result.some(p=>!Number.isSafeInteger(p.unitAmount)||p.unitAmount<1||!Number.isSafeInteger(p.stock)||p.stock<0))throw Error('Invalid catalog');
fs.writeFileSync(new URL('../src/catalog.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`Built trusted checkout catalog: ${result.length} lots`);
