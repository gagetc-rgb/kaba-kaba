/* Flat, single-colour water and road laid on the terrain (shared by the live page and the baker).
   River: a ribbon between the two surveyed banks. Road: the surveyed outline, filled. */
window.buildGround = function (THREE, S, V, hAt, grp) {
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const cx = x => clamp(x, S.x0 + .05, S.x1 - .05), cy = y => clamp(y, S.y0 + .05, S.y1 - .05);
  const len = pts => pts.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - pts[i-1][0], p[1] - pts[i-1][1]) : 0), 0);
  const along = (pts, t) => { // point at fraction t of the arc length
    const L = len(pts) * t; let a = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]); if (a + d >= L || i === pts.length - 1) { const u = d ? clamp((L - a) / d, 0, 1) : 0; return [pts[i-1][0] + (pts[i][0] - pts[i-1][0]) * u, pts[i-1][1] + (pts[i][1] - pts[i-1][1]) * u]; } a += d; }
  };
  const resample = (pts, n) => Array.from({length: n + 1}, (_, i) => along(pts, i / n));
  const smooth = (pts, w, passes) => { for (let k = 0; k < passes; k++) pts = pts.map((p, i) => { if (i === 0 || i === pts.length - 1) return p; let sx = 0, sy = 0, c = 0; for (let j = Math.max(0, i - w); j <= Math.min(pts.length - 1, i + w); j++) { sx += pts[j][0]; sy += pts[j][1]; c++; } return [sx / c, sy / c]; }); return pts; };

  function mesh(pos, idx, color, rough, lift) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));  // all facing up: one flat, even colour
    const m = new THREE.MeshStandardMaterial({color, roughness: rough, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
    const o = new THREE.Mesh(g, m); o.receiveShadow = true; return o;
  }

  /* river: quads between bank A and bank B, both resampled by arc length */
  {
    const A = S.rivers[0], B = S.rivers[1].slice().reverse(), n = 260;
    const a = smooth(resample(A, n), 4, 3), b = smooth(resample(B, n), 4, 3), pos = [], idx = [];
    for (let i = 0; i <= n; i++) for (const p of [a[i], b[i]]) { const v = V(cx(p[0]), cy(p[1]), .07); pos.push(v.x, v.y, v.z); }
    for (let i = 0; i < n; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    grp('river').add(mesh(pos, idx, '#3f9089', .6, .07));
  }

  /* road: the four surveyed edge lines form one outline; fill it, refine it, drape it */
  {
    const R = S.roads, pl = [];
    const push = pts => pts.forEach(p => pl.push(p));
    push(R[1]); push(R[2]); push(R[0].slice().reverse());   // R[3] is the wandering slope line down the west edge: not road
    // drop repeated points
    const poly = pl.filter((p, i) => i === 0 || Math.hypot(p[0] - pl[i-1][0], p[1] - pl[i-1][1]) > .05);
    const flat = poly.map(p => new THREE.Vector2(p[0], p[1]));
    let tris = THREE.ShapeUtils.triangulateShape(flat, []);
    let T = tris.map(t => t.map(i => [poly[i][0], poly[i][1]]));
    const long = t => Math.max(...[[0, 1], [1, 2], [2, 0]].map(([i, j]) => Math.hypot(t[i][0] - t[j][0], t[i][1] - t[j][1])));
    for (let pass = 0; pass < 6; pass++) {
      const next = [];
      T.forEach(t => { if (long(t) < 1.3) { next.push(t); return; } const m = [[0, 1], [1, 2], [2, 0]].map(([i, j]) => [(t[i][0] + t[j][0]) / 2, (t[i][1] + t[j][1]) / 2]); next.push([t[0], m[0], m[2]], [m[0], t[1], m[1]], [m[2], m[1], t[2]], [m[0], m[1], m[2]]); });
      T = next;
    }
    const pos = [], idx = []; let k = 0;
    T.forEach(t => { const c = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3]; if (c[0] < S.x0 || c[0] > S.x1 || c[1] < S.y0 || c[1] > S.y1) return; t.forEach(p => { const v = V(cx(p[0]), cy(p[1]), .06); pos.push(v.x, v.y, v.z); }); idx.push(k, k + 1, k + 2); k += 3; });
    if (k) grp('road').add(mesh(pos, idx, '#262825', .85, .06));   // dark grey, reads against the pale clay (user, 2026-09-30)
  }
};
