'use client';
import LineStage, { node, limit, type LineProps, type Factory, type Point } from './line-scene';
import { camera, painter, box, type V3 } from './line-solid';
type Building = {
    name: string;
    x: number;
    y: number;
    w: number;
    d: number;
    h: number;
    steps: number;
};
/** Authored city plan: separated footprints, varied roofs and consistent 2:1 projection. */
export const districtPlan: Building[] = Array.from({ length: 16 }, (_, i) => ({
    name: ['North Atelier', 'Signal House', 'The Observatory', 'West Studios', 'Archive Tower', 'Meridian Hall', 'Civic Works', 'Foundry No. 8', 'Garden Pavilion', 'Riverside Offices', 'The Exchange', 'South Gallery', 'Beacon House', 'Motion Institute', 'Canal Studios', 'Corner Workshop'][i],
    x: -126 + (i % 4) * 84, y: -126 + Math.floor(i / 4) * 84, w: [34, 42, 32, 38][i % 4], d: [38, 30, 40, 34][i % 4], h: [66, 106, 82, 48, 122, 60, 92, 72, 46, 108, 70, 128, 84, 56, 94, 62][i], steps: i % 3,
}));
function inside(point: Point, polygon: Point[]) { let hit = false; for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0])
        hit = !hit;
} return hit; }
export const createDistrict: Factory = group => {
    const cam = camera(1.04, [320, 296]), underlay = node(group, 'g', { 'data-city-layer': 'ground' }), roads = node(group, 'g', { 'data-city-layer': 'roads' }), volumes = node(group, 'g', { 'data-city-layer': 'buildings' }), floor = painter(underlay, cam), street = painter(roads, cam), paint = painter(volumes, cam);
    floor.mesh(box(-181, -181, -7, 181, 181, 0), { color: '#101010', stroke: '#555', width: .55 });
    for (const axis of [0, 1])
        for (const coordinate of [-174, -84, 0, 84, 174])
            for (const delta of [-5, 5]) {
                const pts: V3[] = axis === 0 ? [[coordinate + delta, -174, .4], [coordinate + delta, 174, .4]] : [[-174, coordinate + delta, .4], [174, coordinate + delta, .4]];
                street.curve(pts, { stroke: '#777', width: .45 });
            }
    // Small lane markings and squares give the city scale without adding visual noise.
    for (const axis of [0, 1])
        for (let i = -158; i < 170; i += 21) {
            street.curve(axis === 0 ? [[0, i, .5], [0, i + 7, .5]] : [[i, 0, .5], [i + 7, 0, .5]], { stroke: '#494949', width: .5 });
        }
    floor.draw();
    street.draw();
    const buildings = districtPlan.map((b, index) => {
        const { x, y, w, d, h } = b, faces = box(x - w / 2, y - d / 2, 2, x + w / 2, y + d / 2, h), style = { color: '#151515', stroke: '#aaa', width: .55 };
        const body = paint.mesh(faces, style);
        body.element.setAttribute('data-building', String(index));
        const roofFaces = Array.from({ length: b.steps }, (_, j) => box(x - w / 2 + 4 + j * 3, y - d / 2 + 4 + j * 3, h + j * 9, x + w / 2 - 4 - j * 3, y + d / 2 - 4 - j * 3, h + (j + 1) * 9));
        const roofs = roofFaces.map(faces => paint.mesh(faces, style));
        const contours = [];
        for (let z = 15; z < h - 6; z += 13) {
            contours.push(paint.curve([[x + w / 2, y - d / 2, z], [x + w / 2, y + d / 2, z], [x - w / 2, y + d / 2, z]], { stroke: '#555', width: .45 }));
        }
        const centre = cam.project([x + w * .32, y + d * .32, h * .56]), hits = [faces, ...roofFaces].flatMap(faces=>[faces[1], faces[3], faces[4]].map(f=>f.map(cam.project)));
        return { b, index, style, body, roofs, contours, centre, hits, glow: 0, depth: cam.depth([x, y, 0]) };
    });
    const ordered = [...buildings].sort((a, b) => b.depth - a.depth);
    const label = node(group, 'g', { 'data-district-label': '', opacity: 0 });
    node(label, 'rect', { x: -91, y: -17, width: 182, height: 30, rx: 15, fill: '#202020', 'fill-opacity': .96, stroke: '#ffffff30', 'stroke-width': .6 });
    node(label, 'circle', { cx: -77, cy: -2, r: 2.5, fill: '#ef6052' });
    const text = node(label, 'text', { x: -66, y: 1, fill: '#ededed', 'font-size': 9, 'font-family': 'sans-serif' });
    let keyboardIndex = -1, pinned = -1, lastSelected = -1, lx = 320, ly = 200, opacity = 0,groundTheme=document.documentElement.dataset.theme;
    const nearest = (point: Point) => ordered.find(building => building.hits.some(polygon => inside(point, polygon)))?.index ?? -1;
    return {
        reset() { keyboardIndex = pinned = -1; buildings.forEach(b => b.glow = 0); opacity = 0; },
        pointer() { keyboardIndex = -1; },
        activate(input) { const hit = nearest([input.x, input.y]); pinned = pinned === hit ? -1 : hit; },
        key(key, input) { let current = keyboardIndex >= 0 ? keyboardIndex : pinned >= 0 ? pinned : nearest([input.x, input.y]); if (key === 'Enter' || key === ' ') {
            pinned = pinned === current ? -1 : current;
            return;
        } const next = key === 'Home' ? 0 : key === 'End' ? 15 : limit(Math.max(0, current) + (key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1), 0, 15); keyboardIndex = next; const p = buildings[next].centre; input.x = p[0]; input.y = p[1]; },
        update(dt, input) {
            if(groundTheme!==document.documentElement.dataset.theme){floor.draw();street.draw();groundTheme=document.documentElement.dataset.theme;}
            const hovered = input.strength > .06 ? (keyboardIndex >= 0 ? keyboardIndex : nearest([input.x, input.y])) : -1, selected = pinned >= 0 ? pinned : hovered, a = dt === 0 ? 1 : 1 - Math.exp(-dt * 9);
            let moving = false;
            buildings.forEach(b => { const target = b.index === selected ? (pinned >= 0 ? 1 : Math.min(1, input.strength)) : 0; b.glow += (target - b.glow) * a; if (Math.abs(target - b.glow) > .001)
                moving = true; b.style.color = `rgb(${Math.round(21 + b.glow * 17)},${Math.round(21 + b.glow * 7)},${Math.round(21 + b.glow * 5)})`; b.style.stroke = b.glow > .003 ? `rgb(${Math.round(165 + b.glow * 74)},${Math.round(165 - b.glow * 69)},${Math.round(165 - b.glow * 83)})` : '#a5a5a5'; b.contours.forEach(c => c.stroke = b.glow > .01 ? `rgb(${Math.round(85 + b.glow * 130)},${Math.round(85 + b.glow * 34)},${Math.round(85 + b.glow * 22)})` : '#555'); b.body.element.setAttribute('data-glow', b.glow.toFixed(3)); });
            paint.draw();
            const lightTheme=document.documentElement.dataset.theme==='light';
            label.querySelector('rect')!.setAttribute('fill',lightTheme?'#fff':'#202020');
            label.querySelector('rect')!.setAttribute('stroke',lightTheme?'#00000028':'#ffffff30');
            text.setAttribute('fill',lightTheme?'#292929':'#ededed');
            group.append(label);
            const targetOpacity = selected >= 0 ? 1 : 0;
            opacity += (targetOpacity - opacity) * a;
            if (Math.abs(targetOpacity - opacity) > .001)
                moving = true;
            if (selected >= 0) {
                const b = buildings[selected], p = cam.project([b.b.x, b.b.y, b.b.h + b.b.steps * 9]);
                const tx = limit(p[0], 104, 536), ty = limit(p[1] - 22, 35, 360);
                lx += (tx - lx) * a;
                ly += (ty - ly) * a;
                if (Math.abs(tx - lx) + Math.abs(ty - ly) > .05)
                    moving = true;
                if (lastSelected !== selected) {
                    text.textContent = b.b.name;
                    group.closest('.line-stage')?.setAttribute('aria-label', `District, ${b.b.name}`);
                    lastSelected = selected;
                }
            }
            else if (lastSelected >= 0) {
                group.closest('.line-stage')?.setAttribute('aria-label', 'District, an interactive isometric city');
                lastSelected = -1;
            }
            label.setAttribute('transform', `translate(${lx.toFixed(2)} ${ly.toFixed(2)})`);
            label.setAttribute('opacity', opacity.toFixed(3));
            group.setAttribute('data-selected-building', String(selected));
            return moving;
        }
    };
};
export default function District(props: LineProps) { return <LineStage {...props} factory={createDistrict} label="District, an interactive isometric city" help="Move or touch a building to illuminate it. Click or Space pins the selection. Arrow keys browse all sixteen buildings, Home and End reach the first and last." className={`district ${props.className ?? ''}`}/>; }
