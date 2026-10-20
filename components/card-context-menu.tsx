'use client';

import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion,useIsPresent,useReducedMotion} from 'motion/react';
import {ArrowUpRight,Bookmark,Check,ChevronRight,Code2,Copy,Download,Link,Sparkles} from 'lucide-react';
import {moodsFor,normalizeSettings,type Settings} from '@/lib/element-controls';
import type {LibraryElement} from '@/lib/catalog';

export type CardMenuPosition={element:LibraryElement;x:number;y:number;trigger:HTMLElement};
export default function CardContextMenu({position,href,saved,settings,onClose,onOpen,onSave,onShare,onPrompt,onMood}:{
  position:CardMenuPosition;href:string;saved:boolean;settings?:Settings;onClose:(restore?:boolean)=>void;
  onOpen:(tab:'preview'|'code')=>void;onSave:()=>void;onShare:()=>void;onPrompt:()=>void;onMood:(settings:Settings)=>void;
}){
  const menu=useRef<HTMLDivElement>(null),submenu=useRef<HTMLDivElement>(null),moodTrigger=useRef<HTMLButtonElement>(null);
  const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),focusSubmenu=useRef(false),submenuId=useId();
  const [moodOpen,setMoodOpen]=useState(false),[point,setPoint]=useState({x:position.x,y:position.y});
  const [subpoint,setSubpoint]=useState({x:0,y:0,side:'right'});
  const reduced=useReducedMotion(),present=useIsPresent(),moods=moodsFor(position.element.id);
  const spring={type:'spring' as const,stiffness:620,damping:38,mass:.8};
  function cancelClose(){if(closeTimer.current){clearTimeout(closeTimer.current);closeTimer.current=null;}}
  function closeSubmenu(restore=false){cancelClose();setMoodOpen(false);if(restore)moodTrigger.current?.focus({preventScroll:true});}
  function scheduleClose(){cancelClose();closeTimer.current=setTimeout(()=>{closeTimer.current=null;setMoodOpen(false);},220);}
  function openSubmenu(focus=false){cancelClose();focusSubmenu.current=focus;setMoodOpen(true);if(focus&&moodOpen)submenu.current?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus({preventScroll:true});}
  useLayoutEffect(()=>{
    const node=menu.current!,box=node.getBoundingClientRect();
    setMoodOpen(false);cancelClose();
    setPoint({x:Math.max(8,Math.min(position.x,window.innerWidth-(node.offsetWidth||box.width)-8)),y:Math.max(8,Math.min(position.y,window.innerHeight-(node.offsetHeight||box.height)-8))});
    node.querySelector<HTMLElement>('[role="menuitem"]')?.focus({preventScroll:true});
  },[position]);
  useLayoutEffect(()=>{
    if(!moodOpen||!submenu.current||!moodTrigger.current)return;
    const box=submenu.current.getBoundingClientRect(),parent=menu.current!,anchor=moodTrigger.current.getBoundingClientRect(),width=submenu.current.offsetWidth||box.width,height=submenu.current.offsetHeight||box.height,parentWidth=parent.offsetWidth||parent.getBoundingClientRect().width;
    const side=point.x+parentWidth+width+6>window.innerWidth-8?'left':'right';
    setSubpoint({x:Math.max(8,Math.min(side==='left'?point.x-width-6:point.x+parentWidth+6,window.innerWidth-width-8)),y:Math.max(8,Math.min(anchor.top-5,window.innerHeight-height-8)),side});
    if(focusSubmenu.current){focusSubmenu.current=false;submenu.current.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus({preventScroll:true});}
  },[moodOpen,point]);
  useEffect(()=>{
    if(!present)return;
    function outside(event:globalThis.PointerEvent){const target=event.target as Node;if(!menu.current?.contains(target)&&!submenu.current?.contains(target))onClose();}
    function dismiss(){onClose();}
    function scroll(event:Event){if(event.target!==menu.current&&event.target!==submenu.current)onClose();}
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',dismiss);window.addEventListener('scroll',scroll,true);window.addEventListener('blur',dismiss);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',scroll,true);window.removeEventListener('blur',dismiss);};
  },[onClose,present]);
  useEffect(()=>()=>cancelClose(),[]);
  function action(run:()=>void){onClose(true);run();}
  function key(event:KeyboardEvent<HTMLDivElement>){
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]')),index=items.indexOf(document.activeElement as HTMLElement),insideSubmenu=event.currentTarget===submenu.current;
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();if(!insideSubmenu&&moodOpen)closeSubmenu();items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}
    else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(moodOpen)closeSubmenu(true);else onClose(true);}
    else if(event.key==='ArrowLeft'&&insideSubmenu){event.preventDefault();closeSubmenu(true);}
    else if(event.key==='Tab'){event.preventDefault();onClose(true);}
    else if(event.key===' '&&document.activeElement?.tagName==='A'){event.preventDefault();(document.activeElement as HTMLAnchorElement).click();}
  }
  function hoverItem(event:PointerEvent<HTMLElement>){if(event.pointerType==='touch')return;event.currentTarget.focus({preventScroll:true});scheduleClose();}
  const chosen=JSON.stringify(normalizeSettings(position.element.id,settings));
  const exit={opacity:0,scale:.98,pointerEvents:'none' as const,transition:{duration:reduced?0:.12}};
  return createPortal(<>
    <motion.div ref={menu} className="card-context-menu" role="menu" aria-label={`${position.element.title} actions`} style={{left:point.x,top:point.y,pointerEvents:present?'auto':'none',transformOrigin:'top left'}} initial={reduced?false:{opacity:0,scale:.96,y:4}} animate={{opacity:1,scale:1,y:0}} exit={exit} transition={reduced?{duration:0}:spring} onContextMenu={e=>e.preventDefault()} onKeyDown={key} onPointerLeave={scheduleClose}>
      <a role="menuitem" href={href} target="_blank" rel="noopener noreferrer" onPointerEnter={hoverItem} onClick={()=>onClose(true)}><ArrowUpRight size={15}/>Open in new tab</a>
      <a role="menuitem" href={`/api/components/${position.element.id}${settings?`?config=${encodeURIComponent(JSON.stringify({v:1,id:position.element.id,settings}))}`:''}`} download onPointerEnter={hoverItem} onClick={()=>onClose(true)}><Download size={15}/>Download</a>
      <button role="menuitem" onPointerEnter={hoverItem} onClick={()=>action(onShare)}><Link size={15}/>Share · Copy link</button>
      <div role="separator"/>
      {!!moods.length&&<button ref={moodTrigger} role="menuitem" aria-haspopup="menu" aria-controls={moodOpen?submenuId:undefined} aria-expanded={moodOpen} data-submenu-open={moodOpen||undefined} onPointerEnter={event=>{if(event.pointerType!=='touch'){event.currentTarget.focus({preventScroll:true});openSubmenu();}}} onClick={()=>openSubmenu(true)} onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();openSubmenu(true);}}}><Sparkles size={15}/>Mood<ChevronRight className="menu-trailing" size={13}/></button>}
      <button role="menuitem" onPointerEnter={hoverItem} onClick={()=>action(onPrompt)}><Copy size={15}/>Copy prompt</button>
      <button role="menuitem" onPointerEnter={hoverItem} onClick={()=>action(()=>onOpen('code'))}><Code2 size={15}/>View source</button>
      <div role="separator"/>
      <button role="menuitem" onPointerEnter={hoverItem} onClick={()=>action(onSave)}><Bookmark size={15} fill={saved?'currentColor':'none'}/>{saved?'Remove from saved':'Save'}</button>
    </motion.div>
    <AnimatePresence>
      {moodOpen&&present&&<motion.div ref={submenu} id={submenuId} className="card-context-menu card-context-submenu" role="menu" aria-label="Mood" data-side={subpoint.side} style={{left:subpoint.x,top:subpoint.y,transformOrigin:subpoint.side==='left'?'right top':'left top'}} initial={reduced?false:{opacity:0,scale:.96,x:subpoint.side==='left'?5:-5}} animate={{opacity:1,scale:1,x:0}} exit={exit} transition={reduced?{duration:0}:spring} onContextMenu={e=>e.preventDefault()} onKeyDown={key} onPointerEnter={cancelClose} onPointerLeave={scheduleClose}>
        {[{id:'default',label:'Default',settings:{}},...moods].map(mood=><button key={mood.id} role="menuitemradio" aria-checked={chosen===JSON.stringify(normalizeSettings(position.element.id,mood.settings))} onPointerEnter={event=>{if(event.pointerType!=='touch')event.currentTarget.focus({preventScroll:true});}} onClick={()=>action(()=>onMood(normalizeSettings(position.element.id,mood.settings)))}><span className="menu-check">{chosen===JSON.stringify(normalizeSettings(position.element.id,mood.settings))&&<Check size={14}/>}</span>{mood.label}</button>)}
      </motion.div>}
    </AnimatePresence>
  </>,document.body);
}
