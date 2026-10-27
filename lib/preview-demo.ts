import type {ElementId} from '@/lib/catalog';

// Only card previews opt in. Reuse each scene's input handling without changing exports.
const pointerTargets:Partial<Record<ElementId,string>>={
  'titanium-card':'.ti-space',
  'ink-headline':'.ih-replay',
  'lumen-button':'.lumen-button',
  'quantum-core':'.mq-quantum',
  'orbit-stage-hero':'.orbit-stage-hero',
  'halftone-wordmark':'.hw-field canvas',
  'signal-grid':'.sg-plot',
  'sonic-aperture':'.sonic-aperture',
  'elevation-matrix':'.em-cell',
  'prism-core':'.prism-core',
  'aperture-loader':'.aperture-loader',
  'stratum':'.stratum',
  'atelier':'.atelier',
  'inkshift':'.inkshift',
  'helix':'.helix',
  'pleat':'.pleat',
  'gyro':'.gyro',
  'district':'.district',
  'liquid-sculpture':'.liquid-form',
  'gilded-signal':'.gc-canvas',
  'drawer':'.drawer',
  'arbor':'.arbor',
  'lantern':'.lantern',
  'crate':'.crate-stage',
  'pulse':'.pulse',
  'event-horizon':'.prism-bloom',
  'liquid-artifact-hero':'.lah-root',
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
  const reactInput=id==='orbit-stage-hero'||id==='titanium-card'||id==='signal-grid'||id.endsWith('-button')||id==='orbit-agent'||id==='holdings'||id==='glow-nav'||id==='elevation-matrix';
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
    if(id==='holdings'||id==='glow-nav'||id==='elevation-matrix'){
      const targets=root.querySelectorAll<HTMLElement>(selector!),next=Math.floor(time/(id==='holdings'?4.8:id==='elevation-matrix'?1.2:2.4))%(targets.length+1);
      if(next!==step){leave();step=next;target=targets[next]??null;
        if(target){pointer('pointerover',true);pointer('pointerenter');entered=true;
          if(id==='glow-nav')target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
        }
      }
    }else target=root.querySelector<HTMLElement>(selector!);
    if(target){
      if(id==='ink-headline'||id==='lumen-button'){
        const next=Math.floor(time/(id==='ink-headline'?8:3));
        if(next!==step){step=next;target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}
      }else if(id==='titanium-card'){
        const next=Math.floor(time/5);
        if(next!==step){step=next;root.querySelector('.ti-card')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));}
        if(!entered){pointer('pointerover',true);entered=true;}
        pointer('pointermove',true,.5+Math.sin(time)*.25,.5+Math.cos(time*.7)*.2);
      }else if(id==='sonic-aperture'){
        const button=target.querySelector<HTMLButtonElement>('.sa-mic');
        const open=time%12>=1.5&&time%12<8;
        if(button&&button.getAttribute('aria-pressed')!==String(open))button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      }else if(id==='sleeve'){
        // Browse, lift a sleeve, return it, then continue through the collection.
        const cursor=Number(target.closest<HTMLElement>('.sleeve')?.dataset.cursor??0);
        const phase=time%24,album=3+Math.floor(time/24)%3,stage=phase<6?0:phase<10?1:2;
        const wanted=phase<6?album*(1-Math.cos(phase*Math.PI/6))/2:phase<12?album:album*(1+Math.cos((phase-12)*Math.PI/12))/2;
        if(stage!==step){const starting=step<0;step=stage;if(stage===1)root.querySelector<HTMLElement>(`.sleeve-card[data-album="${album}"] .sleeve-art`)?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));else if(starting||stage===2)root.querySelector<HTMLElement>('.sleeve-card[data-active=true] .sleeve-art')?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}
        if(stage!==1)target.dispatchEvent(new WheelEvent('wheel',{deltaY:(wanted-cursor)*250,deltaMode:0,cancelable:true}));
      }else if(id!=='holdings'&&id!=='glow-nav'){
        if(id.endsWith('-button')){const turn=Math.floor(time/8);if(turn!==step){step=turn;target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));}}
        if(id==='gilded-signal'){const turn=Math.floor(time/10);if(turn!==step){if(turn>0)target.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));step=turn;}}
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
