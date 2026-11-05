import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base = new URL('../character.manifest.v1.json', import.meta.url);
const manifest = JSON.parse(readFileSync(base, 'utf8'));
const dna = readFileSync(new URL('../CHARACTER_DNA.md', import.meta.url), 'utf8');
const domains = ['health','relationships','projects','work','personal','memory'];

test('Character DNA v1.0 is a personal OS project and future proof manifest', () => {
  assert.equal(manifest.manifestVersion, '1.0.0');
  assert.equal(manifest.projectId, 'PERSONAL-OS/HUMAN-OS/CHARACTER-SYSTEM');
  assert.equal(manifest.characterId, 'human-os-primary-hero');
  assert.match(dna, /Character DNA v1\.0/);
});

test('all six world adapters refer to the same character and never create a second identity', () => {
  assert.deepEqual(manifest.environments.map(x=>x.environmentId),domains);
  assert.equal(manifest.approvedConcept.identityLocked,true);
  for(const env of manifest.environments){
    assert.equal(env.status,'PLANNED');
    assert.ok(manifest.requiredCameraPresets.includes(env.cameraPreset));
    assert.deepEqual(Object.keys(env).sort(),[...manifest.environmentFields,'status'].sort());
    assert.equal(Object.prototype.hasOwnProperty.call(env,'characterId'),false);
  }
});

test('missing Blender/GLB/rig assets cannot be represented as ready', () => {
  assert.equal(manifest.status,'BLOCKOUT_NOT_APPROVED');
  for(const key of ['editableMaster','gameReadyGLB','mobileGLB','skeleton','neutralOutfit','textures'])
    assert.equal(manifest.assets[key].status,'BLOCKED');
  assert.equal(manifest.assets.currentWebGLStudy.characterRigged,false);
  assert.equal(manifest.approvedConcept.finalWebGLVisualApproval,false);
});

test('gates are contiguous and only the first is open for art refinement', () => {
  assert.equal(manifest.currentVerifiedProgressPercent,50);
  assert.deepEqual(manifest.releaseGates.map(x=>[x.fromPercent,x.toPercent]),[[50,65],[65,75],[75,85],[85,92],[92,100]]);
  assert.equal(manifest.releaseGates[0].status,'HOLD');
  assert.ok(manifest.releaseGates.slice(1).every(x=>x.status==='BLOCKED' && x.evidence.length===0));
});

test('production quality cannot be represented by world preview or a public demo',()=>{
  assert.equal(manifest.protectedWorld.modificationAllowed,false);
  assert.equal(manifest.privacy.publicDemo,'SYNTHETIC_ONLY');
  assert.equal(manifest.privacy.personalHealthData,'FORBIDDEN');
  assert.equal(manifest.privacy.hrosPrivateData,'FORBIDDEN');
  for(const key of ['idle','turn','walk'])assert.ok(manifest.requiredAnimationStates.includes(key));
});
