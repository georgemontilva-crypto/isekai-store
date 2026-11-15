import { useEffect, useRef, useState } from "react";
import { esGamaBaja } from "@/lib/gamaBaja";

/**
 * El Guardián del Portal en 3D, modelado por código (sin archivo de modelo):
 * yelmo de cresta con cuernos de media luna, hombreras de púas en capas,
 * peto en V con el emblema de la espada, manto de esquirlas y garras.
 * Armadura casi negra con los filos y las grietas encendidos en rosa, como
 * la ilustración original.
 *
 * Tiene esqueleto: hombro → codo → mano. Con él:
 *  - respira, gira la cabeza y el cuerpo (en computadora sigue al ratón)
 *  - ataca: alza un brazo y descarga el zarpazo hacia la cámara, alternando
 *  - carga aura: se encoge, tiembla, las llamas crecen y suben rayas de
 *    energía… y la suelta abriendo los brazos, con un anillo de luz
 *
 * three.js se carga solo cuando hace falta. Sin WebGL no dibuja nada y avisa
 * con `alFallar`, para que quien lo use muestre la imagen de siempre.
 */
type Pt = [number, number];
const ROSA = 0xff2a6d, ROSA_CLARO = 0xffc4d6, NARANJA = 0xffa052;

// ── Piezas: contornos en 2D que luego se extruyen ──
const PETO: Pt[] = [[-0.78, 1.22], [-0.3, 1.42], [0, 1.28], [0.3, 1.42], [0.78, 1.22], [0.66, 0.55], [0.34, 0.05], [0, -0.28], [-0.34, 0.05], [-0.66, 0.55]];
const VIENTRE: Pt[] = [[-0.44, 0.22], [0, -0.02], [0.44, 0.22], [0.34, -0.5], [0, -0.98], [-0.34, -0.5]];
const YELMO: Pt[] = [[0, 0.78], [0.2, 0.5], [0.31, 0.12], [0.21, -0.2], [0, -0.5], [-0.21, -0.2], [-0.31, 0.12], [-0.2, 0.5]];
const CRESTA: Pt[] = [[0, 1.3], [0.075, 0.55], [0, 0.36], [-0.075, 0.55]];
const CUERNO: Pt[] = [[0.2, 0.28], [0.52, 0.42], [0.76, 0.78], [1.04, 0.92], [0.82, 1.06], [0.84, 1.36], [0.64, 1.95], [0.66, 1.36], [0.55, 0.92], [0.38, 0.62], [0.2, 0.52]];
const HOMBRERA: Pt[] = [[0, 0], [0.5, 0.45], [1.28, 0.78], [0.96, 0.3], [1.5, 0.06], [1.02, -0.1], [1.24, -0.58], [0.72, -0.36], [0.46, -0.78], [0.24, -0.3]];
const BRAZO: Pt[] = [[-0.2, 0.05], [0.2, 0.05], [0.3, -0.3], [0.52, -0.22], [0.3, -0.5], [0.24, -0.8], [-0.2, -0.8]];
const GUANTELETE: Pt[] = [[-0.22, 0.06], [0.24, 0.06], [0.58, 0.36], [0.36, -0.2], [0.34, -0.86], [-0.2, -0.86], [-0.32, -0.4]];
const ESQUIRLA: Pt[] = [[-0.22, 0], [0.22, 0], [0.3, -0.9], [0.05, -1.72], [-0.12, -1.1], [-0.3, -0.8]];
const MANTO: Pt[] = [[0, 0], [0.42, -0.1], [0.85, -0.62], [0.6, -0.66], [0.98, -1.3], [0.56, -1.12], [0.62, -1.8], [0.2, -1.2], [0.05, -1.5], [-0.12, -0.7]];
const LLAMA: Pt[] = [[0, 0], [0.3, 0.5], [0.15, 0.9], [0.4, 1.5], [0.05, 1.1], [-0.1, 1.65], [-0.25, 0.8], [-0.1, 0.5], [-0.3, 0.2]];
const OJO: Pt[] = [[0.05, 0.07], [0.25, 0.21], [0.2, 0.09]];
const EMBLEMA_V: Pt[] = [[0, 1.08], [0.075, 0.62], [0, -0.12], [-0.075, 0.62]];
const EMBLEMA_H: Pt[] = [[-0.32, 0.72], [0, 0.79], [0.32, 0.72], [0, 0.65]];

/** Un ataque: el brazo se alza despacio, descarga de golpe y vuelve */
const suave = (a: number, b: number, x: number) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const golpe = (ph: number) => suave(0, 0.22, ph) * 0.6 - suave(0.22, 0.29, ph) * 1.6 + suave(0.32, 0.64, ph);
const CICLO = 10, CARGA_DESDE = 4.6, DESCARGA = 8.4, ATAQUE = 4.6;

export default function JefeModelo3D({ className = "", alFallar }: { className?: string; alFallar?: () => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const brillo = useRef<HTMLCanvasElement>(null);
  const [listo, setListo] = useState(false);
  const fallar = useRef(alFallar); fallar.current = alFallar;

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;
    let vivo = true, limpiar = () => {};
    const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ligero = esGamaBaja();

    void import("three").then(T => {
      if (!vivo) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: !ligero, powerPreference: "high-performance" }); }
      catch { fallar.current?.(); return; }
      renderer.setClearColor(0x000000, 0);
      const escena = new T.Scene();
      const camara = new T.PerspectiveCamera(30, 1, 0.1, 50);
      camara.position.set(0, 0.35, 11.2);

      // ── Materiales ──
      const mArmadura = new T.MeshStandardMaterial({ color: 0x0b0610, metalness: 0.6, roughness: 0.42, flatShading: true, side: T.DoubleSide });
      const mBorde = new T.MeshBasicMaterial({ color: ROSA, side: T.DoubleSide });
      const mLinea = new T.MeshBasicMaterial({ color: ROSA, side: T.DoubleSide });
      const mOjo = new T.MeshBasicMaterial({ color: ROSA_CLARO, side: T.DoubleSide });
      const mLlama = new T.MeshBasicMaterial({ color: ROSA, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false });
      const mLlama2 = new T.MeshBasicMaterial({ color: NARANJA, transparent: true, opacity: 0.12, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
      const mFuego = new T.MeshBasicMaterial({ color: 0xff7a2c, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });

      escena.add(new T.AmbientLight(0x3a2250, 0.55));
      const frente = new T.DirectionalLight(0x9a86e0, 0.55); frente.position.set(-2, 3, 6); escena.add(frente);
      const izq = new T.PointLight(ROSA, 14, 12); izq.position.set(-3.2, 1.2, 1.5); escena.add(izq);
      const der = new T.PointLight(ROSA, 14, 12); der.position.set(3.2, 1.2, 1.5); escena.add(der);
      const abajo = new T.PointLight(0xff7a30, 14, 9); abajo.position.set(0, -2.6, 2.2); escena.add(abajo);

      const forma = (pts: Pt[]) => { const s = new T.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
      /** Placa de armadura con su filo encendido detrás (el contorno de neón) */
      const placa = (pts: Pt[], prof = 0.2, filo = 1.06) => {
        const geo = new T.ExtrudeGeometry(forma(pts), { depth: prof, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 1 });
        geo.computeBoundingBox();
        const c = geo.boundingBox!.getCenter(new T.Vector3());
        geo.translate(-c.x, -c.y, -c.z);
        const borde = new T.Mesh(geo, mBorde); borde.scale.set(filo, filo, 0.3); borde.position.z = -0.03;
        const dentro = new T.Group(); dentro.add(borde, new T.Mesh(geo, mArmadura)); dentro.position.copy(c);
        const g = new T.Group(); g.add(dentro); return g;
      };
      const plana = (pts: Pt[], mat: InstanceType<typeof T.Material>) => new T.Mesh(new T.ShapeGeometry(forma(pts)), mat);
      const en = <O extends InstanceType<typeof T.Object3D>>(o: O, x = 0, y = 0, z = 0, rz = 0, s = 1) => { o.position.set(x, y, z); o.rotation.z = rz; o.scale.multiplyScalar(s); return o; };
      const espejo = (o: InstanceType<typeof T.Object3D>) => { const g = new T.Group(); g.add(o); g.scale.x = -1; return g; };

      const raiz = new T.Group(); escena.add(raiz);
      const cuerpo = new T.Group(); raiz.add(cuerpo);

      // ── Aura de llamas, detrás de todo ──
      const llamas: { m: InstanceType<typeof T.Mesh>; base: number; fase: number }[] = [];
      const geoLlama = new T.ShapeGeometry(forma(LLAMA));
      for (let i = 0; i < 11; i++) {
        const ang = -1.75 + (i / 10) * 3.5;                       // abanico por arriba y los lados
        const r = 1.0 + (i % 3) * 0.16, esc = 0.78 + ((i * 7) % 5) * 0.12;
        for (const [mat, k, z] of [[mLlama, 1, -0.7], [mLlama2, 1.3, -0.9]] as const) {
          const m = new T.Mesh(geoLlama, mat);
          m.position.set(Math.sin(ang) * r * 1.05, 0.5 + Math.cos(ang) * r * 0.85, z);
          m.rotation.z = -ang * 0.85; m.scale.setScalar(esc * k);
          raiz.add(m); llamas.push({ m, base: esc * k, fase: i * 1.7 + k });
        }
      }

      // ── Manto de esquirlas (parte baja y costados) ──
      for (let i = -3; i <= 3; i++) {
        const a = Math.abs(i);
        cuerpo.add(en(placa(ESQUIRLA, 0.16), i * 0.3, -0.42 + a * 0.05, -0.1 - a * 0.07, i * -0.17, 1 + a * 0.06));
      }
      for (const lado of [1, -1]) {
        const ala = new T.Group();
        ala.add(en(placa(MANTO, 0.14), 0.62, 0.92, -0.32, -0.08, 1.12));
        ala.add(en(placa(MANTO, 0.14), 0.42, 0.42, -0.2, 0.1, 0.9));
        if (lado < 0) ala.scale.x = -1;
        cuerpo.add(ala);
      }

      // ── Torso ──
      const torso = new T.Group(); cuerpo.add(torso);
      torso.add(en(placa(VIENTRE, 0.42), 0, 0, -0.06));
      torso.add(placa(PETO, 0.52));
      torso.add(en(plana(EMBLEMA_V, mOjo), 0, 0, 0.585));
      torso.add(en(plana(EMBLEMA_H, mLinea), 0, 0, 0.58));
      const tubo = (p: [number, number, number][], r = 0.014) => new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(p.map(q => new T.Vector3(...q))), 12, r, 5), mLinea);
      for (const s of [1, -1]) {
        torso.add(tubo([[s * 0.7, 1.2, 0.57], [s * 0.4, 0.86, 0.585], [s * 0.1, 0.74, 0.585]]));
        torso.add(tubo([[s * 0.6, 0.55, 0.57], [s * 0.3, 0.2, 0.585], [s * 0.04, -0.2, 0.585]]));
        torso.add(tubo([[s * 0.32, -0.5, 0.41], [s * 0.14, -0.75, 0.42], [0, -0.94, 0.42]]));
      }

      // ── Cabeza ──
      const cabeza = new T.Group(); cabeza.position.set(0, 1.62, 0.12); cuerpo.add(cabeza);
      for (const s of [1, -1]) {
        const cuerno = en(placa(CUERNO, 0.12, 1.06), 0, 0, -0.16);
        cabeza.add(s > 0 ? cuerno : espejo(cuerno));
        const ojo = en(plana(OJO, mOjo), 0, 0, 0.465);
        cabeza.add(s > 0 ? ojo : espejo(ojo));
      }
      cabeza.add(placa(YELMO, 0.4, 1.07));
      cabeza.add(en(placa(CRESTA, 0.14, 1.12), 0, 0, 0.36));
      cabeza.add(tubo([[0, 1.2, 0.56], [0, 0.6, 0.57], [0, 0.4, 0.57]], 0.012));
      // cuello: dos púas que suben junto al yelmo
      for (const s of [1, -1]) {
        const pua = placa([[0, 0], [0.24, 0.1], [0.3, 0.62], [0.08, 0.3]], 0.14);
        pua.position.set(s * 0.3, 1.3, -0.02); if (s < 0) pua.scale.x = -1;
        torso.add(pua);
      }

      // ── Hombreras y brazos, con su esqueleto ──
      type Brazo = { hombro: InstanceType<typeof T.Group>; codo: InstanceType<typeof T.Group>; lado: number };
      const brazos: Brazo[] = [];
      for (const lado of [1, -1]) {
        const lateral = new T.Group(); if (lado < 0) lateral.scale.x = -1; cuerpo.add(lateral);
        lateral.add(en(placa(HOMBRERA, 0.2), 0.5, 1.02, -0.14, 0.16, 1));
        const hombro = new T.Group(); hombro.position.set(0.98, 1.0, 0.1); lateral.add(hombro);
        hombro.add(en(placa(HOMBRERA, 0.22), -0.3, -0.12, 0.16, 0.05, 0.68));
        hombro.add(en(placa(BRAZO, 0.34), 0, 0, 0));
        const codo = new T.Group(); codo.position.set(0.02, -0.8, 0); hombro.add(codo);
        codo.add(placa(GUANTELETE, 0.38));
        codo.add(tubo([[-0.1, -0.1, 0.44], [0.08, -0.45, 0.45], [-0.02, -0.8, 0.45]]));
        const mano = new T.Group(); mano.position.set(0.05, -0.9, 0.04); codo.add(mano);
        for (let d = 0; d < 4; d++) {
          const garra = new T.Mesh(new T.ConeGeometry(0.06, 0.42, 5), mArmadura);
          garra.position.set(-0.15 + d * 0.1, -0.16, 0.05 * Math.sin(d * 1.3)); garra.rotation.z = Math.PI + (d - 1.5) * 0.16; garra.rotation.x = -0.35;
          const punta = new T.Mesh(new T.ConeGeometry(0.03, 0.16, 4), mLinea); punta.position.y = 0.22; garra.add(punta);
          mano.add(garra);
        }
        brazos.push({ hombro, codo, lado });
      }

      // ── Fuego a sus pies ──
      const fuegos: { m: InstanceType<typeof T.Mesh>; fase: number; base: number }[] = [];
      for (let i = 0; i < 11; i++) {
        const m = new T.Mesh(geoLlama, mFuego), base = 0.34 + ((i * 5) % 4) * 0.1;
        m.position.set(-1.7 + i * 0.34, -2.3, 0.5 + (i % 2) * 0.2); m.scale.setScalar(base);
        raiz.add(m); fuegos.push({ m, fase: i * 2.3, base });
      }

      // ── Brasas, rayas de energía y anillo de la descarga ──
      const N = ligero ? 40 : 90;
      const posBrasas = new Float32Array(N * 3), velBrasas = new Float32Array(N);
      for (let i = 0; i < N; i++) { posBrasas[i * 3] = (Math.random() - 0.5) * 4.4; posBrasas[i * 3 + 1] = -2.2 + Math.random() * 5; posBrasas[i * 3 + 2] = (Math.random() - 0.5) * 1.6; velBrasas[i] = 0.3 + Math.random() * 0.9; }
      const geoBrasas = new T.BufferGeometry(); geoBrasas.setAttribute("position", new T.BufferAttribute(posBrasas, 3));
      const brasas = new T.Points(geoBrasas, new T.PointsMaterial({ color: 0xffb070, size: 0.055, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
      raiz.add(brasas);
      const mRaya = new T.MeshBasicMaterial({ color: ROSA_CLARO, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      const rayas: InstanceType<typeof T.Mesh>[] = [];
      for (let i = 0; i < 16; i++) {
        const m = new T.Mesh(new T.PlaneGeometry(0.022, 0.9 + (i % 4) * 0.35), mRaya);
        m.position.set(-2 + i * 0.27 + (i % 2) * 0.08, 0, i % 3 === 0 ? 0.7 : -0.5); m.userData.v = 2.2 + (i % 5) * 0.7; m.userData.o = i * 0.61;
        raiz.add(m); rayas.push(m);
      }
      const mAnillo = new T.MeshBasicMaterial({ color: ROSA_CLARO, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      const anillo = new T.Mesh(new T.TorusGeometry(1, 0.035, 6, 56), mAnillo); anillo.position.set(0, 0.5, 0.4); raiz.add(anillo);

      // ── Tamaño ──
      const b2d = brillo.current?.getContext("2d") ?? null;
      const medir = () => {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, ligero ? 1 : 1.75));
        renderer.setSize(r.width, r.height, false);
        camara.aspect = r.width / r.height;
        // En formato alto se aleja para que quepan los cuernos y las hombreras
        camara.position.z = camara.aspect < 0.9 ? 11.2 / Math.max(0.55, camara.aspect) * 0.92 : 11.2;
        camara.updateProjectionMatrix();
        if (brillo.current) { brillo.current.width = Math.round(r.width / 3); brillo.current.height = Math.round(r.height / 3); }
      };
      medir();
      const ro = new ResizeObserver(medir); ro.observe(canvas);

      const mira = { x: 0, y: 0, mx: 0, my: 0 };
      const mover = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse") return;
        const r = canvas.getBoundingClientRect();
        mira.mx = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - 0.5) * 1.4));
        mira.my = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height - 0.5) * 1.4));
      };
      window.addEventListener("pointermove", mover, { passive: true });

      const rosa = new T.Color(ROSA), claro = new T.Color(0xffe3ec), tmp = new T.Color();
      const t0 = performance.now();
      let raf = 0, visible = true, antes = t0;
      const cuadro = (ahora: number) => {
        raf = requestAnimationFrame(cuadro);
        const t = quieto ? 2.2 : (ahora - t0) / 1000, dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
        const tc = t % CICLO;
        let carga = 0, estallido = 0;
        if (!quieto) {
          if (tc > CARGA_DESDE && tc < DESCARGA) carga = suave(CARGA_DESDE, DESCARGA, tc);
          else if (tc >= DESCARGA) { const k = (tc - DESCARGA) / (CICLO - DESCARGA); estallido = Math.min(1, k * 1.2); carga = Math.max(0, 1 - k * 3.5); }
        }
        const suelta = estallido > 0 ? Math.sin(Math.min(1, estallido * 1.6) * Math.PI) : 0;
        mira.x += (mira.mx - mira.x) * 0.06; mira.y += (mira.my - mira.y) * 0.06;

        // Cuerpo: respira, gira, se encoge al cargar y tiembla
        raiz.rotation.y = 0.2 * Math.sin(t * 0.42) + mira.x * 0.4;
        raiz.rotation.x = mira.y * 0.12 + carga * 0.07;
        raiz.position.set((Math.random() - 0.5) * 0.03 * carga, -0.1 - carga * 0.1 + suelta * 0.08 + (Math.random() - 0.5) * 0.03 * carga, 0);
        torso.scale.y = 1 + 0.016 * Math.sin(t * 1.7) + 0.03 * suelta;
        cabeza.rotation.z = 0.035 * Math.sin(t * 0.8);
        cabeza.rotation.y = mira.x * 0.25 + 0.08 * Math.sin(t * 0.6);
        cabeza.rotation.x = carga * 0.22 - suelta * 0.3;

        // Brazos: zarpazos alternos; al cargar se recogen y al soltar se abren
        for (const b of brazos) {
          const fase = ((t / ATAQUE) + (b.lado > 0 ? 0 : 0.5)) % 1;
          const g = golpe(fase) * (1 - Math.min(1, carga * 1.6)) * (estallido > 0 ? 0 : 1);
          const alza = Math.max(g, 0) / 0.6, pega = Math.max(-g, 0);
          const ocio = 0.05 * Math.sin(t * 1.3 + b.lado);
          b.hombro.rotation.z = 0.28 + ocio + alza * 1.45 + pega * 0.35 - carga * 0.16 + suelta * 1.05;
          b.hombro.rotation.x = -0.12 + alza * 0.55 - pega * 1.55 - carga * 0.5 + suelta * 0.3;
          b.codo.rotation.x = -0.45 - alza * 0.7 + pega * 0.35 - carga * 1.1 + suelta * 0.5;
          b.hombro.scale.setScalar(1 + pega * 0.16);
        }

        // Aura
        for (const l of llamas) {
          const k = 1 + 0.18 * Math.sin(t * 3.1 + l.fase) + carga * 0.75 + suelta * 0.5;
          l.m.scale.set(l.base * (1 + 0.08 * Math.sin(t * 2.3 + l.fase)), l.base * k, 1);
        }
        for (const f of fuegos) f.m.scale.set(f.base, f.base * (1 + 0.3 * Math.sin(t * 5 + f.fase) + carga * 0.5), 1);
        mLlama.opacity = 0.26 + carga * 0.3 + suelta * 0.2; mLlama2.opacity = 0.1 + carga * 0.25 + suelta * 0.2;
        tmp.copy(rosa).lerp(claro, Math.min(1, carga * 0.75 + suelta));
        mLinea.color.copy(tmp); mBorde.color.copy(rosa).lerp(claro, Math.min(1, carga * 0.45 + suelta * 0.8));
        izq.intensity = der.intensity = 14 + carga * 40 + suelta * 70;
        for (let i = 0; i < N; i++) {
          posBrasas[i * 3 + 1] += velBrasas[i] * dt * (1 + carga * 3);
          if (posBrasas[i * 3 + 1] > 3) posBrasas[i * 3 + 1] = -2.3;
        }
        geoBrasas.attributes.position.needsUpdate = true;
        mRaya.opacity = carga * 0.85;
        for (const r of rayas) r.position.y = -2.4 + ((t * r.userData.v + r.userData.o) % 1) * 5.4;
        anillo.scale.setScalar(0.3 + estallido * 4.2); mAnillo.opacity = estallido > 0 ? (1 - estallido) * 0.95 : 0;

        renderer.render(escena, camara);
        // Resplandor: una copia pequeña y difuminada del mismo cuadro, encima
        if (b2d && brillo.current && !ligero) {
          b2d.clearRect(0, 0, brillo.current.width, brillo.current.height);
          b2d.drawImage(canvas, 0, 0, brillo.current.width, brillo.current.height);
        }
      };
      const arrancar = () => { if (!raf && visible && !document.hidden) { antes = performance.now(); raf = requestAnimationFrame(cuadro); } };
      const parar = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) arrancar(); else parar(); });
      io.observe(canvas);
      const vis = () => { if (document.hidden) parar(); else arrancar(); };
      document.addEventListener("visibilitychange", vis);
      arrancar(); setListo(true);

      limpiar = () => {
        parar(); io.disconnect(); ro.disconnect();
        document.removeEventListener("visibilitychange", vis); window.removeEventListener("pointermove", mover);
        escena.traverse(o => { const m = o as InstanceType<typeof T.Mesh>; m.geometry?.dispose?.(); });
        renderer.dispose();
      };
    }).catch(() => { fallar.current?.(); });

    return () => { vivo = false; limpiar(); };
  }, []);

  return (
    <div className={`jefe3d ${listo ? "jefe3d-on" : ""} ${className}`} aria-hidden="true">
      <canvas ref={lienzo} className="jefe3d-lienzo" />
      <canvas ref={brillo} className="jefe3d-brillo" />
    </div>
  );
}
