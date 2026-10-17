export type SequenceMode='auto'|'perlin'|'radial'|'diagonal'|'step';
export type HoverEffect='retract'|'elevate';
export type StratumPalette={background?:string;pillars?:string;light?:string};
export type Shockwave={x:number;z:number;born:number};
export const stratumModes=['perlin','radial','diagonal','step'] as const;
export const stratumClamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
export const stratumHex=(value:string|undefined,fallback:string)=>value&&/^#[\da-f]{6}$/i.test(value)?value:fallback;
export const stratumGrid=(n:number)=>Math.round(stratumClamp(n,8,25));
export const pillarPitch=.265;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const fade=(t:number)=>t*t*t*(t*(t*6-15)+10);
function hash(x:number,y:number,z:number){let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return(h^(h>>>16))>>>0;}
function gradient(h:number,x:number,y:number,z:number){const k=h&15,u=k<8?x:y,v=k<4?y:k===12||k===14?x:z;return((k&1)?-u:u)+((k&2)?-v:v);}
/** Deterministic gradient Perlin noise; no per-frame random samples or allocations. */
export function pillarNoise(x:number,y:number,z:number){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),a=x-ix,b=y-iy,c=z-iz,u=fade(a),v=fade(b),w=fade(c);
 return mix(mix(mix(gradient(hash(ix,iy,iz),a,b,c),gradient(hash(ix+1,iy,iz),a-1,b,c),u),mix(gradient(hash(ix,iy+1,iz),a,b-1,c),gradient(hash(ix+1,iy+1,iz),a-1,b-1,c),u),v),mix(mix(gradient(hash(ix,iy,iz+1),a,b,c-1),gradient(hash(ix+1,iy,iz+1),a-1,b,c-1),u),mix(gradient(hash(ix,iy+1,iz+1),a,b-1,c-1),gradient(hash(ix+1,iy+1,iz+1),a-1,b-1,c-1),u),v),w);
}
function field(mode:Exclude<SequenceMode,'auto'>,x:number,z:number,row:number,column:number,t:number){
 if(mode==='radial')return .04+.96*(.5+.5*Math.sin(Math.hypot(x,z)*3.3-t*1.8))**1.7;
 if(mode==='diagonal')return .01+.99*(.5+.5*Math.sin((x+z)*2.1-t*1.8))**3.4;
 if(mode==='step'){const beat=Math.floor(t*.85),a=((row+beat)%6)/5,b=((column+Math.floor(beat/2))%5)/4;return .06+.9*((row+column+beat)%2?a:b);}
 const broad=pillarNoise(row*.15,column*.15,t*.23),fine=pillarNoise(row*.62+17,column*.62+31,t*.19);
 const detail=(hash(row,29,column)%1000)/1000;
 return stratumClamp(.32+broad*.5+fine*.28+Math.sin(x*.9+z*1.1-t*.65)*.15+detail**1.5*.52,.015,1);
}
/** Auto blends fields over the last 1.8 seconds of each eight-second phrase. */
export function pillarHeight(mode:SequenceMode,x:number,z:number,row:number,column:number,t:number,maxHeight:number){
 let value:number;
 if(mode==='auto'){const phrase=Math.floor(t/8),phase=t-phrase*8,blend=stratumClamp((phase-6.2)/1.8,0,1),ease=blend*blend*(3-2*blend);value=mix(field(stratumModes[phrase%4],x,z,row,column,t),field(stratumModes[(phrase+1)%4],x,z,row,column,t),ease);}
 else value=field(mode,x,z,row,column,t);
 const max=stratumClamp(maxHeight,.05,4.5);return .05+stratumClamp(value,0,1)*(max-.05);
}
export function createPillarLayout(gridSize:number){const n=stratumGrid(gridSize),matrices=new Float32Array(n*n*16),heights=new Float32Array(n*n),velocities=new Float32Array(n*n);for(let row=0;row<n;row++)for(let col=0;col<n;col++){const i=row*n+col,m=i*16;matrices[m]=matrices[m+10]=matrices[m+15]=1;matrices[m+5]=heights[i]=.05;matrices[m+12]=(col-(n-1)/2)*pillarPitch;matrices[m+14]=(row-(n-1)/2)*pillarPitch;}return{n,matrices,heights,velocities};}
export function interactiveHeight(base:number,x:number,z:number,maxHeight:number,hoverX:number,hoverZ:number,hover:number,effect:HoverEffect,shocks:readonly Shockwave[],time:number){
 const max=stratumClamp(maxHeight,.05,4.5),distance=Math.hypot(x-hoverX,z-hoverZ),bell=Math.exp(-distance*distance/.66)*hover;
 let value=effect==='retract'?base-(base-.05)*bell*.98:base+(max-base)*bell;
 for(const shock of shocks){const age=time-shock.born,d=Math.hypot(x-shock.x,z-shock.z)-age*2.7;value+=Math.exp(-d*d/.13)*Math.cos(d*5.2)*Math.exp(-age*.48)*max*.48;}
 return stratumClamp(value,.05,max);
}
/** Only matrix[5] is writable during animation; translation remains (x, 0, z). */
export function springPillar(layout:ReturnType<typeof createPillarLayout>,i:number,target:number,dt:number,maxHeight:number,snap=false){
 let height=layout.heights[i],velocity=layout.velocities[i];
 if(snap){height=target;velocity=0;}else{velocity+=(target-height)*76*dt;velocity*=Math.exp(-dt*11.5);height+=velocity*dt;}
 const bounded=stratumClamp(height,.05,stratumClamp(maxHeight,.05,4.5));if(bounded!==height)velocity=0;
 layout.heights[i]=bounded;layout.velocities[i]=velocity;layout.matrices[i*16+5]=bounded;
}
