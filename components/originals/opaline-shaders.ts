import { kineticNoiseGLSL } from "./kinetic-noise";
export const opalineVertex =
  kineticNoiseGLSL +
  `
uniform float uTime,uLayer,uIntensity,uActivity;
varying vec3 vPosition,vView;varying vec2 vSurface;
void main(){
 vec3 n=normalize(position);float t=uTime+uLayer*.8;
 float theta=acos(clamp(n.z,-1.,1.)),phi=atan(n.y,n.x);
 float lobes=sin(phi*6.+t*.32+sin(theta*3.-t*.16))*.52;
 lobes+=kSimplex(n*1.65+vec3(t*.12,0.,t*.08))*.55;
 float displacement=lobes*(.055+uLayer*.042)*uIntensity*(1.+uActivity*.32);
 vec3 p=n*(1.+displacement);vPosition=p;vSurface=uv;
 vec4 view=modelViewMatrix*vec4(p,1.);vView=view.xyz;gl_Position=projectionMatrix*view;
}`;
export const opalineFragment = `
uniform float uDensity,uLayer;uniform vec3 uBlue,uPeach,uLavender,uLine;
varying vec3 vPosition,vView;varying vec2 vSurface;
void main(){
 vec3 normal=normalize(cross(dFdx(vView),dFdy(vView))),view=normalize(-vView);
 float fresnel=pow(1.-abs(dot(normal,view)),2.5);
 float contour=vPosition.y*uDensity+sin(vPosition.x*2.+uLayer)*.35;
 float edge=abs(fract(contour)-.5),aa=max(fwidth(contour),.001);
 float rings=1.-smoothstep(.03,.03+aa*.8,edge);
 float beads=pow(.5+.5*cos(vSurface.x*6.283185*200.),12.);
 float warm=smoothstep(-.35,.8,vPosition.x+vPosition.y*.65);
 vec3 hue=mix(uBlue,uPeach,warm);hue=mix(hue,uLavender,fresnel*.6);
 float detail=rings*(.1+beads*.2+fresnel*.85);
 float alpha=.015+detail*.9+fresnel*.12;
 if(!gl_FrontFacing)alpha*=.33;
 vec3 color=mix(hue,uLine,clamp(.3+fresnel*.7+rings*.35,0.,1.));
 gl_FragColor=vec4(color,clamp(alpha,0.,.9));
 #include <colorspace_fragment>
}`;
export const opalineCoreVertex = `varying vec3 vNormal,vPosition,vView;void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=mv.xyz;gl_Position=projectionMatrix*mv;}`;
export const opalineCoreFragment = `uniform vec3 uBlue,uPeach,uLavender;varying vec3 vNormal,vPosition,vView;void main(){float facing=max(0.,dot(normalize(vNormal),normalize(-vView)));float warm=smoothstep(-.2,1.1,vPosition.x+vPosition.y*.85);vec3 hue=mix(uBlue,uPeach,warm);hue=mix(hue,uLavender,pow(1.-facing,2.)*.6);gl_FragColor=vec4(hue,pow(facing,.7)*.75);
#include <colorspace_fragment>
}`;
export const opalineGlowFragment = `uniform vec3 uBlue,uPeach,uLavender;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float glow=exp(-r*r*3.5)*smoothstep(1.,.5,r);vec3 col=mix(uBlue,uPeach,smoothstep(-.5,.8,p.x+p.y*.7));col=mix(col,uLavender,r*.4);gl_FragColor=vec4(col,glow*.45);}`;
