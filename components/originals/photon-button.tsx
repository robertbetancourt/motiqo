'use client';
import type {ButtonHTMLAttributes} from 'react';
import {OpticalButton,OpticalStage} from './optical-button';
import {buttonColor,buttonValue} from './button-optics';
import {photonFragment} from './photon-shaders';
export type PhotonButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{pulseCount?:number;speed?:number;trailLength?:number;pulseWidth?:number;energy?:number;pulseColor?:string;trailColor?:string;paused?:boolean;compact?:boolean};
export function PhotonButton({pulseCount=2,speed=.85,trailLength=.12,pulseWidth=.009,energy=1,pulseColor='#ecf7ff',trailColor='#638fff',paused=false,compact=false,children,...props}:PhotonButtonProps){
 return <OpticalButton {...props} paused={paused} compact={compact} thickness={18} bevelWidth={10} fragmentShader={photonFragment}
  extraUniforms={{uPulseCount:Math.round(buttonValue(pulseCount,1,3,2)),uSpeed:buttonValue(speed,0,2.5,.85),uTrailLength:buttonValue(trailLength,.04,.22,.12),uPulseWidth:buttonValue(pulseWidth,.003,.025,.009),uEnergy:buttonValue(energy,.2,2.5,1),uPulseColor:buttonColor(pulseColor,'#ecf7ff'),uTrailColor:buttonColor(trailColor,'#638fff')}}>{children??'Photon Button'}</OpticalButton>;
}
export default function PhotonPreview({compact=false,className='',...props}:PhotonButtonProps){
 return <OpticalStage compact={compact} className={className}><PhotonButton {...props} compact={compact}/></OpticalStage>;
}
