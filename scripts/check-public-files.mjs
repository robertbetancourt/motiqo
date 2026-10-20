import {spawnSync} from 'node:child_process';
const result=spawnSync('git',['ls-files','-z'],{encoding:'utf8'});
if(result.status!==0)throw Error(result.stderr||'Cannot inspect tracked files.');
const markdown=new Set(['README.md','CONTRIBUTING.md','SECURITY.md','THIRD_PARTY_NOTICES.md','LICENSE.md','packages/cli/NOTICE.md','packages/cli/THIRD_PARTY_NOTICES.md','skills/motiqo/SKILL.md']);
const rejected=result.stdout.split('\0').filter(Boolean).filter(file=>{
 if(/^(?:screenshots|research|\.cursor|\.agents|\.codex|\.claude)\//.test(file))return true;
 if(file.startsWith('docs/')&&!file.startsWith('docs/readme/'))return true;
 if(/(?:^|\/)(?:AGENTS|CLAUDE|PENDIENTES)\.md$/i.test(file))return true;
 return /\.md$/i.test(file)&&!markdown.has(file)&&!/[^/]*LICENSE[^/]*\.md$/i.test(file);
});
if(rejected.length){console.error(`Private or unapproved publication paths:\n${rejected.join('\n')}`);process.exitCode=1;}
else console.log('Publication paths verified: no private working notes or raw captures tracked.');
