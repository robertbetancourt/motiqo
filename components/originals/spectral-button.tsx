'use client';
import OpticalPlayground, {OpticalButton,opticalDefaults,type OpticalButtonProps,type OpticalPlaygroundProps} from './optical-button';

/** A thin spectral edge with a counterclockwise, independently phased cycle. */
export const spectralDefaults={...opticalDefaults,brightness:32,auraWidth:2,centerClarity:100};
export type SpectralButtonProps=Omit<OpticalButtonProps,'fragmentShader'|'iconOnly'>;

export function SpectralButton({children,...props}:SpectralButtonProps){
 return <OpticalButton timeOffset={7.3} timeScale={-.73} hueOffset={.27} {...spectralDefaults} {...props}>{children??'Spectral Button'}</OpticalButton>;
}
export default function SpectralPreview(props:OpticalPlaygroundProps){
 return <OpticalPlayground timeOffset={7.3} timeScale={-.73} hueOffset={.27} {...spectralDefaults} {...props} label={props.label??'Spectral Button'}/>;
}
