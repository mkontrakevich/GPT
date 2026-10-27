import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareHrosContextPreview } from '../integrations/hros-context-bridge.mjs';
const NOW = new Date('2026-10-26T12:00:00.000Z');
const record = (overrides = {}) => ({
  id:'r-001',kind:'fact',status:'confirmed',visibility:'private',
  version:1,updatedAt:'2026-10-25T12:00:00.000Z',
  source:{kind:'ai_diary',label:'private note'},perspectiveOwnerId:'self',
  statement:'Sensitive interpersonal event',subjectIds:['other-person'],
  relationshipIds:['private-relationship'], ...overrides
});
const snapshot = records => ({meta:{schemaVersion:'1.0.0'},records});
const approval = (overrides = {}) => ({
  status:'confirmed',ownerId:'self',target:'health-game-console',
  purpose:'contextualize_wellbeing',
  allowedRecordIds:['r-001'],
  confirmedAt:'2026-10-24T12:00:00Z',
  expiresAt:'2026-11-01T00:00:00Z',...overrides
});
const convert = (s, a) => prepareHrosContextPreview(s,a,{now:NOW});
test('blocks data transfer without explicit approval',()=>{
  assert.equal(convert(snapshot([record()]),null).state,'blocked');
  assert.equal(convert(snapshot([record()]),approval({status:'draft'})).state,'blocked');
});
test('rejects revoked, expired and wrong-purpose approvals',()=>{
  for (const a of [approval({revokedAt:'2026-10-26T11:00:00Z'}),approval({expiresAt:'2026-10-25T00:00:00Z'}),approval({target:'HROS'}),approval({purpose:'marketing'})])
    assert.equal(convert(snapshot([record()]),a).state,'blocked');
});
test('only confirmed explicitly selected records pass, never hypotheses or drafts',()=>{
 const p=convert(snapshot([
   record(),record({id:'r-002',status:'hypothesis'}),record({id:'r-003',status:'draft'}),
   record({id:'r-004',visibility:'shared'})
 ]),approval({allowedRecordIds:['r-001','r-002','r-003','r-004']}));
 assert.deepEqual(p.projection.map(x=>x.ref),['r-001']);
});
test('cannot import someone else’s perspective',()=>{
 const p=convert(snapshot([record({kind:'perspective',perspectiveOwnerId:'another-person'})]),approval());
 assert.equal(p.projection.length,0);
});
test('removes all private narrative and third-party identifiers from projection',()=>{
 const source=snapshot([record()]);const before=structuredClone(source);
 const p=convert(source,approval());
 assert.equal(p.state,'review_only');
 assert.equal(p.projection.length,1);
 const output=JSON.stringify(p);
 for(const privateText of ['Sensitive interpersonal event','other-person','private-relationship','private note'])
  assert.equal(output.includes(privateText),false);
 assert.deepEqual(source,before);
 assert.equal(p.transferAuthorized,false);
});
test('rejects invalid snapshot, dates, and source without version',()=>{
 assert.equal(convert({},approval()).state,'blocked');
 assert.equal(convert(snapshot([record({updatedAt:'not a date'})]),approval()).projection.length,0);
 assert.equal(convert(snapshot([record({version:null})]),approval()).projection.length,0);
});