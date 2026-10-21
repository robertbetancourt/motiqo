export type OrbitReaction='happy'|'listening';
export const orbitEvent='motiqo:orbit';
export function notifyOrbit(mood:OrbitReaction){
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(orbitEvent,{detail:{mood}}));
}
