const motion=`
uniform float uTime;uniform float uBurst;uniform float uIntensity;uniform vec2 uHand;
vec3 stellarMotion(vec3 p){
 float t=uTime*.12,yaw=t+uHand.x*.35*uIntensity,pitch=.22+sin(t*.7)*.12+uHand.y*.24*uIntensity;
 p*=1.+sin(p.y*7.-uTime*2.)*.025*uBurst;
 p.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*p.xz;
 p.yz=mat2(cos(pitch),-sin(pitch),sin(pitch),cos(pitch))*p.yz;return p;
}`;
export const constellationVertex=`
attribute vec4 aSeed;uniform float uPixelScale;varying float vAlpha;varying float vMajor;varying float vHue;
${motion}
void main(){
 vec3 p=position;float small=1.-aSeed.z;
 float drift=sin(uTime*.23+aSeed.x)*.014*small;p+=normalize(position)*drift;
 p.xz=mat2(cos(drift),-sin(drift),sin(drift),cos(drift))*p.xz;
 p=stellarMotion(p);vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
 gl_PointSize=clamp(mix(.008+aSeed.y*.01,.052,aSeed.z)*uPixelScale/max(1.,-view.z),1.,11.);
 float front=smoothstep(-1.05,1.05,p.z);
 vAlpha=mix(.05,.45,front)*mix(.5,.95,.5+.5*sin(aSeed.x+uTime*(.3+aSeed.w*.4)))+aSeed.z*.65;
 vMajor=aSeed.z;vHue=front*.6+(position.y+1.)*.2;
}`;
export const constellationFragment=`
uniform vec3 uAccent;varying float vAlpha;varying float vMajor;varying float vHue;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;
 float glow=exp(-r*8.)*.75+exp(-r*2.5)*.08;vec3 ink=mix(vec3(.27,.21,.78),uAccent,clamp(vHue,0.,1.));
 ink=mix(ink,vec3(.86,.95,1.),vMajor*.6);gl_FragColor=vec4(ink,glow*vAlpha);
 #include <colorspace_fragment>
}`;
export const constellationThreadVertex=`attribute vec2 aTrace;varying vec2 vTrace;varying float vDepth;${motion}
void main(){vec3 p=stellarMotion(position);vDepth=smoothstep(-1.,1.,p.z);vTrace=aTrace;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
export const constellationThreadFragment=`uniform float uTime;uniform float uBurst;uniform vec3 uAccent;varying vec2 vTrace;varying float vDepth;
void main(){float d=abs(fract(vTrace.x*.6+vTrace.y-uTime*.13)-.5),pulse=exp(-d*d*700.);gl_FragColor=vec4(mix(vec3(.32,.28,.72),uAccent,vDepth),(.025+vDepth*.08+pulse*.45+uBurst*.14)*(.3+vDepth*.7));
 #include <colorspace_fragment>
}`;
