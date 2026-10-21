export const MAX_AUTOMATIC_PREVIEWS = 4;
type Candidate = {visible:boolean;engaged:boolean;granted:boolean;priority:()=>number;onChange:(granted:boolean)=>void};
const candidates = new Set<Candidate>();

function reconcile(){
  const ranked=[...candidates].filter(item=>item.visible).map(item=>({item,rank:item.priority()}))
    .sort((a,b)=>Number(b.item.engaged)-Number(a.item.engaged)||a.rank-b.rank);
  const selected=new Set(ranked.slice(0,MAX_AUTOMATIC_PREVIEWS).map(({item})=>item));
  // Revoke first so a newly selected preview never overlaps an outgoing one.
  for(const item of candidates)if(item.granted&&!selected.has(item)){item.granted=false;item.onChange(false);}
  for(const item of selected)if(!item.granted){item.granted=true;item.onChange(true);}
}

/** One shared budget for homepage rails and Library; focus and hover take priority. */
export function registerPreviewCandidate(priority:()=>number,onChange:(granted:boolean)=>void){
  const candidate:Candidate={visible:false,engaged:false,granted:false,priority,onChange};
  candidates.add(candidate);
  return {
    update(visible:boolean,engaged=false){candidate.visible=visible;candidate.engaged=engaged;reconcile();},
    dispose(){const granted=candidate.granted;candidates.delete(candidate);candidate.granted=false;if(granted)onChange(false);reconcile();},
  };
}
