import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const checks=['three@0.180.0','WebGLRenderer','touchmove','pointermove','pointerup','id="menu"','id="panel"','DEMO','relationships','projects','personal','memory'];
for (const term of checks) if(!html.includes(term)) throw new Error('Missing: '+term);
if(/(?:API_KEY|PRIVATE_TOKEN|BEARER\s+[a-z0-9])/i.test(html))throw new Error('Sensitive token marker detected');
console.log('PASS: Human OS WebGL static structure & touch controls');
