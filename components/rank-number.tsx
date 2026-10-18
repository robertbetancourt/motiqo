'use client';

import {useEffect,useRef,useState} from 'react';

/** A transparent glyph with demand-driven spectral light on its rim. */
export default function RankNumber({value,className,still}:{value:number;className:string;still:boolean}){
  const host=useRef<HTMLSpanElement>(null),canvas=useRef<HTMLCanvasElement>(null),[ready,setReady]=useState(false);
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,ctx=surface.getContext('2d');
    if(!ctx)return;
    let frame=0,disposed=false,active=false,light=0,last=0,phase=0,width=0,height=0,font='',size=0;
    const cursor={x:0,y:0};
    function draw(time:number){
      frame=0;if(disposed)return;
      const dt=Math.min((time-last)/1000||0,.04);last=time;
      light+=(Number(active)-light)*(1-Math.exp(-dt*12));phase+=still?0:dt*.7;
      ctx!.clearRect(0,0,width,height);ctx!.font=font;ctx!.textBaseline='alphabetic';ctx!.lineJoin='round';
      const text=String(value),metrics=ctx!.measureText(text),y=(height+metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
      ctx!.strokeStyle=getComputedStyle(root).getPropertyValue('-webkit-text-stroke-color');ctx!.lineWidth=.85;ctx!.strokeText(text,3,y);
      if(light>.005){
        const cx=Math.min(metrics.width*.5,cursor.x),cy=height*.5,gradient=ctx!.createConicGradient(phase,cx,cy);
        // OpticalButton's travelling spectral lobes, kept on the glyph's edge.
        for(let i=0;i<=48;i++){
          const p=i/48,lobe=Math.pow(Math.max(0,Math.cos(p*Math.PI*2)),4),counter=Math.pow(Math.max(0,Math.cos(p*Math.PI*2+2.8)),8)*.22;
          gradient.addColorStop(p,`hsl(${(p*720+phase*45)%360} 95% ${5+(lobe+counter)*63}%)`);
        }
        ctx!.globalAlpha=light;ctx!.strokeStyle=gradient;ctx!.lineWidth=2.1;ctx!.strokeText(text,3,y);
        ctx!.globalAlpha=light*.36;ctx!.filter='blur(2px)';ctx!.lineWidth=3.2;ctx!.strokeText(text,3,y);ctx!.filter='none';
        const spot=ctx!.createRadialGradient(cursor.x,cursor.y,0,cursor.x,cursor.y,size*.55);
        spot.addColorStop(0,'#eaf6ff');spot.addColorStop(.2,'#98cfff99');spot.addColorStop(1,'#98cfff00');
        ctx!.globalAlpha=light*.8;ctx!.strokeStyle=spot;ctx!.lineWidth=.8;ctx!.strokeText(text,3,y);ctx!.globalAlpha=1;
      }
      if(!still&&(active||light>.005))frame=requestAnimationFrame(draw);
    }
    function wake(){if(!frame){last=performance.now()-16;frame=requestAnimationFrame(draw);}}
    function resize(){
      const box=root.getBoundingClientRect(),style=getComputedStyle(root),ratio=Math.min(devicePixelRatio||1,2);
      width=box.width;height=box.height;size=parseFloat(style.fontSize);font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      surface.width=Math.ceil(width*ratio);surface.height=Math.ceil(height*ratio);ctx!.setTransform(ratio,0,0,ratio,0,0);ctx!.letterSpacing=style.letterSpacing;cursor.x=width*.5;cursor.y=height*.5;wake();
    }
    function enter(){active=true;if(still)light=1;wake();}
    function leave(){active=false;if(still)light=0;wake();}
    function move(event:PointerEvent){const box=root.getBoundingClientRect();cursor.x=event.clientX-box.left;cursor.y=event.clientY-box.top;wake();}
    const item=root.parentElement!;
    item.addEventListener('pointerenter',enter);item.addEventListener('pointerleave',leave);item.addEventListener('pointermove',move);item.addEventListener('focusin',enter);item.addEventListener('focusout',leave);
    const observer=new ResizeObserver(resize);observer.observe(root);
    void document.fonts.ready.then(()=>{if(!disposed){resize();setReady(true);}});
    const themeObserver=new MutationObserver(wake);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();themeObserver.disconnect();item.removeEventListener('pointerenter',enter);item.removeEventListener('pointerleave',leave);item.removeEventListener('pointermove',move);item.removeEventListener('focusin',enter);item.removeEventListener('focusout',leave);};
  },[value,still]);
  return <span ref={host} className={className} aria-hidden="true" data-ready={ready||undefined}><span>{value}</span><canvas ref={canvas}/></span>;
}
