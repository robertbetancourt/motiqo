export const galleryFragment = `
uniform sampler2D uFrom,uTo;
uniform vec2 uResolution,uFromCover,uToCover,uOrigin;
uniform float uProgress,uMode,uStrength,uTime;
vec3 imageAt(sampler2D tex,vec2 uv,vec2 cover){return texture(tex,(uv-.5)*cover+.5).rgb;}
void main(){
 vec2 uv=vUv,aspect=vec2(uResolution.x/uResolution.y,1.);
 vec2 p=(uv-uOrigin)*aspect;float distanceToOrigin=length(p);
 float farthest=length(max(uOrigin,1.-uOrigin)*aspect);
 float t=clamp(uProgress,0.,1.);float radius=mix(-.1,farthest+.15,t);
 float delta=distanceToOrigin-radius;
 vec2 direction=p/max(distanceToOrigin,.001)/aspect;
 float envelope=sin(t*3.14159265);
 vec2 offset=vec2(0.);float mask=0.,glint=0.;
 if(uMode<.5){
  float wave=sin(delta*62.-t*15.)*exp(-abs(delta)*16.);
  float wake=sin(delta*115.+t*8.)*exp(-abs(delta+.065)*23.)*.28;
  offset=direction*(wave+wake)*.026*uStrength*envelope;
  mask=1.-smoothstep(-.025,.025,delta);
  glint=pow(max(0.,cos(delta*62.-t*15.)),10.)*exp(-abs(delta)*22.)*.18*envelope;
 }else{
  float angle=atan(p.y,p.x);float blade=cos(angle*6.+t*.75);
  float iris=radius+(blade*.014+sin(angle*12.+t)*.003)*envelope;
  float edge=distanceToOrigin-iris;
  mask=1.-smoothstep(-.002,.002,edge);
  offset=direction*exp(-abs(edge)*70.)*.018*envelope;
  glint=exp(-abs(edge)*350.)*.36*envelope;
 }
 if(t<=0.)mask=0.;if(t>=1.)mask=1.;
 vec3 a=imageAt(uFrom,uv+offset,uFromCover),b=imageAt(uTo,uv-offset*.7,uToCover);
 vec3 col=mix(a,b,mask);
 if(uMode<.5){col.r+=imageAt(uTo,uv+offset*1.4,uToCover).r*abs(offset.x)*1.3;}
 col+=glint*vec3(.76,.9,1.);
 float vignette=1.-.26*pow(length((uv-.5)*1.2),1.7);col*=vignette;
 fragColor=vec4(col,1.);
}`;
