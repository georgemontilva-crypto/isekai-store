import { useEffect, useRef, useState } from "react";
import { esGamaBaja } from "@/lib/gamaBaja";

/**
 * Gate: un portal de energía como los de las historias de cazadores — una
 * grieta vertical que es un túnel hacia un punto de luz, con brazos de
 * energía que giran hacia dentro, un filo fino y eléctrico, llamas que lamen
 * hacia fuera, rayos que saltan y los anillos de marcas del Sistema.
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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 3.1; a *= 0.5; }
  return v;
}
float fbm3(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.1 + 1.7; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) + uSacude;
  float z = 1.0 + uZoom * uZoom * uZoom * 14.0;
  uv /= z;
  // Grieta vertical: más alta que ancha
  vec2 e = uv * vec2(1.0, 0.64);
  float radio = 0.285 * max(uEscala, 0.001);
  float rr = length(e) / radio;
  float a = atan(e.y, e.x);
  // Dirección en vez de ángulo: así el ruido no deja costura
  vec2 dir = e / max(length(e), 1e-4);
  float t = uT * (0.55 + uGiro);

  // Borde vivo: el contorno ondula como una llama
  float borde = 1.0 + (fbm3(dir * 1.8 + vec2(t * 0.7, -t * 0.4)) - 0.5) * 0.11;
  float rn = rr / borde;
  float dentro = smoothstep(1.0, 0.94, rn);

  vec3 hondo = vec3(0.004, 0.008, 0.045);
  vec3 azul = vec3(0.08, 0.36, 1.0);
  vec3 cian = vec3(0.45, 0.92, 1.0);
  vec3 violeta = vec3(0.46, 0.22, 1.0);
  vec3 rosa = vec3(1.0, 0.24, 0.62);

  // ── Interior: un túnel que se traga la luz hacia un punto ──
  float lr = log(max(rn, 0.002));
  float giro = a + t * 0.6 - lr * 2.3;
  vec2 sp = vec2(cos(giro), sin(giro));
  float prof = lr * 1.5 + t * 0.85;
  float n1 = fbm(sp * 1.5 + vec2(prof, -prof * 0.6));
  float n2 = fbm3(sp * 3.4 + vec2(prof * 2.0, prof * 1.1));
  // Tres brazos nítidos, deformados por el ruido
  float brazos = pow(0.5 + 0.5 * sin(giro * 3.0 + n1 * 5.5), 3.0);
  float hilos = smoothstep(0.52, 0.8, n2);
  float fondo = smoothstep(0.0, 0.95, rn);           // el centro es abismo
  vec3 col = hondo;
  col += azul * brazos * (0.18 + 0.95 * fondo);
  col += violeta * n1 * 0.4 * fondo;
  col += cian * hilos * brazos * 1.1 * fondo;
  col += rosa * hilos * (1.0 - brazos) * 0.16 * fondo;
  // Motas de luz que caen hacia dentro
  vec2 g = vec2((a + 3.14159) / 6.28318 * 72.0, lr * 5.0 + t * 1.8);
  vec2 gi = floor(g); gi.x = mod(gi.x, 72.0);
  vec2 gf = fract(g) - 0.5;
  float mota = step(0.93, hash(gi)) * smoothstep(0.3, 0.0, length(gf * vec2(1.6, 0.5)));
  col += vec3(0.85, 0.97, 1.0) * mota * smoothstep(0.12, 0.55, rn) * 0.75;
  // El punto del fondo: pequeño, blanco, respira
  float pulso = 0.75 + 0.25 * sin(uT * 1.7);
  col += cian * exp(-rn * rn * 30.0) * 0.9 * pulso;
  col += vec3(1.0) * exp(-rn * rn * 180.0) * pulso;
  col *= dentro;

  // ── Filo: una línea fina y eléctrica, no una banda gruesa ──
  float d = rn - 1.0;
  float chispa = 0.55 + 0.9 * fbm3(dir * 5.0 + vec2(uT * 3.0, uT * 1.7));
  float filo = exp(-d * d * 900.0);
  float resplandor = exp(-abs(d) * 9.0);
  vec3 tinte = mix(azul, mix(violeta, rosa, 0.55), 0.5 + 0.5 * sin(a * 1.0 + uT * 0.35));
  col += mix(cian, vec3(1.0), 0.7) * filo * 1.5 * chispa;
  col += tinte * resplandor * 0.55 * chispa;

  // Llamas de energía que lamen hacia fuera
  float fuera = max(d, 0.0);
  float lf = fbm3(dir * 3.6 + vec2(fuera * 3.2 - uT * 1.3, uT * 0.5));
  float llama = smoothstep(fuera * 2.7 + 0.18, fuera * 2.7 + 0.5, lf) * step(0.0, d);
  col += mix(azul, cian, llama) * llama * 0.85;
  col += tinte * exp(-fuera * 3.4) * (1.0 - dentro) * 0.28;

  // Rayos finos, que saltan y se apagan
  float arco = fbm3(dir * 4.2 + vec2(rn * 3.2 - uT * 2.4, uT * 0.8));
  float salto = step(0.5, noise(vec2(uT * 6.0, floor((a + 3.14159) * 1.3) * 7.3)));
  float rayos = smoothstep(0.022, 0.0, abs(arco - 0.5)) * smoothstep(1.75, 1.05, rn) * step(0.0, d) * salto;
  col += vec3(0.8, 0.96, 1.0) * rayos * 1.3;

  // Anillos del Sistema: marcas que giran alrededor del gate detectado
  float marcas = step(0.5, fract((a + uT * 0.16) / 6.28318 * 56.0));
  float tramos = step(0.22, fract((a - uT * 0.1) / 6.28318 * 10.0));
  col += cian * exp(-pow((rr - 1.36) * 70.0, 2.0)) * marcas * 0.5;
  col += mix(cian, rosa, 0.35) * exp(-pow((rr - 1.47) * 110.0, 2.0)) * tramos * 0.42;

  // Sin quemar: los brillos se comprimen en vez de irse a blanco plano
  col = 1.0 - exp(-col * 1.5);

  // Al entrar: todo termina en luz
  col = mix(col, vec3(0.92, 0.97, 1.0), smoothstep(0.78, 1.0, uZoom));

  float alfa = clamp(max(col.r, max(col.g, col.b)) * 1.2 + dentro, 0.0, 1.0);

  // Sin «cuadro»: el halo y los rayos se apagan antes de llegar a los bordes
  // del lienzo. Al entrar, el desvanecido se abre hasta llenar la pantalla.
  vec2 s = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  float esquina = length(s * vec2(1.0, 0.92));
  float suave = smoothstep(1.0, 0.7, esquina) * smoothstep(1.0, 0.9, max(abs(s.x), abs(s.y)));
  suave = mix(suave, 1.0, smoothstep(0.25, 0.75, uZoom));
  gl_FragColor = vec4(col * suave, alfa * suave);
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
