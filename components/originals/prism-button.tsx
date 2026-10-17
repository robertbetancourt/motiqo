'use client';
import {OpticalButton,opticalDefaults,type OpticalButtonProps,type OpticalPlaygroundProps} from './optical-button';
import {prismFragment} from './prism-shaders';

export const prismDefaults={...opticalDefaults,auraWidth:6,centerClarity:96};
export type PrismButtonProps=Omit<OpticalButtonProps,'fragmentShader'|'iconOnly'>;

/** The first optical study, retained as its own independently usable button. */
export function PrismButton({children,style,...props}:PrismButtonProps){
 return <OpticalButton {...prismDefaults} {...props} fragmentShader={prismFragment}
  style={{width:236,height:62,fontSize:14,...style}}>{children??'Prism Button'}</OpticalButton>;
}
export default function PrismPreview({compact=false,paused=false,perspective=false,className='',...settings}:OpticalPlaygroundProps){
 return <div className={`mq-prism-preview ${className}`} data-compact={compact||undefined}>
  <style>{`.mq-prism-preview{position:relative;display:grid;place-items:center;width:100%;height:100%;min-height:180px;overflow:hidden;perspective:900px;background-color:#08080a;background-image:linear-gradient(#14141888 1px,transparent 1px),linear-gradient(90deg,#14141888 1px,transparent 1px);background-size:44px 44px}.mq-prism-pose{transition:transform .5s ease;transform-style:preserve-3d}.mq-prism-pose[data-tilted]{transform:rotateX(24deg) rotateY(-14deg) rotateZ(-5deg)}.mq-prism-preview[data-compact] .mq-prism-pose{scale:.94}@media(prefers-reduced-motion:reduce){.mq-prism-pose{transition:none}}`}</style>
  <div className="mq-prism-pose" data-tilted={perspective||undefined}><PrismButton {...settings} paused={paused} compact={compact}/></div>
 </div>;
}
