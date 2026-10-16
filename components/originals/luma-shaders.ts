export const lumaVertex=`#version 300 es
precision highp float;
layout(location=0) in vec4 aSeed;
layout(location=1) in vec2 aStyle;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAmplitude;
uniform float uDpr;
uniform vec3 uWarm;
uniform vec3 uCool;
out vec3 vColor;
out float vKind;
out float vFade;
float wave(float u,float t){return (sin(u*5.2-t*1.9)*.07+sin(u*2.8+t*.74)*.025+sin(u*8.3+t*1.13)*.012)*uAmplitude;}
void main(){
  float kind=aStyle.x,size=aStyle.y,flow=.035+size*.04;
  float u=fract(aSeed.x+uTime*flow),y=0.,fade=1.;
  if(kind<.56){
    float pinch=.5+.5*sin(u*7.-uTime*1.4),width=.0015+.0055*pinch*pinch;
    y=wave(u,uTime)+aSeed.y*width+sin(aSeed.w+uTime*(1.3+size))*width*.7;
  }else{
    float life=.85+size*1.35,cycle=fract(uTime/life+aSeed.w/6.28318530718),age=cycle*life,birth=uTime-age;
    float source=fract(aSeed.x+birth*flow),emitter=wave(source,birth);
    float velocity=(wave(source+flow*.01,birth+.01)-emitter)/.01;
    float curl=sin(aSeed.w+age*(2.5+size*2.));
    u=fract(source+age*flow+aSeed.z*age*.012+curl*age*.006);
    y=emitter+aSeed.y*.003+velocity*age*.32-age*(.025+size*.05)+aSeed.z*age*.018+curl*age*.012;
    fade=smoothstep(0.,.08,cycle)*(1.-smoothstep(.35,1.,cycle));
  }
  vec2 px=vec2(u*uResolution.x,uResolution.y*.53+y*uResolution.x);
  gl_Position=vec4(px.x/uResolution.x*2.-1.,1.-px.y/uResolution.y*2.,0.,1.);
  float scale=clamp(uResolution.x/400.,.45,1.15);
  gl_PointSize=uDpr*scale*(kind<.56?mix(2.4,4.,size):kind<.91?mix(3.,6.5,size):mix(16.,32.,size));
  float blend=smoothstep(.12,.88,u);
  vColor=mix(uWarm,uCool,blend);vKind=kind;
  vFade=fade*min(1.,min(u/.045,(1.-u)/.045));
}`;
export const lumaFragment=`#version 300 es
precision highp float;
in vec3 vColor;
in float vKind;
in float vFade;
uniform float uGlow;
out vec4 outColor;
void main(){
  vec2 p=gl_PointCoord*2.-1.;float r2=dot(p,p);if(r2>1.)discard;
  float light=vKind<.56?exp(-r2*18.)*.28+exp(-r2*3.5)*.02:vKind<.91?exp(-r2*8.)*.26:exp(-r2*3.2)*.014;
  float alpha=light*vFade*uGlow;
  outColor=vec4(vColor*alpha,alpha);
}`;
