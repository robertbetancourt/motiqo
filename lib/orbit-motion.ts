export type OrbitMotion={x:number;y:number;vx:number;vy:number;roll:number;turn:number;turnV:number};
export type OrbitBounds={left:number;right:number;top:number;bottom:number};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export function stepOrbit(s:OrbitMotion,target:{x:number;y:number},bounds:OrbitBounds,delta:number){
  const dt=clamp(delta,0,1/30);
  const tx=clamp(target.x,bounds.left,bounds.right),ty=clamp(target.y,bounds.top,bounds.bottom);
  s.vx+=(42*(tx-s.x)-8.8*s.vx)*dt;s.vy+=(42*(ty-s.y)-8.8*s.vy)*dt;
  const speed=Math.hypot(s.vx,s.vy);if(speed>1250){s.vx*=1250/speed;s.vy*=1250/speed;}
  s.x+=s.vx*dt;s.y+=s.vy*dt;let impact=false;
  if(s.x<bounds.left){s.x=bounds.left;s.vx=Math.abs(s.vx)*.5;impact=true;}else if(s.x>bounds.right){s.x=bounds.right;s.vx=-Math.abs(s.vx)*.5;impact=true;}
  if(s.y<bounds.top){s.y=bounds.top;s.vy=Math.abs(s.vy)*.5;impact=true;}else if(s.y>bounds.bottom){s.y=bounds.bottom;s.vy=-Math.abs(s.vy)*.5;impact=true;}
  s.turnV+=(-60*s.turn-8*s.turnV)*dt;s.turn+=s.turnV*dt;
  const goal=clamp(s.vx*.035,-26,26)+s.turn;
  s.roll+=(goal-s.roll)*(1-Math.exp(-dt*7));
  return impact;
}
export function angleToward(current:number,target:number,amount:number){return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*amount;}
