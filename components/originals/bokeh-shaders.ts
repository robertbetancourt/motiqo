import { kineticNoiseGLSL } from "./kinetic-noise";
export const bokehVertex =
  kineticNoiseGLSL +
  `
uniform float uTime,uHeight,uDpr,uScale,uHover;uniform vec2 uPointer;uniform vec3 uPrimary,uSecondary,uAccent;
varying vec3 vColor;varying float vAlpha,vBlur;
void main(){
 vec3 p=position;float t=uTime;
 float broad=sin(p.x*.24+t*.65)*cos(p.z*.17+t*.28);
 float fold=sin(p.x*.42-p.z*.2-t*.42)*.38;
 float noise=kSimplex(vec3(p.x*.12,p.z*.13,t*.14))*.5;
 float d=length(p.xz-vec2(uPointer.x*13.,uPointer.y*8.));
 float ripple=sin(d*1.1-t*2.)*exp(-d*.2)*uHover*.35;
 float height=(broad+fold+noise+ripple)*uHeight;
 p.y=height;p.z+=sin(p.x*.16+t*.3)*.4;
 vec4 mv=modelViewMatrix*vec4(p,1.);float depth=-mv.z;
 float coc=clamp(abs(depth-27.)/22.,0.,1.);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp((27./max(4.,depth))*uDpr*uScale*(2.+coc*coc*12.),1.45*uDpr,27.*uDpr);
 float crest=smoothstep(-.2,1.15,height/max(.1,uHeight));
 vColor=mix(uSecondary,uPrimary,.5+.5*sin(p.x*.17+p.z*.23));
 vColor=mix(vColor,uAccent,pow(crest,3.)*.8);vColor=mix(vColor,vec3(1.),pow(crest,9.)*.7);
 vAlpha=(.45+crest*.85)/(1.+coc*coc*5.);vAlpha*=1.-smoothstep(42.,54.,depth);vBlur=coc;
}`;
export const bokehFragment = `varying vec3 vColor;varying float vAlpha,vBlur;
void main(){vec2 p=gl_PointCoord*2.-1.;float d=dot(p,p);if(d>1.)discard;float glow=exp(-d*mix(8.,4.5,vBlur));gl_FragColor=vec4(vColor*1.2,glow*vAlpha);
#include <colorspace_fragment>
}`;
export const bokehDustVertex = `uniform float uTime,uDpr;attribute float aSeed;varying float vAlpha;void main(){vec3 p=position;p.x+=sin(uTime*.08+aSeed*5.)*.4;p.y+=sin(uTime*.12+aSeed*17.)*.3;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uDpr*(1.+aSeed*2.8);vAlpha=(.12+aSeed*.3)*(.55+.45*sin(uTime*.45+aSeed*61.));}`;
export const bokehDustFragment = `varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.7,.76,1.,exp(-d*d*8.)*vAlpha);}`;
