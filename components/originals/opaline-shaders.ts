import { kineticNoiseGLSL } from "./kinetic-noise";
export const opalineVertex =
  kineticNoiseGLSL +
  `
uniform float uTime,uLayer,uIntensity,uActivity;
varying vec3 vPosition,vView;varying vec2 vSurface;
void main(){
 vec3 n=normalize(position);float t=uTime+uLayer*.8;
 float theta=acos(clamp(n.z,-1.,1.)),phi=atan(n.y,n.x);
 float polar=sin(theta);float layer=max(0.,uLayer);
 float lobes=sin(phi*5.+t*.24+layer*.72+sin(theta*2.-t*.2))*.62;
 lobes+=sin(phi*3.-t*.19+layer*1.1)*.23;
 lobes*=polar*polar;
 lobes+=kSimplex(n*1.4+vec3(t*.1,layer*.25,t*.07))*.2;
 float amplitude=uLayer<0. ? .16 : .08+layer*.058;
 float displacement=lobes*amplitude*uIntensity*(1.+uActivity*.25);
 vec3 p=n*(1.+displacement);
 p.xy+=vec2(sin(t*.2+layer),cos(t*.17-layer))*.018*layer*polar;
 vPosition=p;vSurface=uv;
 vec4 view=modelViewMatrix*vec4(p,1.);vView=view.xyz;gl_Position=projectionMatrix*view;
}`;
export const opalineFragment = `
uniform float uDensity,uLayer,uTime;uniform vec3 uBlue,uPeach,uLavender,uLine;
varying vec3 vPosition,vView;varying vec2 vSurface;
void main(){
 vec3 normal=normalize(cross(dFdx(vView),dFdy(vView))),view=normalize(-vView);
 float fresnel=pow(1.-abs(dot(normal,view)),2.5);
 // Contours run around the viewing axis, producing nested topographic loops.
 vec3 n=normalize(vPosition);float theta=acos(clamp(n.z,-1.,1.));
 float polar=sin(theta),azimuth=atan(n.y,n.x);
 float contour=theta*uDensity*.5+sin(azimuth*5.+uTime*.24+uLayer*.72)*polar*polar*(.4+uLayer*.27);
 float lineDistance=abs(fract(contour)-.5)/max(fwidth(contour),.001);
 float rings=1.-smoothstep(.18,.85,lineDistance);
 float silk=1.-smoothstep(.7,2.2,lineDistance);
 float row=floor(contour);
 float latitude=(row+.5)/max(1.,uDensity*.5);
 float count=floor(max(16.,sin(latitude)*190.));
 float phi=atan(n.y,n.x)/6.283185;
 float dotDistance=abs(fract(phi*count+row*.37)-.5);
 float beadAA=max(fwidth(phi*count),.015);
 float beads=1.-smoothstep(.16,.23+beadAA,dotDistance);
 float warm=smoothstep(-.35,.8,vPosition.x+vPosition.y*.65);
 vec3 hue=mix(uBlue,uPeach,warm);hue=mix(hue,uLavender,fresnel*.6);
 float aperture=smoothstep(.22,.95,length(vPosition.xy));
 float detail=rings*(.035+beads*.38+fresnel*.3)*mix(.1,1.,aperture);
 float alpha=detail*.75+silk*.035*aperture+fresnel*.04;
 if(!gl_FrontFacing)alpha*=.16;
 vec3 color=mix(hue,uLine,clamp(.55+fresnel*.4+beads*.2,0.,1.));
 gl_FragColor=vec4(color,clamp(alpha,0.,.9));
 #include <colorspace_fragment>
}`;
export const opalineCoreVertex = `varying vec3 vNormal,vPosition,vView;void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=mv.xyz;gl_Position=projectionMatrix*mv;}`;
export const opalineCoreFragment = `uniform vec3 uBlue,uPeach,uLavender;varying vec3 vPosition,vView;void main(){
 vec3 normal=normalize(cross(dFdx(vView),dFdy(vView)));
 float facing=abs(dot(normal,normalize(-vView)));
 float warm=smoothstep(.05,1.35,vPosition.x+vPosition.y*.9);
 vec3 hue=mix(uBlue,uPeach,warm);hue=mix(hue,uLavender,pow(1.-facing,2.)*.55);
 float light=exp(-dot(vPosition.xy-vec2(.37,.4),vPosition.xy-vec2(.37,.4))*24.);
 hue=mix(hue,vec3(1.),light*.8);
 gl_FragColor=vec4(hue,smoothstep(.04,.8,facing)*.82);
#include <colorspace_fragment>
}`;
export const opalineGlowFragment = `uniform vec3 uBlue,uPeach,uLavender;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float glow=exp(-r*r*3.5)*smoothstep(1.,.5,r);vec3 col=mix(uBlue,uPeach,smoothstep(-.5,.8,p.x+p.y*.7));col=mix(col,uLavender,r*.4);gl_FragColor=vec4(col,glow*.45);}`;
