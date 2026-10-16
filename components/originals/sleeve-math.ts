import {spring} from 'motion';
export type Album={id:string;artist:string;title:string;artwork?:string;colors?:readonly [string,string];year?:string};
export type SleeveSpringConfig={stiffness?:number;damping?:number;mass?:number};
export const sleeveClamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export const sleeveAlbums:Album[]=[
 {id:'tidal',artist:'Arden',title:'Tidal Memory',colors:['#203f46','#b6d8b1'],year:'2026'},
 {id:'soft',artist:'Mira Sol',title:'Soft Geometry',colors:['#d67c8d','#f8dbc1'],year:'2025'},
 {id:'after',artist:'Nocturne',title:'After Hours',colors:['#171b41','#6479ce'],year:'2026'},
 {id:'sun',artist:'Elo',title:'Sun Room',colors:['#efa631','#804422'],year:'2024'},
 {id:'still',artist:'June Atlas',title:'Still Moving',colors:['#566c61','#d8d9b7'],year:'2026'},
 {id:'satin',artist:'Forma',title:'Satin Signals',colors:['#983e45','#efafa0'],year:'2025'},
 {id:'echo',artist:'Isla',title:'Echo Gardens',colors:['#436476','#a9c4c2'],year:'2026'},
 {id:'orbit',artist:'Oriel',title:'Inner Orbit',colors:['#564981','#dfb4d2'],year:'2025'},
 {id:'paper',artist:'Cedar',title:'Paper Cities',colors:['#b59d79','#ece3cd'],year:'2024'},
 {id:'blue',artist:'Low Season',title:'Blue Interval',colors:['#245a78','#83bad0'],year:'2026'},
 {id:'velvet',artist:'Sora',title:'Velvet Horizon',colors:['#452c5d','#d9a8bf'],year:'2025'},
 {id:'drift',artist:'Northline',title:'Slow Drift',colors:['#35565e','#c6d7cf'],year:'2026'},
 {id:'copper',artist:'Milo Vale',title:'Copper Light',colors:['#9a5137','#eed0a5'],year:'2024'},
 {id:'bloom',artist:'Aster',title:'Night Bloom',colors:['#28352d','#b3c5a0'],year:'2026'},
 {id:'prism',artist:'Vela',title:'Prism Studies',colors:['#3b426d','#c9b4e8'],year:'2025'},
 {id:'dune',artist:'Toma',title:'Dune Radio',colors:['#987958','#e6cf99'],year:'2026'},
 {id:'hush',artist:'Elian',title:'Hush Patterns',colors:['#75485b','#e3b9ab'],year:'2025'},
 {id:'current',artist:'Fjord',title:'Quiet Current',colors:['#244d68','#94bec5'],year:'2024'},
 {id:'chrome',artist:'Solis',title:'Chrome Days',colors:['#535a68','#d5d4c7'],year:'2026'},
 {id:'ember',artist:'Maren',title:'Last Ember',colors:['#7c3736','#f0ba87'],year:'2026'},
];
export type SleeveSpring={value:number;velocity:number;target:number;elapsed:number;signature:string;generator:ReturnType<typeof spring>|null};
export const sleeveSpring=(value:number):SleeveSpring=>({value,velocity:0,target:value,elapsed:0,signature:'',generator:null});
export function sleeveStep(s:SleeveSpring,target:number,dt:number,config:SleeveSpringConfig={},instant=false){
 const stiffness=sleeveClamp(config.stiffness??140,40,400),damping=sleeveClamp(config.damping??22,8,50),mass=sleeveClamp(config.mass??1,.5,3),signature=`${stiffness},${damping},${mass}`;
 if(instant){s.value=s.target=target;s.velocity=0;s.generator=null;return target;}
 if(target!==s.target||signature!==s.signature){s.generator=spring({keyframes:[s.value,target],velocity:s.velocity,stiffness,damping,mass,restDelta:.001,restSpeed:.01});s.target=target;s.signature=signature;s.elapsed=0;}
 if(s.generator&&dt>0){const previous=s.value;s.elapsed+=dt*1000;const next=s.generator.next(s.elapsed);s.value=next.value;s.velocity=(s.value-previous)/dt;if(next.done){s.value=target;s.velocity=0;s.generator=null;}}return s.value;
}
export function sleeveLayout(index:number,cursor:number,selected:number|null,size:number,tilt=-28){
 const relative=index-cursor,hero=index===selected,rank=selected!==null&&index>selected?index-1:index;
 const depth=rank/(rank+5);
 if(selected!==null)return{y:hero?size*.16:size*(.91-depth*.24),scale:hero?1:.88-depth*.1,angle:hero?0:tilt*.65,z:hero?48:24-depth*20,opacity:1};
 return{y:size*.80-relative*size*.17,scale:sleeveClamp(1-relative*.045,.66,1.1),angle:tilt,z:45-relative*10,opacity:relative>5.8?sleeveClamp(1-(relative-5.8)/1.2,0,1):relative<-.7?sleeveClamp(1+(relative+.7)/1.4,0,1):1};
}
