import { useEffect, useRef } from "react";

/**
 * Procedural ASCII colonnade: three fluted columns with leafy capitals, drawn
 * as a grid of monospace glyphs on a canvas. Density per cell comes from a
 * simple column model (abacus, capital, necking, fluted shaft) plus value
 * noise for weathering. A slow scan band sweeps down to hint at "replay".
 */

const RAMP = ".·:-=+*#%@";
const CELL_W = 6;
const CELL_H = 8;
const LEVELS = 8;

type Column = { cx: number; w: number; top: number; depth: number };

// Fractions of the canvas width/height. Middle column sits further back.
const COLUMNS: Column[] = [
  { cx: 0.2, w: 0.075, top: 0.06, depth: 1 },
  { cx: 0.55, w: 0.056, top: 0.2, depth: 0.78 },
  { cx: 0.88, w: 0.075, top: 0.06, depth: 1 },
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

function columnDensity(px: number, py: number, col: Column, W: number, H: number) {
  const w = col.w * W;
  const cx = col.cx * W;
  const top = col.top * H;
  const dx = px - cx;
  const dy = py - top;
  if (dy < 0) return 0;

  const abacus = w * 0.28;
  const capH = w * 2.1;
  const neck = w * 0.18;

  // Abacus: flat slab on top.
  if (dy < abacus) {
    if (Math.abs(dx) > w * 1.8) return 0;
    return 0.7 + 0.3 * fbm(px * 0.09, py * 0.09);
  }

  // Capital: leafy, flaring mass, ragged edge.
  if (dy < abacus + capH) {
    const t = (dy - abacus) / capH;
    const n = fbm(px * 0.055 + col.cx * 40, py * 0.055);
    const half = w * (1.9 - 0.85 * Math.pow(t, 0.7)) * (0.8 + 0.4 * n);
    if (Math.abs(dx) > half) return 0;
    const leaf = fbm(px * 0.12, py * 0.12 + col.cx * 13);
    if (leaf < 0.3) return 0.12;
    return 0.45 + 0.75 * leaf;
  }

  // Necking ring.
  if (dy < abacus + capH + neck) {
    if (Math.abs(dx) > w * 1.08) return 0;
    return 0.8;
  }

  // Shaft: shaded cylinder with flutes and weathering.
  const u = dx / w;
  if (Math.abs(u) > 1) return 0;
  const round = Math.sqrt(1 - u * u);
  const lit = 0.45 + 0.75 * round * (0.8 - 0.25 * u);
  const flute = 0.5 + 0.5 * Math.cos(u * Math.PI * 9);
  const weather = fbm(px * 0.035, py * 0.012 + col.cx * 7);
  let d = lit * (0.45 + 0.55 * flute);
  if (weather < 0.26) d *= 0.35;
  // Fade towards the floor.
  const fade = Math.min(1, Math.max(0.35, 1.15 - (py / H) * 0.6));
  return d * fade;
}

type Cell = { x: number; y: number; d: number; phase: number; glyph: number };

function buildCells(W: number, H: number): Cell[] {
  const cells: Cell[] = [];
  const cols = Math.ceil(W / CELL_W);
  const rows = Math.ceil(H / CELL_H);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = c * CELL_W + CELL_W / 2;
      const py = r * CELL_H + CELL_H / 2;
      let d = 0;
      for (const col of COLUMNS) {
        d = Math.max(d, columnDensity(px, py, col, W, H) * col.depth);
      }
      // Stray dust around the capitals and along the floor.
      if (d === 0) {
        const near = COLUMNS.some(
          (col) => Math.abs(px - col.cx * W) < col.w * W * 2.6 && py < (col.top + 0.35) * H,
        );
        const h = hash(c * 7 + 3, r * 13 + 1);
        if ((near && h > 0.94) || h > 0.997) d = 0.12 + 0.25 * hash(c, r);
      }
      if (d < 0.06) continue;
      cells.push({ x: px, y: py, d, phase: hash(c + 99, r + 7) * Math.PI * 2, glyph: hash(r, c) });
    }
  }
  return cells;
}

export function AsciiColumns({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cells: Cell[] = [];
    let W = 0;
    let H = 0;
    let raf = 0;
    let last = 0;
    const buckets: Cell[][] = Array.from({ length: LEVELS }, () => []);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${CELL_H}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      cells = buildCells(W, H);
      draw(performance.now());
    };

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const b of buckets) b.length = 0;

      // Scan band sweeping top to bottom every ~22s.
      const scanY = ((t / 22) % 1) * (H + 200) - 100;

      for (const cell of cells) {
        let b = cell.d;
        if (!reduceMotion) {
          b *= 0.82 + 0.18 * Math.sin(t * 0.5 + cell.phase);
          const dist = Math.abs(cell.y - scanY);
          if (dist < 60) b += (1 - dist / 60) * 0.35;
        }
        const level = Math.min(LEVELS - 1, Math.floor(Math.min(1, b) * LEVELS));
        buckets[level]?.push(cell);
      }

      for (let l = 0; l < LEVELS; l++) {
        const bucket = buckets[l];
        if (!bucket?.length) continue;
        const alpha = 0.15 + (0.45 * (l + 1)) / LEVELS;
        ctx.fillStyle = `rgba(145, 145, 145, ${alpha.toFixed(3)})`;
        for (const cell of bucket) {
          const spread = Math.floor(cell.glyph * 3) - 1;
          const idx = Math.max(
            0,
            Math.min(RAMP.length - 1, Math.floor((l / LEVELS) * RAMP.length) + spread),
          );
          ctx.fillText(RAMP.charAt(idx), cell.x, cell.y);
        }
      }
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
