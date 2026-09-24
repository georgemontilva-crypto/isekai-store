import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Piezas comunes del panel de administración: colores de estado, encabezado
 * de sección, estado vacío, fechas relativas, montos y el modal de
 * confirmación (reemplaza la ventanita gris del navegador).
 *
 * Paleta de estados (la misma en todo el panel):
 *   ámbar = nuevo/pendiente · azul = en proceso · púrpura = producción ·
 *   turquesa = listo · verde = completado · rojo = rechazado/cancelado
 */

export const COLORES = {
  ambar: "#fbbf24", azul: "#38bdf8", purpura: "#a78bfa", turquesa: "#2dd4bf",
  celeste: "#60a5fa", verde: "#4ade80", rojo: "#f87171", gris: "#8a8494",
};

export const ESTADOS_PEDIDO: Record<string, { texto: string; corto: string; color: string }> = {
  pending: { texto: "Orden creada", corto: "Nuevos", color: COLORES.ambar },
  preparing: { texto: "En preparación", corto: "Preparando", color: COLORES.azul },
  printing: { texto: "Imprimiendo", corto: "Imprimiendo", color: COLORES.purpura },
  post_printing: { texto: "Post impresión", corto: "Post imp.", color: COLORES.purpura },
  packed: { texto: "Empacada", corto: "Empacados", color: COLORES.turquesa },
  shipped: { texto: "Enviada", corto: "Enviados", color: COLORES.celeste },
  delivered: { texto: "Entregada", corto: "Entregados", color: COLORES.verde },
  cancelled: { texto: "Cancelada", corto: "Cancelados", color: COLORES.rojo },
};

export const PASOS_PEDIDO = ["pending", "preparing", "printing", "post_printing", "packed", "shipped", "delivered"] as const;

export const ESTADOS_PAGO: Record<string, { texto: string; color: string }> = {
  // Estados reales de la base: pending, verifying, partial, approved, rejected
  pending: { texto: "Sin pagar", color: COLORES.gris },
  verifying: { texto: "Por verificar", color: COLORES.ambar },
  partial: { texto: "Parcial", color: COLORES.ambar },
  approved: { texto: "Aprobado", color: COLORES.verde },
  rejected: { texto: "Rechazado", color: COLORES.rojo },
};

/** $1,234.50 */
export const dinero = (n: number | string) =>
  "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** «hace 3 días» (la fecha exacta va en el title) */
export function fechaRelativa(fecha: string | Date | null | undefined): { texto: string; exacta: string } {
  if (!fecha) return { texto: "—", exacta: "" };
  const d = new Date(fecha);
  const seg = Math.round((Date.now() - d.getTime()) / 1000);
  const exacta = d.toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" });
  if (seg < 60) return { texto: "hace un momento", exacta };
  const min = Math.round(seg / 60);
  if (min < 60) return { texto: `hace ${min} min`, exacta };
  const h = Math.round(min / 60);
  if (h < 24) return { texto: `hace ${h} h`, exacta };
  const dias = Math.round(h / 24);
  if (dias === 1) return { texto: "ayer", exacta };
  if (dias < 30) return { texto: `hace ${dias} días`, exacta };
  return { texto: d.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" }), exacta };
}

/** Pastilla de estado con punto de color */
export function Estado({ color, children, className = "" }: { color: string; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] text-[11px] font-semibold ${className}`}
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

/** Encabezado estándar: título, una línea de ayuda y la acción principal */
export function EncabezadoSeccion({ titulo, descripcion, accion }: { titulo: string; descripcion?: string; accion?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-[#8a8494]">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}

/** Estado vacío: ícono, frase y (opcional) la acción para crear el primero */
export function EstadoVacio({ icono: Icono, texto, accion }: { icono: any; texto: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-white/10 px-6 py-14 text-center">
      <Icono size={26} strokeWidth={1.4} className="text-[#5d5766]" />
      <p className="text-sm text-[#8a8494]">{texto}</p>
      {accion}
    </div>
  );
}

/** Chip de filtro con contador (se usa como fila de estados) */
export function ChipFiltro({ activo, color, numero, texto, onClick }: {
  activo: boolean; color?: string; numero: number; texto: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`adm-chip flex min-w-0 flex-col items-start gap-0.5 border px-3 py-2 text-left transition-colors ${
        activo ? "border-[#ff3d9e] bg-[#1a0a14]" : "border-white/[0.08] bg-[#0c0b10] hover:border-white/20"
      }`}
    >
      <span className="text-lg font-black leading-none tabular-nums" style={{ color: numero > 0 ? (color ?? "#fff") : "#5d5766" }}>{numero}</span>
      <span className="truncate text-[11px] text-[#8a8494]">{texto}</span>
    </button>
  );
}

// ─── Confirmación con el estilo del sitio ─────────────────────────────────────

type PedidoConfirmacion = {
  titulo: string;
  mensaje: string;
  confirmar?: string;
  peligro?: boolean;
  resolver: (ok: boolean) => void;
};
let abrirConfirmacion: ((p: PedidoConfirmacion) => void) | null = null;

/**
 * Pide confirmación con un modal propio. Devuelve true si la persona acepta.
 * Si el modal no está montado, usa la confirmación del navegador.
 */
export function confirmar(opciones: { titulo: string; mensaje: string; confirmar?: string; peligro?: boolean }): Promise<boolean> {
  return new Promise(resolver => {
    if (abrirConfirmacion) abrirConfirmacion({ ...opciones, resolver });
    else resolver(window.confirm(`${opciones.titulo}\n\n${opciones.mensaje}`));
  });
}

/** Se monta una vez en el panel */
export function ModalConfirmar() {
  const [pedido, setPedido] = useState<PedidoConfirmacion | null>(null);
  useEffect(() => {
    abrirConfirmacion = setPedido;
    return () => { abrirConfirmacion = null; };
  }, []);
  useEffect(() => {
    if (!pedido) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(false); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);
  if (!pedido) return null;
  const cerrar = (ok: boolean) => { pedido.resolver(ok); setPedido(null); };
  const color = pedido.peligro ? "#f87171" : "#e5007d";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" onClick={() => cerrar(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        className="ev-notch relative w-full max-w-md border bg-[#0c0b10] p-6 text-white"
        style={{ borderColor: `${color}66` }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => cerrar(false)} className="absolute right-3 top-3 text-[#8a8494] hover:text-white" aria-label="Cerrar"><X size={16} /></button>
        <div className="mb-3 flex items-center gap-2" style={{ color }}>
          <AlertTriangle size={18} />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">{pedido.peligro ? "Acción permanente" : "Confirmar"}</p>
        </div>
        <p className="mb-2 text-lg font-black leading-snug">{pedido.titulo}</p>
        <p className="mb-6 text-sm leading-relaxed text-[#b8b1c2]">{pedido.mensaje}</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => cerrar(false)} className="ev-notch border border-white/15 bg-[#141318] px-4 py-2.5 text-xs font-bold text-white">Cancelar</button>
          <button autoFocus onClick={() => cerrar(true)} className="ev-notch px-4 py-2.5 text-xs font-bold text-white" style={{ background: color }}>
            {pedido.confirmar ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
