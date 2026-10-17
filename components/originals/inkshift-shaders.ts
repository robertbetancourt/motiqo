export const inkSplat=`uniform sampler2D uSource;uniform vec2 uPoint,uForce;uniform float uRadius,uAspect,uDye;
void main(){vec2 d=vUv-uPoint;d.x*=uAspect;float s=exp(-dot(d,d)/(uRadius*uRadius));vec4 old=texture(uSource,vUv);fragColor=old+vec4(uForce*s,uDye*s,0.);}`;
export const inkCurl=`uniform sampler2D uVelocity;uniform vec2 uTexel;
void main(){float l=texture(uVelocity,vUv-vec2(uTexel.x,0)).y,r=texture(uVelocity,vUv+vec2(uTexel.x,0)).y,b=texture(uVelocity,vUv-vec2(0,uTexel.y)).x,t=texture(uVelocity,vUv+vec2(0,uTexel.y)).x;fragColor=vec4(.5*(r-l-t+b),0,0,1);}`;
export const inkVorticity=`uniform sampler2D uVelocity,uCurl;uniform vec2 uTexel;uniform float uDt,uStrength;
void main(){float l=texture(uCurl,vUv-vec2(uTexel.x,0)).x,r=texture(uCurl,vUv+vec2(uTexel.x,0)).x,b=texture(uCurl,vUv-vec2(0,uTexel.y)).x,t=texture(uCurl,vUv+vec2(0,uTexel.y)).x,c=texture(uCurl,vUv).x;vec2 n=vec2(abs(t)-abs(b),abs(r)-abs(l));n/=length(n)+.0001;vec2 force=n*uStrength*c*.25;force.y*=-1.;fragColor=vec4(clamp(texture(uVelocity,vUv).xy+force*uDt,vec2(-650),vec2(650)),0,1);}`;
export const inkDivergence=`uniform sampler2D uVelocity;uniform vec2 uTexel;
void main(){vec2 c=texture(uVelocity,vUv).xy;float l=texture(uVelocity,vUv-vec2(uTexel.x,0)).x,r=texture(uVelocity,vUv+vec2(uTexel.x,0)).x,b=texture(uVelocity,vUv-vec2(0,uTexel.y)).y,t=texture(uVelocity,vUv+vec2(0,uTexel.y)).y;if(vUv.x<uTexel.x)l=-c.x;if(vUv.x>1.-uTexel.x)r=-c.x;if(vUv.y<uTexel.y)b=-c.y;if(vUv.y>1.-uTexel.y)t=-c.y;fragColor=vec4(.5*(r-l+t-b),0,0,1);}`;
export const inkClear=`uniform sampler2D uSource;uniform float uScale;void main(){fragColor=texture(uSource,vUv)*uScale;}`;
export const inkPressure=`uniform sampler2D uPressure,uDivergence;uniform vec2 uTexel;
void main(){float l=texture(uPressure,vUv-vec2(uTexel.x,0)).x,r=texture(uPressure,vUv+vec2(uTexel.x,0)).x,b=texture(uPressure,vUv-vec2(0,uTexel.y)).x,t=texture(uPressure,vUv+vec2(0,uTexel.y)).x,d=texture(uDivergence,vUv).x;fragColor=vec4((l+r+b+t-d)*.25,0,0,1);}`;
export const inkGradient=`uniform sampler2D uPressure,uVelocity;uniform vec2 uTexel;
void main(){float l=texture(uPressure,vUv-vec2(uTexel.x,0)).x,r=texture(uPressure,vUv+vec2(uTexel.x,0)).x,b=texture(uPressure,vUv-vec2(0,uTexel.y)).x,t=texture(uPressure,vUv+vec2(0,uTexel.y)).x;fragColor=vec4(texture(uVelocity,vUv).xy-vec2(r-l,t-b)*.5,0,1);}`;
export const inkAdvect=`uniform sampler2D uVelocity,uSource;uniform vec2 uVelocityTexel,uSourceTexel;uniform float uDt,uDecay;
vec4 bilerp(sampler2D tex,vec2 uv,vec2 pixel){vec2 st=uv/pixel-.5,i=floor(st),f=fract(st);vec2 a=(i+.5)*pixel;return mix(mix(texture(tex,a),texture(tex,a+vec2(pixel.x,0)),f.x),mix(texture(tex,a+vec2(0,pixel.y)),texture(tex,a+pixel),f.x),f.y);}
void main(){vec2 v=bilerp(uVelocity,vUv,uVelocityTexel).xy;vec2 p=vUv-uDt*v*uVelocityTexel;fragColor=bilerp(uSource,p,uSourceTexel)*exp(-uDt*uDecay);}`;
export const inkDisplay=`uniform sampler2D uDye,uText;uniform float uThreshold,uTime;uniform vec3 uBackground,uForeground;uniform vec2 uResolution;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){float density=texture(uDye,vUv).z;float rough=(noise(vUv*uResolution*.23+vec2(uTime*.5,-uTime))-.5)*.11;float aa=max(.02,fwidth(density)*.65);float ink=smoothstep(uThreshold-aa,uThreshold+aa,density+rough);float text=texture(uText,vUv).a;fragColor=vec4(mix(uBackground,uForeground,abs(ink-text)),1.);}`;
