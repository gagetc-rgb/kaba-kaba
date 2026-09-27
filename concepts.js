/* Kaba-Kaba: three illustrative building concepts on the surveyed terrain.
   Shared by the live 3D viewer (index.html) and the image baker (_build/bake_scene.html).
   Local frame: x = east, y = north (metres); three.js: (x, elevation - Z0, -y).
   Elevations below are absolute (survey datum), like the ITR/survey figures. */
window.buildConcepts = function (THREE, hAt, Z0) {
  "use strict";
  const M = {
    glass: new THREE.MeshStandardMaterial({color: '#cfe6ea', emissive: '#ffd49a', emissiveIntensity: .3, roughness: .06, metalness: .1, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2}),
    slab: new THREE.MeshStandardMaterial({color: '#f7f4ee', roughness: .5}),
    col: new THREE.MeshStandardMaterial({color: '#eeebe3', roughness: .6}),
    pool: new THREE.MeshStandardMaterial({color: '#7fdde0', emissive: '#12939b', emissiveIntensity: .55, roughness: .1}),
    deck: new THREE.MeshStandardMaterial({color: '#c2a47a', roughness: .8}),
    lane: new THREE.MeshStandardMaterial({color: '#f1ede4', roughness: .85}),
    stone: new THREE.MeshStandardMaterial({color: '#c6c2ba', roughness: .82}),  // smooth light concrete
    timber: new THREE.MeshStandardMaterial({color: '#a9825a', roughness: .75}),
    coping: new THREE.MeshStandardMaterial({color: '#f4efe6', roughness: .55}),
    cushion: new THREE.MeshStandardMaterial({color: '#fbf8f2', roughness: .9}),
    rail: new THREE.MeshStandardMaterial({color: '#dff0f2', roughness: .05, transparent: true, opacity: .28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2}),
    edge: new THREE.LineBasicMaterial({color: '#ffffff'}),
    mull: new THREE.LineBasicMaterial({color: '#ffffff', transparent: true, opacity: .55}),
  };
  const R = d => d * Math.PI / 180;
  // plan point (u along the long axis, v across) of a rotated rectangle -> world plan (x, y)
  const P = (cx, cy, rot, u, v) => [cx + u * Math.cos(R(rot)) - v * Math.sin(R(rot)), cy + u * Math.sin(R(rot)) + v * Math.cos(R(rot))];
  const rect = (cx, cy, rot, w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => P(cx, cy, rot, u, v));

  function orient(o, cx, cy, z, rot) { o.position.set(cx, z - Z0, -cy); o.rotation.y = R(rot); return o; }
  function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }

  // one storey: floor slab, glass volume with white edges and mullions, roof slab with an overhang
  function volume(parent, o) {
    const {cx, cy, rot = 0, z, w, d, h = 3.4, over = .9, roof = true, cols = true, posts = false} = o;
    const g = orient(new THREE.Group(), cx, cy, z, rot);
    const floor = box(w + .2, .35, d + .2, M.slab); floor.position.y = -.175; floor.castShadow = floor.receiveShadow = true; g.add(floor);
    // glass stops 3 cm short of the floor and roof slabs: coplanar faces z-fight (flicker) as the model turns
    const gl = box(w, h - .06, d, M.glass); gl.position.y = h / 2; gl.renderOrder = 1; g.add(gl);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(gl.geometry), M.edge); e.position.y = h / 2; g.add(e);
    const mv = [], n = Math.max(Math.round(w / 2.6), 2);
    for (let i = 1; i < n; i++) { const u = -w / 2 + w * i / n; mv.push(u, 0, d / 2, u, h, d / 2, u, 0, -d / 2, u, h, -d / 2); }
    for (let i = 1; i < Math.max(Math.round(d / 2.6), 2); i++) { const v = -d / 2 + d * i / Math.max(Math.round(d / 2.6), 2); mv.push(w / 2, 0, v, w / 2, h, v, -w / 2, 0, v, -w / 2, h, v); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(mv, 3)); const ml = new THREE.LineSegments(mg, M.mull); ml.renderOrder = 2; g.add(ml);
    // slim white posts just inside the glass: the frame reads as part of the rooms, not as stilts
    if (posts) [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1]].forEach(([a, b]) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, h, 10), M.col); c.position.set(a * (w / 2 - .35), h / 2, b * (d / 2 - .35)); c.castShadow = true; g.add(c); });
    if (roof) { const r = box(w + 2 * over, .3, d + 2 * over, M.slab); r.position.y = h + .15; r.castShadow = r.receiveShadow = true; g.add(r); }
    parent.add(g);
    // no stilts: a concrete base set 1.2 m in from the slab edge, so the house seems to hover over its own shadow
    if (cols && groundRange(cx, cy, rot, w - 2.4, d - 2.4)[0] < z - .9) podium(parent, cx, cy, rot, w - 2.4, d - 2.4, z - .35, false);
    return rect(cx, cy, rot, w, d);
  }

  // lowest and highest ground under a rotated rectangle (sampled every ~0.75 m, corners included)
  function groundRange(cx, cy, rot, w, d) {
    let lo = 1e9, hi = -1e9;
    const nu = Math.max(Math.ceil(w / .75), 1), nv = Math.max(Math.ceil(d / .75), 1);
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const [x, y] = P(cx, cy, rot, -w / 2 + w * i / nu, -d / 2 + d * j / nv), g = hAt(x, y) + Z0;
      lo = Math.min(lo, g); hi = Math.max(hi, g);
    }
    return [lo, hi];
  }

  // a stone terrace from below the ground up to zTop: it follows the slope, so nothing floats and nothing sinks
  function podium(parent, cx, cy, rot, w, d, zTop, coping = true) {
    const lo = groundRange(cx, cy, rot, w, d)[0] - .6, h = zTop - lo;
    const g = orient(new THREE.Group(), cx, cy, lo, rot), b = box(w, h, d, M.stone);
    b.position.y = h / 2; b.castShadow = b.receiveShadow = true; g.add(b);
    if (coping) { const cp = box(w + .12, .12, d + .12, M.coping); cp.position.y = h - .06; cp.receiveShadow = true; g.add(cp); }
    parent.add(g);
    return rect(cx, cy, rot, w, d);
  }

  // a sun lounger in a group's local frame (u across, v toward north), lying along u
  function lounger(g, u, v) {
    const L = new THREE.Group(); L.position.set(u, 0, -v); L.rotation.y = Math.PI / 2;
    const base = box(.75, .22, 2, M.coping); base.position.y = .11; L.add(base);
    const cu = box(.7, .1, 1.35, M.cushion); cu.position.set(0, .27, .3); L.add(cu);
    const back = box(.7, .1, .7, M.cushion); back.position.set(0, .5, -.62); back.rotation.x = -.6; L.add(back);
    L.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.add(L);
  }

  // infinity pool on its own stone terrace, set above the highest ground under it; teak deck, loungers
  function pool(parent, o) {
    const {cx, cy, rot = 0, z, w, d, deckW = w + 3, deckD = d + 2.4} = o;
    const zTop = Math.max(z, groundRange(cx, cy, rot, deckW, deckD)[1] + .3);
    podium(parent, cx, cy, rot, deckW, deckD, zTop);
    const g = orient(new THREE.Group(), cx, cy, zTop, rot);
    const dk = box(deckW - .4, .05, deckD - .4, M.deck); dk.position.y = .025; dk.receiveShadow = true; g.add(dk);
    const wz = (deckD - d) / 2 - .2;  // water on the river-side edge of the terrace
    const wt = box(w, .05, d, M.pool); wt.position.set(0, .06, wz); g.add(wt);
    const cp = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, .05, d)), M.edge); cp.position.copy(wt.position); g.add(cp);
    if (deckD - d > 1.6) for (let u = -w / 2 + 1.2; u <= w / 2 - 1; u += 2.4) lounger(g, u, deckD / 2 - .65);
    parent.add(g);
    return rect(cx, cy, rot, deckW, deckD);
  }

  // a paved lane draped on the ground
  function lane(parent, pts, width) {
    const v = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(Math.ceil(L / .8), 1), nx = -(y1 - y0) / L * width / 2, ny = (x1 - x0) / L * width / 2;
      for (let s = 0; s < n; s++) {
        const a = [x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n], b = [x0 + (x1 - x0) * (s + 1) / n, y0 + (y1 - y0) * (s + 1) / n];
        const q = [[a[0] + nx, a[1] + ny], [a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny]].map(([x, y]) => [x, hAt(x, y) + .1, -y]);
        v.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.lane); m.receiveShadow = true; parent.add(m);
  }

  const C = {};

  /* A — The Estate: one long glass house along the upper terrace, a pool terrace below, a pavilion toward the river */
  (function () {
    const g = new THREE.Group(), fp = [];
    fp.push(volume(g, {cx: -5.5, cy: -1.5, rot: 4, z: 74.0, w: 40, d: 11, h: 3.6, over: 1.2}));
    fp.push(volume(g, {cx: -3.5, cy: -4.7, rot: 4, z: 78.35, w: 25, d: 10, h: 3.4, over: 1.4, cols: false}));
    fp.push(pool(g, {cx: -7.5, cy: -11.9, rot: 4, z: 71.0, w: 20, d: 3.6}));
    fp.push(volume(g, {cx: -11, cy: -16.4, rot: 14, z: 67.1, w: 7, d: 5, h: 3.1, over: 1}));
    C.estate = {group: g, footprints: fp, label: 'The Estate'};
  })();

  /* B — Three villas, one gate: a house on each plot, a shared gate and lane at the road */
  (function () {
    const g = new THREE.Group(), fp = [];
    fp.push(volume(g, {cx: -29.6, cy: 6.4, rot: 74, z: 72.2, w: 14, d: 7.5, h: 3.4}));
    fp.push(volume(g, {cx: -30.4, cy: 3.6, rot: 74, z: 75.75, w: 8, d: 7, h: 3.2, cols: false}));
    fp.push(pool(g, {cx: -32.0, cy: -3.2, rot: 74, z: 68.6, w: 8, d: 2.8, deckW: 10, deckD: 5}));
    fp.push(volume(g, {cx: -15.4, cy: 0.2, rot: 6, z: 73.6, w: 13, d: 8, h: 3.4}));
    fp.push(volume(g, {cx: -16.6, cy: -1.2, rot: 6, z: 77.15, w: 8, d: 7, h: 3.2, cols: false}));
    fp.push(pool(g, {cx: -14.8, cy: -8.2, rot: 6, z: 71.2, w: 9, d: 3, deckW: 11.5, deckD: 5}));
    fp.push(volume(g, {cx: 4.2, cy: -0.6, rot: 4, z: 73.8, w: 14, d: 8, h: 3.4}));
    fp.push(volume(g, {cx: 6.0, cy: -2.0, rot: 4, z: 77.35, w: 8, d: 7, h: 3.2, cols: false}));
    fp.push(pool(g, {cx: 3.8, cy: -8.6, rot: 4, z: 70.6, w: 9, d: 3, deckW: 11.5, deckD: 5}));
    // gate: two pylons and a thin roof at the road, between plots II and III
    const gate = orient(new THREE.Group(), -9.3, 4.4, 74.9, 2);
    [-2.6, 2.6].forEach(u => { const p = box(.7, 3.4, .7, M.slab); p.position.set(u, 1.7, 0); p.castShadow = true; gate.add(p); });
    const top = box(7.2, .3, 2.6, M.slab); top.position.y = 3.55; top.castShadow = true; gate.add(top);
    g.add(gate);
    lane(g, [[-24.5, 3.8], [-9.3, 3.6], [-2.2, 3.1]], 2.6);
    C.three = {group: g, footprints: fp, label: 'Three Villas, One Gate'};
  })();

  // one of the twin houses, stepped with the slope: a stone lower-ground storey dug into the hill and glazed toward
  // the river, three glass storeys stacked true on top (slim posts inside the glass, a balcony on each), and a pool
  // terrace one level down in front of the lower storey
  const TW = {hw: 10, hd: 8.5, tW: 11, tD: 6.4};
  function twinLevels(cx, cy, rot) {
    const P2 = (u, v) => P(cx, cy, rot, u, v), tv = -(TW.hd / 2 + .3 + TW.tD / 2);
    return {house: groundRange(cx, cy, rot, TW.hw + .6, TW.hd + .6), terrace: groundRange(...P2(0, tv), rot, TW.tW, TW.tD), tv};
  }
  function twin(parent, fp, cx, cy, rot, zB, zP) {
    const {hw, hd, tW, tD} = TW, h = 3.6, st = h + .35, P2 = (u, v) => P(cx, cy, rot, u, v), tv = twinLevels(cx, cy, rot).tv;
    fp.push(podium(parent, cx, cy, rot, hw + .6, hd + .6, zB));
    // lower storey glazing on the river face, from the pool terrace up to the first glass floor
    const gh = zB - .35 - zP;
    if (gh > 1.2) {
      const [fx, fy] = P2(0, -(hd + .6) / 2 - .06), f = orient(new THREE.Group(), fx, fy, zP, rot);
      const gl = box(hw - 1, gh - .06, .08, M.glass); gl.position.y = gh / 2; gl.renderOrder = 1; f.add(gl);
      f.add(Object.assign(new THREE.LineSegments(new THREE.EdgesGeometry(gl.geometry), M.edge), {position: gl.position.clone()}));
      parent.add(f);
    }
    for (let i = 0; i < 3; i++) {
      fp.push(volume(parent, {cx, cy, rot, z: zB + .35 + i * st, w: hw, d: hd, h, over: 1.1, roof: i === 2, cols: false, posts: true}));
      // timber-clad side walls: glass only to the river and the road
      const sg = orient(new THREE.Group(), cx, cy, zB + .35 + i * st, rot);
      [-1, 1].forEach(k => { const t = box(.24, h, hd + .1, M.timber); t.position.set(k * (hw / 2 + .12), h / 2, 0); t.castShadow = t.receiveShadow = true; sg.add(t); });
      parent.add(sg);
      const [bx, by] = P2(0, -hd / 2 - .9), bg = orient(new THREE.Group(), bx, by, zB + .35 + i * st, rot);
      const sl = box(hw + .2, .35, 1.8, M.slab); sl.position.y = -.175; sl.castShadow = sl.receiveShadow = true; bg.add(sl);
      const rl = box(hw + .2, 1.05, .04, M.rail); rl.position.set(0, .53, .88); rl.renderOrder = 3; bg.add(rl);
      parent.add(bg);
    }
    // pool terrace: stone base, teak deck, the water along the river-side edge, loungers facing it
    const [tx, ty] = P2(0, tv);
    fp.push(podium(parent, tx, ty, rot, tW, tD, zP));
    const g = orient(new THREE.Group(), tx, ty, zP, rot);
    const dk = box(tW - .4, .05, tD - .4, M.deck); dk.position.y = .025; dk.receiveShadow = true; g.add(dk);
    const wt = box(tW - 1.2, .05, 2.8, M.pool); wt.position.set(0, .06, tD / 2 - 1.8); g.add(wt);
    const cp = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(tW - 1.2, .05, 2.8)), M.edge); cp.position.copy(wt.position); g.add(cp);
    [-3.6, -1.2, 1.2, 3.6].forEach(u => { const L = new THREE.Group(); lounger(L, 0, 0); L.children[0].rotation.y = 0; L.position.set(u, 0, -tD / 2 + 1.35); g.add(L); });
    parent.add(g);
  }

  /* C — Two Tree-top Houses: a matched pair of three-storey glass houses on plots II and III, rising above the palms */
  (function () {
    const g = new THREE.Group(), fp = [];
    // a matched pair: both houses on one level, both pool terraces on one level, each just above its highest ground
    const A = [-14.2, -2.4], B = [1.3, -2.4], ROT = 15, LA = twinLevels(...A, ROT), LB = twinLevels(...B, ROT);
    const zB = Math.max(LA.house[1], LB.house[1]) + .3, zP = Math.max(LA.terrace[1], LB.terrace[1]) + .3;
    twin(g, fp, ...A, ROT, zB, zP);
    twin(g, fp, ...B, ROT, zB, zP);
    C.tower = {group: g, footprints: fp, label: 'Two Tree-top Houses'};
  })();

  // glass panes draw in a fixed order instead of being re-sorted by depth every frame, which made floors pop
  // brighter/darker while turning; all panes share one colour and opacity, so the order does not change the look
  let order = 1;
  Object.values(C).forEach(c => c.group.traverse(o => { if (o.material === M.glass) o.renderOrder = 1 + (order++) * 1e-4; }));
  Object.values(C).forEach(c => { c.group.visible = false; c.group.traverse(o => { if (o.isMesh && o.material !== M.glass) o.castShadow = true; }); });
  // point-in-footprint test (with a margin), used to thin palms that would stand inside a building
  const inRing = (x, y, ring) => { let c = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xa, ya] = ring[a], [xb, yb] = ring[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) c = !c; } return c; };
  const near = (x, y, ring, m) => inRing(x, y, ring) || ring.some((p, i) => { const q = ring[(i + 1) % ring.length], vx = q[0] - p[0], vy = q[1] - p[1], L = vx * vx + vy * vy; let t = ((x - p[0]) * vx + (y - p[1]) * vy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - p[0] - t * vx, y - p[1] - t * vy) < m; });
  C.blocks = (name, x, y) => !!(C[name] && C[name].footprints.some(r => near(x, y, r, 1.2)));
  return C;
};
