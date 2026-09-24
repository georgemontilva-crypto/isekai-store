import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Image as ImageIcon, Loader2, Mail, Monitor, Plus, RotateCcw, Send, Smartphone, Trash2, Users, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import MediaPickerModal from "./MediaPickerModal";
import { COLORES, Estado, EstadoVacio, confirmar, fechaRelativa } from "./ui";

/**
 * Campañas de correo: editor con vista previa en vivo, envío de prueba,
 * elección de audiencia e historial. Todo el trabajo pesado y la seguridad
 * (escapado, https, baja firmada, envío sin duplicados) viven en el servidor.
 */

type Segmento = "todos" | "usuarios" | "worldfest" | "newsletter" | "cosplayers" | "compradores";
const SEGMENTOS: { id: Segmento; texto: string; ayuda: string }[] = [
  { id: "todos", texto: "Todos", ayuda: "Usuarios registrados y suscriptores, sin repetir" },
  { id: "usuarios", texto: "Usuarios registrados", ayuda: "Quienes tienen cuenta en la tienda" },
  { id: "worldfest", texto: "Lista del World Fest", ayuda: "Quienes aceptaron la misión" },
  { id: "newsletter", texto: "Newsletter", ayuda: "Suscriptores de novedades de la tienda" },
  { id: "cosplayers", texto: "Cosplayers", ayuda: "Miembros activos del Cosplay Guild" },
  { id: "compradores", texto: "Clientes que compraron", ayuda: "Con al menos un pago aprobado" },
];

const ESTADOS: Record<string, { texto: string; color: string }> = {
  borrador: { texto: "Borrador", color: COLORES.gris },
  enviando: { texto: "Enviando", color: COLORES.azul },
  enviada: { texto: "Enviada", color: COLORES.verde },
  interrumpida: { texto: "Pausada", color: COLORES.ambar },
};

type Borrador = {
  id?: number; asunto: string; preheader: string; titulo: string; cuerpo: string;
  imagenUrl: string; botonTexto: string; botonUrl: string; segmento: Segmento;
};
const VACIO: Borrador = { asunto: "", preheader: "", titulo: "", cuerpo: "", imagenUrl: "", botonTexto: "", botonUrl: "https://isekaiworld.co", segmento: "todos" };

const campo = "w-full border border-[var(--iw-border)] bg-[var(--iw-input-bg)] px-3 py-2.5 text-sm text-[var(--iw-text)] outline-none focus:border-[#e5007d]";
const etiqueta = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--iw-text-muted)]";

/** Contadores de audiencia (también se muestran en Usuarios) */
export function ContadoresAudiencia() {
  const { data } = trpc.campanas.estadisticas.useQuery(undefined, { staleTime: 60_000 });
  const tarjetas = [
    { t: "Usuarios registrados", v: data?.usuarios, icono: Users, color: "#fff" },
    { t: "Nuevos este mes", v: data?.nuevosMes, icono: Plus, color: COLORES.verde },
    { t: "Audiencia total", v: data?.porSegmento?.todos, icono: Mail, color: "#ff3d9e", ayuda: "Personas únicas a las que puedes escribir" },
    { t: "Se dieron de baja", v: data?.bajas, icono: UserX, color: COLORES.gris },
  ];
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tarjetas.map(k => (
        <div key={k.t} className="ev-notch border border-white/[0.08] bg-[#0c0b10] p-3.5" title={k.ayuda}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8a8494]">{k.t}</span>
            <k.icono size={14} style={{ color: k.color }} />
          </div>
          <p className="text-2xl font-black tabular-nums" style={{ color: k.color }}>{k.v === undefined ? "…" : Number(k.v).toLocaleString("es-VE")}</p>
        </div>
      ))}
    </div>
  );
}

function Editor({ inicial, onCerrar }: { inicial: Borrador; onCerrar: () => void }) {
  const utils = trpc.useUtils();
  const [b, setB] = useState<Borrador>(inicial);
  const [picker, setPicker] = useState(false);
  const [vista, setVista] = useState<"movil" | "pc">("movil");
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB(x => ({ ...x, [k]: v }));
  const { data: est } = trpc.campanas.estadisticas.useQuery(undefined, { staleTime: 60_000 });

  // Vista previa en vivo, con una pequeña espera para no pedirla en cada tecla
  const [previa, setPrevia] = useState(b);
  useEffect(() => { const t = setTimeout(() => setPrevia(b), 450); return () => clearTimeout(t); }, [b]);
  const listoParaVista = previa.asunto.trim().length >= 3 && previa.titulo.trim().length >= 2 && previa.cuerpo.trim().length >= 2;
  const { data: html, isFetching } = trpc.campanas.vistaPrevia.useQuery(
    { ...previa, imagenUrl: previa.imagenUrl || null, botonUrl: previa.botonUrl || null },
    { enabled: listoParaVista, placeholderData: p => p, retry: false },
  );

  const errores = useMemo(() => {
    const e: string[] = [];
    if (b.asunto.trim().length < 3) e.push("El asunto necesita al menos 3 caracteres");
    if (b.titulo.trim().length < 2) e.push("Falta el título");
    if (b.cuerpo.trim().length < 2) e.push("Falta el mensaje");
    if (b.botonTexto && !/^https:\/\//i.test(b.botonUrl)) e.push("El enlace del botón debe empezar por https://");
    if (b.imagenUrl && !/^https:\/\//i.test(b.imagenUrl)) e.push("La imagen debe venir de un enlace https://");
    return e;
  }, [b]);

  const guardar = trpc.campanas.guardar.useMutation();
  const prueba = trpc.campanas.enviarPrueba.useMutation({
    onSuccess: () => toast.success("Prueba enviada a tu correo"),
    onError: e => toast.error(e.message),
  });
  const enviar = trpc.campanas.enviar.useMutation();

  const payload = () => ({
    ...(b.id ? { id: b.id } : {}),
    asunto: b.asunto, preheader: b.preheader || null, titulo: b.titulo, cuerpo: b.cuerpo,
    imagenUrl: b.imagenUrl || null, botonTexto: b.botonTexto || null, botonUrl: b.botonTexto ? b.botonUrl : null,
    segmento: b.segmento,
  });

  const guardarBorrador = async () => {
    try {
      const r = await guardar.mutateAsync(payload());
      set("id", r.id);
      await utils.campanas.listar.invalidate();
      toast.success("Borrador guardado");
      return r.id;
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
      return null;
    }
  };

  const enviarAhora = async () => {
    const cuantos = est?.porSegmento?.[b.segmento] ?? 0;
    const seg = SEGMENTOS.find(s => s.id === b.segmento)!;
    const ok = await confirmar({
      titulo: `Enviar a ${cuantos.toLocaleString("es-VE")} ${cuantos === 1 ? "persona" : "personas"}`,
      mensaje: `«${b.asunto}» se enviará a: ${seg.texto}. Una vez enviada no se puede deshacer ni editar.`,
      confirmar: "Enviar campaña",
      peligro: true,
    });
    if (!ok) return;
    const id = await guardarBorrador();
    if (!id) return;
    const r = await enviar.mutateAsync({ id });
    if (!r.ok) { toast.error(r.motivo ?? "No se pudo iniciar el envío"); return; }
    toast.success(`Enviando a ${r.total} personas…`);
    await utils.campanas.listar.invalidate();
    onCerrar();
  };

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onCerrar} className="flex w-fit items-center gap-1.5 text-xs font-bold text-[var(--iw-text-muted)] hover:text-[var(--iw-text)]">
        <ArrowLeft size={14} /> Volver a campañas
      </button>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        {/* ── Formulario ── */}
        <div className="flex flex-col gap-4">
          <div>
            <label className={etiqueta}>Asunto</label>
            <input className={campo} maxLength={150} value={b.asunto} onChange={e => set("asunto", e.target.value)} placeholder="Ej: ¡La preventa del Fest ya abrió!" />
          </div>
          <div>
            <label className={etiqueta}>Texto de vista previa <span className="normal-case tracking-normal">(opcional)</span></label>
            <input className={campo} maxLength={150} value={b.preheader} onChange={e => set("preheader", e.target.value)} placeholder="Lo que se lee junto al asunto en la bandeja de entrada" />
          </div>

          <div>
            <label className={etiqueta}>Imagen <span className="normal-case tracking-normal">(tu diseño, ancho recomendado 1200 px)</span></label>
            {b.imagenUrl ? (
              <div className="relative border border-[var(--iw-border)]">
                <img src={b.imagenUrl} alt="" className="max-h-64 w-full object-contain bg-black/40" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <button onClick={() => setPicker(true)} className="bg-black/70 px-2.5 py-1.5 text-[11px] font-bold text-white">Cambiar</button>
                  <button onClick={() => set("imagenUrl", "")} className="bg-black/70 p-1.5 text-white" aria-label="Quitar imagen"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => setPicker(true)} className="ev-notch flex w-full flex-col items-center justify-center gap-2 border border-dashed border-[#e5007d]/50 py-8 text-sm font-bold text-[#ff3d9e] hover:bg-[#e5007d]/5">
                <ImageIcon size={22} /> Subir o elegir imagen
              </button>
            )}
          </div>

          <div>
            <label className={etiqueta}>Título</label>
            <input className={campo} maxLength={120} value={b.titulo} onChange={e => set("titulo", e.target.value)} placeholder="Ej: El Sistema ha despertado" />
          </div>
          <div>
            <label className={etiqueta}>Mensaje</label>
            <textarea className={`${campo} min-h-[150px] resize-y leading-relaxed`} maxLength={5000} value={b.cuerpo}
              onChange={e => set("cuerpo", e.target.value)} placeholder={"Escribe el mensaje.\n\nDeja una línea en blanco para separar párrafos."} />
            <p className="mt-1 text-right text-[10px] text-[var(--iw-text-muted)]">{b.cuerpo.length}/5000</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <label className={etiqueta}>Botón <span className="normal-case tracking-normal">(opcional)</span></label>
              <input className={campo} maxLength={40} value={b.botonTexto} onChange={e => set("botonTexto", e.target.value)} placeholder="Ej: Comprar entradas" />
            </div>
            <div>
              <label className={etiqueta}>Enlace del botón</label>
              <input className={campo} maxLength={500} value={b.botonUrl} onChange={e => set("botonUrl", e.target.value)} placeholder="https://isekaiworld.co/…" inputMode="url" />
            </div>
          </div>

          <div>
            <label className={etiqueta}>¿A quién se envía?</label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {SEGMENTOS.map(s => {
                const n = est?.porSegmento?.[s.id];
                const activo = b.segmento === s.id;
                return (
                  <button key={s.id} onClick={() => set("segmento", s.id)}
                    className={`flex items-center justify-between gap-2 border px-3 py-2.5 text-left transition-colors ${activo ? "border-[#e5007d] bg-[#e5007d]/10" : "border-[var(--iw-border)] hover:border-white/25"}`}>
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold ${activo ? "text-white" : "text-[var(--iw-text)]"}`}>{s.texto}</span>
                      <span className="block truncate text-[11px] text-[var(--iw-text-muted)]">{s.ayuda}</span>
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums" style={{ color: activo ? "#ff3d9e" : "var(--iw-text-muted)" }}>{n === undefined ? "…" : n.toLocaleString("es-VE")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {errores.length > 0 && (
            <ul className="border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
              {errores.map(e => <li key={e}>• {e}</li>)}
            </ul>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={guardarBorrador} disabled={errores.length > 0 || guardar.isPending}
              className="ev-notch flex-1 border border-white/15 bg-[#141318] py-3 text-sm font-bold text-white disabled:opacity-40">
              {guardar.isPending ? "Guardando…" : "Guardar borrador"}
            </button>
            <button onClick={() => prueba.mutate(payload())} disabled={errores.length > 0 || prueba.isPending}
              className="ev-notch flex-1 border border-[#e5007d]/50 py-3 text-sm font-bold text-[#ff3d9e] disabled:opacity-40">
              {prueba.isPending ? "Enviando prueba…" : "Enviarme una prueba"}
            </button>
            <button onClick={enviarAhora} disabled={errores.length > 0 || enviar.isPending || !(est?.porSegmento?.[b.segmento])}
              className="ev-notch flex flex-1 items-center justify-center gap-2 bg-[#e5007d] py-3 text-sm font-bold text-white disabled:opacity-40">
              <Send size={15} /> Enviar ahora
            </button>
          </div>
        </div>

        {/* ── Vista previa ── */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <div className="mb-2 flex items-center justify-between">
            <span className={etiqueta + " !mb-0"}>Vista previa {isFetching && <Loader2 size={11} className="ml-1 inline animate-spin" />}</span>
            <div className="inline-flex border border-[var(--iw-border)]">
              {([["movil", Smartphone], ["pc", Monitor]] as const).map(([id, Icono]) => (
                <button key={id} onClick={() => setVista(id)} aria-label={id === "movil" ? "Vista teléfono" : "Vista computador"}
                  className={`p-2 ${vista === id ? "bg-[#e5007d] text-white" : "text-[var(--iw-text-muted)]"}`}><Icono size={14} /></button>
              ))}
            </div>
          </div>
          <div className="border border-[var(--iw-border)] bg-[#06040d] p-2">
            <p className="mb-2 truncate px-1 text-xs text-[var(--iw-text-muted)]"><strong className="text-white">{b.asunto || "Asunto"}</strong> · {b.preheader || b.titulo}</p>
            {listoParaVista && html ? (
              <div className="flex justify-center overflow-hidden">
                {/* Marco aislado: el correo no puede ejecutar nada en el panel */}
                <iframe
                  title="Vista previa del correo"
                  sandbox=""
                  srcDoc={html}
                  className="h-[640px] border-0 bg-[#06040d]"
                  style={{ width: vista === "movil" ? 375 : "100%" }}
                />
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center px-6 text-center text-xs text-[var(--iw-text-muted)]">
                Escribe el asunto, el título y el mensaje para ver cómo queda.
              </div>
            )}
          </div>
        </div>
      </div>

      {picker && <MediaPickerModal onPick={item => { set("imagenUrl", item.url); setPicker(false); }} onClose={() => setPicker(false)} />}
    </div>
  );
}

export default function CampanasSection() {
  const utils = trpc.useUtils();
  const [editando, setEditando] = useState<Borrador | null>(null);
  const { data: lista = [], isError } = trpc.campanas.listar.useQuery(undefined, {
    // Mientras algo se envía, se actualiza el progreso cada 3 segundos
    refetchInterval: q => ((q.state.data as any[]) ?? []).some((c: any) => c.estado === "enviando") ? 3000 : false,
  });
  const borrar = trpc.campanas.borrar.useMutation({ onSuccess: () => utils.campanas.listar.invalidate() });
  const enviar = trpc.campanas.enviar.useMutation({
    onSuccess: r => { r.ok ? toast.success("Reanudando el envío…") : toast.error(r.motivo ?? "No se pudo reanudar"); utils.campanas.listar.invalidate(); },
  });

  if (editando) return <Editor inicial={editando} onCerrar={() => setEditando(null)} />;

  const aBorrador = (c: any, copia = false): Borrador => ({
    ...(copia ? {} : { id: c.id }),
    asunto: copia ? `${c.asunto} (copia)`.slice(0, 150) : c.asunto, preheader: c.preheader ?? "", titulo: c.titulo, cuerpo: c.cuerpo,
    imagenUrl: c.imagenUrl ?? "", botonTexto: c.botonTexto ?? "", botonUrl: c.botonUrl ?? "https://isekaiworld.co", segmento: c.segmento,
  });

  return (
    <div className="flex flex-col gap-4">
      <ContadoresAudiencia />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ff3d9e]">Historial</p>
        <button onClick={() => setEditando({ ...VACIO })} className="ev-notch flex items-center gap-2 bg-[#e5007d] px-4 py-2.5 text-sm font-bold text-white">
          <Plus size={15} /> Nueva campaña
        </button>
      </div>

      {isError ? (
        <EstadoVacio icono={Mail} texto="No se pudieron cargar las campañas. Si acabas de instalar esta función, falta ejecutar la migración." />
      ) : lista.length === 0 ? (
        <EstadoVacio icono={Mail} texto="Todavía no has creado campañas."
          accion={<button onClick={() => setEditando({ ...VACIO })} className="bg-[#e5007d] px-4 py-2 text-xs font-bold text-white">Crear la primera</button>} />
      ) : (
        <div className="divide-y divide-white/[0.05] border border-white/[0.08]">
          {lista.map((c: any) => {
            const e = ESTADOS[c.estado] ?? { texto: c.estado, color: COLORES.gris };
            const pct = c.total > 0 ? Math.round((c.enviados / c.total) * 100) : 0;
            const f = fechaRelativa(c.enviadoEn ?? c.creadoEn);
            const seg = SEGMENTOS.find(s => s.id === c.segmento)?.texto ?? c.segmento;
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-white/[0.02]">
                {/* En el teléfono el título va en su propia línea, sin cortarse */}
                <div className="min-w-0 flex-1 basis-full sm:basis-0">
                  <p className="text-sm font-bold text-white sm:truncate">{c.asunto}</p>
                  <p className="truncate text-[11px] text-[#8a8494]"><span title={f.exacta}>{f.texto}</span> · {seg}</p>
                  {(c.estado === "enviando" || c.estado === "interrumpida") && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 w-40 max-w-full bg-white/10"><div className="h-full" style={{ width: `${pct}%`, background: e.color }} /></div>
                      <span className="text-[11px] tabular-nums text-[#a39cad]">{Number(c.enviados).toLocaleString("es-VE")} / {Number(c.total).toLocaleString("es-VE")}</span>
                    </div>
                  )}
                  {c.estado === "interrumpida" && c.ultimoError && <p className="mt-1 text-[11px] text-amber-300/80">{c.ultimoError}</p>}
                </div>
                <Estado color={e.color}>{e.texto}{c.estado === "enviada" ? ` · ${Number(c.enviados).toLocaleString("es-VE")}` : ""}</Estado>
                <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
                  {c.estado === "borrador" && (
                    <button onClick={() => setEditando(aBorrador(c))} className="px-2.5 py-1.5 text-[11px] font-bold text-white hover:text-[#ff3d9e]">Editar</button>
                  )}
                  {c.estado === "interrumpida" && (
                    <button onClick={() => enviar.mutate({ id: c.id })} disabled={enviar.isPending} title="Continúa solo con quienes no lo recibieron"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:text-white"><RotateCcw size={12} /> Reanudar</button>
                  )}
                  <button onClick={() => setEditando(aBorrador(c, true))} title="Duplicar como borrador" className="p-2 text-[#8a8494] hover:text-white"><Copy size={14} /></button>
                  {c.estado === "borrador" && (
                    <button
                      title="Eliminar borrador"
                      onClick={() => confirmar({ titulo: "Eliminar este borrador", mensaje: `«${c.asunto}» se borra para siempre.`, confirmar: "Eliminar", peligro: true })
                        .then(ok => { if (ok) borrar.mutate({ id: c.id }); })}
                      className="p-2 text-[#8a8494] hover:text-[#f87171]"
                    ><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
