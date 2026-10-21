import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'registry/manifest.json'),'utf8'));
const index=JSON.parse(fs.readFileSync(path.join(root,'tests/component-tests.json'),'utf8'));
const ids=new Set(manifest.items.map(item=>item.id));
const errors=[],gaps=[];
// Only the ten gaps recorded on 2026-10-20 may remain during migration.
// New catalog entries must register behavior tests rather than another waiver.
const baselineGaps=new Set(['thermal-smoke','lenticular-button','photon-button','optical-button','spectral-button','caustic-button','prism-button','quantum-core','clustered','gilded-signal']);
if(index.schemaVersion!==1)errors.push('Unsupported component test index version.');
for(const id of Object.keys(index.components))if(!ids.has(id))errors.push(`Obsolete component record: ${id}`);
for(const id of ids){
 const entry=index.components[id];
 if(!entry||!Array.isArray(entry.tests)){errors.push(`Missing test record: ${id}`);continue;}
 if(!entry.tests.length){
  if(!baselineGaps.has(id))errors.push(`New components require behavior tests: ${id}`);
  if(typeof entry.gap!=='string'||!entry.gap.trim())errors.push(`No behavior tests or documented baseline gap: ${id}`);
  gaps.push(id);
 }else if(entry.gap)errors.push(`Remove the obsolete gap after adding tests: ${id}`);
 for(const test of entry.tests){
  if(typeof test!=='string'||!/^tests\/[a-z0-9-]+\.test\.cjs$/.test(test)||!fs.existsSync(path.join(root,test)))errors.push(`Invalid test path for ${id}: ${test}`);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Test index: ${ids.size} components; ${gaps.length} documented behavior gaps. This is not an accessibility certification.`);
if(gaps.length)console.log(`Pending behavior suites: ${gaps.join(', ')}`);
const args=process.argv.slice(2);
const planOnly=args[0]==='--plan';
if(planOnly)args.shift();
if(!args.length)process.exit(0);
let selected;
if(args[0]==='--files'){
 const changed=args.slice(1).map(file=>path.relative(root,path.resolve(root,file)).replaceAll('\\','/'));
 if(!changed.length)throw Error('Provide changed source/helper paths after --files.');
 const unmatched=changed.filter(file=>!manifest.items.some(item=>item.files.some(source=>source.source===file)));
 if(unmatched.length)throw Error(`No component mapping for ${unmatched.join(', ')}. Run npm test for site, manifest or test-infrastructure changes.`);
 selected=manifest.items.filter(item=>item.files.some(file=>changed.includes(file.source))).map(item=>item.id);
}else{
 selected=[...new Set(args)];
 for(const id of selected)if(!ids.has(id))throw Error(`Unknown component: ${id}`);
}
const missing=selected.filter(id=>!index.components[id].tests.length);
if(missing.length)throw Error(`Add component behavior tests before validating: ${missing.join(', ')}`);
const tests=[...new Set([...selected.flatMap(id=>index.components[id].tests),'tests/distribution.test.cjs','tests/distribution-settings.test.cjs'])];
console.log(`Selected components: ${selected.join(', ')}\nSuites: ${tests.join(', ')}`);
if(planOnly)process.exit(0);
function run(args){const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);}
run(['scripts/build-distribution.mjs']);
run(['--test',...tests]);
