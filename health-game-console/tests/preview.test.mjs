import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const html=readFileSync(new URL('../preview.html',import.meta.url),'utf8');
test('preview has all 7 system modules',()=>{
  for(const id of ['overview','vitals','recovery','mobility','activity','body','mind'])
    assert.ok(html.includes("'"+id+"'"),id+' missing');
});
test('three.js based 3D model and a 2D fallback',()=>{
  assert.match(html,/three@0\.180\.0/);assert.match(html,/WebGLRenderer/);assert.match(html,/FALLBACK/);
});
test('labels synthetic example correctly',()=>{
  assert.match(html,/DEMO • SYNTHETIC/);assert.match(html,/Все цифры вымышлены/);
});
test('no server upload of personal metrics',()=>{
  assert.doesNotMatch(html,/fetch\(\s*['"]\/api/);
  assert.match(html,/localStorage/);assert.match(html,/JSON\.parse\(await f\.text\(\)\)/);
});
test('has no privileged provider APIs or secrets',()=>{
  assert.doesNotMatch(html,/api\.openai\.com|Authorization:\s*Bearer|CLOUDFLARE_API_TOKEN|GITHUB_TOKEN/i);
});
test('health data is clearly non-diagnostic',()=>{
  assert.match(html,/Не медицинский диагноз/);
});
test('includes mobility-specific information and self-check',()=>{
  assert.match(html,/walkingAsymmetryPercentage/);assert.match(html,/КОЛЕНО — ДИСКОМФОРТ/);
});