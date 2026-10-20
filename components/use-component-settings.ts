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
      // Upgrade former autoplay defaults once, retaining other saved edits.
      // Explicit shared configurations and subsequent autoplay choices still win.
      if(!shared&&(id==='water-ripple-carousel'||id==='aperture-carousel')){
        try{
          const autoplay=defaultsFor(id).autoplay;
          const migrationKey=storageKey(id)+':autoplay-default-'+autoplay;
          if(!window.localStorage.getItem(migrationKey)){
            if(stored&&typeof stored==='object'&&!Array.isArray(stored)&&[0,4000].includes(Number((stored as Settings).autoplay))){
              stored={...stored,autoplay};
              window.localStorage.setItem(storageKey(id),JSON.stringify(stored));
            }
            window.localStorage.setItem(migrationKey,'1');
          }
        }catch{}
      }
      if(!shared&&id==='elastic-showcase'){
        try{
          const migrationKey=storageKey(id)+':dark-default-v2';
          if(!window.localStorage.getItem(migrationKey)){
            if(stored&&typeof stored==='object'&&!Array.isArray(stored)&&(stored as Settings).backgroundColor==='#fdfce6'){
              stored={...stored,backgroundColor:defaultsFor(id).backgroundColor,textColor:defaultsFor(id).textColor};
              window.localStorage.setItem(storageKey(id),JSON.stringify(stored));
            }
            window.localStorage.setItem(migrationKey,'1');
          }
        }catch{}
      }
      if(!shared&&id==='elevation-matrix'){
        try{
          const migrationKey=storageKey(id)+':2d-default-v2';
          if(!window.localStorage.getItem(migrationKey)){
            if(stored&&typeof stored==='object'&&!Array.isArray(stored)&&(stored as Settings).defaultView==='3d'){
              stored={...stored,defaultView:'2d'};
              window.localStorage.setItem(storageKey(id),JSON.stringify(stored));
            }
            window.localStorage.setItem(migrationKey,'1');
          }
        }catch{}
      }
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
