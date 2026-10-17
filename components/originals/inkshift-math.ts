export const inkshiftWords=['Mo**ti**qo','D**esi**gn','M**oti**on','Cr**eati**ve'] as const;
export function kineticWords(words:readonly string[]){const valid=words.filter(w=>typeof w==='string'&&w.trim()).slice(0,12).map(w=>w.trim().slice(0,64));return valid.length?valid:[...inkshiftWords];}
export function kineticLetters(word:string){
 const match=/^(.*?)\*\*(.*?)\*\*(.*)$/.exec(word);
 if(match)return match.slice(1).flatMap((part,i)=>Array.from(part).map(char=>({char,weight:i===1?800:100})));
 const chars=Array.from(word.replaceAll('**','')),start=Math.floor(chars.length*.28),end=Math.ceil(chars.length*.72);
 return chars.map((char,i)=>({char,weight:i>=start&&i<end?800:100}));
}
export type KineticState={position:number;velocity:number;index:number;lastInput:number;lastCycle:number};
export function kineticAdvance(state:KineticState,dt:number,time:number,count:number,auto:boolean){
 state.position+=state.velocity*dt;state.velocity*=Math.exp(-dt*6);
 if(auto&&time-state.lastInput>2.5&&time-state.lastCycle>4.2){state.position=Math.round(state.position)+1;state.velocity=0;state.lastCycle=time;}
 const index=((Math.round(state.position)%count)+count)%count,changed=index!==state.index;
 if(changed){state.index=index;state.lastCycle=time;}
 return changed;
}
export const kineticEase=(t:number)=>1-(1-Math.max(0,Math.min(1,t)))**4;
