import type {ElementId} from '@/lib/catalog';

// Only card previews opt in. Reuse each scene's input handling without changing exports.
const pointerTargets:Partial<Record<ElementId,string>>={
  'stratum':'.stratum',
  'atelier':'.atelier',
  'inkshift':'.inkshift',
  'helix':'.helix',
  'pleat':'.pleat',
  'gyro':'.gyro',
  'drawer':'.drawer',
  'arbor':'.arbor',
  'lantern':'.lantern',
  'crate':'.crate-stage',
  'pulse':'.pulse',
  'event-horizon':'.liquid-relic',
  'liquid-relic':'.liquid-relic',
  'sentiment':'.sentiment-plot',
  'opaline-orb':'.mq-opaline',
  'orbit-agent':'.mq-orbit-agent',
  'holdings':'.holdings-segment path[stroke="transparent"]',
  'glow-nav':'.gn-link',
  'optical-button':'.mq-optical-button',
  'prism-button':'.mq-optical-button',
  'spectral-button':'.mq-optical-button',
  'caustic-button':'.mq-optical-button',
  'lenticular-button':'.mq-optical-button',
  'photon-button':'.mq-optical-button',
};

export function startPreviewDemo(root:HTMLElement,id:ElementId){
  const selector=id==='sleeve'?'.sleeve-viewport':pointerTargets[id];
  if(!selector)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0,time=0,entered=false,target:HTMLElement|null=null,step=-1;
  const reactInput=id.endsWith('-button')||id==='orbit-agent'||id==='holdings'||id==='glow-nav';
  function pointer(type:string,bubbles=false,x=.5,y=.5){
    if(!target)return;
    const box=target.getBoundingClientRect();
    target.dispatchEvent(new PointerEvent(type,{bubbles:bubbles&&reactInput,pointerId:1,pointerType:'mouse',isPrimary:true,clientX:box.left+box.width*x,clientY:box.top+box.height*y}));
  }
  function leave(){if(entered){pointer('pointerout',true);pointer('pointerleave');entered=false;}}
  function running(){return root.isConnected&&!document.hidden&&!media.matches;}
  function tick(now:number){
    frame=0;if(!running())return;
    if(now-last<1000/60-.5){frame=requestAnimationFrame(tick);return;}
    const dt=Math.min(.1,(now-last)/1000);last=now;time+=dt;
    if(id==='holdings'||id==='glow-nav'){
      const targets=root.querySelectorAll<HTMLElement>(selector!),next=Math.floor(time/2.4)%(targets.length+1);
      if(next!==step){leave();step=next;target=targets[next]??null;
        if(target){pointer('pointerover',true);pointer('pointerenter');entered=true;
          if(id==='glow-nav')target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
        }
      }
    }else target=root.querySelector<HTMLElement>(selector!);
    if(target){
      if(id==='sleeve'){
        // Browse three records and return; never scroll the page or trigger playback.
        const cursor=Number(target.closest<HTMLElement>('.sleeve')?.dataset.cursor??0);
        const wanted=1.5*(1-Math.cos(time*Math.PI/5));
        target.dispatchEvent(new WheelEvent('wheel',{deltaY:(wanted-cursor)*250,deltaMode:0,cancelable:true}));
      }else if(id!=='holdings'&&id!=='glow-nav'){
        const phase=time%8;
        if(id==='atelier'||phase<5.5){
          // A closed, slow path keeps the brush continuous across loop boundaries.
          const x=id==='atelier'?.5+Math.sin(time*Math.PI/6)*.24:.5+Math.sin(phase*1.15)*.28;
          const y=id==='atelier'?.55+Math.sin(time*Math.PI/3)*.16:.52+Math.sin(phase*1.7)*.18;
          if(!entered){pointer('pointerover',true,x,y);pointer('pointerenter',false,x,y);entered=true;
            if(id==='orbit-agent')target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
          }
          pointer('pointermove',true,x,y);
        }else leave();
      }
    }
    frame=requestAnimationFrame(tick);
  }
  function sync(){cancelAnimationFrame(frame);frame=0;if(running()){last=performance.now();frame=requestAnimationFrame(tick);}else leave();}
  document.addEventListener('visibilitychange',sync);media.addEventListener('change',sync);sync();
  return()=>{cancelAnimationFrame(frame);leave();document.removeEventListener('visibilitychange',sync);media.removeEventListener('change',sync);};
}
