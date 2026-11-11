import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Minus, Plus, X } from "lucide-react";

/**
 * Encuadrar una foto antes de subirla: se arrastra para moverla y se acerca
 * con la barra (o con dos dedos / la rueda del ratón). Sale recortada al
 * tamaño justo: foto de perfil cuadrada (se ve redonda) o portada ancha.
 */
export default function RecortarImagen({
  archivo, forma, onListo, onCancelar,
}: {
  archivo: File;
  forma: "perfil" | "portada";
  onListo: (f: File) => Promise<void> | void;
  onCancelar: () => void;
}) {
  const proporcion = forma === "perfil" ? 1 : 3; // ancho / alto
  const salida = forma === "perfil" ? { w: 800, h: 800 } : { w: 1800, h: 600 };
  const [url] = useState(() => URL.createObjectURL(archivo));
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // desplazamiento en px del marco
  const [marco, setMarco] = useState({ w: 0, h: 0 });
  const [guardando, setGuardando] = useState(false);
  const marcoRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const pellizco = useRef<{ d: number; z: number } | null>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
  }, [url]);
  useEffect(() => {
    const el = marcoRef.current;
    if (!el) return;
    const medir = () => setMarco({ w: el.clientWidth, h: el.clientHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tamaño base: la imagen cubre todo el marco (como object-cover)
  const base = img && marco.w ? Math.max(marco.w / img.width, marco.h / img.height) : 1;
  const ancho = img ? img.width * base * zoom : 0;
  const alto = img ? img.height * base * zoom : 0;
  // Nunca deja huecos: el desplazamiento se limita a lo que sobra
  const limitar = (x: number, y: number, z = zoom) => {
    if (!img) return { x: 0, y: 0 };
    const w = img.width * base * z, h = img.height * base * z;
    const mx = Math.max(0, (w - marco.w) / 2), my = Math.max(0, (h - marco.h) / 2);
    return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) };
  };
  const cambiarZoom = (z: number) => {
    const nz = Math.min(4, Math.max(1, z));
    setZoom(nz);
    setPos(p => limitar(p.x, p.y, nz));
  };

  const abajo = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.current.size === 2) {
      const [a, b] = Array.from(dedos.current.values());
      pellizco.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
      arrastre.current = null;
    } else {
      arrastre.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    }
  };
  const mover = (e: React.PointerEvent) => {
    if (!dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pellizco.current && dedos.current.size === 2) {
      const [a, b] = Array.from(dedos.current.values());
      cambiarZoom(pellizco.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pellizco.current.d));
      return;
    }
    const a = arrastre.current;
    if (a) setPos(limitar(a.px + e.clientX - a.x, a.py + e.clientY - a.y));
  };
  const arriba = (e: React.PointerEvent) => {
    dedos.current.delete(e.pointerId);
    if (dedos.current.size < 2) pellizco.current = null;
    arrastre.current = null;
  };

  const guardar = async () => {
    if (!img || !marco.w) return;
    setGuardando(true);
    try {
      // Qué parte de la imagen original está dentro del marco
      const escala = base * zoom;
      const sx = (ancho / 2 - pos.x - marco.w / 2) / escala;
      const sy = (alto / 2 - pos.y - marco.h / 2) / escala;
      const sw = marco.w / escala, sh = marco.h / escala;
      const c = document.createElement("canvas");
      c.width = salida.w; c.height = salida.h;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, salida.w, salida.h);
      const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("No se pudo recortar"))), "image/jpeg", 0.88));
      const nombre = `${forma}-${Date.now()}.jpg`;
      await onListo(new File([blob], nombre, { type: "image/jpeg" }));
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[500] flex flex-col bg-black/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Encuadrar imagen">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onCancelar} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Cancelar"><X size={18} /></button>
        <p className="text-[15px] font-bold text-white">{forma === "perfil" ? "Encuadra tu foto" : "Encuadra tu portada"}</p>
        <span className="w-10" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div
          ref={marcoRef}
          className="relative w-full max-w-[720px] touch-none select-none overflow-hidden bg-[#111]"
          style={{ aspectRatio: String(proporcion), maxWidth: forma === "perfil" ? 360 : 720, cursor: "grab", borderRadius: forma === "perfil" ? "50%" : 14 }}
          onPointerDown={abajo}
          onPointerMove={mover}
          onPointerUp={arriba}
          onPointerCancel={arriba}
          onWheel={e => cambiarZoom(zoom - e.deltaY * 0.0015)}
        >
          {img ? (
            <img
              src={url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{ width: ancho, height: alto, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-white/60" /></div>
          )}
          {/* Guía de tercios */}
          <div className="pointer-events-none absolute inset-0 border border-white/30" style={{ borderRadius: "inherit" }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
        <p className="mb-3 text-center text-[13px] text-white/60">Arrastra para mover · acerca con la barra{forma === "portada" ? " · en PC se verá más ancha" : ""}</p>
        <div className="mb-5 flex items-center gap-3">
          <button onClick={() => cambiarZoom(zoom - 0.2)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Alejar"><Minus size={16} /></button>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e => cambiarZoom(parseFloat(e.target.value))} className="flex-1 accent-[#e5007d]" aria-label="Acercar" />
          <button onClick={() => cambiarZoom(zoom + 0.2)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white" aria-label="Acercar"><Plus size={16} /></button>
        </div>
        <button onClick={guardar} disabled={!img || guardando} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e5007d] py-4 text-[15px] font-bold text-white disabled:opacity-50">
          {guardando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
