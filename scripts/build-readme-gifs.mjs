import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

// Encode real browser captures. Source PNGs and timing.json stay in ignored screenshots/.
// Authoring URL: /preview-capture/<id>?theme=dark&motion=1 (development only).
const input=path.resolve('screenshots/readme-motion');
const binary=process.env.FFMPEG_BIN||'ffmpeg';
const ids=fs.readdirSync(input,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^[a-z][a-z0-9-]*$/.test(entry.name)).map(entry=>entry.name);
fs.mkdirSync('docs/readme',{recursive:true});
let total=0;
for(const id of ids){
 const directory=path.join(input,id),timing=JSON.parse(fs.readFileSync(path.join(directory,'timing.json'),'utf8'));
 if(timing.id!==id||timing.times.length<2)throw Error(`Missing animation frames: ${id}`);
 const lines=['ffconcat version 1.0'];
 for(let i=0;i<timing.times.length;i++){
  const file=String(i).padStart(4,'0')+'.png';
  if(!fs.existsSync(path.join(directory,file)))throw Error(`Missing captured frame: ${id}/${file}`);
  lines.push(`file '${file}'`,`duration ${Math.max(.01,((timing.times[i+1]??timing.duration+1000/15)-timing.times[i])/1000).toFixed(6)}`);
 }
 lines.push(`file '${String(timing.times.length-1).padStart(4,'0')}.png'`);
 const concat=path.join(directory,'frames.ffconcat');fs.writeFileSync(concat,lines.join('\n')+'\n');
 const output=path.resolve('docs/readme',id+'.gif');
 const result=spawnSync(binary,['-hide_banner','-loglevel','error','-y','-safe','0','-i',concat,'-filter_complex','[0:v]fps=12,scale=256:256:flags=lanczos,split[a][b];[a]palettegen=max_colors=80:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle','-t','4','-loop','0',output],{stdio:'inherit',shell:false});
 if(result.error||result.status!==0)throw Error(`GIF encoding failed for ${id}: ${result.error?.message??result.status}. Set FFMPEG_BIN to a trusted FFmpeg executable.`);
 const size=fs.statSync(output).size;total+=size;console.log(`${id}: ${(size/1024).toFixed(0)} KiB`);
}
console.log(`Encoded ${ids.length} animations, ${(total/1024/1024).toFixed(2)} MiB total.`);
await import('./build-readme.mjs');
