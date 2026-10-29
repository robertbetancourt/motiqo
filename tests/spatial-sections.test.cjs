const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load, mount, React } = require("./support/component-harness.cjs");

test('Obsidian preview repeats its demo phases and releases its timer when paused',async()=>{
 const originalSet=global.setInterval,originalClear=global.clearInterval,jobs=new Map();let serial=0;
 global.setInterval=fn=>{jobs.set(++serial,fn);return serial;};global.clearInterval=id=>jobs.delete(id);
 let e;try{
  const C=load('components/originals/obsidian-gate.tsx').default;e=await mount(C,{autoDemo:true});
  const node=document.querySelector('.obsidian-gate');assert.equal(jobs.size,1);
  for(const expected of ['focused','authenticating','success','idle','focused']){
   await React.act(()=>{for(const fn of jobs.values())fn();});assert.equal(node.dataset.phase,expected);
  }
  await e.update({autoDemo:true,paused:true});assert.equal(jobs.size,0);
 }finally{await e?.close();global.setInterval=originalSet;global.clearInterval=originalClear;}
});

test('The library places additions first with a stable order within each release date',()=>{
 const {elements,releaseGroup,isElementNew}=load('lib/catalog.ts'),items=require('../registry/manifest.json').items.filter(item=>item.visibility!=='draft');
 assert.deepEqual(elements.slice(0,4).map(item=>item.id),['elastic-reel','frame-bloom','arc-drift','silk-stream']);
 assert.deepEqual(elements.filter(isElementNew).slice(-2).map(item=>item.id),['liquid-artifact-hero','gilded-signal']);
 assert.equal(elements.length,items.length);
 for(let i=1;i<elements.length;i++)assert.ok(releaseGroup(elements[i-1])<releaseGroup(elements[i])||releaseGroup(elements[i-1])===releaseGroup(elements[i])&&(elements[i-1].addedAt??'')>=(elements[i].addedAt??''));
});

test('Section fitting preserves both axes and gives stacked sign-in panels their full height',async()=>{
 let width=936;
 const Fit=load('components/section-preview-fit.tsx').default,Wrapper=()=>{
  Object.defineProperty(window.HTMLElement.prototype,'clientWidth',{configurable:true,get(){return width;}});
  Object.defineProperty(window.HTMLElement.prototype,'scrollHeight',{configurable:true,get(){return this.style.width==='100%'?1400:700;}});
  return React.createElement(Fit,{frameWidth:1040,height:700,responsive:true},React.createElement('section',null,'Complete sign in'));
 },e=await mount(Wrapper);
 try{const outer=document.querySelector('#root>div'),inner=outer.firstElementChild;assert.equal(outer.style.height,'630px');assert.equal(inner.style.transform,'scale(0.9)');assert.equal(inner.style.width,'1040px');width=320;await React.act(()=>e.observers[0].fn());await React.act(()=>e.observers[0].fn());assert.equal(inner.style.width,'100%');assert.equal(inner.style.transform,'scale(1)');assert.equal(outer.style.height,'1400px');}finally{await e.close();}
 assert.ok(e.observers.every(observer=>observer.disconnected));
});
test('Pricing entries have a separate gallery and preserve their portable registry identity',()=>{
 const {isPricing,isSection,componentGroupCounts}=load('lib/component-groups.ts'),items=require('../registry/manifest.json').items.filter(item=>item.visibility!=='draft');
 assert.deepEqual(items.filter(isPricing).map(item=>item.id).sort(),['horizon-grid-pricing','prism-tier-pricing']);
 assert.equal(Object.values(componentGroupCounts).reduce((sum,n)=>sum+n,0),items.filter(item=>!isSection(item)).length);
});
test('Cosmos serializes async sign in, clears the password on success and reports provider errors',async()=>{
 const Auth=load('components/originals/cosmos-split-auth.tsx').default;let finish,calls=0;const e=await mount(Auth,{onSubmit:()=>{calls++;return new Promise(resolve=>{finish=resolve;});},onGoogle:async()=>{throw Error('provider unavailable');}});
 try{const form=document.querySelector('form'),send=()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await React.act(()=>{send();send();});assert.equal(calls,1);assert.equal(document.querySelector('.cs-submit').disabled,true);await React.act(async()=>{finish();await Promise.resolve();});assert.equal(document.querySelector('.cs-submit').disabled,false);assert.match(document.querySelector('.cs-feedback').textContent,/complete/);assert.equal(document.querySelector('[name=password]').value,'');await React.act(async()=>{document.querySelector('.cs-google').click();await Promise.resolve();});assert.match(document.querySelector('.cs-feedback').textContent,/failed/);}finally{await e.close();}
});
test("Cosmos translates the form, wraps scenes, and reports missing authentication honestly", async () => {
  const Auth = load("components/originals/cosmos-split-auth.tsx").default,
    e = await mount(Auth, { autoCycleSlides: false });
  try {
    const host = document.querySelector("section"),
      select = host.querySelector("select");
    await React.act(() => {
      select.value = "ES";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    assert.equal(host.querySelector("h2").textContent, "¡Bienvenido!");
    assert.equal(host.lang, "es");
    await e.click(host.querySelector('[aria-label="Previous scene"]'));
    assert.equal(host.querySelector(".cs-space").dataset.slide, "3");
    await e.click(host.querySelector('[aria-label="Next scene"]'));
    assert.equal(host.querySelector(".cs-space").dataset.slide, "0");
    await React.act(() =>
      host
        .querySelector("form")
        .dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    assert.match(host.querySelector("[role=status]").textContent, /Modo demo/);
    await e.click(host.querySelector(".cs-google"));
    assert.match(host.querySelector("[role=status]").textContent, /onGoogle/);
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
  assert.ok(e.observers.every((o) => o.disconnected));
});
test("Bio Terrain updates live uniforms without rebuilding the scene and disposes StrictMode sessions", async () => {
  const sessions = [],
    Hero = load("components/heroes/bio-terrain-hero.tsx", {
      "./bio-terrain-scene": {
        createBioTerrainScene(host, canvas, read) {
          const s = {
            read,
            pulses: 0,
            invalidate() {},
            pulse() {
              this.pulses++;
            },
            dispose() {
              this.disposed = true;
            },
          };
          sessions.push(s);
          host.dataset.ready = "true";
          return s;
        },
      },
    }).default,
    e = await mount(Hero);
  try {
    await e.click(
      [...document.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Deploy"),
      ),
    );
    assert.equal(sessions.at(-1).pulses, 1);
    assert.match(
      document.querySelector("[role=status]").textContent,
      /wave released/,
    );
    const count = sessions.length;
    await e.update({ waveSpeed: 0.4, paused: true });
    assert.equal(sessions.length, count);
    assert.equal(sessions.at(-1).read().waveSpeed, 0.4);
    assert.equal(sessions.at(-1).read().paused, true);
    await e.click(
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent === "Explore Architecture",
      ),
    );
    assert.equal(document.querySelector("#bio-architecture").hidden, false);
  } finally {
    await e.close();
  }
  assert.ok(sessions.every((s) => s.disposed));
});
test("Bio GPU geometry, energy uniforms and context recovery use the real Three primitives", async () => {
  const three = require("three");
  let rendered,
    disposed = 0,
    clockDisposed = 0,
    draw,
    resize;
  class Renderer {
    setClearColor() {}
    setPixelRatio(v) {
      this.ratio = v;
    }
    getPixelRatio() {
      return this.ratio;
    }
    setSize() {}
    render(s) {
      rendered = s;
    }
    dispose() {
      disposed++;
    }
  }
  const Scene = load("components/heroes/bio-terrain-scene.ts", {
    three: { ...three, WebGLRenderer: Renderer },
    "./hero-clock": {
      heroClock(host, fn, size) {
        draw = fn;
        resize = size;
        size(1280, 900);
        fn({ dt: 1 / 60, still: false });
        return {
          invalidate() {
            fn({ dt: 1 / 60, still: false });
          },
          dispose() {
            clockDisposed++;
          },
        };
      },
    },
  });
  const e = await mount(() =>
    React.createElement("section", null, React.createElement("canvas")),
  );
  try {
    const host = document.querySelector("section"),
      canvas = host.querySelector("canvas"),
      options = {
        particleCount: 45000,
        waveSpeed: 1,
        pulseIntensity: 1,
        accentColor: "#9ef054",
        paused: false,
      },
      s = Scene.createBioTerrainScene(host, canvas, () => options);
    assert.equal(
      rendered.children[0].geometry.attributes.position.count,
      45000,
    );
    const material = rendered.children[0].material,
      first = material.uniforms.uTime.value;
    options.waveSpeed = 0;
    draw({ dt: 0.04, still: false });
    assert.equal(material.uniforms.uTime.value, first);
    s.pulse();
    assert.equal(host.dataset.pulse, "active");
    canvas.dispatchEvent(
      new window.Event("webglcontextlost", { cancelable: true }),
    );
    assert.equal(host.dataset.gl, "off");
    canvas.dispatchEvent(new window.Event("webglcontextrestored"));
    assert.equal(host.dataset.gl, "on");
    s.dispose();
    assert.equal(disposed, 1);
    assert.equal(clockDisposed, 1);
  } finally {
    await e.close();
  }
});
test("Horizon updates capacity, prices and disclosures and calls the selected plan", async () => {
  const Pricing = load("components/originals/horizon-grid-pricing.tsx").default,
    calls = [],
    e = await mount(Pricing, { onSelectPlan: (...value) => calls.push(value) });
  try {
    const host = e.dom.window.document.querySelector("section"),
      buttons = () => [...host.querySelectorAll("button")];
    assert.equal(
      host
        .querySelector('[aria-label="$89 per month"]')
        .textContent.includes("$"),
      true,
    );
    await e.click(buttons().find((b) => b.textContent.startsWith("250K")));
    assert.ok(host.querySelector('[aria-label="$329 per month"]'));
    await e.click(
      buttons().find((b) => b.textContent.includes("Choose Expert")),
    );
    assert.deepEqual(calls, [["expert", 250000]]);
    assert.match(host.textContent, /37,500 req\/s/);
    await e.click(buttons().find((b) => b.textContent.includes("View more")));
    assert.equal(host.querySelector(".hg-extra").hidden, false);
    await e.update({ defaultTierIndex: 1, paused: true });
    assert.ok(host.querySelector('[aria-label="$129 per month"]'));
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
});
test("Zenith keeps the complete editorial fallback and announces its energy pulse", async () => {
  const Hero = load("components/heroes/zenith-beam-hero.tsx").default,
    e = await mount(Hero, { title: "A luminous core" });
  try {
    const host = e.dom.window.document.querySelector("section");
    assert.equal(host.dataset.graphics, "fallback");
    assert.equal(host.querySelector("h1").textContent, "A luminous core");
    await e.click(
      [...host.querySelectorAll("button")].find((b) =>
        b.textContent.includes("Initialize"),
      ),
    );
    assert.match(
      host.querySelector("[role=status]").textContent,
      /initialized/,
    );
    await e.update({ title: "New core", paused: true });
    assert.equal(host.querySelector("h1").textContent, "New core");
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
});
