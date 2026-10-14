'use client';
import {Sun,Monitor,Moon} from 'lucide-react';
import {useTheme,type ThemePreference} from './theme-provider';
const choices=[{id:'light',label:'Light',icon:Sun},{id:'system',label:'Auto',icon:Monitor},{id:'dark',label:'Dark',icon:Moon}] as const;
export default function ThemeControl(){
 const {preference,setTheme}=useTheme(),index=choices.findIndex(choice=>choice.id===preference);
 return <div className="theme-segment" role="group" aria-label="Color theme" style={{'--theme-index':index} as React.CSSProperties}>
  <span className="theme-thumb" aria-hidden="true"/>{choices.map((choice,i)=><button key={choice.id} aria-pressed={preference===choice.id} onClick={()=>setTheme(choice.id)} onKeyDown={event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowLeft'?-1:1)+3)%3;
   setTheme(choices[next].id as ThemePreference);(event.currentTarget.parentElement?.querySelectorAll('button')[next] as HTMLButtonElement)?.focus();
  }}><choice.icon size={14}/><span>{choice.label}</span></button>)}
 </div>;
}
