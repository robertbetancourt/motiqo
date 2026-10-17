'use client';
import type {ButtonHTMLAttributes,CSSProperties} from 'react';
import {OpticalButton,OpticalStage} from './optical-button';
import {buttonColor,buttonValue} from './button-optics';
import {lenticularFragment} from './lenticular-shaders';
export type LenticularButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{magnification?:number;lensRadius?:number;distortion?:number;gridSpacing?:number;tint?:string;idleMotion?:boolean;paused?:boolean;compact?:boolean};
export function LenticularButton({magnification=1.8,lensRadius=29,distortion=.4,gridSpacing=22,tint='#91d9ed',idleMotion=true,paused=false,compact=false,children,...props}:LenticularButtonProps){
 return <OpticalButton {...props} paused={paused} compact={compact} thickness={18} bevelWidth={11} fragmentShader={lenticularFragment}
  extraUniforms={{uMagnification:buttonValue(magnification,1,3,1.8),uLensRadius:buttonValue(lensRadius,12,40,29),uDistortion:buttonValue(distortion,0,1,.4),uGridSpacing:buttonValue(gridSpacing,12,40,22),uLensTint:buttonColor(tint,'#91d9ed'),uIdleMotion:idleMotion?1:0}}>{children??'Lenticular Button'}</OpticalButton>;
}
export default function LenticularPreview({compact=false,className='',gridSpacing=22,...props}:LenticularButtonProps){
 return <OpticalStage compact={compact} className={`mq-lenticular-stage ${className}`} style={{'--lens-spacing':`${buttonValue(gridSpacing,12,40,22)}px`} as CSSProperties}><style>{`.mq-lenticular-stage{background-image:linear-gradient(#18303d99 1px,transparent 1px),linear-gradient(90deg,#18303d99 1px,transparent 1px);background-size:var(--lens-spacing) var(--lens-spacing);background-position:center center}.mq-lenticular-stage .mq-optical-pair{display:flex}.mq-lenticular-stage .mq-optical-button{max-width:100%}`}</style>
  <LenticularButton {...props} compact={compact} gridSpacing={gridSpacing}/>
 </OpticalStage>;
}
