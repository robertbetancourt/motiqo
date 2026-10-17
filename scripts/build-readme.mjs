import fs from 'node:fs';
import path from 'node:path';
const manifest=JSON.parse(fs.readFileSync('registry/manifest.json','utf8'));
const previews=JSON.parse(fs.readFileSync('registry/previews.json','utf8'));
const ids=['sacred-lotus','inkshift','gyro','quantum-core','photon-button','helix','aura','drawer','silk-aperture'];
fs.mkdirSync('docs/readme',{recursive:true});
const cells=ids.map(id=>{
 const item=manifest.items.find(item=>item.id===id),poster=previews.items[id]?.dark;
 if(!item||!poster)throw Error(`Missing README item ${id}`);
 fs.copyFileSync(path.join('public',poster),`docs/readme/${id}.webp`);
 return `<td align="center" width="33%"><a href="https://motiqo.site/library?element=${id}"><img src="docs/readme/${id}.webp" width="250" alt="${item.title} component preview" /><br /><strong>${item.title}</strong></a></td>`;
});
const gallery='<table>\n'+[0,3,6].map(i=>'<tr>\n'+cells.slice(i,i+3).join('\n')+'\n</tr>').join('\n')+'\n</table>';
let readme=fs.readFileSync('README.md','utf8');
readme=readme.replace(/<!-- gallery:start -->[\s\S]*?<!-- gallery:end -->/,`<!-- gallery:start -->\n${gallery}\n<!-- gallery:end -->`).replace(/<!-- count:start -->[\s\S]*?<!-- count:end -->/,`<!-- count:start -->${manifest.items.length}<!-- count:end -->`);
fs.writeFileSync('README.md',readme);
console.log(`Updated ${ids.length} README previews; ${manifest.items.length} components.`);
