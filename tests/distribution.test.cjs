const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),bin=path.join(root,'packages/cli/bin/motiqo.mjs'),registry=JSON.parse(fs.readFileSync(path.join(root,'packages/cli/registry.json'),'utf8'));
function fixture(){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'motiqo-cli-')),project=path.join(temp,'project');fs.mkdirSync(project);fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({private:true,dependencies:{react:'19.2.4'}}));return{temp,project,dispose(){const resolved=fs.realpathSync(temp);assert.ok(resolved.startsWith(fs.realpathSync(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('motiqo-cli-'));fs.rmSync(resolved,{recursive:true,force:true});}};}
function run(project,args,env={}){return spawnSync(process.execPath,[bin,...args,'--cwd',project],{encoding:'utf8',env:{...process.env,...env}});}
test('Every registry export includes its real entry, local imports, artwork and matching hashes',()=>{
 const manifest=require('../registry/manifest.json');assert.equal(registry.items.length,manifest.items.length);assert.equal(new Set(registry.items.map(i=>i.id)).size,manifest.items.length);
 for(const item of registry.items){assert.ok(item.files.some(f=>path.basename(f.source)===item.entry));for(const f of item.files){const content=Buffer.from(f.content,f.encoding);assert.ok(content.equals(fs.readFileSync(path.join(root,f.source))),`${item.id}: exact source bytes`);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),f.sha256);}}
 const gilded=registry.items.find(i=>i.id==='gilded-signal');assert.ok(gilded.files.some(f=>f.target==='public/branding/Isotype.svg'));assert.equal(gilded.files.filter(f=>f.encoding==='base64').length,2);
});
test('CLI simulates without writes, deduplicates shared helpers, installs and remains idempotent',()=>{const f=fixture();try{
 const dry=run(f.project,['add','gyro','tempo','--dir','src/components/motiqo','--dry-run','--json']);assert.equal(dry.status,0,dry.stderr);assert.equal(JSON.parse(dry.stdout).files.length,4);assert.ok(!fs.existsSync(path.join(f.project,'src')));
 const added=run(f.project,['add','gyro','tempo','--dir','src/components/motiqo','--json']);assert.equal(added.status,0,added.stderr);assert.equal(JSON.parse(added.stdout).changed.length,4);assert.ok(fs.existsSync(path.join(f.project,'src/components/motiqo/line-solid.ts')));
 const again=run(f.project,['add','gyro','tempo','--dir','src/components/motiqo','--json']);assert.equal(again.status,0,again.stderr);assert.equal(JSON.parse(again.stdout).changed.length,0);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.project,'package.json'),'utf8')).dependencies,{react:'19.2.4'});
 const skill=run(f.project,['skill']);assert.equal(skill.status,0,skill.stderr);assert.match(fs.readFileSync(path.join(f.project,'.agents/skills/motiqo/SKILL.md'),'utf8'),/name: motiqo/);
 }finally{f.dispose();}});
test('CLI rejects collisions before copying any file and rejects traversal',()=>{const f=fixture();try{
 fs.mkdirSync(path.join(f.project,'components/motiqo'),{recursive:true});fs.writeFileSync(path.join(f.project,'components/motiqo/line-scene.tsx'),'my existing helper');
 const collision=run(f.project,['add','gyro']);assert.notEqual(collision.status,0);assert.match(collision.stderr,/already exists/);assert.ok(!fs.existsSync(path.join(f.project,'components/motiqo/gyro.tsx')));assert.equal(fs.readFileSync(path.join(f.project,'components/motiqo/line-scene.tsx'),'utf8'),'my existing helper');
 const replace=run(f.project,['add','gyro','--overwrite']);assert.equal(replace.status,0,replace.stderr);assert.notEqual(fs.readFileSync(path.join(f.project,'components/motiqo/line-scene.tsx'),'utf8'),'my existing helper');
 assert.notEqual(run(f.project,['add','companion','--dir','../escape']).status,0);assert.notEqual(run(f.project,['add','unknown']).status,0);assert.ok(!fs.existsSync(path.join(f.temp,'escape')));
 }finally{f.dispose();}});
test('CLI refuses a symlink destination and corrupted bundled content',async()=>{const f=fixture();try{
 fs.mkdirSync(path.join(f.temp,'outside'));fs.symlinkSync(path.join(f.temp,'outside'),path.join(f.project,'components'),'junction');assert.notEqual(run(f.project,['add','companion']).status,0);assert.equal(fs.readdirSync(path.join(f.temp,'outside')).length,0);
 const {planInstall}=await import(pathToFileURL(path.join(root,'packages/cli/lib/installer.mjs')));const bad=structuredClone(registry);bad.items[0].files[0].content+='tampered';assert.throws(()=>planInstall(bad,[bad.items[0].id],f.project,{directory:'safe-components'}),/Integrity/);
 }finally{f.dispose();}});
test('Dependency installation is opt-in, uses argument arrays and disables package scripts',()=>{const f=fixture();try{
 const npm=path.join(f.temp,'npm-cli.js'),log=path.join(f.temp,'npm-calls.jsonl');fs.writeFileSync(npm,`require('fs').appendFileSync(${JSON.stringify(log)},JSON.stringify(process.argv.slice(2))+'\\n');`);
 const installed=run(f.project,['add','companion','--install'],{npm_execpath:npm});assert.equal(installed.status,0,installed.stderr);const calls=fs.readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.length,2);assert.ok(calls.every(c=>c.includes('--ignore-scripts')));assert.ok(calls[0].includes('three@^0.172.0'));assert.ok(calls[1].includes('--save-dev'));
 }finally{f.dispose();}});

test('A write failure rolls back new files and restores replaced files without touching unrelated content',async()=>{const f=fixture();try{
 const {planInstall,applyInstall}=await import(pathToFileURL(path.join(root,'packages/cli/lib/installer.mjs')));
 const folder=path.join(f.project,'components/motiqo');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'gyro.tsx'),'my component');fs.writeFileSync(path.join(folder,'notes.txt'),'keep me');
 const plan=planInstall(registry,['gyro'],f.project,{overwrite:true});
 // A destination becomes occupied after preflight, simulating a competing write.
 fs.mkdirSync(path.join(folder,'line-solid.ts'));
 assert.throws(()=>applyInstall(plan,f.project));assert.equal(fs.readFileSync(path.join(folder,'gyro.tsx'),'utf8'),'my component');assert.ok(!fs.existsSync(path.join(folder,'line-scene.tsx')));assert.equal(fs.readFileSync(path.join(folder,'notes.txt'),'utf8'),'keep me');assert.ok(fs.statSync(path.join(folder,'line-solid.ts')).isDirectory());assert.ok(!fs.readdirSync(folder).some(name=>name.endsWith('.tmp')));
 }finally{f.dispose();}});
