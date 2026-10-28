import {buttonOpticsGLSL} from './button-optics';
export const photonFragment=buttonOpticsGLSL+`
uniform vec3 uPulseColor,uTrailColor;
uniform float uPulseCount,uSpeed,uTrailLength,uPulseWidth,uEnergy;
void main(){
 vec2 p=vUv*uResolution-uResolution*.5;float d=capsule(p);if(d>=18.){fragColor=vec4(0.);return;}float depth=max(-d,0.);
 float s=arcLength(p),headEnergy=0.,tailEnergy=0.;
 for(int i=0;i<3;i++){
  if(float(i)>=uPulseCount)break;
  float head=fract(uTime*.115*uSpeed+float(i)/uPulseCount+.17);
  float difference=fract(s-head+.5)-.5;
  float behind=fract(head-s);
  headEnergy+=exp(-pow(difference/max(.002,uPulseWidth),2.));
  tailEnergy+=exp(-behind/max(.02,uTrailLength))*smoothstep(0.,.012,behind)*(1.-smoothstep(uTrailLength*3.,min(.95,uTrailLength*4.),behind));
 }
 float line=exp(-abs(depth-.8)/.6),halo=exp(-depth/3.4);
 float chart=smoothstep(1.5,8.,min(uSize.x,uSize.y)*.5-depth);
 float response=uEnergy*(1.+uHover*.3);
 vec3 trail=uTrailColor*tailEnergy*1.6;vec3 head=uPulseColor*headEnergy*1.8;
 vec3 color=vec3(.018,.023,.034)+vec3(.17,.23,.34)*line*.15;
 color+=(trail+head)*response*(line+halo*.32)*chart;
 vec3 n=surfaceNormal(p);float reflection=pow(max(dot(n,normalize(vec3(-.35,.7,1.))),0.),80.);
 color+=uPulseColor*reflection*.015;
 float clickRing=exp(-pow((length(p-uClick)-uRippleAge*160.)/6.,2.))*exp(-uRippleAge*3.);
 color+=uPulseColor*clickRing*.18;
 fragColor=compositeGlass(color,(trail+head)*response*.25,d);
}`;
