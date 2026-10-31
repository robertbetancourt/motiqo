// Record real component behavior using the development-only capture fixture.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.MOTIQO_PLAYWRIGHT||'playwright-core');
(async()=>{
 const {previewRevisions}=await import('./preview-revisions.mjs'),revisions=previewRevisions();
 const registryPath='registry/preview-videos.json',registry=JSON.parse(fs.readFileSync(registryPath)),items=registry.items;
 const selected=process.env.MOTIQO_VIDEO_IDS?.split(',');
 const queue=require('../registry/manifest.json').items.filter(item=>(!selected||selected.includes(item.id))&&(process.env.MOTIQO_VIDEO_FORCE==='1'||items[item.id]?.sourceHash!==revisions[item.id]||!['dark','light'].every(t=>fs.existsSync('public'+items[item.id]?.[t]))));
 fs.mkdirSync('screenshots/video-capture',{recursive:true});fs.mkdirSync('public/previews/videos',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});let index=0;
 async function worker(){while(index<queue.length){const {id}=queue[index++],entry={sourceHash:revisions[id]};for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width:400,height:300},deviceScaleFactor:1,recordVideo:{dir:'screenshots/video-capture',size:{width:400,height:300}}});
  const page=await context.newPage();
  try{
   const base=process.env.MOTIQO_URL||'http://127.0.0.1:3014';
   if(id==='elevation-matrix'){
    // Its old card contract is deliberately static 2D. Record the real editor instead.
    const config=encodeURIComponent(JSON.stringify({v:1,id,settings:{defaultView:'3d'}}));
    await page.goto(base+'/library?element='+id+'&config='+config,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForSelector('.workbench-preview .em-cell',{timeout:60000});
    await page.addStyleTag({content:'body *{visibility:hidden!important}.workbench-preview,.workbench-preview *{visibility:visible!important}.workbench-preview{position:fixed!important;inset:0!important;width:400px!important;height:300px!important;z-index:999999!important}.workbench-preview>.demo{width:100%!important;height:100%!important;padding:0!important}'});
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.dispatchEvent(new CustomEvent('motiqo-theme-change',{detail:theme}));let i=130;setInterval(()=>{const cell=document.querySelectorAll('.em-cell')[i++%365];cell?.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,clientX:200,clientY:140}));},900);},theme);
    await page.waitForTimeout(7000);
   }else{
    await page.goto(base+'/preview-capture/'+id+'?theme='+theme+'&frame=card&motion=1',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForSelector('[data-testid=poster-surface][data-ready=true]',{timeout:60000});await page.waitForTimeout(6500);
   }
  }finally{await context.close();}
  const source=await page.video().path(),temporary=path.resolve('screenshots/video-capture/'+id+'-'+theme+'.mp4');
  execFileSync('ffmpeg',['-y','-sseof','-6','-i',source,'-an','-vf','fps=24,scale=400:300','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart',temporary],{stdio:'ignore'});
  const bytes=fs.readFileSync(temporary),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12),name=id+'-'+theme+'-'+hash+'.mp4';fs.copyFileSync(temporary,'public/previews/videos/'+name);entry[theme]='/previews/videos/'+name;fs.unlinkSync(source);
 }items[id]=entry;fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');console.log('Recorded '+id+' ('+Object.keys(items).length+')');}}
 try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
