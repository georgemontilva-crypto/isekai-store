import { useEffect, useRef, useState } from "react";
import { esGamaBaja } from "@/lib/gamaBaja";

/**
 * El jefe, vivo: toma su ilustración y la anima con un shader, como una
 * figura con volumen en vez de una imagen quieta.
 *
 *  - la figura no se mueve ni se deforma
 *  - carga aura de poder: las llamas del contorno crecen, suben rayas de
 *    energía, las partes rojas se encienden… y estalla en un anillo de luz
 *
 * La imagen se pide por el mismo dominio (media-proxy) para poder leerla
 * desde el lienzo. Sin WebGL, con «reducir movimiento» o si la imagen no se
 * puede leer, se muestra la imagen normal.
 */
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uT;
uniform float uEscala;     // relación imagen / lienzo
uniform float uTransp;     // 1 = la imagen tiene fondo transparente
uniform float uCarga;      // 0..1, aura acumulándose
uniform float uEstallido;  // 0..1, tras descargar
uniform vec2 uMira;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.1 + 1.7; a *= 0.5; }
  return v;
}
vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

// Un ataque: el brazo se alza despacio, descarga de golpe y vuelve
float golpe(float ph){
  float sube = smoothstep(0.0, 0.2, ph);
  float baja = smoothstep(0.2, 0.27, ph);
  float vuelve = smoothstep(0.3, 0.62, ph);
  return sube * 0.6 - baja * 1.6 + vuelve;
}

vec4 tomar(vec2 q){
  vec2 u = q + 0.5;
  float dentro = step(0.0, u.x) * step(u.x, 1.0) * step(0.0, u.y) * step(u.y, 1.0);
  vec4 c = texture2D(uTex, clamp(u, 0.0, 1.0));
  // Los bordes de la imagen se desvanecen: sin esto, el resplandor que la
  // ilustración trae pintado y los efectos dibujaban el rectángulo de la foto
  float orilla = smoothstep(0.0, 0.11, u.x) * smoothstep(0.0, 0.11, 1.0 - u.x) * smoothstep(0.0, 0.1, 1.0 - u.y) * smoothstep(0.0, 0.03, u.y);
  c.a = mix(1.0, c.a, uTransp) * dentro * orilla;
  return c;
}

void main(){
  vec2 c0 = gl_FragCoord.xy / uRes - 0.5;
  // El lienzo sobresale un poco del marco: deja sitio al aura y a los brazos
  vec2 q = c0 * 1.2;
  if (uEscala > 1.0) q.y *= uEscala; else q.x /= uEscala;
  vec2 q0 = q;

  // La figura queda quieta: solo se mueven los efectos (aura, energía y descarga)

  vec4 c = tomar(q);
  vec3 col = c.rgb;
  // Lo rojo de la figura es energía: late, y arde al cargar
  float rojez = clamp(c.r - max(c.g, c.b), 0.0, 1.0);
  col += c.rgb * rojez * (0.4 + 0.3 * sin(uT * 2.3) + uCarga * 1.8);
  col = mix(col, col * vec3(1.3, 0.92, 0.96), uCarga * 0.5);

  // Contorno: se mide cuánta figura hay cerca de este punto
  float cerca1 = 0.0, cerca2 = 0.0;
  for (int i = 0; i < 8; i++) {
    float an = float(i) * 0.7854;
    vec2 dir = vec2(cos(an), sin(an));
    cerca1 = max(cerca1, tomar(q + dir * 0.022).a);
    cerca2 += tomar(q + dir * (0.06 + 0.04 * uCarga)).a;
  }
  cerca2 /= 8.0;
  float fuera = 1.0 - c.a;
  float n = fbm(vec2(q0.x * 6.5, q0.y * 5.0 - uT * (1.5 + uCarga * 2.8)));
  float aura = (cerca1 * 0.4 + cerca2 * 1.05) * fuera * smoothstep(0.25, 0.75, n) * (0.5 + uCarga * 1.5) * uTransp;
  vec3 colAura = mix(vec3(0.95, 0.05, 0.22), vec3(1.0, 0.62, 0.38), clamp(n * uCarga * 1.4 + cerca1 * 0.25, 0.0, 1.0));

  // Rayas de energía que suben mientras carga
  float id = floor(q0.x * 36.0);
  float h = hash(vec2(id, 3.0));
  float tramo = fract(q0.y * 1.4 - uT * (1.4 + h * 2.2) + h * 7.0);
  float raya = smoothstep(0.14, 0.0, abs(fract(q0.x * 36.0) - 0.5)) * step(0.55, h) * smoothstep(0.0, 0.15, tramo) * smoothstep(0.5, 0.15, tramo);
  // Las rayas se reparten en un óvalo alrededor de la figura, no en su caja
  float ovalo = smoothstep(0.62, 0.2, length(q0 * vec2(1.0, 0.8)));
  float energia = raya * (cerca2 * 0.6 + c.a * 0.3 + 0.25) * ovalo * uCarga;

  // Descarga: anillo que se abre y destello sobre el cuerpo
  float e = uEstallido;
  float viva = step(0.001, e) * (1.0 - e);
  float anillo = exp(-pow((length(q0) - e * 0.72) * 13.0, 2.0)) * viva;

  vec3 rgb = col * c.a
    + colAura * aura
    + vec3(1.0, 0.4, 0.45) * energia
    + vec3(1.0, 0.82, 0.8) * anillo
    + vec3(1.0) * c.a * viva * 0.45;
  float alfa = clamp(c.a + aura + energia + anillo, 0.0, 1.0);
  // Y nada llega hasta el borde del lienzo
  float marco = smoothstep(0.5, 0.39, max(abs(c0.x), abs(c0.y)));
  gl_FragColor = vec4(min(rgb, vec3(1.0)), alfa) * marco;
}`;

/** La imagen, pedida por el mismo dominio para que el lienzo pueda leerla */
function rutaLegible(src: string) {
  if (/^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)) return `/api/media-proxy?u=${encodeURIComponent(src)}`;
  return src;
}

/** Ciclo del aura: reposo, carga y descarga */
const CICLO = 9.5, CARGA_DESDE = 4.2, DESCARGA = 8.2;

export default function JefeVivo({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [plano, setPlano] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    setPlano(false);
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducir) { setPlano(true); return; }
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) { setPlano(true); return; }

    let vivo = true, raf = 0, visible = true, listo = false;
    const mira = { x: 0, y: 0, mx: 0, my: 0 };

    const sh = (tipo: number, fuente: string) => {
      const s = gl.createShader(tipo)!;
      gl.shaderSource(s, fuente); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { setPlano(true); return; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setPlano(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uT = u("uT"), uEscala = u("uEscala"), uTransp = u("uTransp"), uCarga = u("uCarga"), uEstallido = u("uEstallido"), uMira = u("uMira");
    let aspecto = 1, transparente = 1;

    const medir = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const escala = Math.min(1, (esGamaBaja() ? 420 : 760) / Math.max(r.width, r.height, 1));
      canvas.width = Math.max(2, Math.round(r.width * dpr * escala));
      canvas.height = Math.max(2, Math.round(r.height * dpr * escala));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!vivo) return;
      try {
        // Se reduce a un tamaño cómodo y se mira si las esquinas son transparentes
        const lado = Math.min(1024, Math.max(img.naturalWidth, img.naturalHeight));
        const k = lado / Math.max(img.naturalWidth, img.naturalHeight);
        const tmp = document.createElement("canvas");
        tmp.width = Math.max(2, Math.round(img.naturalWidth * k)); tmp.height = Math.max(2, Math.round(img.naturalHeight * k));
        const c2 = tmp.getContext("2d")!;
        c2.drawImage(img, 0, 0, tmp.width, tmp.height);
        const esq = [[1, 1], [tmp.width - 2, 1], [1, tmp.height - 2], [tmp.width - 2, tmp.height - 2]];
        transparente = esq.filter(([x, y]) => c2.getImageData(x, y, 1, 1).data[3] < 40).length >= 3 ? 1 : 0;
        aspecto = tmp.width / tmp.height;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        listo = true; arrancar();
      } catch { setPlano(true); }
    };
    img.onerror = () => { if (vivo) setPlano(true); };
    img.src = rutaLegible(src);

    const t0 = performance.now();
    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      const t = (ahora - t0) / 1000, tc = t % CICLO;
      let carga = 0, estallido = 0;
      if (tc > CARGA_DESDE && tc < DESCARGA) { const k = (tc - CARGA_DESDE) / (DESCARGA - CARGA_DESDE); carga = k * k * (3 - 2 * k); }
      else if (tc >= DESCARGA) { const k = (tc - DESCARGA) / (CICLO - DESCARGA); estallido = Math.min(1, k * 1.25); carga = Math.max(0, 1 - k * 3); }
      mira.x += (mira.mx - mira.x) * 0.06; mira.y += (mira.my - mira.y) * 0.06;
      const r = canvas.width / canvas.height;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.uniform1f(uEscala, aspecto / r);
      gl.uniform1f(uTransp, transparente);
      gl.uniform1f(uCarga, carga);
      gl.uniform1f(uEstallido, estallido);
      gl.uniform2f(uMira, mira.x, mira.y);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const arrancar = () => { if (!raf && listo && visible && !document.hidden) raf = requestAnimationFrame(cuadro); };
    const parar = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) arrancar(); else parar(); });
    io.observe(canvas);
    const vis = () => { if (document.hidden) parar(); else arrancar(); };
    document.addEventListener("visibilitychange", vis);
    // Con el ratón, el jefe te sigue con la mirada (gira un poco hacia ti)
    const mover = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      const r = canvas.getBoundingClientRect();
      mira.mx = Math.max(-1, Math.min(1, ((ev.clientX - r.left) / r.width - 0.5) * 1.2));
      mira.my = Math.max(-1, Math.min(1, ((ev.clientY - r.top) / r.height - 0.5) * 1.2));
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      vivo = false; parar(); io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", vis); window.removeEventListener("pointermove", mover);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [src]);

  if (plano) return <img src={src} alt="" draggable={false} className={`h-full w-full object-contain ${className}`} />;
  return <canvas ref={ref} className={`jefe-vivo ${className}`} aria-hidden="true" />;
}
