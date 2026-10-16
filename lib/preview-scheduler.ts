type Job={activate:()=>void;priority:()=>number};
const pending=new Set<Job>(),sleeping=new Map<symbol,()=>void>();
let frame=0;

function drain(){
  // Give navigation and the poster image a paint before constructing a scene.
  frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
    frame=0;
    const job=[...pending].sort((a,b)=>a.priority()-b.priority())[0];
    if(job){pending.delete(job);job.activate();}
    if(pending.size&&!frame)drain();
  });});
}
export function schedulePreview(activate:()=>void,priority:()=>number){
  const job={activate,priority};pending.add(job);if(!frame)drain();
  return()=>{pending.delete(job);if(!pending.size){cancelAnimationFrame(frame);frame=0;}};
}
/** Retain two paused recent scenes; evict the oldest before retaining another. */
export function retainPreview(key:symbol,release:()=>void){
  sleeping.delete(key);sleeping.set(key,release);
  while(sleeping.size>2){const oldest=sleeping.keys().next().value!;const evict=sleeping.get(oldest)!;sleeping.delete(oldest);evict();}
}
export function releasePreview(key:symbol){sleeping.delete(key);}
