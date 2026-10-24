import { useState } from "react";
import { Crown, Gift, Loader2, Package, Pencil, Plus, Sparkles, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { confirmar } from "./ui";
import { Hoja, campoRueda, etiquetaRueda } from "@/components/rueda/ListaRueda";

/**
 * Tipos de boleto del evento: precio, días, cupo y beneficios.
 *
 * Cada tipo guarda lo que el sistema necesita para tratarlo distinto:
 *   · Cupo       → la venta se frena sola al agotarse (VIP 20, Fanbox 100)
 *   · VIP        → la puerta lo destaca y entra al sorteo
 *   · Kit        → la puerta avisa que hay que entregarle algo (la caja Fanbox)
 *   · Bonos      → las tiendas aliadas los canjean escaneando el boleto
 */
const COLORES = ["#38bdf8", "#a78bfa", "#fbbf24", "#e5007d", "#4ade80", "#2dd4bf", "#f87171"];

type Tipo = {
  id: number; name: string; priceUsd: string; days: number; perks: string | null; active: boolean;
  cupo: number | null; esVip: boolean; entregaKit: string | null; bonos: number; color: string | null;
  archivado?: boolean; vendidos?: number; quedan?: number | null;
};

export default function TiposBoleto({ evento }: { evento: { id: number; name: string } | undefined }) {
  const utils = trpc.useUtils();
  const { data: tipos = [], isLoading } = trpc.tickets.tipos.useQuery({ eventId: evento?.id ?? 0 }, { enabled: !!evento });
  const [editando, setEditando] = useState<Partial<Tipo> | null>(null);
  const refrescar = () => { void utils.tickets.tipos.invalidate(); void utils.tickets.resumen.invalidate(); };
  const plantilla = trpc.tickets.plantilla2027.useMutation({
    onSuccess: r => { toast.success(`Boletos 2027 cargados (${r.creados} nuevos, ${r.actualizados} actualizados)`); refrescar(); },
    onError: e => toast.error(e.message),
  });
  const borrar = trpc.tickets.borrarTipo.useMutation({
    onSuccess: () => { toast.success("Tipo eliminado"); refrescar(); },
    onError: e => toast.error(e.message),
  });
  const restaurar = trpc.tickets.editarTipo.useMutation({
    onSuccess: () => { toast.success("Tipo restaurado"); refrescar(); },
    onError: e => toast.error(e.message),
  });

  if (!evento) return <p className="py-8 text-center text-sm text-[var(--iw-text-muted)]">Crea o elige un evento primero.</p>;

  const todos = tipos as Tipo[];
  // Los eliminados con ventas se archivan: no estorban, pero se pueden recuperar
  const lista = todos.filter(t => !t.archivado);
  const archivados = todos.filter(t => t.archivado);
  const faltan2027 = !["general 1 día", "general 2 días", "vip 2 días", "isekai fanbox"].every(n => lista.some(t => t.name.toLowerCase() === n));

  return (
    <div className="flex flex-col gap-3">
      {faltan2027 && (
        <div className="rounded-3xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] p-4">
          <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--iw-text)]"><Sparkles size={16} className="text-[#fbbf24]" /> Boletería Isekai World Fest 2027</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--iw-text-muted)]">
            General 1 día ($25) · General 2 días ($45) · VIP 2 días ($80, 20 boletos) · Isekai Fanbox ($100, 100 cajas). Con sus beneficios, cupos y bonos ya configurados.
          </p>
          <button
            onClick={async () => { if (await confirmar({ titulo: "Cargar boletos 2027", mensaje: `Se cargan los 4 tipos en «${evento.name}». Si alguno ya existe con ese nombre, se actualiza.`, confirmar: "Cargar" })) plantilla.mutate({ eventId: evento.id }); }}
            disabled={plantilla.isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-[#1a1405]"
            style={{ background: "#fbbf24" }}
          >
            {plantilla.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Cargar los 4 boletos de 2027
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[var(--iw-text-muted)]" /></div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {lista.map(t => {
            const color = t.color ?? "#e5007d";
            const pct = t.cupo ? Math.min(100, ((t.vendidos ?? 0) / t.cupo) * 100) : 0;
            const beneficios = (t.perks ?? "").split("\n").map(x => x.trim()).filter(Boolean);
            return (
              <li key={t.id} className={`rounded-3xl border p-4 ${t.active ? "" : "opacity-50"}`} style={{ borderColor: `${color}40`, background: `${color}0a` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[16px] font-bold text-[var(--iw-text)]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      {t.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip>{t.days === 1 ? "1 día (el que elija)" : `${t.days} días`}</Chip>
                      {t.esVip && <Chip color="#fbbf24"><Crown size={11} /> VIP · sorteo</Chip>}
                      {t.entregaKit && <Chip color="#e5007d"><Package size={11} /> {t.entregaKit}</Chip>}
                      {t.bonos > 0 && <Chip color="#4ade80"><Gift size={11} /> {t.bonos} bonos</Chip>}
                      {!t.active && <Chip color="#f87171">No a la venta</Chip>}
                    </div>
                  </div>
                  <p className="shrink-0 text-[20px] font-black" style={{ color }}>${parseFloat(t.priceUsd).toFixed(0)}</p>
                </div>

                {/* Cupo vendido */}
                <div className="mt-3">
                  <div className="flex justify-between text-[12px] text-[var(--iw-text-muted)]">
                    <span>{t.vendidos ?? 0} vendido{(t.vendidos ?? 0) === 1 ? "" : "s"}</span>
                    <span>{t.cupo ? (t.quedan === 0 ? "Agotado" : `Quedan ${t.quedan} de ${t.cupo}`) : "Sin límite"}</span>
                  </div>
                  {t.cupo != null && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.quedan === 0 ? "#f87171" : color }} />
                    </div>
                  )}
                </div>

                {beneficios.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1 text-[12.5px] leading-snug text-[var(--iw-text-muted)]">
                    {beneficios.map(b => <li key={b} className="flex gap-2"><span style={{ color }}>·</span><span>{b}</span></li>)}
                  </ul>
                )}

                <div className="mt-3 flex gap-2">
                  <button onClick={() => setEditando(t)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/[0.07] py-2.5 text-[13px] font-semibold text-[var(--iw-text)]">
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={async () => { if (await confirmar({ titulo: `Eliminar «${t.name}»`, mensaje: (t.vendidos ?? 0) > 0 ? `Deja de venderse y sale de la lista. Los ${t.vendidos} boletos ya vendidos siguen valiendo.` : "Se borra por completo.", confirmar: "Eliminar", peligro: true })) borrar.mutate({ id: t.id }); }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--iw-text-muted)] hover:text-[#f87171]"
                    aria-label="Eliminar tipo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {archivados.length > 0 && (
        <details className="rounded-3xl bg-white/[0.02] px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--iw-text-muted)]">Eliminados con ventas · {archivados.length}</summary>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--iw-text-muted)]">Ya no se venden. Se guardan porque hay boletos vendidos con ellos, que siguen valiendo en la puerta.</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {archivados.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-2.5">
                <span className="min-w-0 truncate text-[13.5px] text-[var(--iw-text)]">{t.name} · {t.vendidos ?? 0} vendido{(t.vendidos ?? 0) === 1 ? "" : "s"}</span>
                <button onClick={() => restaurar.mutate({ id: t.id, archivado: false, active: true })} className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-semibold text-[var(--iw-text)]">Restaurar</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button onClick={() => setEditando({ days: 1, active: true, esVip: false, bonos: 0, color: COLORES[lista.length % COLORES.length] })} className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-white/15 py-3.5 text-[14px] font-semibold text-[var(--iw-text-muted)]">
        <Plus size={16} /> Otro tipo de boleto
      </button>

      {editando && <EditarTipo tipo={editando} eventId={evento.id} onCerrar={() => setEditando(null)} onListo={() => { refrescar(); setEditando(null); }} />}
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={color ? { background: `${color}1f`, color } : { background: "rgba(255,255,255,0.07)", color: "var(--iw-text-muted)" }}>
      {children}
    </span>
  );
}

function EditarTipo({ tipo, eventId, onCerrar, onListo }: { tipo: Partial<Tipo>; eventId: number; onCerrar: () => void; onListo: () => void }) {
  const [f, setF] = useState({
    name: tipo.name ?? "", priceUsd: tipo.priceUsd ? String(parseFloat(tipo.priceUsd)) : "", days: tipo.days ?? 1,
    cupo: tipo.cupo != null ? String(tipo.cupo) : "", esVip: tipo.esVip ?? false, entregaKit: tipo.entregaKit ?? "",
    bonos: String(tipo.bonos ?? 0), color: tipo.color ?? "#e5007d", perks: tipo.perks ?? "", active: tipo.active ?? true,
  });
  const crear = trpc.tickets.crearTipo.useMutation();
  const editar = trpc.tickets.editarTipo.useMutation();
  const ocupado = crear.isPending || editar.isPending;

  const guardar = async () => {
    const precio = f.priceUsd.replace(",", ".");
    if (f.name.trim().length < 2) return toast.error("Ponle un nombre");
    if (!/^\d+(\.\d{1,2})?$/.test(precio) || parseFloat(precio) <= 0) return toast.error("Revisa el precio");
    const datos = {
      name: f.name.trim(), priceUsd: precio, days: f.days, perks: f.perks.trim(),
      cupo: f.cupo.trim() ? Math.max(1, parseInt(f.cupo, 10) || 1) : null,
      esVip: f.esVip, entregaKit: f.entregaKit.trim() || null, bonos: Math.max(0, parseInt(f.bonos, 10) || 0), color: f.color,
    };
    try {
      if (tipo.id) await editar.mutateAsync({ id: tipo.id, ...datos, active: f.active });
      else await crear.mutateAsync({ eventId, ...datos });
      toast.success("Tipo de boleto guardado");
      onListo();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo guardar");
    }
  };

  return (
    <Hoja titulo={tipo.id ? `Editar ${tipo.name}` : "Nuevo tipo de boleto"} onCerrar={onCerrar}>
      <label className={etiquetaRueda}>Nombre</label>
      <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={200} placeholder="Ej. VIP 2 días" className={`${campoRueda} mb-3`} />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className={etiquetaRueda}>Precio (US$)</label>
          <input value={f.priceUsd} onChange={e => setF({ ...f, priceUsd: e.target.value.replace(/[^0-9.,]/g, "") })} inputMode="decimal" className={campoRueda} />
        </div>
        <div>
          <label className={etiquetaRueda}>Días de acceso</label>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1">
            {[1, 2].map(d => (
              <button key={d} onClick={() => setF({ ...f, days: d })} className="rounded-xl py-2.5 text-[14px] font-semibold" style={f.days === d ? { background: "#e5007d", color: "#fff" } : { color: "#9a93a6" }}>{d}</button>
            ))}
          </div>
        </div>
      </div>
      <label className={etiquetaRueda}>Cupo (déjalo vacío si no tiene límite)</label>
      <input value={f.cupo} onChange={e => setF({ ...f, cupo: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Sin límite" className={`${campoRueda} mb-3`} />

      <label className={etiquetaRueda}>Beneficios (uno por línea)</label>
      <textarea value={f.perks} onChange={e => setF({ ...f, perks: e.target.value })} rows={5} maxLength={1000} className={`${campoRueda} mb-3 resize-y`} placeholder={"Acceso a los dos días + Level Pass\nMesa en zona VIP"} />

      <div className="mb-3 flex flex-col gap-2 rounded-2xl bg-white/[0.03] p-3">
        <label className="flex items-center gap-2.5 text-[13.5px] text-white">
          <input type="checkbox" checked={f.esVip} onChange={e => setF({ ...f, esVip: e.target.checked })} className="h-4 w-4 accent-[#fbbf24]" />
          <Crown size={14} className="text-[#fbbf24]" /> Es VIP (se destaca en la puerta y entra al sorteo)
        </label>
        <div>
          <label className={etiquetaRueda}>Se le entrega al llegar (opcional)</label>
          <input value={f.entregaKit} onChange={e => setF({ ...f, entregaKit: e.target.value })} maxLength={200} placeholder="Ej. Caja Fanbox + tote bag" className={campoRueda} />
        </div>
        <div>
          <label className={etiquetaRueda}>Bonos de consumo en tiendas aliadas</label>
          <input value={f.bonos} onChange={e => setF({ ...f, bonos: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={campoRueda} />
        </div>
      </div>

      <label className={etiquetaRueda}>Color en la puerta</label>
      <div className="mb-4 flex gap-2">
        {COLORES.map(c => (
          <button key={c} onClick={() => setF({ ...f, color: c })} aria-label={`Color ${c}`} className="h-9 w-9 rounded-full" style={{ background: c, outline: f.color === c ? "3px solid #fff" : "none", outlineOffset: 2 }} />
        ))}
      </div>

      {tipo.id && (
        <label className="mb-4 flex items-center gap-2.5 text-[13.5px] text-white">
          <input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} className="h-4 w-4 accent-[#e5007d]" />
          A la venta
        </label>
      )}

      <button onClick={guardar} disabled={ocupado} className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-bold text-white disabled:opacity-50" style={{ background: "#e5007d" }}>
        {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />} Guardar
      </button>
    </Hoja>
  );
}
