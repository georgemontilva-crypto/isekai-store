import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Koi-sama vivo: un koi visto desde arriba, dibujado en un lienzo y animado
 * por código. El cuerpo es una columna de puntos que ondula de cabeza a cola,
 * con volumen (sombra en el fondo del estanque, borde oscuro, brillo de luz y
 * contraluz), aletas que baten y manchas propias. Nada solo, eligiendo rumbos
 * al azar, y al recibir un golpe se estremece, destella y huye del toque.
 *
 * `corrupto`: negro con rojo y aura oscura. `liberar()` lo purifica con una
 * animación —vuelve a sus colores—, da una vuelta al estanque y se va.
 * `posa`: se queda en su sitio nadando hacia arriba (tarjeta y entrada).
 */
export type KoiVivoRef = { golpe: (x?: number, y?: number) => void; liberar: (alIrse?: () => void) => void };

const CUERPO = 20;          // puntos de la columna
const COLA = 5;             // puntos extra de la aleta caudal
const PERFIL: [number, number][] = [[0, .44], [.07, .76], [.18, .97], [.3, 1], [.48, .88], [.68, .58], [.86, .3], [1, .17]];
type RGBA = [number, number, number, number];
const hex = (h: string, a = 1): RGBA => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
/** Color entre el corrupto (p=0) y el puro (p=1) */
const mez = (k: RGBA, c: RGBA, p: number) =>
  `rgba(${Math.round(k[0] + (c[0] - k[0]) * p)},${Math.round(k[1] + (c[1] - k[1]) * p)},${Math.round(k[2] + (c[2] - k[2]) * p)},${(k[3] + (c[3] - k[3]) * p).toFixed(3)})`;
/** Manchas: posición (u), lado (lat), tamaño, color puro (c) y corrupto (k) */
const MANCHAS = [
  { u: .1, lat: -.15, a: .11, b: .8, c: hex("#e3391b"), k: hex("#d0101f") }, { u: .16, lat: .35, a: .07, b: .5, c: hex("#ee5a22"), k: hex("#16040a") },
  { u: .36, lat: -.45, a: .1, b: .62, c: hex("#f0601f"), k: hex("#1c050b") }, { u: .43, lat: .1, a: .09, b: .7, c: hex("#e3391b"), k: hex("#a50c18") },
  { u: .5, lat: .55, a: .05, b: .34, c: hex("#15171c"), k: hex("#ff3344") }, { u: .27, lat: .62, a: .035, b: .26, c: hex("#15171c"), k: hex("#ff3344") },
  { u: .66, lat: -.1, a: .08, b: .75, c: hex("#f39a2d"), k: hex("#16040a") }, { u: .74, lat: .3, a: .05, b: .5, c: hex("#ee5a22"), k: hex("#d0101f") },
  { u: .88, lat: 0, a: .05, b: .9, c: hex("#e3391b"), k: hex("#1c050b") },
];
const C = {
  base: [hex("#0d0c11"), hex("#f3efe6")], halo: [[225, 20, 45, .85] as RGBA, [34, 211, 238, .75] as RGBA],
  borde: [[255, 55, 70, .75] as RGBA, [103, 232, 249, .6] as RGBA], luz: [[255, 255, 255, .1] as RGBA, [255, 255, 255, .3] as RGBA],
  luz2: [[255, 120, 130, .28] as RGBA, [255, 255, 255, .5] as RGBA], escama: [[255, 70, 80, .13] as RGBA, [20, 30, 50, .085] as RGBA],
  lomo: [[255, 40, 55, .6] as RGBA, [150, 50, 14, .5] as RGBA], ojo: [hex("#ff2638"), hex("#8ff5ff")], ojoFondo: [hex("#1a0206"), hex("#0a1620")],
  bigote: [[150, 30, 40, .9] as RGBA, [235, 220, 200, .85] as RGBA],
  aleta0: [[40, 6, 12, .95] as RGBA, [255, 236, 220, .92] as RGBA], aleta1: [[190, 16, 34, .7] as RGBA, [255, 158, 84, .6] as RGBA], aleta2: [[255, 40, 60, .25] as RGBA, [255, 110, 60, .22] as RGBA],
  radio: [[255, 80, 90, .25] as RGBA, [120, 40, 10, .22] as RGBA], aletaBorde: [[255, 70, 80, .35] as RGBA, [255, 255, 255, .3] as RGBA],
};

function perfil(u: number) {
  for (let i = 1; i < PERFIL.length; i++) {
    if (u <= PERFIL[i][0]) {
      const [u0, w0] = PERFIL[i - 1], [u1, w1] = PERFIL[i];
      const k = (u - u0) / (u1 - u0);
      return w0 + (w1 - w0) * (k * k * (3 - 2 * k));
    }
  }
  return PERFIL[PERFIL.length - 1][1];
}
type P = { x: number; y: number };
type Mota = { x: number; y: number; vx: number; vy: number; vida: number; max: number; r: number; luz: boolean };
/** Curva suave que pasa por los puntos (continúa el trazo abierto) */
function suave(c: CanvasRenderingContext2D, pts: P[], mover = true) {
  if (mover) c.moveTo(pts[0].x, pts[0].y); else c.lineTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    c.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
  }
  const f = pts[pts.length - 1];
  c.lineTo(f.x, f.y);
}

type Props = { className?: string; posa?: boolean; calma?: boolean; corrupto?: boolean };
const KoiVivo = forwardRef<KoiVivoRef, Props>(function KoiVivo({ className = "", posa = false, calma = false, corrupto = false }, ref) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const vivo = useRef({
    impulso: 0, destello: 0, huir: null as P | null, calma,
    /** 0 = corrupto, 1 = puro */
    pureza: corrupto ? 0 : 1,
    /** Liberación: transforma → vuelta → salida → ido */
    etapa: "" as "" | "transforma" | "vuelta" | "salida" | "ido", t: 0, giro: 0, alIrse: undefined as undefined | (() => void),
  });
  vivo.current.calma = calma;
  // Si cambia de fuera (batalla nueva) y no hay liberación en curso, se ajusta
  useEffect(() => { const v = vivo.current; if (!v.etapa || v.etapa === "ido") { v.pureza = corrupto ? 0 : 1; v.etapa = ""; } }, [corrupto]);

  useImperativeHandle(ref, () => ({
    golpe(x?: number, y?: number) {
      const v = vivo.current;
      if (v.etapa) return;
      v.impulso = Math.min(1.7, v.impulso + 0.55);
      v.destello = 1;
      if (x !== undefined && y !== undefined) v.huir = { x, y };
    },
    liberar(alIrse?: () => void) {
      const v = vivo.current;
      if (v.etapa) return;
      v.etapa = "transforma"; v.t = 0; v.giro = 0; v.alIrse = alIrse; v.destello = 1; v.impulso = 0; v.huir = null;
    },
  }), []);

  useEffect(() => {
    const el = lienzo.current;
    if (!el) return;
    const c = el.getContext("2d");
    if (!c) return;
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, L = 0, dpr = 1;
    const total = CUERPO + COLA;
    const esp: P[] = Array.from({ length: total }, () => ({ x: 0, y: 0 }));
    let rumbo = -Math.PI / 2, fase = 0, velBase = 1, meta: P = { x: 0, y: 0 }, hasta = 0, sembrado = false;
    let motas: Mota[] = [], anillo = -1, angVuelta = 0;

    const medir = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
      L = posa ? H * 0.62 : Math.min(W * 0.5, H * 0.58);
      if (!sembrado || posa) {
        const x0 = W / 2, y0 = posa ? H * 0.12 : H * 0.42, s = L / (CUERPO - 1);
        esp.forEach((p, i) => { p.x = x0; p.y = y0 + i * s; });
        meta = { x: x0, y: y0 }; sembrado = true;
      }
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);

    const nuevaMeta = (lejosDe?: P | null) => {
      const m = L * 0.34;
      for (let k = 0; k < 8; k++) {
        const cand = { x: m + Math.random() * Math.max(1, W - 2 * m), y: m + Math.random() * Math.max(1, H - 2 * m) };
        meta = cand;
        const lejosCabeza = Math.hypot(cand.x - esp[0].x, cand.y - esp[0].y) > L * 0.45;
        const lejosToque = !lejosDe || Math.hypot(cand.x - lejosDe.x, cand.y - lejosDe.y) > Math.min(W, H) * 0.42;
        if (lejosCabeza && lejosToque) break;
      }
      hasta = performance.now() + 2200 + Math.random() * 3200;
      velBase = 0.7 + Math.random() * 0.6;
    };
    const mota = (luz: boolean, i = Math.floor(Math.random() * CUERPO), fuerza = 1) => {
      if (motas.length > 110) return;
      const p = esp[i], a = Math.random() * Math.PI * 2, vel = (luz ? 26 + Math.random() * 60 : 8 + Math.random() * 16) * fuerza;
      motas.push({
        x: p.x + (Math.random() - 0.5) * L * 0.12, y: p.y + (Math.random() - 0.5) * L * 0.12,
        vx: Math.cos(a) * vel, vy: Math.sin(a) * vel - (luz ? 0 : 14), vida: 0, max: luz ? 0.7 + Math.random() * 0.7 : 0.9 + Math.random() * 0.9,
        r: luz ? 1.4 + Math.random() * 2.4 : L * (0.05 + Math.random() * 0.07), luz,
      });
    };

    const paso = (dt: number, ahora: number) => {
      const v = vivo.current, s = L / (CUERPO - 1);
      v.impulso *= Math.exp(-dt * 2.6);
      v.destello *= Math.exp(-dt * (v.etapa === "transforma" ? 2.2 : 9));
      const cab = esp[0];
      let vel = 0;

      if (v.etapa === "ido") return;
      if (v.etapa) v.t += dt;
      if (v.etapa === "transforma") {
        // Se purifica: los colores vuelven y estalla la luz
        if (anillo < 0) anillo = 0;
        const k = Math.min(1, v.t / 1.7);
        v.pureza = k * k * (3 - 2 * k);
        for (let n = 0; n < 4; n++) mota(true, undefined, 1.3);
        fase += dt * 9;
        if (v.t > 2) { v.etapa = "vuelta"; v.t = 0; v.pureza = 1; angVuelta = Math.atan2(cab.y - H / 2, cab.x - W / 2); v.giro = 0; }
      } else if (v.etapa === "vuelta" || v.etapa === "salida") {
        if (v.etapa === "vuelta") {
          // Una vuelta completa al estanque, libre
          const avance = dt * 1.7; angVuelta += avance; v.giro += avance;
          const R = Math.min(W, H) * 0.22;
          meta = { x: W / 2 + Math.cos(angVuelta + 0.9) * R, y: H / 2 + Math.sin(angVuelta + 0.9) * R * 0.86 };
          if (v.giro > Math.PI * 2.15) { v.etapa = "salida"; v.t = 0; }
        } else {
          meta = { x: W * 0.5, y: -L * 3 };
        }
        let dif = Math.atan2(meta.y - cab.y, meta.x - cab.x) - rumbo;
        dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        const giro = 3.4 * dt;
        rumbo += Math.max(-giro, Math.min(giro, dif));
        vel = L * (v.etapa === "salida" ? 0.95 + v.t * 0.7 : 0.78);
        cab.x += Math.cos(rumbo) * vel * dt; cab.y += Math.sin(rumbo) * vel * dt;
        fase += dt * (4.2 + (vel / L) * 11);
        if (Math.random() < 0.6) mota(true, CUERPO - 1 + Math.floor(Math.random() * COLA), 0.4);
        // Se fue: toda la cola quedó fuera de la vista
        if (v.etapa === "salida" && (esp[total - 1].y < -L * 0.2 || v.t > 6)) {
          v.etapa = "ido"; const f = v.alIrse; v.alIrse = undefined; f?.();
        }
      } else if (!posa) {
        if (v.huir) { nuevaMeta(v.huir); v.huir = null; rumbo += (Math.random() - 0.5) * 0.9; }
        if (ahora > hasta || Math.hypot(meta.x - cab.x, meta.y - cab.y) < L * 0.22) nuevaMeta();
        let dif = Math.atan2(meta.y - cab.y, meta.x - cab.x) - rumbo;
        dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        // Si se acerca al borde vuelve hacia dentro: nunca sale del estanque
        const borde = L * 0.34;
        const fuera = cab.x < borde || cab.x > W - borde || cab.y < borde || cab.y > H - borde;
        if (fuera && (meta.x < borde * 1.6 || meta.x > W - borde * 1.6 || meta.y < borde * 1.6 || meta.y > H - borde * 1.6 || v.impulso > 0.4)) {
          meta = { x: W * (0.38 + Math.random() * 0.24), y: H * (0.38 + Math.random() * 0.24) }; hasta = ahora + 2500;
          dif = Math.atan2(meta.y - cab.y, meta.x - cab.x) - rumbo; dif = Math.atan2(Math.sin(dif), Math.cos(dif));
        }
        const giro = (1.8 + v.impulso * 1.5) * (fuera ? 2.2 : 1) * dt;
        rumbo += Math.max(-giro, Math.min(giro, dif));
        vel = L * 0.3 * velBase * (v.calma ? 0.55 : 1) * (1 + v.impulso * 2.6) * (quieto ? 0.4 : 1);
        cab.x += Math.cos(rumbo) * vel * dt; cab.y += Math.sin(rumbo) * vel * dt;
        const tope = L * 0.22;
        cab.x = Math.max(tope, Math.min(W - tope, cab.x)); cab.y = Math.max(tope, Math.min(H - tope, cab.y));
        fase += dt * (4.2 + (vel / L) * 11);
      } else {
        fase += dt * (quieto ? 2 : 4.6 + v.impulso * 6);
      }
      // Cada punto sigue al anterior, sin doblarse más de la cuenta: así el
      // cuerpo gira en arco, como un pez, en vez de plegarse sobre sí mismo
      let previo = (posa ? -Math.PI / 2 : rumbo) + Math.PI;
      for (let i = 1; i < total; i++) {
        const a = esp[i - 1], b = esp[i];
        let ang = Math.atan2(b.y - a.y, b.x - a.x);
        const dif = Math.atan2(Math.sin(ang - previo), Math.cos(ang - previo));
        const max = i < CUERPO ? 0.2 : 0.3;
        if (Math.abs(dif) > max) ang = previo + Math.sign(dif) * max;
        b.x = a.x + Math.cos(ang) * s; b.y = a.y + Math.sin(ang) * s;
        previo = ang;
      }
      // Aura oscura: humo que brota del cuerpo mientras siga corrupto
      if (v.pureza < 0.85 && !quieto && Math.random() < (posa ? 0.45 : 0.7) * (1 - v.pureza)) mota(false);
      for (const m of motas) { m.vida += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= 1 - dt * 1.4; m.vy *= 1 - dt * 1.4; }
      motas = motas.filter(m => m.vida < m.max);
      if (anillo >= 0) { anillo += dt; if (anillo > 1.3) anillo = -1; }
    };

    const dibujar = () => {
      const v = vivo.current, Wm = L * 0.142, p = v.pureza;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      if (v.etapa === "ido") return;
      const col = (par: RGBA[]) => mez(par[0], par[1], p);
      // Columna con la ondulación: casi nada en la cabeza, amplia en la cola
      const amp = Wm * (0.5 + 0.55 * Math.min(1, v.impulso)) * (posa ? 0.85 : 1);
      const pts: P[] = [], nor: P[] = [];
      for (let i = 0; i < total; i++) {
        const a = esp[Math.max(0, i - 1)], b = esp[Math.min(total - 1, i + 1)];
        let tx = b.x - a.x, ty = b.y - a.y; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
        const u = i / (CUERPO - 1);
        const o = amp * Math.pow(Math.min(1.3, u), 1.7) * Math.sin(fase - i * 0.42);
        nor.push({ x: -ty, y: tx });
        pts.push({ x: esp[i].x - ty * o, y: esp[i].y + tx * o });
      }
      const w = (i: number) => Wm * perfil(Math.min(1, i / (CUERPO - 1)));
      const lado = (i: number, k: number): P => ({ x: pts[i].x + nor[i].x * w(i) * k, y: pts[i].y + nor[i].y * w(i) * k });
      const adelante = { x: pts[0].x - pts[1].x, y: pts[0].y - pts[1].y };
      const da = Math.hypot(adelante.x, adelante.y) || 1; adelante.x /= da; adelante.y /= da;

      const trazoCuerpo = () => {
        c.beginPath();
        const izq: P[] = [], der: P[] = [];
        for (let i = 0; i < CUERPO; i++) { izq.push(lado(i, 1)); der.push(lado(i, -1)); }
        suave(c, izq);
        suave(c, der.reverse(), false);
        const morro = { x: pts[0].x + adelante.x * Wm * 0.95, y: pts[0].y + adelante.y * Wm * 0.95 };
        c.quadraticCurveTo(morro.x - nor[0].x * Wm * 0.36, morro.y - nor[0].y * Wm * 0.36, morro.x, morro.y);
        c.quadraticCurveTo(morro.x + nor[0].x * Wm * 0.36, morro.y + nor[0].y * Wm * 0.36, izq[0].x, izq[0].y);
        c.closePath();
      };
      /** Aleta caudal: abanico que sale del último punto del cuerpo */
      const trazoCola = () => {
        const b = CUERPO - 1, izq: P[] = [], der: P[] = [];
        for (let j = 0; j <= COLA - 1; j++) {
          const i = b + j, k = j / (COLA - 1), an = Wm * (0.17 + 1.15 * Math.pow(k, 0.85));
          izq.push({ x: pts[i].x + nor[i].x * an, y: pts[i].y + nor[i].y * an });
          der.push({ x: pts[i].x - nor[i].x * an, y: pts[i].y - nor[i].y * an });
        }
        const muesca = pts[b + COLA - 2];
        c.beginPath(); suave(c, izq);
        c.quadraticCurveTo(muesca.x, muesca.y, der[der.length - 1].x, der[der.length - 1].y);
        suave(c, der.reverse(), false); c.closePath();
        return { izq, der: der.reverse(), base: pts[b] };
      };
      /** Aleta lateral: sale del costado y bate */
      const trazoAleta = (i: number, k: number, largo: number, ancho: number, bat: number) => {
        const base = lado(i, k * 0.86), t = { x: pts[i + 1].x - pts[i].x, y: pts[i + 1].y - pts[i].y };
        const d = Math.hypot(t.x, t.y) || 1; t.x /= d; t.y /= d;
        const ang = (0.95 + bat) * k, cs = Math.cos(ang), sn = Math.sin(ang);
        const dir = { x: t.x * cs - t.y * sn, y: t.x * sn + t.y * cs };      // hacia atrás y afuera
        const per = { x: -dir.y * k, y: dir.x * k };
        const punta = { x: base.x + dir.x * largo, y: base.y + dir.y * largo };
        c.beginPath(); c.moveTo(base.x, base.y);
        c.quadraticCurveTo(base.x + dir.x * largo * 0.45 + per.x * ancho, base.y + dir.y * largo * 0.45 + per.y * ancho, punta.x, punta.y);
        c.quadraticCurveTo(base.x + dir.x * largo * 0.6 - per.x * ancho * 0.35, base.y + dir.y * largo * 0.6 - per.y * ancho * 0.35, base.x - t.x * ancho * 0.5, base.y - t.y * ancho * 0.5);
        c.closePath();
        return { base, punta };
      };
      const aletas: [number, number, number, number, number][] = [];
      for (const k of [1, -1]) {
        aletas.push([4, k, L * 0.2, L * 0.085, 0.3 * Math.sin(fase * 0.8 + (k > 0 ? 0 : 1.4))]);
        aletas.push([10, k, L * 0.115, L * 0.05, 0.22 * Math.sin(fase * 0.8 + 2 + (k > 0 ? 0 : 1.1))]);
      }

      // 0 · Aura oscura: humo negro con borde rojo, por debajo del pez
      for (const m of motas) {
        if (m.luz) continue;
        const k = m.vida / m.max, a = Math.sin(Math.PI * Math.min(1, k * 1.1)) * (1 - p), r = m.r * (0.6 + k * 1.5);
        c.fillStyle = `rgba(150,10,30,${(a * 0.2).toFixed(3)})`; c.beginPath(); c.arc(m.x, m.y, r * 1.35, 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(6,0,4,${(a * 0.62).toFixed(3)})`; c.beginPath(); c.arc(m.x, m.y, r, 0, Math.PI * 2); c.fill();
      }

      // 1 · Sombra en el fondo del estanque: es lo que lo separa del agua
      c.save(); c.translate(L * 0.07, L * 0.1);
      c.fillStyle = "rgba(0,6,14,.2)"; c.strokeStyle = "rgba(0,6,14,.1)"; c.lineWidth = L * 0.05; c.lineJoin = "round";
      trazoCuerpo(); c.stroke(); c.fill(); trazoCola(); c.fill();
      for (const a of aletas) { trazoAleta(...a); c.fill(); }
      c.restore();

      // 2 · Aletas, translúcidas, con sus radios
      const pintarAleta = (base: P, punta: P) => {
        const g = c.createLinearGradient(base.x, base.y, punta.x, punta.y);
        g.addColorStop(0, col(C.aleta0)); g.addColorStop(0.55, col(C.aleta1)); g.addColorStop(1, col(C.aleta2));
        c.fillStyle = g; c.fill();
        c.strokeStyle = col(C.aletaBorde); c.lineWidth = 1; c.stroke();
      };
      for (const a of aletas) {
        const { base, punta } = trazoAleta(...a); pintarAleta(base, punta);
        c.save(); c.clip(); c.strokeStyle = col(C.radio); c.lineWidth = 1;
        for (let r = -2; r <= 2; r++) { c.beginPath(); c.moveTo(base.x, base.y); c.lineTo(punta.x + r * a[3] * 0.55, punta.y + r * a[3] * 0.3); c.stroke(); }
        c.restore();
      }
      {
        const { izq, der, base } = trazoCola();
        const fin = pts[total - 1];
        pintarAleta(base, fin);
        c.save(); c.clip(); c.strokeStyle = col(C.radio); c.lineWidth = 1;
        const ul = izq[izq.length - 1], ur = der[der.length - 1];
        for (let r = 0; r <= 8; r++) { const k = r / 8; c.beginPath(); c.moveTo(base.x, base.y); c.lineTo(ul.x + (ur.x - ul.x) * k, ul.y + (ur.y - ul.y) * k); c.stroke(); }
        c.restore();
      }

      // 3 · Cuerpo, con su resplandor: rojo si está corrupto, del agua si es libre
      c.save();
      c.shadowColor = col(C.halo); c.shadowBlur = L * (0.09 + 0.05 * (1 - p));
      trazoCuerpo(); c.fillStyle = col(C.base); c.fill();
      c.restore();

      c.save(); trazoCuerpo(); c.clip();
      // manchas
      for (const m of MANCHAS) {
        const fi = m.u * (CUERPO - 1), i = Math.min(CUERPO - 2, Math.floor(fi)), k = fi - i;
        const px = pts[i].x + (pts[i + 1].x - pts[i].x) * k, py = pts[i].y + (pts[i + 1].y - pts[i].y) * k;
        const wi = Wm * perfil(m.u), ang = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
        c.fillStyle = mez(m.k, m.c, p); c.beginPath();
        c.ellipse(px + nor[i].x * wi * m.lat, py + nor[i].y * wi * m.lat, L * m.a, wi * m.b, ang, 0, Math.PI * 2);
        c.fill();
      }
      // escamas
      c.strokeStyle = col(C.escama); c.lineWidth = 1;
      for (let i = 3; i < CUERPO - 2; i++) {
        const ang = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x), wi = w(i);
        for (let k = -2; k <= 2; k++) {
          const q = (k + (i % 2 ? 0.5 : 0)) * 0.42;
          c.beginPath(); c.arc(pts[i].x + nor[i].x * wi * q, pts[i].y + nor[i].y * wi * q, wi * 0.3, ang - 1.1, ang + 1.1); c.stroke();
        }
      }
      // volumen: los costados se oscurecen hacia el borde
      c.lineJoin = "round";
      trazoCuerpo(); c.strokeStyle = "rgba(8,22,44,.17)"; c.lineWidth = Wm * 1.15; c.stroke();
      trazoCuerpo(); c.strokeStyle = "rgba(8,22,44,.2)"; c.lineWidth = Wm * 0.55; c.stroke();
      // aleta dorsal
      c.beginPath(); suave(c, pts.slice(6, 13)); c.strokeStyle = col(C.lomo); c.lineWidth = Wm * 0.13; c.lineCap = "round"; c.stroke();
      // brillo: la luz viene de arriba a la izquierda
      const luz = pts.slice(1, 14).map((q, j) => ({ x: q.x - w(j + 1) * 0.3, y: q.y - w(j + 1) * 0.3 }));
      c.beginPath(); suave(c, luz); c.strokeStyle = col(C.luz); c.lineWidth = Wm * 0.42; c.stroke();
      c.beginPath(); suave(c, luz.slice(0, 9)); c.strokeStyle = col(C.luz2); c.lineWidth = Wm * 0.13; c.stroke();
      // contraluz en el borde
      trazoCuerpo(); c.strokeStyle = col(C.borde); c.lineWidth = 3; c.stroke();
      // destello del golpe (y de la purificación)
      if (v.destello > 0.02) { c.fillStyle = `rgba(255,255,255,${Math.min(0.9, v.destello * 0.9)})`; c.fillRect(0, 0, W, H); }
      c.restore();

      // 4 · Ojos y bigotes
      for (const k of [1, -1]) {
        const o = lado(1, k * 0.8), r = Wm * 0.13;
        c.fillStyle = col(C.ojoFondo); c.beginPath(); c.arc(o.x, o.y, r, 0, Math.PI * 2); c.fill();
        // corrupto: el ojo entero arde en rojo
        c.save(); if (p < 0.6) { c.shadowColor = "#ff1a30"; c.shadowBlur = 9 * (1 - p); }
        c.fillStyle = col(C.ojo); c.beginPath();
        c.arc(o.x - r * 0.35 * p, o.y - r * 0.35 * p, r * (0.34 + 0.4 * (1 - p)), 0, Math.PI * 2); c.fill(); c.restore();
        const b0 = { x: pts[0].x + adelante.x * Wm * 0.7 + nor[0].x * Wm * 0.3 * k, y: pts[0].y + adelante.y * Wm * 0.7 + nor[0].y * Wm * 0.3 * k };
        const mueve = Math.sin(fase * 0.7 + k) * Wm * 0.12;
        c.beginPath(); c.moveTo(b0.x, b0.y);
        c.quadraticCurveTo(b0.x + adelante.x * Wm * 0.5 + nor[0].x * Wm * 0.5 * k, b0.y + adelante.y * Wm * 0.5 + nor[0].y * Wm * 0.5 * k,
          b0.x + nor[0].x * (Wm * 0.8 * k + mueve) - adelante.x * Wm * 0.1, b0.y + nor[0].y * (Wm * 0.8 * k + mueve) - adelante.y * Wm * 0.1);
        c.strokeStyle = col(C.bigote); c.lineWidth = Math.max(1.2, Wm * 0.06); c.lineCap = "round"; c.stroke();
      }

      // 5 · Luz de la liberación: anillo que se abre y chispas doradas
      if (anillo >= 0) {
        const k = anillo / 1.3, cx = pts[6].x, cy = pts[6].y;
        c.strokeStyle = `rgba(255,255,255,${(1 - k).toFixed(3)})`; c.lineWidth = 6 * (1 - k) + 1;
        c.beginPath(); c.arc(cx, cy, L * (0.15 + k * 0.95), 0, Math.PI * 2); c.stroke();
        c.strokeStyle = `rgba(125,249,255,${((1 - k) * 0.7).toFixed(3)})`; c.lineWidth = 2;
        c.beginPath(); c.arc(cx, cy, L * (0.08 + k * 0.6), 0, Math.PI * 2); c.stroke();
      }
      for (const m of motas) {
        if (!m.luz) continue;
        const a = 1 - m.vida / m.max;
        c.fillStyle = `rgba(255,236,170,${a.toFixed(3)})`; c.beginPath(); c.arc(m.x, m.y, m.r * (0.5 + a), 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(125,249,255,${(a * 0.35).toFixed(3)})`; c.beginPath(); c.arc(m.x, m.y, m.r * 2.4, 0, Math.PI * 2); c.fill();
      }
    };

    let raf = 0, antes = performance.now(), visible = true;
    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
      if (!visible || document.hidden || !W) return;
      paso(dt, ahora); dibujar();
    };
    raf = requestAnimationFrame(cuadro);
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; });
    io.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [posa]);

  return <canvas ref={lienzo} className={`koi-lienzo ${className}`} role="img" aria-label="Koi-sama" />;
});

export default KoiVivo;
