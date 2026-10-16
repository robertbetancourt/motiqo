import * as THREE from 'three';

export type ResonanceOptions={size:number;speed:number;waveAmplitude:number;ribbonCount:number;colorPalette:readonly [string,string,string];intensity:number;paused:boolean};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const field=`
uniform float uTime,uAmplitude,uHover,uIntensity;
float fold(float a,float lane){
 float t=uTime;float agitation=uAmplitude*(1.+uHover*uIntensity*.45);
 float band=.115+.105*sin(a*3.-t*.85)*cos(a*2.+t*.57)+.032*sin(a*5.+t*.64);
 return .80+.023*sin(a*2.+t*.51)+pow(lane,3.0)*band*agitation
  +.067*sin(a*3.+t*.76+lane*5.2)*sin(lane*3.14159265)*agitation;
}
`;
const ribbonVertex=field+`
uniform float uPixel;varying float vLane,vSide;
void main(){float a=position.x+uTime*.065,lane=position.y;
 float r=fold(a,lane);vec2 radial=vec2(cos(a),sin(a));
 float width=uPixel*(.65+pow(1.-lane,3.)*2.2);
 vec2 p=radial*(r+position.z*width);vLane=lane;vSide=position.z;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,0.,1.);
}`;
const ribbonFragment=`uniform vec3 uColors[3];varying float vLane,vSide;
void main(){float alpha=exp(-vSide*vSide*2.5)*.48;
 vec3 c=mix(uColors[1],uColors[0],vLane);
 c=mix(c,vec3(.88,.94,1.),pow(1.-vLane,6.)*.62);
 gl_FragColor=vec4(c*2.3,alpha);}`;
const auraVertex=field+`
uniform float uDpr;attribute float aSeed;varying float vAlpha,vLane;
void main(){float lane=position.y,a=position.x+uTime*(.035+lane*.015);
 float r=fold(a,1.)+.025+lane*.92;
 r+=sin(a*4.+uTime*.55+lane*3.)*.07*lane;
 vec2 p=vec2(cos(a),sin(a))*r;
 p.y+=lane*lane*.48;vLane=lane;
 vAlpha=pow(1.-lane,1.6)*(.5+.16*sin(aSeed*17.+uTime*.35));
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,-.1,1.);
 gl_PointSize=uDpr*(1.0+aSeed*.35);
}`;
const auraFragment=`uniform vec3 uColors[3];varying float vAlpha,vLane;
void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
 gl_FragColor=vec4(mix(uColors[2],uColors[0],vLane)*5.,vAlpha*(1.-d*d));}`;
const haloFragment=field+`
uniform vec3 uColors[3];varying vec2 vPoint;
void main(){float a=atan(vPoint.y,vPoint.x),r=length(vPoint),edge=fold(a,1.);
 float glow=exp(-pow((r-edge)/.15,2.))*.12;
 glow+=exp(-pow((r-.81)/.055,2.))*.24;
 glow*=smoothstep(.71,.79,r);
 gl_FragColor=vec4(uColors[2],glow);}`;

export function resonanceBuffers(count:number){
 const segments=720,positions=new Float32Array(count*(segments+1)*6),indices=new Uint32Array(count*segments*6);let v=0,k=0;
 for(let ring=0;ring<count;ring++){
  for(let j=0;j<=segments;j++)for(const side of [-1,1]){positions[v++]=j/segments*Math.PI*2;positions[v++]=ring/(count-1);positions[v++]=side;}
  for(let j=0;j<segments;j++){const a=(ring*(segments+1)+j)*2;indices.set([a,a+1,a+2,a+1,a+3,a+2],k);k+=6;}
 }
 const dots=new Float32Array(56*640*3),seeds=new Float32Array(56*640);let seed=52371;
 for(let ring=0;ring<56;ring++)for(let j=0;j<640;j++){seed=(Math.imul(seed,1664525)+1013904223)|0;const r=(seed>>>0)/4294967296,i=ring*640+j;dots[i*3]=(j+r*.4)/640*Math.PI*2;dots[i*3+1]=(ring+r*.3)/56;seeds[i]=r;}
 return{positions,indices,dots,seeds};
}

export function createResonanceScene(canvas:HTMLCanvasElement,compact:boolean,getOptions:()=>ResonanceOptions){
 const root=canvas.parentElement!,renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setClearColor('#000000');renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,10);camera.position.z=4;
 const o=getOptions(),buffers=resonanceBuffers(Math.round(clamp(o.ribbonCount,30,45))),geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
 const uniforms={uTime:{value:0},uAmplitude:{value:1},uHover:{value:0},uIntensity:{value:1},uPixel:{value:.004},uDpr:{value:1},uColors:{value:[new THREE.Color(),new THREE.Color(),new THREE.Color()]}};
 const geometry=(g:THREE.BufferGeometry)=>{geometries.push(g);return g;};
 const material=(vertexShader:string,fragmentShader:string)=>{const m=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending});materials.push(m);return m;};
 const ribbons=geometry(new THREE.BufferGeometry());ribbons.setAttribute('position',new THREE.BufferAttribute(buffers.positions,3));ribbons.setIndex(new THREE.BufferAttribute(buffers.indices,1));
 const mesh=new THREE.Mesh(ribbons,material(ribbonVertex,ribbonFragment));mesh.frustumCulled=false;mesh.renderOrder=2;scene.add(mesh);
 const aura=geometry(new THREE.BufferGeometry());aura.setAttribute('position',new THREE.BufferAttribute(buffers.dots,3));aura.setAttribute('aSeed',new THREE.BufferAttribute(buffers.seeds,1));
 const points=new THREE.Points(aura,material(auraVertex,auraFragment));points.frustumCulled=false;points.renderOrder=1;scene.add(points);
 const halo=new THREE.Mesh(geometry(new THREE.PlaneGeometry(5,5)),material('varying vec2 vPoint;void main(){vPoint=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',haloFragment));scene.add(halo);
 const media=matchMedia('(prefers-reduced-motion: reduce)');let gone=false,lost=false,visible=true,raf=0,last=0,time=0,hover=0,hoverTarget=0,width=1,height=1,samples=0,sampleStart=0;
 function draw(){if(gone||lost)return;const opt=getOptions();uniforms.uTime.value=media.matches?.8:time;uniforms.uAmplitude.value=clamp(opt.waveAmplitude,0,2);uniforms.uIntensity.value=clamp(opt.intensity,0,3);uniforms.uHover.value=hover;
  opt.colorPalette.forEach((c,i)=>uniforms.uColors.value[i].set(/^#[\da-f]{6}$/i.test(c)?c:['#234bff','#5a8cff','#1a3cff'][i]));
  const diameter=Math.min(clamp(opt.size,100,600),width*.63,height*.57),units=diameter/1.6;
  camera.left=-width/(2*units);camera.right=-camera.left;camera.top=height/(2*units);camera.bottom=-camera.top;camera.updateProjectionMatrix();uniforms.uPixel.value=1/units;
  renderer.render(scene,camera);root.dataset.ready='true';root.dataset.sceneTime=time.toFixed(3);root.dataset.hover=hover.toFixed(3);root.dataset.ribbons=String(Math.round(clamp(opt.ribbonCount,30,45)));
 }
 function stop(){cancelAnimationFrame(raf);raf=0;}
 function tick(now:number){raf=0;if(gone||lost||!root.isConnected||!visible||document.hidden)return;if(getOptions().paused||media.matches){draw();return;}const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}const dt=Math.min(.05,elapsed/1000);last=now;time+=dt*clamp(getOptions().speed,.1,3);hover+=(hoverTarget-hover)*(1-Math.exp(-dt*4));draw();samples++;if(now-sampleStart>=750){root.dataset.fps=(samples*1000/(now-sampleStart)).toFixed(1);samples=0;sampleStart=now;}raf=requestAnimationFrame(tick);}
 function wake(){if(!gone&&!lost&&!raf&&visible&&!document.hidden){last=sampleStart=performance.now();samples=0;raf=requestAnimationFrame(tick);}}
 function resize(){const r=root.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const dpr=Math.min(window.devicePixelRatio||1,compact?1:2);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);uniforms.uDpr.value=dpr;draw();wake();}
 function sync(){stop();draw();wake();}function enter(){hoverTarget=1;wake();}function leave(){hoverTarget=0;wake();}function visibility(){stop();wake();}function lostContext(event:Event){event.preventDefault();lost=true;stop();delete root.dataset.ready;}function restored(){lost=false;resize();}
 const resizeObserver=new ResizeObserver(resize),observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility();});resizeObserver.observe(root);observer.observe(root);root.addEventListener('pointerenter',enter);root.addEventListener('pointerleave',leave);root.addEventListener('focus',enter);root.addEventListener('blur',leave);canvas.addEventListener('webglcontextlost',lostContext);canvas.addEventListener('webglcontextrestored',restored);media.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);resize();
 return{sync,dispose(){gone=true;stop();resizeObserver.disconnect();observer.disconnect();root.removeEventListener('pointerenter',enter);root.removeEventListener('pointerleave',leave);root.removeEventListener('focus',enter);root.removeEventListener('blur',leave);canvas.removeEventListener('webglcontextlost',lostContext);canvas.removeEventListener('webglcontextrestored',restored);media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();if(!root.isConnected)renderer.forceContextLoss();delete root.dataset.ready;}};
}
