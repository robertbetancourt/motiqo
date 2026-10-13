// All shader code is authored for Motiqo. No reference-site source is bundled.
export const surfaceVertex = `
varying vec2 vUv; varying vec3 vNormal; varying vec3 vView;
void main(){vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.); vView=-mv.xyz;
vNormal=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv;}`;

const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5; for(int i=0;i<OCTAVES;i++){s+=a*noise2(p);p=mat2(1.61,1.17,-1.17,1.61)*p+3.7;a*=.5;}return s;}`;

export const foilFragment = `
uniform sampler2D uArt; uniform vec2 uTexel; uniform vec2 uPointer,uCardPointer;
uniform float uTime,uReveal,uFoil,uCardHover;
varying vec2 vUv; varying vec3 vNormal,vView;
${noise}
void main(){
vec4 art=texture2D(uArt,vec2(vUv.x,1.-vUv.y));
vec2 uv=vec2(vUv.x,1.-vUv.y);
float dx=texture2D(uArt,uv+vec2(uTexel.x,0.)).g-texture2D(uArt,uv-vec2(uTexel.x,0.)).g;
float dy=texture2D(uArt,uv+vec2(0.,uTexel.y)).g-texture2D(uArt,uv-vec2(0.,uTexel.y)).g;
vec3 n=normalize(vNormal+vec3(-dx*4.,dy*4.,0.)); vec3 view=normalize(vView);
vec3 l=normalize(vec3(-.6,.85,1.4)),r=reflect(-view,n);
float spec=pow(max(dot(r,l),0.),48.);
float mouse=pow(max(dot(r,normalize(vec3(uPointer*.8,1.8))),0.),65.);
float diffuse=max(dot(n,l),0.);
// A moving spectral reflection, anchored in the card's own coordinates.
vec2 reflection=mix(vec2(.5,.52),uCardPointer,uCardHover);
float lane=dot(vUv-reflection,vec2(.91,.42))-n.x*1.9+n.y*1.25;
float streak=exp(-lane*lane/.025);
float phase=vUv.x*1.75-vUv.y*.94+n.x*2.65-n.y*1.8;
phase+=dot(reflection-vec2(.5),vec2(1.15,-.82));
vec3 holo=.5+.5*cos(6.283*(phase+vec3(.10,.37,.69)));
holo=mix(holo,vec3(.95,.75,.48),.12);
vec3 metal=vec3(.58,.34,.12)*(.45+diffuse*.5)+vec3(.94,.79,.53)*(spec*1.2+mouse*.7);
metal=mix(metal,holo*(.6+spec),streak*(.5+.38*uCardHover)*uFoil)+holo*streak*(.17+.20*uCardHover);
vec3 lacquer=vec3(.0018,.0026,.0035)+vec3(.016,.014,.012)*pow(max(dot(r,l),0.),5.);
float spectralInk=streak*(.045+.22*uCardHover);
lacquer+=art.a*(.019+mouse*.10+spectralInk)*mix(vec3(.72,.53,.32),holo,.86);
// Fine intermittent foil rows catch the moving reflection on the black print too.
float pitch=uv.y*190.+uv.x*6.;
float rows=1.-smoothstep(.035,.035+min(.35,fwidth(pitch)),abs(fract(pitch)-.5));
float runs=step(.60,hash(floor(uv*vec2(90.,190.))));
lacquer+=holo*streak*uCardHover*(.003+rows*runs*.085);
float sparkle=step(.994,hash(floor(uv*vec2(470.,658.))))*pow(max(dot(r,normalize(vec3(hash(floor(uv*100.))-.5,.7,1.))),0.),140.);
lacquer+=holo*sparkle*(.6+.65*uCardHover);
vec3 col=mix(lacquer,metal,art.r); col=mix(col,vec3(.72,.66,.52),art.b*.75);
float reveal=smoothstep(0.,.13,uReveal-length((vUv-vec2(.5,.5))*vec2(.7,1.)));
float edge=exp(-pow((length((vUv-.5)*vec2(.7,1.))-uReveal)/.018,2.));
col=col*reveal+vec3(1.,.76,.4)*edge*art.r*1.6;
gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

export const screenVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}`;
export const atmosphereFragment = `
uniform sampler2D uBackdrop,uDrift; uniform float uTime,uAspect,uImageAspect,uHasDrift,uImageReady;
uniform vec2 uPointer; varying vec2 vUv;
${noise}
void main(){
vec2 uv=vUv;
vec2 offset=texture2D(uDrift,uv).xy*uHasDrift;
vec2 p=(uv-.5)*vec2(uAspect,1.); p-=offset*.22;
vec2 q=vec2(fbm(p*2.+vec2(0.,-uTime*.035)),fbm(p*2.+vec2(5.4,uTime*.028)));
float cloud=fbm(p*3.+q*2.6+vec2(.0,-uTime*.05));
float wisps=fbm(p*7.+q*3.2+vec2(uTime*.02,0.));
float smoke=pow(smoothstep(.46,.82,cloud),1.65)*(.3+wisps*.9);
float angle=atan(p.y,p.x),radius=length(p);
float rays=pow(max(0.,sin(angle*46.+fbm(vec2(angle*7.,uTime*.03))*4.)),13.);
vec2 img=(uv-.5)*vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect))+.5;
img+=uPointer*.006+offset*.045;
vec3 photo=texture2D(uBackdrop,img).rgb;float gray=dot(photo,vec3(.2126,.7152,.0722));
vec3 col=vec3(.0018,.0025,.0036)+vec3(.027,.020,.019)*pow(gray,1.3)*uImageReady;
float side=smoothstep(-.65,.7,p.x);
col+=mix(vec3(.075,.051,.037),vec3(.062,.077,.10),side)*smoke*1.35;
col+=mix(vec3(.32,.17,.08),vec3(.19,.22,.27),side)*rays*.13*smoothstep(.1,.8,radius)*(.3+smoke);
float glow=exp(-dot(p-vec2(.12,.1),p-vec2(.12,.1))*3.);
col+=vec3(.009,.005,.003)*glow;
col*=1.-.5*smoothstep(.12,1.,length(uv-.5));
col+=hash(gl_FragCoord.xy)*.0008;
gl_FragColor=vec4(col,1.);
#include <colorspace_fragment>
}`;

export const interiorFragment = `
uniform float uTime; varying vec2 vUv;
void main(){vec2 p=(vUv-vec2(.5,.535))*vec2(2.5,3.5);float r=length(p),a=atan(p.y,p.x);
float circles=pow(.5+.5*cos(r*73.),24.)*(1.-smoothstep(.1,1.2,r));
float spokes=pow(.5+.5*cos(a*28.+sin(r*3.-uTime*.1)*.1),90.);
float ring=exp(-pow((r-.73)/.012,2.));
vec3 col=vec3(.0015,.0024,.0038)+vec3(.037,.026,.015)*(circles*.2+spokes*.12+ring*.6);
col+=vec3(.011,.007,.004)*exp(-r*r*4.);
gl_FragColor=vec4(col,1.);
#include <colorspace_fragment>
}`;

export const driftFragment = `
uniform sampler2D uField;uniform vec2 uPointer,uVelocity;uniform float uDt,uActive;varying vec2 vUv;
void main(){vec2 field=texture2D(uField,vUv).xy;
vec2 upstream=vUv-field*uDt*.18;
field=texture2D(uField,upstream).xy*exp(-uDt*.9);
float brush=exp(-dot(vUv-uPointer,vUv-uPointer)/.006)*uActive;
field+=uVelocity*brush*.2;
gl_FragColor=vec4(clamp(field,vec2(-.65),vec2(.65)),0.,1.);}`;

export const threadVertex = `
uniform float uTime,uThreadHover,uThreadRadius;
uniform vec2 uThreadPointer,uViewport;
varying vec3 vPos; varying float vHover;
void main(){
vec3 p=position;p.y+=sin(p.x*.6+uTime*.22+p.z)*.025;vPos=p;
vec4 clip=projectionMatrix*modelViewMatrix*vec4(p,1.);
vec2 pixel=(clip.xy/clip.w*.5+.5)*uViewport;
vec2 separation=pixel-uThreadPointer*uViewport;
float radiusSquared=dot(separation,separation)/(uThreadRadius*uThreadRadius);
float influence=pow(max(0.,1.-radiusSquared),3.);
// A smooth finite lens parts the filaments without a sharp kink at its edge.
clip.xy+=separation*(1.25*uThreadHover*influence)/uViewport*2.*clip.w;
vHover=uThreadHover*influence;gl_Position=clip;}`;
export const threadFragment = `uniform float uTime;varying vec3 vPos;varying float vHover;
void main(){float glint=pow(.5+.5*sin(vPos.x*1.5-uTime*.45+vPos.z*5.),12.);
vec3 c=mix(vec3(.23,.12,.055),vec3(.65,.55,.43),.5+.5*sin(vPos.z*4.));
gl_FragColor=vec4(c*(.5+glint*1.5+vHover*.65),.19+glint*.16+vHover*.12);}`;

export const particleVertex = `uniform float uTime,uPixelRatio;attribute float aSize;attribute float aSeed;varying float vSeed;
void main(){vec3 p=position;p.y+=sin(uTime*.16+aSeed*30.)*.13;p.x+=sin(uTime*.11+aSeed*8.)*.06;
vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(18.,aSize*uPixelRatio*6./max(1.,-mv.z));vSeed=aSeed;}`;
export const particleFragment = `uniform float uTime;varying float vSeed;
void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*30.)*(.4+.6*pow(.5+.5*sin(uTime*.55+vSeed*40.),3.));
gl_FragColor=vec4(mix(vec3(.65,.35,.17),vec3(.8,.79,.69),vSeed),a);}`;
