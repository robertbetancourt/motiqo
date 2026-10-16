import {sphereClamp,type SphereState} from './sphere-stage';
export type OrbitRing={radius:number;phase:number;velocity:number;gap:number};
export type OrbitPath={ring:number;offset:number;length:number;start:number;span:number};
export type OrbitGeometry={rings:OrbitRing[];paths:OrbitPath[];output:Float32Array};
const TAU=Math.PI*2;
/** Two separated arcs per contour, with constant radii and independent angular speeds. */
export function createOrbit(count=8,samples=64):OrbitGeometry{
  count=Math.round(sphereClamp(count,4,12));samples=Math.round(sphereClamp(samples,24,96));let offset=0;
  const rings=Array.from({length:count},(_,i)=>({radius:.3+.7*i/(count-1),phase:i*2.3999632297+.75,velocity:(i%2?-1:1)*(.11+i*.015),gap:.1+.025*(i%3)}));
  const paths:OrbitPath[]=[];
  rings.forEach((ring,i)=>{const first=TAU*.65,second=TAU*(.35-ring.gap),n=Math.ceil(samples*.65)+1,m=Math.ceil(samples*(.35-ring.gap))+1;
    paths.push({ring:i,offset,length:n,start:0,span:first});offset+=n;
    paths.push({ring:i,offset,length:m,start:first+TAU*ring.gap*.6,span:second});offset+=m;
  });return{rings,paths,output:new Float32Array(offset*4)};
}
export function projectOrbit(geometry:OrbitGeometry,state:SphereState,spread=1){
  const leanX=state.tiltX,leanY=state.tiltY;
  for(const path of geometry.paths){
    const ring=geometry.rings[path.ring],rx=leanX+.035*Math.sin(state.time*.3+path.ring),ry=leanY+.035*Math.cos(state.time*.23+path.ring),cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry);
    const radius=ring.radius*(1+state.burst*.06*state.intensity*(.4+ring.radius));
    for(let j=0;j<path.length;j++){
      const angle=path.start+path.span*j/(path.length-1)+ring.phase+state.time*ring.velocity;
      const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius,z=.025*Math.sin(angle*2+path.ring)*sphereClamp(spread,0,2);
      const x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cx-z1*sx,z2=y*sx+z1*cx,perspective=3.8/(3.8-z2*.2),n=(path.offset+j)*4;
      geometry.output[n]=x1*perspective;geometry.output[n+1]=y1*perspective;geometry.output[n+2]=z2;geometry.output[n+3]=sphereClamp(.65+z2*.25,.3,.95);
    }
  }return geometry.output;
}
