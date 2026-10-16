export const lumaClamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const lumaHex=(value:string,fallback:string)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
export const lumaRGB=(value:string)=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255);
/** A static, seeded buffer: position is advected entirely in the vertex shader. */
export function createLumaSeeds(count=16000){
  count=Math.round(lumaClamp(count,2000,32000));const data=new Float32Array(count*6);let seed=0x4c756d61;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  for(let i=0;i<count;i++){const n=i*6;data[n]=random();data[n+1]=Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(random()*Math.PI*2);data[n+2]=random()*2-1;data[n+3]=random()*Math.PI*2;data[n+4]=random();data[n+5]=random();}
  return data;
}
const fract=(value:number)=>((value%1)+1)%1;
const smooth=(a:number,b:number,value:number)=>{const t=lumaClamp((value-a)/(b-a),0,1);return t*t*(3-2*t);};
export function lumaWave(u:number,time:number,amplitude=1){
  return (Math.sin(u*5.2-time*1.9)*.07+Math.sin(u*2.8+time*.74)*.025+Math.sin(u*8.3+time*1.13)*.012)*lumaClamp(amplitude,0,1.8);
}
/** Detached grains inherit the emitter's position and velocity at birth, not its current curve. */
export function lumaPoint(data:Float32Array,index:number,time=1,amplitude=1){
  const n=index*6,kind=data[n+4],phase=data[n+3],depth=data[n+2],size=data[n+5],flow=.035+size*.04;
  let u=fract(data[n]+time*flow),y=0,fade=1,age=0,birth=time;
  if(kind<.56){
    const width=.0015+.0055*(.5+.5*Math.sin(u*7-time*1.4))**2;
    y=lumaWave(u,time,amplitude)+data[n+1]*width+Math.sin(phase+time*(1.3+size))*width*.7;
  }else{
    const life=.85+size*1.35,cycle=fract(time/life+phase/(Math.PI*2));age=cycle*life;birth=time-age;
    const source=fract(data[n]+birth*flow),emitter=lumaWave(source,birth,amplitude);
    const velocity=(lumaWave(source+flow*.01,birth+.01,amplitude)-emitter)/.01;
    const curl=Math.sin(phase+age*(2.5+size*2));
    u=fract(source+age*flow+depth*age*.012+curl*age*.006);
    y=emitter+data[n+1]*.003+velocity*age*.32-age*(.025+size*.05)+depth*age*.018+curl*age*.012;
    fade=smooth(0,.08,cycle)*(1-smooth(.35,1,cycle));
  }
  fade*=Math.max(0,Math.min(1,u/.045,(1-u)/.045));
  return {u,y,kind,size,fade,age,birth};
}
