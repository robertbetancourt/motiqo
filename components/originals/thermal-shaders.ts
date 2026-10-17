export const thermalFragment = `
uniform vec2 uResolution;uniform float uTime,uDensity,uIntro,uSpeed,uMini;uniform vec3 uWarm,uCold;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
vec2 curlNoise(vec2 p){
 vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.),du=30.*f*f*(f-1.)*(f-1.);
 float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+1.),k=a-b-c+d;
 vec2 gradient=du*vec2(b-a+k*u.y,c-a+k*u.x);
 return vec2(gradient.y,-gradient.x);
}
float fbm(vec2 p){float f=0.,a=.52;mat2 m=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){f+=a*noise(p);p=m*p*2.07+19.13;a*=.49;}return f;}
float fluid(vec2 p,float seed,float t){
 vec2 n=normalize(p+vec2(.001)),v=p*5.2-n*t*.32;
 vec2 q=vec2(fbm(v+seed),fbm(v+vec2(4.7,9.2)+seed));
 vec2 w=vec2(fbm(v+q*3.6+vec2(t*.11,1.8)),fbm(v+q*3.6+vec2(8.1,-t*.09)));
 // Analytic gradient of a scalar potential, rotated 90 degrees: divergence-free 2D curl.
 vec2 curl=curlNoise(v+vec2(seed,t*.1))*.18;return fbm(v+w*4.+curl*2.4+seed);
}
void main(){
 vec2 p=(vUv-.5)*uResolution/min(uResolution.x,uResolution.y);float r=length(p),angle=atan(p.y,p.x),t=uTime*uSpeed;
 float inner=mix(.19,.255,uIntro);float a=fluid(p,2.7,t),b=fluid(p*1.12,31.9,t*.83+.7);
 float ridge=inner+(noise(p*35.+t*.08)-.5)*.009;
 float smokeRadius=inner+.16*uIntro;
 float diagonal=.5+.5*cos(angle*2.-2.35);float reach=.16+pow(diagonal,2.)*.27;
 float outer=1.-smoothstep(inner+.035,inner+reach*uIntro,r);
 float innerMask=smoothstep(inner-.006,inner+.025,r);
 float fingers=pow(clamp(a*1.9-.45,0.,1.),1.25)*outer;
 float wisps=pow(max(0.,1.-abs(a-.49)*9.),2.5)*outer;
 float coldOuter=1.-smoothstep(inner+.1,inner+reach*uIntro+.07,r);
 float cold=pow(clamp(b*1.75-.48,0.,1.),1.5)*coldOuter*innerMask;
 float warm=(fingers*.9+wisps*.4)*innerMask*uDensity;
 cold*=uDensity*(.45+.55*smoothstep(.15,.7,b-a));
 float rim=exp(-abs(r-ridge)*230.)*(.65+noise(p*47.-t*.18)*.65);
 float ignition=1.+1.1*exp(-pow((uIntro-.45)*5.,2.));
 vec3 color=uCold*cold*.85;
 color=mix(color,uWarm*(warm*1.3),clamp(warm*1.7,0.,.88));
 color+=uWarm*(exp(-abs(r-ridge)*55.)*.2+rim*1.5)*ignition;
 color+=vec3(1.,.53,.5)*pow(rim,3.)*.6;
 if(uMini>.5){color=uCold*(warm+cold)*1.4+mix(uCold,vec3(.85,.98,1.),.7)*rim*1.6;}
 color*=smoothstep(inner-.003,inner+.002,r)*uIntro;
 color+=vec3(.043,.047,.063)*(1.-smoothstep(inner-.004,inner,r));
 color*=1.-smoothstep(.58,.76,r);color*=smoothstep(0.,.07,vUv.x)*smoothstep(0.,.07,1.-vUv.x)*smoothstep(0.,.07,vUv.y)*smoothstep(0.,.07,1.-vUv.y);fragColor=vec4(color,1.);
}`;
