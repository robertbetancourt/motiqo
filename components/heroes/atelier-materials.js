import * as THREE from 'three';

// Deterministic, locally generated PBR maps: no third-party asset requests.
function random(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function canvas(size = 1024) {
  const image = document.createElement('canvas');
  image.width = image.height = size;
  return { image, ctx: image.getContext('2d') };
}

function texture(image, color = false) {
  const map = new THREE.CanvasTexture(image);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function grain(ctx, rng, amount = 7) {
  const pixels = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rng() - 0.5) * amount;
    data[i] += noise; data[i + 1] += noise; data[i + 2] += noise;
  }
  ctx.putImageData(pixels, 0, 0);
}

function limestone(paved = false) {
  const { image, ctx } = canvas();
  const height = canvas();
  const rng = random(paved ? 17 : 31);
  ctx.fillStyle = '#b6aa94'; ctx.fillRect(0, 0, 1024, 1024);
  height.ctx.fillStyle = '#777'; height.ctx.fillRect(0, 0, 1024, 1024);
  const rows = paved ? 14 : 12;
  const rowHeight = 1024 / rows;
  for (let row = 0; row < rows; row++) {
    let x = -(row % 2) * 160;
    while (x < 1024) {
      const width = paved ? 140 + rng() * 180 : 160 + rng() * 190;
      const shade = (rng() - 0.5) * 30;
      const y = row * rowHeight;
      ctx.fillStyle = `rgb(${204 + shade},${192 + shade},${169 + shade})`;
      ctx.fillRect(x + 1.2, y + 1.5, width - 2.4, rowHeight - 3);
      height.ctx.fillStyle = `rgb(${190 + shade},${190 + shade},${190 + shade})`;
      height.ctx.fillRect(x + 1.2, y + 1.5, width - 2.4, rowHeight - 3);
      for (let spot = 0; spot < 24; spot++) {
        const px = x + 6 + rng() * (width - 12);
        const py = y + 5 + rng() * (rowHeight - 10);
        const radius = 3 + rng() * 10;
        const mottling = ctx.createRadialGradient(px, py, 0, px, py, radius);
        mottling.addColorStop(0, rng() > 0.5 ? 'rgba(103,87,65,.12)' : 'rgba(246,232,199,.2)');
        mottling.addColorStop(1, 'rgba(150,140,120,0)');
        ctx.fillStyle = mottling; ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
        height.ctx.fillStyle = 'rgba(88,88,88,.12)';
        height.ctx.fillRect(px, py, radius * 1.5, 1 + rng() * 2);
      }
      // Fine sediment, occasional pores, and softly irregular stone edges.
      for (let line = 0; line < 13; line++) {
        const yy = y + rng() * rowHeight;
        ctx.strokeStyle = rng() > 0.5 ? 'rgba(112,95,70,.08)' : 'rgba(250,240,214,.18)';
        ctx.lineWidth = 0.8 + rng() * 2;
        ctx.beginPath(); ctx.moveTo(x, yy);
        ctx.bezierCurveTo(x + width * 0.35, yy + 4, x + width * 0.7, yy - 4, x + width, yy);
        ctx.stroke();
      }
      for (let pore = 0; pore < 18; pore++) {
        const px = x + rng() * width; const py = y + rng() * rowHeight;
        ctx.fillStyle = 'rgba(100,84,62,.15)';
        ctx.fillRect(px, py, 1 + rng() * 2.5, 1 + rng() * 1.5);
        height.ctx.fillStyle = '#858585'; height.ctx.fillRect(px, py, 2, 1.5);
      }
      x += width;
    }
  }
  grain(ctx, rng, 12);
  grain(height.ctx, rng, 12);
  const material = new THREE.MeshStandardMaterial({ color: paved ? '#f6dbb5' : '#e9e7e8', map: texture(image, true), bumpMap: texture(height.image), bumpScale: paved ? 0.018 : 0.026, roughness: 0.88 });
  material.userData.uvMetres = 2;
  return material;
}

function oak() {
  const { image, ctx } = canvas();
  const rng = random(53);
  ctx.fillStyle = '#916b40'; ctx.fillRect(0, 0, 1024, 1024);
  for (let board = 0; board < 12; board++) {
    const x = board * 1024 / 12;
    const shade = (rng() - 0.5) * 25;
    ctx.fillStyle = `rgb(${147 + shade},${108 + shade},${63 + shade})`;
    ctx.fillRect(x, 0, 1024 / 12 - 1.5, 1024);
    for (let line = 0; line < 26; line++) {
      const xx = x + rng() * 1024 / 12;
      ctx.strokeStyle = rng() > 0.5 ? 'rgba(55,30,14,.14)' : 'rgba(228,177,107,.18)';
      ctx.lineWidth = 0.5 + rng();
      ctx.beginPath(); ctx.moveTo(xx, 0);
      ctx.bezierCurveTo(xx + rng() * 8, 340, xx - rng() * 7, 680, xx, 1024); ctx.stroke();
    }
  }
  grain(ctx, rng, 7);
  const material = new THREE.MeshStandardMaterial({ map: texture(image, true), bumpMap: texture(image), bumpScale: 0.003, roughness: 0.72 });
  material.userData.uvMetres = 2;
  return material;
}

function fineSurface(color, seed, roughness, bumpScale) {
  const { image, ctx } = canvas(512);
  const rng = random(seed);
  ctx.fillStyle = '#aaa'; ctx.fillRect(0, 0, 512, 512);
  grain(ctx, rng, 30);
  const material = new THREE.MeshStandardMaterial({ color, roughness, bumpMap: texture(image), bumpScale });
  material.userData.uvMetres = 1;
  return material;
}

export function createMaterials() {
  const waterSurface = canvas(512);
  for (let y = 0; y < 512; y++) {
    const shade = 128 + Math.sin(y * 0.23) * 17 + Math.sin(y * 0.07) * 11;
    waterSurface.ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    waterSurface.ctx.fillRect(0, y, 512, 1);
  }
  return {
    stone: limestone(),
    terrace: limestone(true),
    oak: oak(),
    roof: fineSurface('#cdb68f', 71, 0.91, 0.003),
    linen: fineSurface('#c6b79a', 83, 1, 0.004),
    curtain: fineSurface('#d6c7ac', 97, 1, 0.002),
    metal: new THREE.MeshStandardMaterial({ color: '#433327', metalness: 0.65, roughness: 0.37 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#bea97e', metalness: 0, roughness: 0.065, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.8 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#507e76', roughness: 0.09, metalness: 0.28, clearcoat: 1, clearcoatRoughness: 0.07, bumpMap: texture(waterSurface.image), bumpScale: 0.007, envMapIntensity: 1.1 }),
    poolBed: new THREE.MeshStandardMaterial({ color: '#506962', roughness: 0.8 }),
  };
}

// Box faces use the same real-world texel scale, including thin slab edges.
export function setBoxUVScale(geometry, size, material) {
  if (!material.userData.uvMetres) return;
  const uv = geometry.attributes.uv;
  const [w, h, d] = size;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    for (let vertex = 0; vertex < 4; vertex++) {
      const i = face * 4 + vertex;
      uv.setXY(i, uv.getX(i) * faces[face][0] / material.userData.uvMetres, uv.getY(i) * faces[face][1] / material.userData.uvMetres);
    }
  }
  uv.needsUpdate = true;
}
