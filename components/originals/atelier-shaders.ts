export const atelierMask=`uniform vec2 uResolution;uniform float uPortal,uBrushCount,uRoughness,uTime;uniform vec4 uBrush[32];
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.1)*.15;}
void main(){vec2 uv=vUv;vec2 warp=vec2(fbm(uv*17.+.02*uTime),fbm(uv*19.+31.-.015*uTime))-.5;uv+=warp*.034*uRoughness;
 vec2 portalRadii=vec2(.255,min(.185,.155*uResolution.x/uResolution.y))*uPortal;
 vec2 ellipse=(uv-vec2(.5,.42))/portalRadii;float field=1.45*exp(-dot(ellipse,ellipse)*1.3);
 for(int i=0;i<32;i++){if(float(i)>=uBrushCount)break;vec4 b=uBrush[i];vec2 d=(uv-b.xy)*uResolution/max(1.,b.z);field=max(field,1.45*exp(-dot(d,d)*1.4)*b.w);}
 float dry=(noise(vUv*uResolution*.18)-.5)*.125*uRoughness+(noise(vUv*uResolution*.055+19.)-.5)*.12*uRoughness;
 fragColor=vec4(clamp(field+dry,0.,1.),0,0,1.);}`;
export const atelierComposite=`uniform sampler2D uRender,uSketch,uMask;uniform vec2 uCover,uSketchCover,uImageTexel,uResolution;uniform float uHasSketch;
float luminance(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){vec2 uv=(vUv-.5)*uCover+.5;vec3 room=texture(uRender,uv).rgb;vec3 sketch;
 if(uHasSketch>.5){sketch=texture(uSketch,(vUv-.5)*uSketchCover+.5).rgb;}
 else{vec2 t=uImageTexel*2.;float a=luminance(texture(uRender,uv+vec2(-t.x,t.y)).rgb),b=luminance(texture(uRender,uv+vec2(0,t.y)).rgb),c=luminance(texture(uRender,uv+t).rgb),d=luminance(texture(uRender,uv-vec2(t.x,0)).rgb),f=luminance(texture(uRender,uv+vec2(t.x,0)).rgb),g=luminance(texture(uRender,uv-t).rgb),h=luminance(texture(uRender,uv-vec2(0,t.y)).rgb),i=luminance(texture(uRender,uv+vec2(t.x,-t.y)).rgb);float edge=length(vec2(-a-2.*d-g+c+2.*f+i,-a-2.*b-c+g+2.*h+i));sketch=vec3(1.-smoothstep(.07,.7,edge)*.38);}
 vec2 edgeDistance=abs(vUv-.5)*2.;float vignette=smoothstep(.24,.97,length(edgeDistance*vec2(.85,.9)));sketch=mix(sketch,vec3(1.),vignette*.92);
 float field=texture(uMask,vUv).r,aa=max(.007,fwidth(field)*.65);float reveal=smoothstep(.5-aa,.5+aa,field);
 float charcoal=(smoothstep(.455,.49,field)-smoothstep(.525,.57,field))*.35;
 vec3 color=mix(sketch,room,reveal);color*=1.-charcoal;
 fragColor=vec4(color,1.);}`;
