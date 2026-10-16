'use client';

import {useEffect,useId,useMemo,useRef,useState} from 'react';



export const sentimentRanges=['1D','1W','1M','6M','1Y'] as const;

export type SentimentRange=typeof sentimentRanges[number];

export type MarketPoint={price:number;volume:number;sentiment:number;label:string};

export type SentimentProps={asset?:'bitcoin'|'ethereum'|'solana';range?:SentimentRange;onRangeChange?:(range:SentimentRange)=>void;series?:readonly MarketPoint[];amplitude?:number;speed?:number;strokeWidth?:number;fillOpacity?:number;compact?:boolean;paused?:boolean;className?:string};

const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});

export function sentimentSeries(range:SentimentRange='1Y',asset='bitcoin',amplitude=1):MarketPoint[]{

  const period=Math.max(0,sentimentRanges.indexOf(range)),base=asset==='ethereum'?3402:asset==='solana'?147:63515;

  return Array.from({length:96},(_,i)=>{

    const u=i/95,dip=Math.exp(-(((u-(.46+period*.025))/.025)**2)),wave=Math.sin(u*(8+period*2)+period*.7)*.065+Math.sin(u*32+period)*.027+Math.sin(u*91)*.009;

    const trend=.13-u*.22+wave-dip*.21+(period===0?Math.sin(u*5)*.06:0),price=base*(1+trend*clamp(amplitude,.3,1.6));

    return{price,volume:(asset==='bitcoin'?77.5e9:asset==='ethereum'?24.8e9:4.3e9)*(1+Math.sin(u*5+period)*.08),sentiment:clamp(55+trend*170,5,95),label:period===0?`${String(Math.floor(u*23)).padStart(2,'0')}:${String(Math.floor(u*59)).padStart(2,'0')}`:period===1?['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][Math.min(6,Math.floor(u*7))]:`${['Jan','Mar','May','Jul','Sep','Nov'][Math.min(5,Math.floor(u*6))]} ${Math.floor(u*27)+1}`};

  });

}

export function normalizeSentiment(series:readonly MarketPoint[]){

  if(!series.length)return sentimentSeries();

  return Array.from({length:96},(_,i)=>{const t=i/95*(series.length-1),a=series[Math.floor(t)],b=series[Math.min(series.length-1,Math.floor(t)+1)],f=t%1;return{price:clamp(a.price,0,1e9)*(1-f)+clamp(b.price,0,1e9)*f,volume:clamp(a.volume,0,1e15)*(1-f)+clamp(b.volume,0,1e15)*f,sentiment:clamp(a.sentiment,0,100)*(1-f)+clamp(b.sentiment,0,100)*f,label:(f<.5?a:b).label};});

}



export default function Sentiment({asset='bitcoin',range='1Y',onRangeChange,series,amplitude=1,speed=1,strokeWidth=1.7,fillOpacity=.12,compact=false,paused=false,className=''}:SentimentProps){

  const [period,setPeriod]=useState<SentimentRange>(range),announcement=useRef<HTMLSpanElement>(null),host=useRef<HTMLDivElement>(null),plot=useRef<HTMLDivElement>(null),line=useRef<SVGPathElement>(null),glow=useRef<SVGPathElement>(null),area=useRef<SVGPathElement>(null),clip=useRef<SVGRectElement>(null),marker=useRef<SVGGElement>(null),guide=useRef<SVGLineElement>(null),tooltip=useRef<HTMLDivElement>(null),numbers=useRef<(HTMLSpanElement|null)[]>([]),tipNumbers=useRef<(HTMLSpanElement|null)[]>([]),axes=useRef<(SVGTextElement|null)[]>([]),sync=useRef<()=>void>(()=>{});

  const id=useId().replace(/:/g,''),target=useMemo(()=>series?.length?normalizeSentiment(series):sentimentSeries(period,asset,amplitude),[series,period,asset,amplitude]);

  const options=useRef({target,paused,speed});options.current={target,paused,speed};

  useEffect(()=>setPeriod(sentimentRanges.includes(range)?range:'1Y'),[range]);useEffect(()=>sync.current(),[target,paused,speed]);

  useEffect(()=>{

    const root=host.current!,graph=plot.current!,media=matchMedia('(prefers-reduced-motion: reduce)');let raf=0,last=0,entry=compact?1:0,gone=false,visible=true,index=95,wanted=95,opacity=0,wantedOpacity=0,pinned=false,header=compact?target[95].price:0,sampleStart=0,samples=0,announced=-1,announcementAt=-Infinity;

    let announcedTarget:MarketPoint[]|null=null;
    const values=target.map(p=>({...p}));

    function draw(dt=0){

      const o=options.current,still=media.matches||o.paused,a=still?1:1-Math.exp(-dt*7),reveal=still?1:entry*entry*(3-2*entry);

      for(let i=0;i<96;i++){values[i].price+=(o.target[i].price-values[i].price)*a;values[i].volume+=(o.target[i].volume-values[i].volume)*a;values[i].sentiment+=(o.target[i].sentiment-values[i].sentiment)*a;values[i].label=o.target[i].label;}

      index+=(wanted-index)*(still?1:1-Math.exp(-dt*12));opacity+=(wantedOpacity-opacity)*(still?1:1-Math.exp(-dt*10));

      let low=Infinity,high=-Infinity;for(const p of values){low=Math.min(low,p.price);high=Math.max(high,p.price);}const padding=Math.max((high-low)*.18,high*.005,1);low=Math.max(0,low-padding);high+=padding;

      const y=(v:number)=>254-(v-low)/(high-low)*224,x=(i:number)=>52+i/95*450;

      const path=values.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(3)},${y(p.price).toFixed(3)}`).join('');line.current?.setAttribute('d',path);glow.current?.setAttribute('d',path);area.current?.setAttribute('d',`${path}L502,254L52,254Z`);clip.current?.setAttribute('width',(450*reveal).toFixed(3));

      const latest=values[95];header=still?latest.price:header+(latest.price*reveal-header)*(1-Math.exp(-dt*9));if(numbers.current[0])numbers.current[0]!.textContent=money.format(header);if(numbers.current[1])numbers.current[1]!.textContent=`$${(latest.volume/1e9).toFixed(1)}B`;if(numbers.current[2])numbers.current[2]!.textContent=String(Math.round(latest.sentiment));

      for(let i=0;i<5;i++)if(axes.current[i]){const v=high-(high-low)*i/4;axes.current[i]!.textContent=v>=1000?`${(v/1000).toFixed(v>=10000?0:1)}k`:v.toFixed(0);}

      const floor=Math.floor(index),next=Math.min(95,floor+1),f=index-floor,p=values[floor],q=values[next],value=p.price+(q.price-p.price)*f,px=x(index),py=y(value);

      marker.current?.setAttribute('transform',`translate(${px.toFixed(3)} ${py.toFixed(3)})`);marker.current?.setAttribute('opacity',opacity.toFixed(3));guide.current?.setAttribute('x1',px.toFixed(3));guide.current?.setAttribute('x2',px.toFixed(3));guide.current?.setAttribute('opacity',(opacity*.25).toFixed(3));

      if(tooltip.current){tooltip.current.style.opacity=opacity.toFixed(3);tooltip.current.setAttribute('aria-hidden',String(opacity<.05));tooltip.current.style.left=`${clamp(px/560*graph.clientWidth-65,5,Math.max(5,graph.clientWidth-150))}px`;}

      if(tipNumbers.current[0])tipNumbers.current[0]!.textContent=o.target[Math.round(index)].label;if(tipNumbers.current[1])tipNumbers.current[1]!.textContent=money.format(value);if(tipNumbers.current[2])tipNumbers.current[2]!.textContent=String(Math.round(p.sentiment+(q.sentiment-p.sentiment)*f));if(tipNumbers.current[3])tipNumbers.current[3]!.textContent=`$${((p.volume+(q.volume-p.volume)*f)/1e9).toFixed(1)}B`;

      const inspected=Math.round(wanted),sample=o.target[inspected],now=performance.now();

      if(wantedOpacity&&announcement.current&&(inspected!==announced||announcedTarget!==o.target)&&(still||now-announcementAt>=300)){announced=inspected;announcedTarget=o.target;announcementAt=now;announcement.current.textContent=`${sample.label}. Price ${money.format(sample.price)}. Sentiment ${Math.round(sample.sentiment)} out of 100. Volume $${(sample.volume/1e9).toFixed(1)} billion.`;}

      root.dataset.ready='true';root.dataset.reveal=reveal.toFixed(3);root.dataset.inspected=index.toFixed(3);root.dataset.price=header.toFixed(2);

    }

    function tick(now:number){raf=0;if(gone||!root.isConnected||!visible||document.hidden)return;if(options.current.paused||media.matches){draw();return;}const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}const dt=Math.min(.05,elapsed/1000);last=now;entry=Math.min(1,entry+dt*clamp(options.current.speed,.3,2)/1.8);draw(dt);samples++;if(now-sampleStart>=750){root.dataset.fps=(samples*1000/(now-sampleStart)).toFixed(1);sampleStart=now;samples=0;}raf=requestAnimationFrame(tick);}

    function stop(){cancelAnimationFrame(raf);raf=0;}function wake(){if(!gone&&!raf&&visible&&!document.hidden){last=sampleStart=performance.now();samples=0;raf=requestAnimationFrame(tick);}}

    function changed(){if(media.matches||options.current.paused)draw();wake();}sync.current=changed;

    function move(event:PointerEvent){if(options.current.paused)return;const box=graph.getBoundingClientRect(),u=(event.clientX-box.left)/Math.max(1,box.width);wanted=clamp((u*560-52)/450,0,1)*95;wantedOpacity=1;pinned=false;if(media.matches)draw();else wake();}

    function leave(){if(!pinned){wantedOpacity=0;if(media.matches)draw();else wake();}}

    function key(event:KeyboardEvent){if(event.target!==root||options.current.paused)return;if(!['ArrowLeft','ArrowRight','Home','End','Escape',' '].includes(event.key))return;event.preventDefault();if(event.key===' '){if(!media.matches)entry=header=0;}else if(event.key==='Escape'){pinned=false;wantedOpacity=0;}else{pinned=true;wantedOpacity=1;wanted=event.key==='Home'?0:event.key==='End'?95:clamp(wanted+(event.key==='ArrowLeft'?-3:3),0,95);}if(media.matches)draw();else wake();}

    function visibility(){stop();wake();}const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility();});observer.observe(root);graph.addEventListener('pointermove',move);graph.addEventListener('pointerdown',move);graph.addEventListener('pointerleave',leave);root.addEventListener('keydown',key);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);draw();wake();

    return()=>{gone=true;stop();sync.current=()=>{};observer.disconnect();graph.removeEventListener('pointermove',move);graph.removeEventListener('pointerdown',move);graph.removeEventListener('pointerleave',leave);root.removeEventListener('keydown',key);media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);};

  // Values morph through refs; switching a range never replaces the animation loop.

  // eslint-disable-next-line react-hooks/exhaustive-deps

  },[]);

  const label=asset==='ethereum'?'Ethereum':asset==='solana'?'Solana':'Bitcoin';

  return <div ref={host} className={`sentiment ${className}`} data-compact={compact||undefined} role="group" tabIndex={compact?-1:0} aria-label="Sentiment, an illustrative market price and sentiment chart. Move to inspect. Arrow keys, Home and End inspect samples, Escape hides details and Space replays."><style>{styles}</style><span className="sentiment-accessible">{label}, {period}. Latest illustrative price {money.format(target[95].price)}. Sentiment {Math.round(target[95].sentiment)} out of 100. Volume ${(target[95].volume/1e9).toFixed(1)} billion.</span><span ref={announcement} className="sentiment-accessible" role="status" aria-live="polite" aria-atomic="true"/><div className="sentiment-card"><div className="sentiment-title">{label}<span>Market sentiment</span></div><div className="sentiment-metrics" aria-hidden="true">{['Price','Volume','Sentiment'].map((text,i)=><div key={text}><span>{text}</span><strong ref={node=>{numbers.current[i]=node;}}>{i===0?'$0.00':i===1?'$0B':'0'}</strong></div>)}</div><div className="sentiment-ranges" role="group" aria-label="Chart period">{sentimentRanges.map(r=><button key={r} aria-pressed={period===r} onClick={()=>{setPeriod(r);onRangeChange?.(r);}}>{r}</button>)}</div><div ref={plot} className="sentiment-plot">

    <svg viewBox="0 0 560 300" aria-hidden="true"><defs><linearGradient id={`${id}-line`} x1="0" y1="30" x2="0" y2="254" gradientUnits="userSpaceOnUse"><stop stopColor="var(--sentiment-high)"/><stop offset=".48" stopColor="var(--sentiment-mid)"/><stop offset=".73" stopColor="var(--sentiment-warm)"/><stop offset="1" stopColor="var(--sentiment-low)"/></linearGradient><linearGradient id={`${id}-fill`} x2="0" y2="1"><stop stopColor="var(--sentiment-mid)" stopOpacity={fillOpacity}/><stop offset="1" stopColor="var(--sentiment-low)" stopOpacity="0"/></linearGradient><clipPath id={`${id}-clip`}><rect ref={clip} x="52" y="0" width="0" height="260"/></clipPath><filter id={`${id}-glow`}><feGaussianBlur stdDeviation="2"/></filter></defs>

    {[0,1,2,3,4].map(i=><g key={i}><line x1="52" x2="502" y1={30+i*56} y2={30+i*56} stroke="var(--sentiment-grid)" strokeDasharray="3 6"/><text ref={node=>{axes.current[i]=node;}} x="40" y={35+i*56} textAnchor="end">—</text><text x="520" y={35+i*56}>{100-i*25}</text></g>)}<g clipPath={`url(#${id}-clip)`}><path ref={area} fill={`url(#${id}-fill)`}/><path ref={glow} fill="none" stroke={`url(#${id}-line)`} strokeWidth={strokeWidth*3} opacity=".16" filter={`url(#${id}-glow)`}/><path ref={line} fill="none" stroke={`url(#${id}-line)`} strokeWidth={clamp(strokeWidth,.6,3)*1.6} strokeLinejoin="round" strokeLinecap="round"/></g><line ref={guide} y1="25" y2="254" stroke="var(--sentiment-ink)" strokeWidth="1" strokeDasharray="3 5" opacity="0"/><g ref={marker} opacity="0"><circle r="8" fill="#c7df882b"/><circle r="4" fill="#edffe1" stroke="#151713" strokeWidth="2"/></g>{[0,24,48,72,95].map(i=><text key={i} x={52+i/95*450} y="285" textAnchor="middle">{target[i].label}</text>)}</svg>

    <div ref={tooltip} className="sentiment-tooltip" aria-hidden="true"><strong ref={node=>{tipNumbers.current[0]=node;}}/><div><span>Price</span><b ref={node=>{tipNumbers.current[1]=node;}}/></div><div><span>Sentiment</span><b ref={node=>{tipNumbers.current[2]=node;}}/></div><div><span>Volume</span><b ref={node=>{tipNumbers.current[3]=node;}}/></div></div></div><p className="sentiment-note">ILLUSTRATIVE MARKET SERIES</p></div>{!compact&&<details className="sentiment-data"><summary>View data</summary><div><table><caption>{label} · {period} · illustrative data</caption><thead><tr><th scope="col">Time</th><th scope="col">Price</th><th scope="col">Sentiment</th><th scope="col">Volume</th></tr></thead><tbody>{target.map((point,i)=><tr key={i}><th scope="row">{point.label}</th><td>{money.format(point.price)}</td><td>{Math.round(point.sentiment)}</td><td>${(point.volume/1e9).toFixed(1)}B</td></tr>)}</tbody></table></div></details>}</div>;

}

const styles=`.sentiment-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.sentiment-data{position:absolute;bottom:10px;right:12px;z-index:3;font:11px sans-serif;color:var(--sentiment-muted)}.sentiment-data summary{padding:6px;cursor:pointer}.sentiment-data>div{position:absolute;bottom:32px;right:0;width:min(400px,80vw);max-height:230px;overflow:auto;padding:12px;border:1px solid var(--sentiment-grid);border-radius:12px;background:var(--sentiment-bg);color:var(--sentiment-ink)}.sentiment-data table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.sentiment-data th,.sentiment-data td{padding:6px;text-align:left}.sentiment-data caption{padding-bottom:10px}.sentiment{--sentiment-high:#b6e99c;--sentiment-mid:#c7df88;--sentiment-warm:#edc17d;--sentiment-low:#e77b8b;--sentiment-bg:#090b0a;--sentiment-ink:#eef0eb;--sentiment-muted:#737a72;--sentiment-grid:#ffffff12;position:relative;width:100%;height:100%;display:grid;place-items:center;overflow:hidden;background:#050505;container-type:size;outline:none;user-select:none}.sentiment-card{width:min(88cqw,85cqh,440px);padding:24px 22px 16px;border:1px solid #ffffff10;border-radius:24px;background:linear-gradient(#11141190,transparent 35%),var(--sentiment-bg);box-sizing:border-box;box-shadow:0 18px 60px #00000020;color:var(--sentiment-ink)}.sentiment-title{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:550;letter-spacing:-.02em}.sentiment-title>span{font-size:9px;font-weight:400;color:var(--sentiment-muted)}.sentiment-metrics{display:grid;grid-template-columns:1.35fr 1fr .8fr;gap:8px;margin-top:24px}.sentiment-metrics>div{display:flex;flex-direction:column;gap:7px}.sentiment-metrics span{font-size:10px;color:var(--sentiment-muted)}.sentiment-metrics strong{font-size:17px;font-weight:500;letter-spacing:-.025em;font-variant-numeric:tabular-nums;white-space:nowrap}.sentiment-ranges{display:flex;justify-content:space-between;margin:22px 0 12px;gap:4px}.sentiment-ranges button{position:relative;min-width:42px;min-height:32px;padding:4px 6px;border:0;background:none;color:var(--sentiment-muted);font-family:inherit;font-size:10px;cursor:pointer;transition:color 220ms linear}.sentiment-ranges button[aria-pressed=true]{color:var(--sentiment-ink)}.sentiment-ranges button:after{content:'';position:absolute;bottom:0;left:25%;right:25%;height:1px;background:#c7df88;opacity:0;transform:scaleX(.2);transition:opacity 220ms linear,transform 280ms linear}.sentiment-ranges button[aria-pressed=true]:after{opacity:1;transform:scaleX(1)}.sentiment-plot{position:relative;touch-action:pan-y}.sentiment-plot svg{display:block;width:100%;overflow:visible}.sentiment-plot svg text{fill:var(--sentiment-muted);font-family:inherit;font-size:16px}.sentiment-tooltip{position:absolute;top:1px;left:0;width:140px;padding:12px;border:1px solid #ffffff14;border-radius:14px;background:linear-gradient(#ffffff08,transparent),var(--sentiment-bg);box-shadow:0 10px 35px #00000035;pointer-events:none;opacity:0;box-sizing:border-box;font-size:10px;color:var(--sentiment-ink)}.sentiment-tooltip>strong{display:block;font-size:11px;margin-bottom:8px;font-weight:500}.sentiment-tooltip>div{display:flex;justify-content:space-between;gap:8px;line-height:1.8}.sentiment-tooltip span{color:var(--sentiment-muted)}.sentiment-tooltip b{font-weight:450;font-variant-numeric:tabular-nums}.sentiment-note{margin:14px 0 0;text-align:center;font-family:var(--font-mono),monospace;font-size:6px;letter-spacing:.15em;color:var(--sentiment-muted);opacity:.7}.sentiment:focus-visible,.sentiment button:focus-visible{outline:1px solid #fff;outline-offset:3px}.sentiment[data-compact=true] .sentiment-card{width:92%;padding:14px 10px 8px;border-radius:14px}.sentiment[data-compact=true] .sentiment-title{font-size:10px}.sentiment[data-compact=true] .sentiment-title>span,.sentiment[data-compact=true] .sentiment-note{display:none}.sentiment[data-compact=true] .sentiment-metrics{margin-top:12px;gap:4px}.sentiment[data-compact=true] .sentiment-metrics span{font-size:7px}.sentiment[data-compact=true] .sentiment-metrics strong{font-size:10px}.sentiment[data-compact=true] .sentiment-ranges{margin:8px 0 5px;gap:0}.sentiment[data-compact=true] .sentiment-ranges button{font-size:7px;min-width:20px;min-height:24px;padding:2px}.sentiment[data-compact=true] .sentiment-tooltip{font-size:8px;width:125px;padding:8px}html[data-theme=light] .sentiment{--sentiment-high:#44834a;--sentiment-mid:#7b822e;--sentiment-warm:#b27631;--sentiment-low:#b94a60;--sentiment-bg:#fafbf8;--sentiment-ink:#252921;--sentiment-muted:#747a6d;--sentiment-grid:#00000013;background:#f6f5f3}html[data-theme=light] .sentiment-card{border-color:#00000010;background:var(--sentiment-bg)}@media(prefers-reduced-motion:reduce){.sentiment-ranges button,.sentiment-ranges button:after{transition:none}}`;
