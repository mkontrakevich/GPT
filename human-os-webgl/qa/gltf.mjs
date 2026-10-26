import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import validator from 'gltf-validator';
const reports=[];
await mkdir('human-os-webgl/qa/artifacts',{recursive:true});
for(const id of ['health','relationships','projects','work','personal','memory']){
 const bytes=await readFile(new URL('../assets/'+id+'-signature.gltf',import.meta.url));
 const report=await validator.validateBytes(new Uint8Array(bytes),{uri:id+'-signature.gltf',maxIssues:50,writeTimestamp:false});
 reports.push({id,report});console.log('GLTF_VALIDATION',id,JSON.stringify(report.issues));
}
await writeFile('human-os-webgl/qa/artifacts/gltf-validation.json',JSON.stringify(reports,null,2));
for(const {id,report} of reports)assert.equal(report.issues.numErrors,0,id+' glTF validation errors');
