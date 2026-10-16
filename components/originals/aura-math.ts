import {sphereClamp,smoothSphere,type SphereState} from './sphere-stage';
export type AuraRisk={label:string;color:[number,number,number]};
export type AuraGeometry={rows:number;columns:number;output:Float32Array};
export const auraPresets=[4.12,3.2,2.88,1.65,.49];
/** Illustrative 0–5 score: higher score corresponds to lower risk. */
export function auraRisk(score:number):AuraRisk{
  score=sphereClamp(score,0,5);
  return score>3.75?{label:'Very low',color:[73,151,255]}:score>3?{label:'Low',color:[75,210,138]}:score>2?{label:'Medium',color:[247,185,73]}:score>1?{label:'High',color:[250,118,68]}:{label:'Very high',color:[241,65,91]};
}
export function nextAuraScore(score:number){const i=auraPresets.findIndex(value=>Math.abs(value-score)<.03);return auraPresets[(i+1)%auraPresets.length];}
export function createAura(small=false,density=1):AuraGeometry{
  density=sphereClamp(density,.5,1.2);const rows=Math.round((small?24:40)*density),columns=small?96:144;
  return {rows,columns,output:new Float32Array(rows*columns*6)};
}
/** Advected spherical harmonics form a moving, continuous membrane rather than a rigid globe. */
export function projectAura(geometry:AuraGeometry,state:SphereState,waves=1,score=4.12){
  const amplitude=sphereClamp(waves,0,1.8),t=state.time,rx=.22+state.tiltX,ry=t*.13+state.tiltY,cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry);
  const volatility=1+(5-sphereClamp(score,0,5))*.055;
  for(let row=0;row<geometry.rows;row++){
    const latitude=.035+(row+.5)/geometry.rows*(Math.PI-.07),sl=Math.sin(latitude),cl=Math.cos(latitude);
    for(let col=0;col<geometry.columns;col++){
      const longitude=col/geometry.columns*Math.PI*2;
      const flow=longitude+.18*Math.sin(latitude*3+t*.55),ripple=.12*Math.sin(flow*3+t*.8+latitude)*sl+.07*Math.sin(latitude*5-t*.95+Math.sin(flow*2))+.035*Math.cos(flow*7+latitude*6-t*1.4);
      const radius=1+amplitude*volatility*ripple+state.burst*.065*state.intensity*Math.sin(latitude*4-t*2);
      const x=Math.cos(flow)*sl*radius,y=cl*radius,z=Math.sin(flow)*sl*radius;
      const x1=x*cy+z*sy,z1=-x*sy+z*cy,y1=y*cx-z1*sx,z2=y*sx+z1*cx;
      const wake=state.presence*state.intensity*.035*Math.exp(-((x1-state.pointerX)**2+(y1-state.pointerY)**2)*6)*Math.sin(flow*4+t*3);
      const perspective=3.8/(3.8-z2*.2),px=x1*perspective*(1+wake),py=y1*perspective*(1+wake),distance=Math.hypot(px,py),rim=Math.max(0,1-Math.abs(z2)/radius);
      const n=(row*geometry.columns+col)*6;
      geometry.output[n]=px;geometry.output[n+1]=py;geometry.output[n+2]=z2;
      geometry.output[n+3]=(.04+rim**3*.72)*(.12+.88*smoothSphere((distance-.28)/.65));
      geometry.output[n+4]=.22+rim*.38;geometry.output[n+5]=rim;
    }
  }return geometry.output;
}
