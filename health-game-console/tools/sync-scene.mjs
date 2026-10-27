import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../preview.html',import.meta.url),html=readFileSync(file,'utf8'),source=readFileSync(new URL('../scene/health-island.mjs',import.meta.url),'utf8').replace('export function mountHealthIsland','function mountHealthIsland');
const start=html.indexOf('// BEGIN HUMAN OS SHARED HEALTH ISLAND'),end=html.indexOf('// END HUMAN OS SHARED HEALTH ISLAND',start);
if(start<0||end<0)throw Error('Missing scene boundary');
const content='// BEGIN HUMAN OS SHARED HEALTH ISLAND\n'+source+'\nmountHealthIsland({host:$(\'#scene\'),ids,onSelect:id=>{part=id;render()},getSelection:()=>part});\n';
writeFileSync(file,html.slice(0,start)+content+html.slice(end));
