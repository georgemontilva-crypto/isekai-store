import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { esGamaBaja } from "@/lib/gamaBaja";

/**
 * El Guardián del Portal, vivo: dibujado en un lienzo y animado por código,
 * con la misma técnica que Koi-sama. No es una imagen que se mueve: es un
 * cuerpo con articulaciones y volumen.
 *
 *  - armadura casi negra con degradado, filo de neón rosa y grietas encendidas
 *  - brazos de dos huesos (hombro, codo) con garras: alza uno y descarga el
 *    zarpazo hacia ti —la mano crece al acercarse y deja una estela—, luego el otro
 *  - capa y manto de tiras que cuelgan y ondean como tela
 *  - gira el cuerpo con profundidad: la cabeza y los cuernos se desplazan
 *    distinto que el torso (en computadora sigue al ratón)
 *  - carga aura: recoge los puños, tiembla, las llamas se disparan y suben
 *    rayas de energía… y la suelta abriendo los brazos, con un anillo de luz
 */
export type GuardianRef = { golpe: () => void };
type Pt = [number, number];

const PETO: Pt[] = [[-0.8, 1.2], [-0.3, 1.42], [0, 1.26], [0.3, 1.42], [0.8, 1.2], [0.68, 0.55], [0.36, 0.05], [0, -0.3], [-0.36, 0.05], [-0.68, 0.55]];
const VIENTRE: Pt[] = [[-0.46, 0.24], [0, -0.02], [0.46, 0.24], [0.36, -0.5], [0, -1.02], [-0.36, -0.5]];
const YELMO: Pt[] = [[0, 0.8], [0.21, 0.5], [0.33, 0.12], [0.22, -0.22], [0, -0.52], [-0.22, -0.22], [-0.33, 0.12], [-0.21, 0.5]];
const CRESTA: Pt[] = [[0, 1.36], [0.085, 0.56], [0, 0.34], [-0.085, 0.56]];
const HOMBRERA: Pt[] = [[0, 0], [0.5, 0.46], [1.3, 0.8], [0.98, 0.3], [1.52, 0.06], [1.04, -0.1], [1.26, -0.6], [0.74, -0.36], [0.48, -0.8], [0.24, -0.3]];
const PUA_CUELLO: Pt[] = [[0, 0], [0.26, 0.1], [0.34, 0.7], [0.09, 0.32]];

const suave = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
/** Un ataque: el brazo se alza despacio, descarga de golpe y vuelve */
const golpeFase = (ph: number) => suave(0, 0.24, ph) * 0.6 - suave(0.24, 0.31, ph) * 1.6 + suave(0.36, 0.7, ph);
const CICLO = 10, CARGA_DESDE = 4.8, DESCARGA = 8.4, ATAQUE = 4.8;
type Mota = { x: number; y: number; vx: number; vy: number; vida: number; max: number; r: number; fuego: boolean };

const GuardianVivo = forwardRef<GuardianRef, { className?: string }>(function GuardianVivo({ className = "" }, ref) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const brillo = useRef<HTMLCanvasElement>(null);
  const vivo = useRef({ retroceso: 0 });
  useImperativeHandle(ref, () => ({ golpe() { vivo.current.retroceso = 1; } }), []);

  useEffect(() => {
    const el = lienzo.current;
    const c = el?.getContext("2d");
    if (!el || !c) return;
    const b2d = brillo.current?.getContext("2d") ?? null;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ligero = esGamaBaja();
    let W = 0, H = 0, U = 1, dpr = 1;
    const medir = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(ligero ? 1 : 2, window.devicePixelRatio || 1);
      W = r.width; H = r.height; U = Math.min(W / 6.3, H / 6.7);
      el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
      if (brillo.current) { brillo.current.width = Math.round(W / 3); brillo.current.height = Math.round(H / 3); }
    };
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);

    const mira = { x: 0, y: 0, mx: 0, my: 0 };
    const mover = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      mira.mx = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - 0.5) * 1.5));
      mira.my = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height - 0.5) * 1.5));
    };
    window.addEventListener("pointermove", mover, { passive: true });

    let motas: Mota[] = [];
    const estela: { x: number; y: number; a: number }[][] = [[], []];
    const BROTES: Pt[] = [[1.5, 1.4], [-1.5, 1.4], [0.9, 2.6], [-0.9, 2.6], [0, 2.9], [1.6, 0.2], [-1.6, 0.2], [1.1, -0.9], [-1.1, -0.9], [2, 1], [-2, 1]];

    // ── Dibujo ──
    let energia = 0.4;                                         // cuánto arden filos y grietas
    const caja = new WeakMap<Pt[], [number, number, number, number]>();
    const limites = (pts: Pt[]) => {
      let b = caja.get(pts);
      if (!b) { b = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, y] of pts) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); } caja.set(pts, b); }
      return b;
    };
    const poli = (pts: Pt[]) => { c.beginPath(); for (let i = 0; i < pts.length; i++) i ? c.lineTo(pts[i][0], pts[i][1]) : c.moveTo(pts[i][0], pts[i][1]); c.closePath(); };
    const filo = () => { const k = Math.max(0, Math.min(1, energia - 0.55)); return `rgba(255,${Math.round(42 + 190 * k)},${Math.round(109 + 120 * k)},${(0.8 + 0.2 * k).toFixed(2)})`; };
    /** Una placa de armadura: volumen con degradado, brillo hacia dentro y filo de neón */
    const placa = (traza: () => void, x0: number, y0: number, x1: number, y1: number, claro = 0) => {
      traza();
      const g = c.createLinearGradient(x0, y1, x1, y0);        // la luz viene de arriba a la izquierda
      g.addColorStop(0, `rgb(${86 + claro},${62 + claro},${118 + claro})`); g.addColorStop(0.3, `rgb(${34 + claro},${20 + claro},${48 + claro})`); g.addColorStop(0.62, "#120916"); g.addColorStop(1, "#030204");
      c.fillStyle = g; c.fill();
      c.save(); c.clip();
      // sombra propia: el borde de abajo a la derecha se hunde
      c.save(); c.translate(-0.05, 0.05); traza(); c.strokeStyle = "rgba(0,0,0,.55)"; c.lineWidth = 0.16; c.lineJoin = "round"; c.stroke(); c.restore();
      // calor de las grietas, apenas, junto al filo
      traza(); c.strokeStyle = `rgba(255,42,109,${Math.min(0.45, 0.03 + Math.max(0, energia - 0.5) * 0.4)})`; c.lineWidth = 0.14; c.stroke();
      // luz en el canto de arriba a la izquierda
      c.translate(0.035, -0.035); traza(); c.strokeStyle = "rgba(210,190,255,.2)"; c.lineWidth = 0.05; c.stroke();
      c.restore();
      traza(); c.strokeStyle = filo(); c.lineWidth = 0.028; c.lineJoin = "miter"; c.stroke();
    };
    const pieza = (pts: Pt[], claro = 0) => { const b = limites(pts); placa(() => poli(pts), b[0], b[1], b[2], b[3], claro); };
    const con = (x: number, y: number, rot: number, sx: number, sy: number, fn: () => void) => { c.save(); c.translate(x, y); c.rotate(rot); c.scale(sx, sy); fn(); c.restore(); };
    /** Grieta encendida */
    const grieta = (pts: Pt[], ancho = 0.035) => {
      c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = `rgba(255,42,109,.28)`; c.lineWidth = ancho * 2.6; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
      c.strokeStyle = filo(); c.lineWidth = ancho; c.stroke();
    };
    /** Tira de tela o manto: cuelga de un punto y ondea */
    const tira = (x: number, y: number, ang: number, largo: number, ancho: number, t: number, k: number, vuelo: number) => {
      const N = 6, izq: Pt[] = [], der: Pt[] = [];
      let px = x, py = y, a = ang;
      for (let i = 0; i <= N; i++) {
        const u = i / N, w = ancho * Math.pow(1 - u, 0.75) * (i % 2 ? 1.12 : 0.9);
        const nx = Math.cos(a), ny = Math.sin(a);                  // normal a la tira
        izq.push([px - nx * w, py - ny * w]); der.push([px + nx * w, py + ny * w]);
        a = ang + (0.3 * Math.sin(t * 1.7 - i * 0.7 + k) + vuelo * Math.sign(Math.sin(ang) || 1)) * u;
        px += Math.sin(a) * (largo / N); py -= Math.cos(a) * (largo / N);
      }
      const pts = [...izq, ...der.reverse()];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [qx, qy] of pts) { x0 = Math.min(x0, qx); y0 = Math.min(y0, qy); x1 = Math.max(x1, qx); y1 = Math.max(y1, qy); }
      placa(() => poli(pts), x0, y0, x1, y1, -14);
    };
    const cuerno = () => {
      const traza = () => {
        c.beginPath(); c.moveTo(0.18, 0.3);
        c.bezierCurveTo(0.8, 0.38, 1.16, 0.95, 0.74, 2.02);
        c.bezierCurveTo(0.86, 1.25, 0.56, 0.8, 0.18, 0.56); c.closePath();
      };
      placa(traza, 0.18, 0.3, 1.1, 2.02, 8);
      pieza(PUA_CUERNO, 4);
    };
    const PUA_CUERNO: Pt[] = [[0.84, 0.86], [1.26, 1.02], [0.9, 1.18]];

    const dibujar = (t: number, dt: number) => {
      const v = vivo.current;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const tc = t % CICLO;
      let carga = 0, estallido = 0;
      if (!quieto) {
        if (tc > CARGA_DESDE && tc < DESCARGA) carga = suave(CARGA_DESDE, DESCARGA, tc);
        else if (tc >= DESCARGA) { const k = (tc - DESCARGA) / (CICLO - DESCARGA); estallido = Math.min(1, k * 1.2); carga = Math.max(0, 1 - k * 3.5); }
      }
      const suelta = estallido > 0 ? Math.sin(Math.min(1, estallido * 1.6) * Math.PI) : 0;
      v.retroceso *= Math.exp(-dt * 7);
      mira.x += (mira.mx - mira.x) * 0.06; mira.y += (mira.my - mira.y) * 0.06;
      energia = 0.42 + 0.1 * Math.sin(t * 2.4) + carga * 0.75 + suelta * 0.9;

      const giro = quieto ? 0 : 0.5 * Math.sin(t * 0.42) + mira.x * 0.9;      // -1..1
      const hondo = (z: number) => giro * z * 0.34;                           // lo cercano se desplaza más
      const tiembla = carga * 0.03;
      const respira = Math.sin(t * 1.7);
      c.translate(W / 2 + (Math.random() - 0.5) * tiembla * U * 2, H * 0.57 + (Math.random() - 0.5) * tiembla * U * 2 + (carga * 0.1 - suelta * 0.08 - v.retroceso * 0.06) * U);
      c.scale(U * (1 - Math.abs(giro) * 0.04), -U);
      c.lineJoin = "miter"; c.miterLimit = 4;

      // 0 · Resplandor de fondo
      {
        const r = 3.1 + carga * 0.6 + suelta * 0.8, g = c.createRadialGradient(0, 0.6, 0.2, 0, 0.6, r);
        g.addColorStop(0, `rgba(255,42,109,${0.2 + carga * 0.25 + suelta * 0.3})`); g.addColorStop(0.5, `rgba(180,20,90,${0.08 + carga * 0.12})`); g.addColorStop(1, "rgba(120,10,60,0)");
        c.fillStyle = g; c.fillRect(-4, -3.4, 8, 7.4);
      }

      // 1 · Llamas del aura, por detrás
      if (!quieto) {
        const cuantas = (ligero ? 1 : 2) * (1 + carga * 2.4 + suelta * 2);
        for (let n = 0; n < cuantas; n++) if (motas.length < (ligero ? 70 : 170) && Math.random() < 0.85) {
          const [bx, by] = BROTES[Math.floor(Math.random() * BROTES.length)];
          motas.push({ x: bx + (Math.random() - 0.5) * 0.7, y: by + (Math.random() - 0.5) * 0.7, vx: bx * 0.14 + (Math.random() - 0.5) * 0.3, vy: 0.7 + Math.random() * 1.1 + carga * 1.4, vida: 0, max: 0.7 + Math.random() * 0.7, r: 0.07 + Math.random() * 0.11, fuego: false });
        }
        for (let n = 0; n < 2; n++) motas.push({ x: (Math.random() - 0.5) * 3.4, y: -2.6, vx: (Math.random() - 0.5) * 0.3, vy: 0.5 + Math.random() * 1.0, vida: 0, max: 0.5 + Math.random() * 0.5, r: 0.06 + Math.random() * 0.09, fuego: true });
        for (const m of motas) { m.vida += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx += Math.sin(t * 5 + m.y * 3) * dt * 0.6; }
        motas = motas.filter(m => m.vida < m.max);
      }
      const pintarMotas = (fuego: boolean) => {
        c.save(); c.globalCompositeOperation = "lighter";
        for (const m of motas) {
          if (m.fuego !== fuego) continue;
          const k = m.vida / m.max, a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (fuego ? 0.4 : 0.34);
          const verde = fuego ? 120 + 60 * (1 - k) : Math.round(42 + 120 * k), azul = fuego ? 40 : Math.round(109 - 50 * k);
          c.fillStyle = `rgba(255,${verde},${azul},${a.toFixed(3)})`;
          c.beginPath(); c.ellipse(m.x, m.y, m.r * (1 - k * 0.6), m.r * (3.2 - k * 1.2), Math.atan2(m.vx, m.vy) * -1, 0, Math.PI * 2); c.fill();
        }
        c.restore();
      };
      pintarMotas(false);

      const vuelo = carga * 0.35 + suelta * 0.9;

      // 2 · Manto de los hombros, detrás del cuerpo
      for (const s of [1, -1]) {
        c.save(); c.translate(hondo(-0.5), 0);
        for (let i = 0; i < 4; i++) tira(s * (0.75 + i * 0.22), 1.15 - i * 0.16, s * (0.5 + i * 0.3), 2.1 - i * 0.25, 0.26, t, i * 1.9 + s, vuelo * s * 0.6);
        c.restore();
      }

      // 3 · Cuernos
      con(hondo(0.2), 1.66 + respira * 0.012 + v.retroceso * 0.04, 0.03 * Math.sin(t * 0.8) - v.retroceso * 0.08, 1, 1, () => {
        cuerno(); con(0, 0, 0, -1, 1, cuerno);
      });

      // 4 · Faldón de tiras
      c.save(); c.translate(hondo(0.05), 0);
      for (let i = -3; i <= 3; i++) tira(i * 0.26, -0.45 + Math.abs(i) * 0.06, i * 0.15, 2.05 - Math.abs(i) * 0.12, 0.25, t, i * 1.3, vuelo * 0.5);
      c.restore();

      // 5 · Torso
      con(hondo(0.3), 0, 0, 1, 1 + respira * 0.014 + suelta * 0.03, () => {
        pieza(VIENTRE);
        grieta([[0.34, -0.48], [0.16, -0.74], [0, -0.96]]); grieta([[-0.34, -0.48], [-0.16, -0.74], [0, -0.96]]);
        pieza(PETO, 6);
        for (const s of [1, -1]) {
          grieta([[s * 0.72, 1.16], [s * 0.42, 0.86], [s * 0.1, 0.74]]);
          grieta([[s * 0.62, 0.56], [s * 0.32, 0.2], [s * 0.04, -0.22]]);
          con(s * 0.32, 1.28, 0, s, 1, () => pieza(PUA_CUELLO));
        }
        // emblema: la espada
        c.save(); c.shadowColor = "#ff2a6d"; c.shadowBlur = (14 + energia * 22) * dpr;
        c.fillStyle = `rgba(255,${200 + Math.round(40 * Math.min(1, energia))},${225},1)`;
        poli([[0, 1.1], [0.085, 0.62], [0, -0.14], [-0.085, 0.62]]); c.fill();
        poli([[-0.34, 0.72], [0, 0.8], [0.34, 0.72], [0, 0.64]]); c.fill();
        c.restore();
      });

      // 6 · Cabeza: se adelanta y mira
      con(hondo(0.75) + mira.x * 0.04, 1.66 + respira * 0.012 - carga * 0.05 + suelta * 0.06 + v.retroceso * 0.05, 0.03 * Math.sin(t * 0.8) - v.retroceso * 0.1, 1, 1, () => {
        pieza(YELMO, 4);
        grieta([[0.3, 0.12], [0.14, -0.1], [0, -0.46]], 0.025); grieta([[-0.3, 0.12], [-0.14, -0.1], [0, -0.46]], 0.025);
        pieza(CRESTA, 10);
        grieta([[0, 1.26], [0, 0.42]], 0.022);
        c.save(); c.shadowColor = "#ff2a6d"; c.shadowBlur = (12 + energia * 20) * dpr; c.fillStyle = "#fff0f5";
        const parpadeo = 0.85 + 0.15 * Math.sin(t * 9) + carga * 0.3;
        for (const s of [1, -1]) { poli([[s * 0.05 + mira.x * 0.02, 0.06], [s * 0.26 + mira.x * 0.02, 0.06 + 0.15 * parpadeo], [s * 0.21 + mira.x * 0.02, 0.07]]); c.fill(); }
        c.restore();
      });

      // 7 · Brazos, con sus hombreras
      for (let b = 0; b < 2; b++) {
        const s = b === 0 ? 1 : -1;
        const fase = ((t / ATAQUE) + (b === 0 ? 0 : 0.5)) % 1;
        const g = quieto ? 0 : golpeFase(fase) * (1 - Math.min(1, carga * 1.6)) * (estallido > 0 ? 0 : 1);
        const alza = Math.max(g, 0) / 0.6, pega = Math.max(-g, 0);
        const ocio = 0.05 * Math.sin(t * 1.3 + s);
        // ángulos desde «colgando»: positivo abre hacia fuera
        const a1 = 0.34 + ocio + alza * 2.0 - pega * 0.45 - carga * 0.12 + suelta * 1.45;
        const a2 = -0.55 - alza * 0.5 - pega * 1.05 - carga * 1.75 + suelta * 0.7;
        const cerca = 1 + pega * 0.6 + carga * 0.12;                         // la mano crece al venir hacia ti
        const hx = s * 1.02 + hondo(0.35), hy = 1.0 + respira * 0.01;
        const ex = hx + s * Math.sin(a1) * 0.86, ey = hy - Math.cos(a1) * 0.86;
        const L2 = 0.92 * (1 + pega * 0.25);
        const mx = ex + s * Math.sin(a1 + a2) * L2 + hondo(0.5 * pega), my = ey - Math.cos(a1 + a2) * L2;

        con(hx - s * 0.52, 1.02, s * 0.16, s, 1, () => pieza(HOMBRERA, -6));            // hombrera de atrás
        const miembro = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, claro: number) => {
          const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
          const pts: Pt[] = [[x0 + nx * w0, y0 + ny * w0], [x1 + nx * w1, y1 + ny * w1], [x1 - nx * w1, y1 - ny * w1], [x0 - nx * w0, y0 - ny * w0]];
          placa(() => poli(pts), Math.min(x0, x1) - w0, Math.min(y0, y1) - w0, Math.max(x0, x1) + w0, Math.max(y0, y1) + w0, claro);
          return { nx, ny, dx: dx / d, dy: dy / d };
        };
        miembro(hx, hy, ex, ey, 0.25, 0.2, 0);
        const f = miembro(ex, ey, mx, my, 0.27 * cerca, 0.21 * cerca, 8);
        // púas del guantelete, hacia fuera
        for (const u of [0.15, 0.5]) {
          const px = ex + (mx - ex) * u, py = ey + (my - ey) * u, o = s * 0.24 * cerca;
          const p: Pt[] = [[px + f.nx * o, py + f.ny * o], [px + f.nx * o * 2.6 - f.dx * 0.1, py + f.ny * o * 2.6 - f.dy * 0.1], [px + f.nx * o + f.dx * 0.26, py + f.ny * o + f.dy * 0.26]];
          placa(() => poli(p), px - 0.7, py - 0.7, px + 0.7, py + 0.7, 4);
        }
        grieta([[ex + f.dx * 0.12, ey + f.dy * 0.12], [(ex + mx) / 2 + f.nx * 0.08, (ey + my) / 2 + f.ny * 0.08], [mx - f.dx * 0.1, my - f.dy * 0.1]], 0.03);
        // garras
        for (let d = 0; d < 4; d++) {
          const ab = (d - 1.5) * 0.3, lg = 0.5 * cerca, w = 0.065 * cerca;
          const cs = Math.cos(ab), sn = Math.sin(ab), ux = f.dx * cs - f.dy * sn, uy = f.dx * sn + f.dy * cs;
          const bx = mx + f.nx * (d - 1.5) * 0.11 * cerca, by = my + f.ny * (d - 1.5) * 0.11 * cerca;
          c.beginPath(); c.moveTo(bx - uy * w, by + ux * w);
          c.quadraticCurveTo(bx + ux * lg * 0.6 - uy * w * 2.2 * s, by + uy * lg * 0.6 + ux * w * 2.2 * s, bx + ux * lg, by + uy * lg);
          c.quadraticCurveTo(bx + ux * lg * 0.5, by + uy * lg * 0.5, bx + uy * w, by - ux * w); c.closePath();
          c.fillStyle = "#0a0510"; c.fill(); c.strokeStyle = filo(); c.lineWidth = 0.03; c.stroke();
        }
        con(hx - s * 0.3, 0.9, s * 0.05, s * 0.7, 0.7, () => pieza(HOMBRERA, 10));        // hombrera de delante

        // estela del zarpazo
        const rastro = estela[b];
        rastro.push({ x: mx, y: my, a: pega });
        if (rastro.length > 9) rastro.shift();
        if (pega > 0.05 && rastro.length > 2) {
          c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
          for (let i = 1; i < rastro.length; i++) {
            const k = i / rastro.length;
            c.strokeStyle = `rgba(255,${120 + Math.round(100 * k)},${170 + Math.round(60 * k)},${(k * pega * 0.8).toFixed(3)})`; c.lineWidth = 0.03 + k * 0.12 * cerca;
            c.beginPath(); c.moveTo(rastro[i - 1].x, rastro[i - 1].y); c.lineTo(rastro[i].x, rastro[i].y); c.stroke();
          }
          c.restore();
        }
      }

      // 8 · Fuego a sus pies, rayas de energía y descarga
      pintarMotas(true);
      if (carga > 0.02) {
        c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
        for (let i = 0; i < 16; i++) {
          const x = -2.3 + i * 0.31 + (i % 2) * 0.1, y = -2.6 + ((t * (2 + (i % 5) * 0.6) + i * 0.61) % 1) * 5.8, l = 0.5 + (i % 4) * 0.25;
          c.strokeStyle = `rgba(255,200,220,${(carga * 0.7).toFixed(3)})`; c.lineWidth = 0.022;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + l); c.stroke();
        }
        c.restore();
      }
      if (estallido > 0) {
        c.save(); c.globalCompositeOperation = "lighter";
        c.strokeStyle = `rgba(255,225,235,${((1 - estallido) * 0.95).toFixed(3)})`; c.lineWidth = 0.1 * (1 - estallido) + 0.02;
        c.beginPath(); c.arc(0, 0.5, 0.3 + estallido * 4.2, 0, Math.PI * 2); c.stroke();
        c.fillStyle = `rgba(255,220,235,${(Math.max(0, 0.5 - estallido * 2.2)).toFixed(3)})`; c.fillRect(-5, -4, 10, 9);
        c.restore();
      }

      if (b2d && brillo.current && !ligero) {
        b2d.clearRect(0, 0, brillo.current.width, brillo.current.height);
        b2d.drawImage(el, 0, 0, brillo.current.width, brillo.current.height);
      }
    };

    let raf = 0, visible = true, antes = performance.now();
    const t0 = antes;
    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
      if (!W) return;
      dibujar(quieto ? 2 : (ahora - t0) / 1000, dt);
    };
    const arrancar = () => { if (!raf && visible && !document.hidden) { antes = performance.now(); raf = requestAnimationFrame(cuadro); } };
    const parar = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); else parar(); });
    io.observe(el);
    const vis = () => { if (document.hidden) parar(); else arrancar(); };
    document.addEventListener("visibilitychange", vis);
    arrancar();
    return () => { parar(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis); window.removeEventListener("pointermove", mover); };
  }, []);

  return (
    <div className={`guardian ${className}`} role="img" aria-label="El Guardián del Portal">
      <canvas ref={lienzo} className="guardian-lienzo" />
      <canvas ref={brillo} className="guardian-brillo" aria-hidden="true" />
    </div>
  );
});

export default GuardianVivo;
