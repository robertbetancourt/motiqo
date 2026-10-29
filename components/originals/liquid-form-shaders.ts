/** Motiqo's procedural metal sculpture. No textures, image sampling or borrowed shader engine. */
export const vertex=`#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`;
export const fragment=`#version 300 es
precision highp float;
out vec4 colour;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float presence,time,liquidity,relief,shape,scale;
uniform vec3 tint;
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float join(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float ring(vec3 p,float r,float w){return length(vec2(length(p.xy)-r,p.z))-w;}
vec3 pose(vec3 p){p.xz=turn(-.3+time*.12+pointer.x*presence*.38)*p.xz;p.yz=turn(.25+.15*sin(time*.23)-pointer.y*presence*.33)*p.yz;p.xy=turn(.22*sin(p.z*1.4+time*.4))*p.xy;return p;}
float field(vec3 p){
  p=pose(p);
  float wake=exp(-dot(p.xy-pointer*1.35,p.xy-pointer*1.35)*2.8)*presence*liquidity;
  p.z+=wake*.14*sin(p.y*9.+time*2.1)*cos(p.x*7.-time*1.6);
  p.xy+=wake*.045*vec2(sin(p.y*12.+time),cos(p.x*11.-time));
  float d=9.;
  if(shape<.5){
    for(int i=0;i<3;i++){vec3 q=p;q.xy=turn(float(i)*2.094+sin(time*.3+float(i))*.16)*q.xy;q.xz=turn(.85+.18*sin(time*.27+float(i)))*q.xz;q.x+=.14;d=join(d,ring(q,.82,.15+.025*sin(time*.6+float(i))),.23);}
  }else if(shape<1.5){vec3 q=p;q.yz=turn(.55+sin(time*.35)*.22)*q.yz;q.x+=.18;d=join(ring(p,.87,.16),ring(q,.7,.12),.19);}
  else{float angle=atan(p.y,p.x);d=ring(p,.84+.14*cos(angle*5.+time*.42),.16+.025*sin(angle*3.-time*.5));}
  return d;
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.-resolution)/min(resolution.x,resolution.y);
  vec3 eye=vec3(0.,0.,4.7/scale),ray=normalize(vec3(uv*1.05,-3.));
  float b=dot(eye,ray),disc=b*b-dot(eye,eye)+2.56;
  if(disc<0.){colour=vec4(0.);return;}
  float travel=max(0.,-b-sqrt(disc)),end=-b+sqrt(disc);bool hit=false;
  vec3 p=eye;
  for(int i=0;i<112;i++){p=eye+ray*travel;float d=field(p);float pixelRadius=max(.0012,travel*.8/min(resolution.x,resolution.y));if(d<pixelRadius){hit=true;break;}travel+=max(.001,d*.55);if(travel>end)break;}
  if(!hit){colour=vec4(0.);return;}
  vec2 e=vec2(.0024,0.);vec3 n=normalize(vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx)));
  n=normalize(n+relief*.028*vec3(sin(p.y*28.),cos(p.z*24.),sin(p.x*22.)));
  vec3 light=normalize(vec3(-.6,1.1,1.8)),v=-ray,h=normalize(light+v);
  float diffuse=max(dot(n,light),0.),spec=pow(max(dot(n,h),0.),74.),rim=pow(1.-max(dot(n,v),0.),3.);
  vec3 reflected=reflect(ray,n);
  float studio=pow(max(dot(reflected,normalize(vec3(1.2,.7,1.8))),0.),18.);
  float strip=exp(-pow((reflected.y-.3)*10.,2.))*smoothstep(-.7,.2,reflected.x);
  float softbox=exp(-pow((reflected.x+.45)*3.2,2.)-pow((reflected.y-.55)*5.,2.));
  float brushed=.5+.5*sin(p.y*180.+p.x*32.);
  vec3 interference=mix(vec3(.62,.32,.18),vec3(.23,.41,.5),.5+.5*sin(reflected.x*3.+reflected.z*2.+time*.1));
  vec3 metal=tint*(.045+diffuse*.12)+interference*(.13+rim*.3)+vec3(.94,.97,.91)*(spec*.85+studio*.65+strip*.85+softbox*.5)+rim*vec3(.24,.3,.27);
  metal*=.96+.04*brushed*relief;
  metal*=.86+.14*smoothstep(-1.,1.,p.y);
  colour=vec4(sqrt(max(metal,vec3(0.))),1.);
}`;
