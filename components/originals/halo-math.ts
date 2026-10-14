export type HaloPoint={latitude:number;longitude:number;orderedLatitude:number;orderedLongitude:number;phase:number};
export type HaloState={time:number;order:number;tiltX:number;tiltY:number;pointerX:number;pointerY:number;presence:number;intensity:number};
export const haloClamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
const TAU=Math.PI*2;
const smooth=(value:number)=>{const t=haloClamp(value,0,1);return t*t*t*(t*(t*6-15)+10);};

/** A quiet cloud, then an ordered globe, with fifth-order transitions between them. */
export function haloOrder(time:number){const phase=((time%24)+24)%24;return phase<8?0:phase<12?smooth((phase-8)/4):phase<17?1:phase<22?1-smooth((phase-17)/5):0;}

/** Fixed seed keeps server fallback, canvas and exported examples reproducible. */
export function createHaloPoints(count=480):HaloPoint[]{
  const length=Math.round(haloClamp(count,160,1000)),columns=24,rows=Math.ceil(length/columns);let seed=0x4d6f7469;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  return Array.from({length},(_,i)=>({latitude:.025+random()*(Math.PI-.05),longitude:random()*TAU,orderedLatitude:(Math.floor(i/columns)+.5)/rows*Math.PI,orderedLongitude:(i%columns)/columns*TAU,phase:random()*TAU}));
}

/** Real spherical coordinates and two camera axes; reusable output avoids per-frame arrays. */
export function projectHalo(points:HaloPoint[],state:HaloState,output:Float32Array){
  const rx=.12+Math.sin(state.time*.1)*.28+state.tiltX,ry=state.time*.13+state.tiltY;
  const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),order=haloClamp(state.order,0,1);
  points.forEach((p,i)=>{
    const latitude=p.latitude+(p.orderedLatitude-p.latitude)*order;
    const difference=Math.atan2(Math.sin(p.orderedLongitude-p.longitude),Math.cos(p.orderedLongitude-p.longitude));
    const longitude=p.longitude+difference*order;
    const sin=Math.sin(latitude),x=Math.cos(longitude)*sin,y=Math.cos(latitude),z=Math.sin(longitude)*sin;
    const x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cx-z1*sx,z2=y*sx+z1*cx;
    const distance=(x1-state.pointerX)**2+(y1-state.pointerY)**2;
    const wake=Math.exp(-distance*5)*state.presence*state.intensity;
    const radius=1+wake*.055*Math.sin(state.time*3.5+p.phase);
    const perspective=3.8/(3.8-z2*.25),depth=(z2+1)*.5,index=i*5;
    output[index]=x1*radius*perspective;output[index+1]=y1*radius*perspective;output[index+2]=z2;
    output[index+3]= .7+depth*.6;output[index+4]= .3+depth*.7;
  });
  return output;
}
