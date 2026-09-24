import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Package, RotateCcw, ShoppingBag, Sparkles, Tag, TrendingUp } from "lucide-react";
import TarjetaRuedaPrensa from "./TarjetaRuedaPrensa";

/**
 * Inicio del panel de administración (computador y teléfono).
 *
 * Orden pensado para decidir rápido:
 *  1. Lo que requiere tu atención (con acceso directo a cada sección).
 *  2. Métricas clave.
 *  3. Ventas recientes (sin kits de cosplayer) · rueda de prensa · más vendidos.
 *
 * Colores fijos (clases adm-*): se ve igual con el tema claro u oscuro.
 */
export type DestinoPanel = "orders" | "payments" | "cosplay" | "products" | "categories";

type Metricas = {
  totalRevenue?: number;
  totalOrders?: number;
  recentOrders?: any[];
  topProducts?: any[];
  revenueResetAt?: string | Date | null;
} | undefined;

type Props = {
  metrics: Metricas;
  pendientes: { pedidos: number; pagos: number; cosplay: number };
  onIr: (destino: DestinoPanel) => void;
  productos?: number;
  categorias?: number;
  /** Solo en el computador: reiniciar el contador de ingresos */
  contador?: { onReiniciar: () => void; onDeshacer: () => void; ocupado: boolean };
};

const ESTADOS: Record<string, { texto: string; color: string }> = {
  pending: { texto: "Orden creada", color: "#fbbf24" },
  preparing: { texto: "En preparación", color: "#38bdf8" },
  printing: { texto: "Imprimiendo", color: "#a78bfa" },
  post_printing: { texto: "Post impresión", color: "#a78bfa" },
  packed: { texto: "Empacada", color: "#2dd4bf" },
  shipped: { texto: "Enviada", color: "#60a5fa" },
  delivered: { texto: "Entregada", color: "#4ade80" },
  cancelled: { texto: "Cancelada", color: "#f87171" },
};

/** $1,234.50 — con separador de miles */
const dinero = (n: number) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esKit = (o: any) => String(o?.orderNumber ?? "").startsWith("IW-KIT-");
/** Precio por unidad sospechoso (probablemente mal escrito) */
const PRECIO_RARO = 3000;

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <p className="adm-etiqueta mb-3">{children}</p>;
}

export default function PanelResumen({ metrics, pendientes, onIr, productos, categorias, contador }: Props) {
  const hoy = new Date().toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });

  const atencion = [
    { n: pendientes.pedidos, texto: "Pedidos por atender", icono: ShoppingBag, destino: "orders" as const, color: "#fbbf24" },
    { n: pendientes.pagos, texto: "Pagos por verificar", icono: CreditCard, destino: "payments" as const, color: "#ff3d9e" },
    { n: pendientes.cosplay, texto: "Solicitudes de cosplayers", icono: Sparkles, destino: "cosplay" as const, color: "#a78bfa" },
  ];
  const hayPendientes = atencion.some(a => a.n > 0);

  const todos = metrics?.recentOrders ?? [];
  const ventas = todos.filter(o => !esKit(o)).slice(0, 6);
  const kitsRecientes = todos.filter(esKit).length;
  const masVendidos = (metrics?.topProducts ?? []).filter((p: any) => parseFloat(p.revenue) > 0).slice(0, 5);

  const kpis = [
    { etq: "Ingresos", valor: dinero(metrics?.totalRevenue ?? 0), icono: TrendingUp, color: "#4ade80" },
    { etq: "Pedidos", valor: String(metrics?.totalOrders ?? 0), icono: ShoppingBag, color: "#ff3d9e", destino: "orders" as const },
    ...(productos !== undefined ? [{ etq: "Productos", valor: String(productos), icono: Package, color: "#7dd8ff", destino: "products" as const }] : []),
    ...(categorias !== undefined ? [{ etq: "Categorías", valor: String(categorias), icono: Tag, color: "#fbbf24", destino: "categories" as const }] : []),
  ];

  return (
    <div className="adm w-full">
      {/* ── Encabezado ── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="adm-etiqueta mb-1.5">[ Panel de control ]</p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-[#8a8494]">{hoy.charAt(0).toUpperCase() + hoy.slice(1)}</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="adm-boton-sec ev-notch">
          <ExternalLink size={14} /> Ver sitio
        </a>
      </div>

      {/* ── 1. Requiere tu atención ── */}
      <section className="mb-7">
        <Etiqueta>Requiere tu atención</Etiqueta>
        {hayPendientes ? (
          <div className="grid gap-2.5 sm:grid-cols-3">
            {atencion.map(a => (
              <button
                key={a.destino}
                onClick={() => onIr(a.destino)}
                className={`adm-tarjeta adm-tarjeta-accion ev-notch flex items-center gap-3.5 p-4 text-left ${a.n === 0 ? "opacity-45" : ""}`}
                style={{ ["--acento" as string]: a.color }}
              >
                <span className="adm-icono ev-notch" style={{ color: a.color, background: `${a.color}1a` }}>
                  <a.icono size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xl font-black leading-none text-white">{a.n}</span>
                  <span className="mt-1 block text-xs text-[#a39cad]">{a.texto}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-[#5d5766]" />
              </button>
            ))}
          </div>
        ) : (
          <div className="adm-tarjeta ev-notch flex items-center gap-3 p-4">
            <CheckCircle2 size={20} className="text-[#4ade80]" />
            <p className="text-sm text-[#d6d0de]">Todo al día: no hay pedidos, pagos ni solicitudes pendientes.</p>
          </div>
        )}
      </section>

      {/* ── 2. Métricas clave ── */}
      <section className="mb-7">
        <Etiqueta>Métricas</Etiqueta>
        <div className={`grid grid-cols-2 gap-2.5 ${kpis.length > 2 ? "lg:grid-cols-4" : ""}`}>
          {kpis.map((k, i) => {
            const Contenedor: any = k.destino ? "button" : "div";
            return (
              <Contenedor
                key={k.etq}
                {...(k.destino ? { onClick: () => onIr(k.destino!) } : {})}
                className={`adm-tarjeta ev-notch flex min-w-0 flex-col justify-start p-4 text-left ${k.destino ? "adm-tarjeta-accion" : ""}`}
                style={{ ["--acento" as string]: k.color }}
              >
                <div className="mb-3 flex w-full items-center justify-between">
                  <span className="adm-etiqueta !mb-0 !text-[#8a8494]">{k.etq}</span>
                  <k.icono size={16} style={{ color: k.color }} />
                </div>
                <p className="truncate text-[22px] font-black tabular-nums leading-tight text-white sm:text-2xl" title={k.valor}>{k.valor}</p>
                {/* El contador de ingresos va dentro de su tarjeta, discreto */}
                {i === 0 && (
                  <div className="mt-2 text-[11px] leading-snug text-[#6f6878]">
                    {metrics?.revenueResetAt
                      ? <>Desde el {new Date(metrics.revenueResetAt).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" })}</>
                      : "Desde el primer pedido"}
                    {contador && (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <button
                          onClick={e => { e.stopPropagation(); if (confirm("¿Reiniciar el contador de ingresos? Los pedidos NO se borran: empieza a contar desde ahora.")) contador.onReiniciar(); }}
                          disabled={contador.ocupado}
                          className="inline-flex items-center gap-1 text-[#8a8494] underline-offset-2 hover:text-white hover:underline"
                        >
                          <RotateCcw size={11} /> Reiniciar
                        </button>
                        {metrics?.revenueResetAt && (
                          <button
                            onClick={e => { e.stopPropagation(); contador.onDeshacer(); }}
                            disabled={contador.ocupado}
                            className="text-[#8a8494] underline-offset-2 hover:text-white hover:underline"
                          >
                            Contar todo
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </Contenedor>
            );
          })}
        </div>
      </section>

      {/* ── 3. Ventas recientes · rueda de prensa · más vendidos ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Etiqueta>Ventas recientes</Etiqueta>
            <button onClick={() => onIr("orders")} className="adm-enlace -mt-3">Ver todos <ArrowRight size={12} /></button>
          </div>
          <div className="adm-tarjeta ev-notch overflow-hidden">
            {ventas.length === 0 ? (
              <p className="p-5 text-sm text-[#8a8494]">Aún no hay ventas recientes.</p>
            ) : ventas.map((o: any, i: number) => {
              const e = ESTADOS[o.status] ?? { texto: o.status, color: "#8a8494" };
              return (
                <div key={o.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-white/[0.06]" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{o.orderNumber}</p>
                    <p className="truncate text-xs text-[#8a8494]">{o.customerName}</p>
                  </div>
                  <span className="adm-estado hidden shrink-0 sm:inline-flex" style={{ color: e.color, background: `${e.color}17`, borderColor: `${e.color}40` }}>
                    {e.texto}
                  </span>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-white">{dinero(parseFloat(o.total))}</p>
                    <p className="text-[11px] sm:hidden" style={{ color: e.color }}>{e.texto}</p>
                  </div>
                </div>
              );
            })}
            {kitsRecientes > 0 && (
              <button onClick={() => onIr("orders")} className="flex w-full items-center justify-between border-t border-white/[0.06] px-4 py-3 text-xs text-[#8a8494] hover:text-white">
                <span>+ {kitsRecientes} kits de cosplayer recientes (no cuentan como venta)</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-5">
          <section>
            <Etiqueta>World Fest</Etiqueta>
            <TarjetaRuedaPrensa />
          </section>

          <section>
            <Etiqueta>Más vendidos</Etiqueta>
            <div className="adm-tarjeta ev-notch overflow-hidden">
              {masVendidos.length === 0 ? (
                <p className="p-5 text-sm text-[#8a8494]">Sin ventas todavía.</p>
              ) : masVendidos.map((p: any, i: number) => {
                const raro = parseFloat(p.revenue) / Math.max(1, Number(p.totalSold)) > PRECIO_RARO;
                return (
                  <div key={p.productId ?? i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.06]" : ""}`}>
                    <span className="w-5 shrink-0 text-center text-xs font-black text-[#ff3d9e]">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{p.productName}</p>
                      <p className="text-[11px] text-[#8a8494]">
                        {p.totalSold} {Number(p.totalSold) === 1 ? "vendido" : "vendidos"}
                        {raro && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[#fbbf24]" title="El monto por unidad es muy alto: revisa el precio de ese pedido">
                            <AlertTriangle size={11} /> revisar precio
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-white">{dinero(parseFloat(p.revenue))}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
