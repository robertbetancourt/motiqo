'use client';
import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
export type ThemePreference='light'|'system'|'dark';
const valid=(value:string|null):value is ThemePreference=>value==='light'||value==='dark'||value==='system';
export const themeBootScript=`(()=>{try{const p=localStorage.getItem('motiqo-theme');const t=['light','dark','system'].includes(p)?p:'dark';const r=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.dataset.theme=r;document.documentElement.dataset.themePreference=t;document.documentElement.style.colorScheme=r;}catch{}})();`;
const ThemeContext=createContext<{preference:ThemePreference;setTheme:(theme:ThemePreference)=>void}>({preference:'dark',setTheme:()=>{}});
export const useTheme=()=>useContext(ThemeContext);
export default function ThemeProvider({children}:{children:ReactNode}){
  const [preference,setPreference]=useState<ThemePreference>('dark');
  const apply=useCallback((choice:ThemePreference)=>{
    const resolved=choice==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):choice;
    document.documentElement.dataset.theme=resolved;
    document.documentElement.dataset.themePreference=choice;
    document.documentElement.style.colorScheme=resolved;
    setPreference(choice);
    document.dispatchEvent(new CustomEvent('motiqo-theme-change',{detail:resolved}));
  },[]);
  const setTheme=useCallback((choice:ThemePreference)=>{try{localStorage.setItem('motiqo-theme',choice);}catch{}apply(choice);},[apply]);
  useEffect(()=>{
    const media=matchMedia('(prefers-color-scheme: dark)');
    const read=()=>{let choice:ThemePreference='dark';try{const stored=localStorage.getItem('motiqo-theme');if(valid(stored))choice=stored;}catch{}return choice;};
    const update=()=>apply(read());
    const storage=(event:StorageEvent)=>{if(event.key==='motiqo-theme'||event.key===null)update();};
    update();media.addEventListener('change',update);window.addEventListener('storage',storage);
    return()=>{media.removeEventListener('change',update);window.removeEventListener('storage',storage);};
  },[apply]);
  return <ThemeContext.Provider value={{preference,setTheme}}>{children}</ThemeContext.Provider>;
}
