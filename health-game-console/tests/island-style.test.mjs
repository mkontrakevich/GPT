import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('bundled scene matches maintained scene source exactly',()=>{
 const html=readFileSync(new URL('../preview.html',import.meta.url),'utf8'),source=readFileSync(new URL('../scene/health-island.mjs',import.meta.url),'utf8').replace('export function mountHealthIsland','function mountHealthIsland');
 assert.ok(html.includes(source),'run node health-game-console/tools/sync-scene.mjs');
 assert.match(source,/993b3e19ee46388cb4d0262629c90d39afd9bb47/);
 assert.doesNotMatch(source,/localStorage|records|checkins|CapsuleGeometry/);
});
