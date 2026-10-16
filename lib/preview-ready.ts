/** Wait for a real canvas frame, or two painted frames of an SVG/DOM preview. */
export function observePreviewReady(root:HTMLElement,ready:()=>void,failed:()=>void=()=>{}){
  let frame=0,settled=false;
  const observer=new MutationObserver(check);
  function finish(callback:()=>void){
    if(settled)return;settled=true;observer.disconnect();cancelAnimationFrame(frame);callback();
  }
  function check(){
    if(settled||frame||!root.isConnected)return;
    if(root.querySelector('[data-failed="true"],[data-gl="off"],.gc-failed')){finish(failed);return;}
    const content=root.querySelector('.demo')?.firstElementChild;
    if(!content)return;
    const canvas=root.querySelector('canvas');
    if(canvas&&!root.querySelector('[data-ready="true"],[data-gl="on"],.gc-ready,.crate-stage.is-ready'))return;
    frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>finish(ready));});
  }
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-ready','data-gl','data-failed','class']});
  check();
  return()=>{settled=true;observer.disconnect();cancelAnimationFrame(frame);};
}
