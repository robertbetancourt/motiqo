import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
// Derive the paired graphite layer from the exact render, retaining every pixel's perspective.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {data,info}=await sharp(path.join(root,'public/media/atelier-room.webp')).greyscale().blur(1.45).raw().toBuffer({resolveWithObject:true});
const output=new Uint8Array(info.width*info.height*3).fill(255),w=info.width,h=info.height;
const sample=(x,y)=>data[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
 const a=sample(x-1,y-1),b=sample(x,y-1),c=sample(x+1,y-1),d=sample(x-1,y),f=sample(x+1,y),g=sample(x-1,y+1),j=sample(x,y+1),k=sample(x+1,y+1);
 const gx=-a-2*d-g+c+2*f+k,gy=-a-2*b-c+g+2*j+k,magnitude=Math.hypot(gx,gy)/1020;
 const t=Math.max(0,Math.min(1,(magnitude-.018)/.1)),edge=t*t*(3-2*t),value=Math.round(255-edge*101);
 const p=(y*w+x)*3;output[p]=output[p+1]=output[p+2]=value;
}
await sharp(output,{raw:{width:w,height:h,channels:3}}).webp({quality:93,effort:6}).toFile(path.join(root,'public/media/atelier-sketch.webp'));
console.log(`Created aligned ${w} × ${h} architectural line drawing.`);
