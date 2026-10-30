import { useEffect, useRef, useState } from "react";
import { esGamaBaja } from "@/lib/gamaBaja";

/**
 * Gate: un portal de energía como los de las historias de cazadores — un
 * óvalo vertical de energía azul que gira como un remolino líquido, con borde
 * brillante, descargas eléctricas alrededor y un halo que respira.
 *
 * Se dibuja con WebGL (un solo shader, sin librerías), así se mueve fluido.
 *
 * - `modo="quieto"`: se abre al aparecer y queda girando.
 * - `modo="entrar"`: la cámara se mete en el portal, el giro se acelera y
 *   todo termina en luz blanca (dura `ENTRAR_MS`).
 * - `modo="salir"`: el portal gira rápido y se cierra hasta desaparecer.
 *
 * Sin WebGL, o con «reducir movimiento», se muestra una imagen quieta.
 */
export const ENTRAR_MS = 2600;
export const SALIR_MS = 1900;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uT;
uniform float uZoom;
uniform float uEscala;
uniform float uGiro;
uniform vec2 uSacude;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 3.1; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) + uSacude;
  float z = 1.0 + uZoom * uZoom * uZoom * 14.0;
  uv /= z;
  // Óvalo vertical
  vec2 e = uv * vec2(1.0, 0.7);
  float radio = 0.34 * max(uEscala, 0.001);
  float r = length(e) / radio;
  float a = atan(e.y, e.x);

  // Remolino: el ángulo gira más cerca del centro
  float t = uT * (0.55 + uGiro);
  float ang = a + 2.6 / (r + 0.35) + t;
  vec2 q = vec2(cos(ang), sin(ang)) * pow(r, 0.8);
  float n = fbm(q * 2.4 + vec2(t * 0.25, -t * 0.18));
  float n2 = fbm(q * 4.6 - vec2(t * 0.4, t * 0.3));
  float bandas = sin((ang * 3.0 + r * 9.0 - t * 2.0) + n * 4.0) * 0.5 + 0.5;

  // Borde ondulado del óvalo
  float borde = 1.0 + (fbm(vec2(a * 2.2, t * 0.9)) - 0.5) * 0.09;
  float dentro = smoothstep(borde + 0.02, borde - 0.05, r);

  vec3 hondo = vec3(0.005, 0.02, 0.09);
  vec3 azul = vec3(0.10, 0.42, 1.0);
  vec3 cian = vec3(0.55, 0.92, 1.0);
  vec3 violeta = vec3(0.42, 0.28, 1.0);

  float remolino = smoothstep(0.38, 0.9, n * 0.75 + bandas * 0.35);
  vec3 col = mix(hondo, mix(azul, violeta, smoothstep(0.35, 0.75, n2)), remolino);
  col += cian * pow(remolino, 3.0) * 0.9;
  // Centro: una luz que respira
  col += azul * 0.9 * smoothstep(0.75, 0.0, r) * (0.65 + 0.35 * sin(uT * 1.7));
  col += vec3(0.8, 0.95, 1.0) * 0.35 * smoothstep(0.35, 0.0, r);
  col *= dentro;

  // Borde brillante
  float filo = exp(-pow((r - borde) * 13.0, 2.0));
  float chispa = 0.75 + 0.5 * fbm(vec2(a * 6.0, uT * 2.5));
  col += mix(cian, vec3(1.0), 0.55) * filo * 1.7 * chispa;

  // Halo exterior
  float fuera = max(r - borde, 0.0);
  float halo = exp(-fuera * 3.2) * (1.0 - dentro);
  col += azul * halo * 0.6 + violeta * halo * 0.25 * n;

  // Descargas eléctricas alrededor
  float arco = fbm(vec2(a * 9.0 + uT * 0.6, r * 5.0 - uT * 3.2));
  float rayos = smoothstep(0.69, 0.74, arco) * smoothstep(1.85, 1.05, r) * step(borde, r);
  col += mix(cian, vec3(1.0), 0.4) * rayos * 1.5;

  // Al entrar: todo termina en luz
  col = mix(col, vec3(0.92, 0.97, 1.0), smoothstep(0.78, 1.0, uZoom));

  float alfa = clamp(max(col.r, max(col.g, col.b)) * 1.15 + dentro, 0.0, 1.0);
  gl_FragColor = vec4(col, alfa);
}`;

type Modo = "quieto" | "entrar" | "salir";

const facil = (x: number) => x * x * (3 - 2 * x);

export default function GatePortal({ modo = "quieto", className = "" }: { modo?: Modo; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [sinGl, setSinGl] = useState(false);
  const modoRef = useRef<Modo>(modo);
  const inicioModo = useRef(0);

  useEffect(() => { modoRef.current = modo; inicioModo.current = performance.now(); }, [modo]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl || reducir) { setSinGl(true); return; }

    const sh = (tipo: number, src: string) => {
      const s = gl.createShader(tipo)!;
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { setSinGl(true); return; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setSinGl(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uT = u("uT"), uZoom = u("uZoom"), uEscala = u("uEscala"), uGiro = u("uGiro"), uSacude = u("uSacude");

    // Resolución contenida: se ve igual de bien y no calienta el teléfono
    const medir = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const escala = Math.min(1, (esGamaBaja() ? 520 : 900) / Math.max(r.width, r.height, 1));
      canvas.width = Math.max(2, Math.round(r.width * dpr * escala));
      canvas.height = Math.max(2, Math.round(r.height * dpr * escala));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);

    const t0 = performance.now();
    inicioModo.current = t0;
    let raf = 0;
    let visible = true;
    const cuadro = (ahora: number) => {
      const t = (ahora - t0) / 1000;
      const dm = ahora - inicioModo.current;
      let zoom = 0, escala = 1, giro = 0, sx = 0, sy = 0;
      if (modoRef.current === "quieto") {
        escala = facil(Math.min(1, t / 1.4)); // se abre al aparecer
      } else if (modoRef.current === "entrar") {
        const p = Math.min(1, dm / ENTRAR_MS);
        zoom = p;
        giro = p * p * 5;
        const temblor = 0.006 * Math.sin(p * Math.PI) * (0.5 + p);
        sx = (Math.random() - 0.5) * temblor; sy = (Math.random() - 0.5) * temblor;
      } else {
        const p = Math.min(1, dm / SALIR_MS);
        giro = 2 + p * 6;
        escala = 1 - facil(p);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform1f(uZoom, zoom);
      gl.uniform1f(uEscala, escala);
      gl.uniform1f(uGiro, giro);
      gl.uniform2f(uSacude, sx, sy);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(cuadro);
    };
    const arrancar = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(cuadro); };
    const parar = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    arrancar();
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) arrancar(); else parar(); });
    io.observe(canvas);
    const vis = () => { if (document.hidden) parar(); else arrancar(); };
    document.addEventListener("visibilitychange", vis);
    return () => {
      parar(); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  if (sinGl) return <div className={`pk-gate-quieto ${className}`} aria-hidden="true" />;
  return <canvas ref={ref} className={`pk-gate ${className}`} aria-hidden="true" />;
}
