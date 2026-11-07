import { useEffect, useRef } from "react";

/**
 * Dot-matrix colonnade: three slender fluted columns with ragged, leafy
 * capitals, drawn as tiny dots on a canvas. Each cell on a fine grid gets a
 * density; a dot is placed when a per-cell hash falls below it (dithering),
 * so shading reads through dot spacing, not dot size.
 * A slow scan band sweeps down to hint at "replay".
 */

const CELL = 3;
const DOT = 1.3;
const LEVELS = 6;

type Column = {
  cx: number; // shaft centre, fraction of width
  w: number; // shaft half-width, fraction of width
  capTop: number; // top of capital, fraction of height
  neck: number; // bottom of capital, fraction of height
  capL: number; // capital extent left of centre, fraction of width
  capR: number; // capital extent right of centre, fraction of width
  seed: number;
};

// Two tall columns cut by the top edge, one shorter column set back in the middle.
const COLUMNS: Column[] = [
  { cx: 0.13, w: 0.046, capTop: -0.02, neck: 0.15, capL: 0.11, capR: 0.19, seed: 1 },
  { cx: 0.5, w: 0.042, capTop: 0.14, neck: 0.28, capL: 0.1, capR: 0.14, seed: 2 },
  { cx: 0.82, w: 0.05, capTop: -0.02, neck: 0.17, capL: 0.11, capR: 0.16, seed: 3 },
];

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number) {
  return 0.55 * noise(x, y) + 0.3 * noise(x * 2.1, y * 2.1) + 0.15 * noise(x * 4.3, y * 4.3);
}

function smooth(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function columnDensity(px: number, py: number, col: Column, W: number, H: number) {
  const cx = col.cx * W;
  const w = col.w * W;
  const capTop = col.capTop * H;
  const neck = col.neck * H;
  const dx = px - cx;
  const u = dx / w;

  // Capital: abacus slab, volutes and tiers of acanthus leaves in a bell
  // that narrows into the shaft.
  if (py >= capTop && py < neck) {
    const capH = neck - capTop;
    const t = (py - capTop) / capH; // 0 top .. 1 bottom
    const bell = 1 - Math.pow(t, 1.6);
    const ragL = 0.75 + 0.4 * fbm(py * 0.04, col.seed * 7.1);
    const ragR = 0.75 + 0.4 * fbm(py * 0.04 + 50, col.seed * 3.3);
    const left = col.capL * W * bell * ragL + w * 1.15 * (1 - bell);
    const right = col.capR * W * bell * ragR + w * 1.15 * (1 - bell);
    if (dx < -left || dx > right) return 0;

    // Abacus: thin bright slab on top.
    if (t < 0.07) return 0.85;
    // Astragal: double ring just above the shaft.
    if (t > 0.9) return Math.abs(u) < 1.15 ? (t > 0.95 ? 0.95 : 0.45) : 0;

    // Volutes: spiral curls under both corners of the abacus.
    const span = (dx < 0 ? left : right) * 0.78;
    const vx = Math.abs(dx) - span;
    const vy = py - (capTop + capH * 0.2);
    const vr = Math.hypot(vx, vy) / (capH * 0.17);
    if (vr < 1) {
      const spiral = Math.cos(vr * Math.PI * 4 - Math.atan2(vy, vx));
      return spiral > 0.2 ? 0.95 : 0.15;
    }

    // Acanthus: tiers of pointed leaves, each with a bright midrib.
    const tier = t * 3;
    const tierT = tier - Math.floor(tier); // 0 leaf tip .. 1 leaf base
    const leafW = w * 0.55;
    const lx = (dx + Math.floor(tier) * leafW * 0.5) / leafW;
    const lf = lx - Math.round(lx); // -0.5 .. 0.5 across one leaf
    const leafEdge = 0.15 + 0.35 * tierT; // leaves widen towards their base
    const inLeaf = Math.abs(lf) < leafEdge;
    const midrib = Math.abs(lf) < 0.05;
    const tex = fbm(px * 0.09 + col.seed * 17, py * 0.09);
    if (midrib && tierT > 0.15) return 0.95;
    if (inLeaf) return 0.4 + 0.5 * tex;
    return 0.06 + 0.2 * tex;
  }

  if (py < neck) return 0;

  // Base: two torus rings and a plinth flaring out at the floor.
  const baseTop = H * 0.93;
  if (py > baseTop) {
    const b = (py - baseTop) / (H - baseTop);
    const half = w * (1.1 + 0.6 * smooth(0, 1, b));
    if (Math.abs(dx) > half) return 0;
    const ring = Math.abs(Math.sin(b * Math.PI * 3));
    return 0.35 + 0.6 * ring;
  }

  if (Math.abs(u) > 1) return 0;

  // Shaft: lit left edge, flutes with bright ridges and dark channels,
  // shadowed right side, a crisp outline.
  if (u < -0.9 || u > 0.94) return 0.85;
  const light = 1 - (u + 1) / 2; // 1 on the lit side .. 0 in shadow
  const flutes = 12;
  const f = ((u + 1) / 2) * flutes;
  const dist = Math.abs(f - Math.round(f)); // 0 on a ridge .. 0.5 in a channel
  const ridge = 1 - smooth(0.04, 0.2, dist);
  const weather = noise(Math.round(f) * 3.7 + col.seed * 11, py * 0.02);
  let d = 0.08 + 0.75 * ridge * (0.45 + 0.55 * light);
  if (weather < 0.28) d *= 0.4;
  // Broad highlight band down the lit side.
  if (u < -0.55) d = Math.max(d, 0.55 + 0.35 * smooth(-0.55, -0.85, u));
  return d;
}

type Dot = { x: number; y: number; b: number; phase: number };

function buildDots(W: number, H: number): Dot[] {
  const dots: Dot[] = [];
  const cols = Math.ceil(W / CELL);
  const rows = Math.ceil(H / CELL);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * CELL + CELL / 2;
      const py = r * CELL + CELL / 2;
      let d = 0;
      for (const col of COLUMNS) {
        d = Math.max(d, columnDensity(px, py, col, W, H));
      }
      if (d <= 0 || hash(c, r) > d) continue;
      dots.push({
        x: c * CELL + (CELL - DOT) / 2,
        y: py,
        b: 0.55 + 0.45 * Math.min(1, d),
        phase: hash(c + 99, r + 7) * Math.PI * 2,
      });
    }
  }
  return dots;
}

export function AsciiColumns({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dots: Dot[] = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    const buckets: Dot[][] = Array.from({ length: LEVELS }, () => []);

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const b of buckets) b.length = 0;

      // Scan band sweeping top to bottom every ~22s.
      const scanY = ((t / 22) % 1) * (H + 200) - 100;

      for (const dot of dots) {
        let b = dot.b;
        if (!reduceMotion) {
          b *= 0.85 + 0.15 * Math.sin(t * 0.5 + dot.phase);
          const dist = Math.abs(dot.y - scanY);
          if (dist < 70) b += (1 - dist / 70) * 0.3;
        }
        const level = Math.min(LEVELS - 1, Math.floor(Math.min(1, b) * LEVELS));
        buckets[level]?.push(dot);
      }

      for (let l = 0; l < LEVELS; l++) {
        const bucket = buckets[l];
        if (!bucket?.length) continue;
        const alpha = 0.3 + (0.6 * (l + 1)) / LEVELS;
        ctx.fillStyle = `rgba(175, 175, 175, ${alpha.toFixed(3)})`;
        for (const dot of bucket) ctx.fillRect(dot.x, dot.y - DOT / 2, DOT, DOT);
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = buildDots(W, H);
      draw(performance.now());
    };

    const loop = (now: number) => {
      if (now - last > 50) {
        draw(now);
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
