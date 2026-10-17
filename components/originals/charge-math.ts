export const chargeClamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const chargeHex=(value:string,fallback:string)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
export type ChargeParticle={phase:number;pace:number;spread:number;side:number;interior:boolean;size:number;warm:number};
export function createChargeParticles(count:number):ChargeParticle[]{
  let seed=7319;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return Array.from({length:Math.round(chargeClamp(count,150,300))},()=>({phase:random(),pace:.075+random()*.055,spread:random(),side:random()<.5?-1:1,interior:random()<.32,size:.5+random()**2*2,warm:random()}));
}
/** One continuous path: accelerating inlet, then a perimeter or interior stream. */
export function chargeParticle(p:ChargeParticle,time:number,aspect:number){
  const cycle=((p.phase+time*p.pace)%1+1)%1,r=.32,base=-aspect*.63;
  let x:number,y:number,fade:number;
  if(cycle<.57){
    const v=cycle/.57,s=v*v;
    y=base+( -r-base)*s;
    x=((p.spread-.5)*.05+Math.sin(y*18-time*2+p.spread*6)*.009)*(1-s);
    fade=Math.min(1,v*10);
  }else{
    const v=(cycle-.57)/.43;
    if(p.interior){
      x=p.side*Math.sin(v*Math.PI)*(.045+p.spread*.17)+Math.sin(v*11+time*.5)*.008*Math.sin(v*Math.PI);
      y=-r+v*r*1.87;
      fade=Math.min(1,(1-v)*4)*(.65+.35*Math.sin(v*Math.PI));
    }else{
      const a=p.side*v*Math.PI,jitter=Math.sin(v*27+time+p.spread*13)*.003*Math.sin(v*Math.PI),radius=r+jitter;
      x=Math.sin(a)*radius;y=-Math.cos(a)*radius;
      fade=Math.min(1,(1-v)*12);
    }
  }
  return{x,y,fade,cycle};
}
