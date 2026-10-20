const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const run=(...args)=>spawnSync(process.execPath,['scripts/check-component-quality.mjs',...args],{cwd:root,encoding:'utf8'});

test('quality index includes all catalog components and exposes baseline gaps',()=>{
 const count=require('../registry/manifest.json').items.length,gaps=Object.values(require('./component-tests.json').components).filter(value=>!value.tests.length).length;
 const result=run();assert.equal(result.status,0,result.stderr);assert.ok(result.stdout.includes(`${count} components; ${gaps} documented behavior gaps`));
});
test('focused plan deduplicates component suites and includes export/settings checks',()=>{
 const result=run('--plan','radial-spectrum','radial-spectrum');assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/Selected components: radial-spectrum\n/);assert.match(result.stdout,/tests\/radial-spectrum.test.cjs/);assert.match(result.stdout,/tests\/distribution.test.cjs/);assert.match(result.stdout,/tests\/distribution-settings.test.cjs/);
});
test('helper plan selects its catalog consumers',()=>{
 const result=run('--plan','--files','components/originals/score-engine.ts');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Selected components: radial-spectrum\n/);
});
test('known behavior gaps cannot be reported as successful focused tests',()=>{
 const entries=require('./component-tests.json').components;
 const missing=Object.entries(entries).find(([,value])=>!value.tests.length);
 if(missing){const result=run('--plan',missing[0]);assert.notEqual(result.status,0);assert.match(result.stderr,/Add component behavior tests/);}
 const helper='components/originals/effect-runtime.ts';
 const affected=require('../registry/manifest.json').items.filter(item=>item.files.some(file=>file.source===helper));
 const shared=run('--plan','--files',helper);
 if(affected.some(item=>!entries[item.id].tests.length)){assert.notEqual(shared.status,0);assert.match(shared.stderr,/Add component behavior tests/);}else assert.equal(shared.status,0,shared.stderr);
});
test('unknown IDs and unmapped site changes require explicit broader validation',()=>{
 const id=run('--plan','unknown-component');assert.notEqual(id.status,0);assert.match(id.stderr,/Unknown component/);
 const site=run('--plan','--files','app/page.tsx');assert.notEqual(site.status,0);assert.match(site.stderr,/Run npm test/);
});
