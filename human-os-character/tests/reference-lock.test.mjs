import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const r=JSON.parse(readFileSync(new URL('../reference/REFERENCE_LOCK_v1.json',import.meta.url),'utf8'));
test('approved character identity is the original heroine, not an unrelated generated character',()=>{
assert.equal(r.characterId,'human-os-primary-heroine');
assert.equal(r.visualIdentity.genderPresentation,'female');
assert.equal(r.source.approval,'USER_APPROVED_2D_REFERENCE');
assert.equal(r.source.sha256,'023f874b0b00049212cc086ac63d2bbdb2196b2d01fbfb57e4144620be4e7974');
});
test('unapproved views cannot be promoted to approved status',()=>{
assert.equal(r.verifiedViews.frontThreeQuarter,'APPROVED_IMAGE');
for(const key of ['leftProfile','rightProfile','back'])assert.equal(r.verifiedViews[key],'NOT_AVAILABLE');
assert.equal(r.releaseGate.status,'HOLD');
assert.equal(r.protectMainWorld,true);
});
