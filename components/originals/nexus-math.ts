import {sphereClamp,smoothSphere,type SphereState} from './sphere-stage';
export type NexusNode={x:number;y:number;z:number;layer:number;phase:number};
export type NexusGeometry={nodes:NexusNode[];edges:[number,number][];output:Float32Array;outerCount:number};
const TAU=Math.PI*2;
/** Three independently turning layers; links are built once in world space. */
export function createNexus(outerCount=72):NexusGeometry{
  outerCount=Math.round(sphereClamp(outerCount,32,120));const nodes:NexusNode[]=[],edges:[number,number][]=[];let seed=0x4e657875;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const shell=(count:number,radius:number,layer:number)=>{
    const start=nodes.length;
    for(let i=0;i<count;i++){const y=1-2*(i+.5)/count,angle=i*Math.PI*(3-Math.sqrt(5)),r=Math.sqrt(1-y*y);nodes.push({x:Math.cos(angle)*r*radius,y:y*radius,z:Math.sin(angle)*r*radius,layer,phase:random()*TAU});}
    const seen=new Set<string>();
    for(let i=start;i<nodes.length;i++){
      const p=nodes[i],nearest=nodes.map((q,j)=>({j,d:(q.x-p.x)**2+(q.y-p.y)**2+(q.z-p.z)**2})).filter(q=>q.j>=start&&q.j!==i).sort((a,b)=>a.d-b.d).slice(0,layer===0?4:3);
      for(const {j}of nearest){const a=Math.min(i,j),b=Math.max(i,j),key=`${a}:${b}`;if(!seen.has(key)){seen.add(key);edges.push([a,b]);}}
    }
  };
  shell(outerCount,1,0);const innerStart=nodes.length;shell(Math.round(outerCount*.5),.62,1);
  for(let i=0;i<8;i++)edges.push([Math.floor(i*outerCount/8),innerStart+Math.floor(i*(nodes.length-innerStart)/8)]);
  // Seeded volume particles make the bright centre, without connecting every pair.
  for(let i=0;i<88;i++){const y=1-2*random(),angle=random()*TAU,radius=.035+.33*random()**2,r=Math.sqrt(1-y*y);nodes.push({x:Math.cos(angle)*r*radius,y:y*radius,z:Math.sin(angle)*r*radius,layer:2,phase:random()*TAU});}
  return {nodes,edges,output:new Float32Array(nodes.length*5),outerCount};
}
/** The cage gently flattens, then returns, matching the reference's breathing silhouette. */
export function nexusCompression(time:number){const t=((time%24)+24)%24;return t<9?0:t<14?smoothSphere((t-9)/5):t<17?1:t<23?1-smoothSphere((t-17)/6):0;}
export function projectNexus(geometry:NexusGeometry,state:SphereState){
  const compression=nexusCompression(state.time),flatten=1-.27*compression-.13*state.burst*state.intensity;
  const rx=.18+Math.sin(state.time*.11)*.17+state.tiltX,cx=Math.cos(rx),sx=Math.sin(rx);
  geometry.nodes.forEach((p,i)=>{
    const ry=state.time*(p.layer===0?.17:p.layer===1?-.21:.34)+state.tiltY,cy=Math.cos(ry),sy=Math.sin(ry);
    const breathing=1+.025*Math.sin(state.time*.7+p.layer),x=p.x*breathing,y=p.y*flatten*breathing,z=p.z*breathing;
    const x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cx-z1*sx,z2=y*sx+z1*cx;
    const wake=1+.035*state.intensity*state.presence*Math.exp(-((x1-state.pointerX)**2+(y1-state.pointerY)**2)*6)*Math.sin(state.time*3+p.phase);
    const perspective=3.8/(3.8-z2*.22),depth=sphereClamp((z2+1)*.5,0,1),n=i*5;
    geometry.output[n]=x1*perspective*wake;geometry.output[n+1]=y1*perspective*wake;geometry.output[n+2]=z2;geometry.output[n+3]=p.layer===2?.65+depth*.5:.6+depth*.8;geometry.output[n+4]=.28+depth*.7;
  });return geometry.output;
}
