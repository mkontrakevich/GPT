import {readFileSync,writeFileSync} from 'node:fs';
const file=new URL('../preview.html',import.meta.url),html=readFileSync(file,'utf8'),source=readFileSync(new URL('../avatar/metric-engine.mjs',import.meta.url),'utf8').replaceAll('export ','');
const start=html.indexOf('// Local-only avatar projection.'),end=html.indexOf('\nlet avatarProfile=',start);
if(start<0||end<0)throw Error('Missing avatar engine boundary');
writeFileSync(file,html.slice(0,start)+source+html.slice(end));
