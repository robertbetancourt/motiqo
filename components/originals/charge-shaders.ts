export const chargeVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const chargeFragment=`
precision highp float;
varying vec2 vUv;
uniform float uTime,uAspect;
uniform vec3 uPrimary,uSecondary;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
void main(){
 vec2 p=vec2(vUv.x-.5,(vUv.y-.63)*uAspect);
 float t=uTime,r=.32,rad=length(p),a=atan(p.x,-p.y),up=abs(a);
 float grain=noise(vec2(up*8.-t*.65,rad*48.+t*.18));
 float wave=.0024*sin(up*11.-t*1.55)+.0017*sin(up*23.-t*2.4)*sin(up*3.+t*.7);
 float ring=abs(rad-r-wave);
 float spine=.0045*sin(p.y*14.-t*1.8)+.002*sin(p.y*39.+t*2.1);
 float stem=abs(p.x-spine)+max(0.,p.y+r-.009)*3.;
 // Smooth union forms the liquid Y-junction rather than crossing two strokes.
 float d=max(0.,smin(ring,stem,.06));
 float motion=.72+.28*sin(up*7.-t*2.2+grain*1.5);
 float packets=pow(max(0.,cos(up*3.-t*1.4)),14.);
 float core=exp(-d*920.)*(.55+.3*motion+.4*packets);
 float cyan=exp(-d*165.)*(.6+.28*motion);
 float blue=exp(-d*42.)*.65;
 vec3 electric=mix(vec3(.005,.075,1.),uPrimary,.28);
 vec3 color=vec3(.8,.97,1.)*core+uPrimary*cyan+electric*blue;
 float outside=rad-r;
 float goldBand=exp(-abs(outside-.012-wave*.7)*85.);
 float warmSide=.3+.7*pow(max(0.,sin(a-t*.45+.5)),4.);
 color+=uSecondary*goldBand*warmSide*.52;
 // Shared arc length carries every pulse from the inlet through both branches.
 float inletLength=uAspect*.63-r,totalLength=inletLength+3.14159265*r;
 for(int k=0;k<3;k++){
  float head=fract(t*.155+float(k)/3.)*(totalLength+.38)-.19;
  float envelope=smoothstep(-.19,.02,head)*(1.-smoothstep(totalLength,totalLength+.19,head));
  float stemPacket=exp(-pow((p.y+uAspect*.63-head)/.095,2.))*(1.-smoothstep(-r-.015,-r+.012,p.y));
  float ringPacket=exp(-pow((inletLength+up*r-head)/.075,2.));
  float packet=stemPacket*exp(-abs(p.x-spine)*110.)+ringPacket*exp(-ring*110.);
  float aura=stemPacket*exp(-abs(p.x-spine-.009)*32.)+ringPacket*exp(-abs(outside-.008)*38.);
  color+=vec3(.8,.98,1.)*packet*envelope*1.35;
  color+=mix(uSecondary,uPrimary,float(k)*.35)*aura*envelope*.5;
 }
 // Broad folds of plasma peel away on their journey to the upper pole.
 float head=fract(t*.075)*5.-.9;
 float envelope=smoothstep(-.9,-.3,head)*(1.-smoothstep(3.35,4.1,head));
 float lobe=exp(-pow((up-head)/.29,2.))*(a<0.?1.:.4)*envelope;
 float trailing=exp(-pow((up-head+.24)/.38,2.))*(a<0.?1.:.3)*envelope;
 float folded=outside-.009-sin(up*13.-t*1.2)*(.004+.01*lobe);
 color+=mix(uPrimary,vec3(.85,.97,1.),.65)*exp(-abs(folded)*95.)*lobe*.65;
 color+=uSecondary*exp(-abs(outside-.023)*52.)*trailing*.38;
 float upperFold=exp(-pow((a+2.48+.12*sin(t*.65))/.28,2.));
 float veil=outside-.006-sin(up*9.+t*.75)*.008;
 color+=mix(uSecondary,vec3(.9,.98,1.),.72)*exp(-abs(veil)*83.)*upperFold*.85;
 // Fine, independent filaments are carried upward on both sides of the orb.
 for(int i=0;i<14;i++){
  float f=float(i),offset=(f-6.5)*.0009;
  float fold=sin(up*(9.+f*.37)-t*(1.3+f*.035)+f*.72)*.0035;
  fold+=sin(up*19.-t*1.7+f*.45)*.0018;
  float line=exp(-abs(rad-r-offset-fold)*1450.);
  float detail=.35+.65*pow(.5+.5*sin(up*5.-t*1.7+f*.4),3.);
  color+=mix(uPrimary,uSecondary,f/19.)*line*detail*.075;
 }
 float inletMask=1.-smoothstep(-r-.012,-r+.016,p.y);
 float inletPulse=.55+.45*noise(vec2(p.y*10.-t*1.5,t*.17));
 color+=uSecondary*exp(-abs(p.x-spine-.013)*150.)*inletMask*.75*inletPulse;
 color+=electric*exp(-abs(p.x-spine)*31.)*inletMask*.19;
 // A diffuse cap, with the condensation flare at twelve o'clock.
 float apex=length((p-vec2(0.,r))*vec2(.88,1.25));
 color+=vec3(.65,.9,1.)*exp(-apex*330.)*.95;
 color+=uPrimary*exp(-apex*52.)*.28;
 float mist=exp(-pow(p.x/.115,2.)-pow((p.y-r+.043)/.063,2.));
 color+=electric*mist*(.035+.055*noise(vec2(p.x*24.+t*.22,p.y*35.-t*.4)));
 float inner=exp(-abs(rad-r+.022)*95.)*(1.-smoothstep(r-.008,r,rad));
 color+=uPrimary*inner*.17;
 float bowl=exp(-pow(p.x/.22,2.)-pow((p.y+.22)/.18,2.))*(1.-smoothstep(r-.025,r,rad));
 color+=mix(electric,uPrimary,.65)*bowl*.23;
 // Keep the interior dark and preserve the broad bloom on black.
 color=vec3(1.)-exp(-color*1.35);
 gl_FragColor=vec4(color,1.);
}`;
export const chargePointVertex=`
attribute float aSize,aFade;attribute vec3 aColor;varying float vFade;varying vec3 vColor;uniform float uAspect,uDpr,uScale;
void main(){vFade=aFade;vColor=aColor;gl_Position=vec4(position.x*2.,position.y*2./uAspect+.26,0.,1.);gl_PointSize=aSize*2.*uDpr*uScale;}`;
export const chargePointFragment=`
precision highp float;varying float vFade;varying vec3 vColor;
void main(){float d=length(gl_PointCoord-.5)*2.;float light=exp(-d*d*4.)*.6+exp(-d*d*28.)*1.4;gl_FragColor=vec4(vColor*light*vFade*(1.-smoothstep(.65,1.,d)),1.);}`;
