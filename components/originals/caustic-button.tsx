'use client';
import OpticalPlayground, {OpticalButton,opticalDefaults,type OpticalButtonProps,type OpticalPlaygroundProps} from './optical-button';

/** The former Liquid Bath mood, preserving its corrected, continuous volume. */
export const causticDefaults={...opticalDefaults,frost:48,auraWidth:24,centerClarity:12};
export type CausticButtonProps=Omit<OpticalButtonProps,'fragmentShader'|'iconOnly'>;

export function CausticButton({children,...props}:CausticButtonProps){
 return <OpticalButton {...causticDefaults} {...props}>{children??'Caustic Button'}</OpticalButton>;
}
export default function CausticPreview(props:OpticalPlaygroundProps){
 return <OpticalPlayground {...causticDefaults} {...props} label={props.label??'Caustic Button'}/>;
}
