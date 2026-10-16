'use client';
import {useEffect,useLayoutEffect,useState,useCallback} from 'react';
import type {ElementId} from '@/lib/catalog';
import {defaultsFor,normalizeSettings,decodeSettings,configurationUrl,type Settings} from '@/lib/element-controls';

const storageKey=(id:ElementId)=>`motiqo-settings-v1:${id}`;
export default function useComponentSettings(id:ElementId,initial?:Settings){
  const [settings,setSettings]=useState<Settings>(()=>normalizeSettings(id,initial));
  const [ready,setReady]=useState(false);
  useLayoutEffect(()=>{
    function restore(){
      const params=new URL(window.location.href).searchParams;
      const shared=decodeSettings(id,params.get('config'));
      let stored:unknown;try{stored=JSON.parse(window.localStorage.getItem(storageKey(id))??'null');}catch{}
      setSettings(shared??normalizeSettings(id,stored));setReady(true);
    }
    restore();window.addEventListener('popstate',restore);
    return()=>window.removeEventListener('popstate',restore);
  },[id]);
  useEffect(()=>{
    if(!ready)return;
    try{window.localStorage.setItem(storageKey(id),JSON.stringify(settings));}catch{}
    // replaceState keeps navigation local and does not add history entries.
    const url=new URL(window.location.href);
    if(url.searchParams.get('element')===id)window.history.replaceState(window.history.state,'',configurationUrl(url.href,id,settings));
  },[id,ready,settings]);
  const update=useCallback((patch:Settings)=>setSettings(previous=>normalizeSettings(id,{...previous,...patch})),[id]);
  const reset=useCallback(()=>setSettings(defaultsFor(id)),[id]);
  return{settings,update,reset};
}
