import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useSearch } from "wouter";
import { Gift, Globe, LayoutDashboard, LayoutGrid, MoreHorizontal, Receipt, Settings2 } from "lucide-react";
import { usePortales } from "@/hooks/usePortales";

/**
 * El menú inferior de todas las pantallas del evento, como en una app: las
 * herramientas principales en la barra y, si hay más, un botón «Más» que abre
 * una carpeta con los iconos del resto. Es el mismo en Boletería, Vender,
 * Dar EXP, Puerta, Gestión, Stands y Rueda, y cada persona ve solo lo suyo.
 */
type Item = { clave: string; href: string; corto: string; icono: typeof LayoutGrid; color: string };

/** Alto de la barra (sin el área segura), para que las pantallas dejen el hueco */
export const ALTO_BARRA = 66;

export default function CambiarHerramienta(_props: { className?: string; ocultar?: string[] }) {
  const { roles, esAdmin } = usePortales();
  const [ubicacion] = useLocation();
  const busqueda = useSearch();
  const [carpeta, setCarpeta] = useState(false);

  const por = (c: string) => roles.find(r => r.clave === c) as Item | undefined;
  const vende = Boolean(por("vender"));
  // En orden de uso: lo primero va en la barra, el resto en la carpeta
  const items = ([
    { clave: "inicio", href: "/boleteria", corto: "Inicio", icono: LayoutGrid, color: "#e5007d" },
    por("vender"),
    por("acceso"),
    esAdmin && { clave: "gestion", href: "/boleteria?v=admin", corto: "Gestión", icono: Settings2, color: "#e5007d" },
    por("xp"),
    vende && { clave: "bonos", href: "/vender?modo=bonos", corto: "Canjear", icono: Gift, color: "#34d399" },
    vende && { clave: "ventas", href: "/vender?modo=ventas", corto: "Ventas", icono: Receipt, color: "#a78bfa" },
    por("misiones"),
    por("stands"),
    por("rueda"),
    esAdmin && { clave: "panel", href: "/admin", corto: "Panel", icono: LayoutDashboard, color: "#94a3b8" },
  ].filter(Boolean) as Item[]);

  const q = new URLSearchParams(busqueda);
  const actual = (href: string) => {
    const [ruta, consulta] = href.split("?");
    const p = new URLSearchParams(consulta ?? "");
    if (ruta === "/boleteria") return ubicacion === "/boleteria" && (q.get("v") ?? "") === (p.get("v") ?? "");
    if (ruta === "/vender") return ubicacion.startsWith("/vender") && (q.get("modo") ?? "vender") === (p.get("modo") ?? "vender");
    return ubicacion.startsWith(ruta);
  };
  const activa = items.find(i => actual(i.href))?.clave;

  // La carpeta se cierra al cambiar de pantalla y con Esc
  useEffect(() => { setCarpeta(false); }, [ubicacion, busqueda]);
  useEffect(() => {
    if (!carpeta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") setCarpeta(false); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [carpeta]);

  if (items.length < 2 || typeof document === "undefined") return null;
  const enBarra = items.length <= 5 ? items : items.slice(0, 4);
  const enCarpeta = items.length <= 5 ? [] : items.slice(4);
  const masActiva = enCarpeta.some(i => i.clave === activa);

  const boton = (activo: boolean, color: string, Icono: typeof LayoutGrid, texto: string) => (
    <>
      <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors" style={{ background: activo ? `${color}26` : "transparent" }}>
        <Icono size={20} style={{ color: activo ? color : "#6b6575" }} />
      </span>
      <span className="text-[11px] font-semibold" style={{ color: activo ? "#ffffff" : "#6b6575" }}>{texto}</span>
    </>
  );
  const clase = "flex flex-1 flex-col items-center justify-center gap-1 py-2";
  const estilo = { minHeight: ALTO_BARRA, WebkitTapHighlightColor: "transparent" } as const;

  return createPortal(
    <>
      {carpeta && (
        <div className="bh-fondo fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-7 backdrop-blur-xl" onClick={() => setCarpeta(false)} role="dialog" aria-modal="true" aria-label="Más herramientas">
          <div className="w-full max-w-[340px]" onClick={e => e.stopPropagation()}>
            <p className="mb-3 text-center text-[22px] font-semibold text-white">Más herramientas</p>
            <div className="bh-carpeta grid grid-cols-3 gap-x-2 gap-y-5 rounded-[36px] border border-white/10 bg-white/[0.13] p-6">
              {[...enCarpeta, { clave: "web", href: "/", corto: "Ir a la web", icono: Globe, color: "#38bdf8" } as Item].map(i => (
                <Link key={i.clave} href={i.href} onClick={() => setCarpeta(false)} className="flex flex-col items-center gap-1.5 active:opacity-70" aria-current={i.clave === activa ? "page" : undefined}>
                  <span className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] text-white shadow-lg" style={{ background: `linear-gradient(160deg, ${i.color}, ${i.color}b3)`, boxShadow: i.clave === activa ? "0 0 0 2.5px #fff" : undefined }}>
                    <i.icono size={27} />
                  </span>
                  <span className="text-center text-[12px] font-medium leading-tight text-white">{i.corto}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-[#08070c]/95 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} aria-label="Herramientas del evento">
        <div className="mx-auto flex max-w-lg px-1">
          {enBarra.map(i => {
            const on = i.clave === activa && !carpeta;
            return (
              <Link key={i.clave} href={i.href} className={clase} style={estilo} aria-current={on ? "page" : undefined}>
                {boton(on, i.color, i.icono, i.corto)}
              </Link>
            );
          })}
          {enCarpeta.length > 0 && (
            <button onClick={() => setCarpeta(v => !v)} className={clase} style={estilo} aria-expanded={carpeta} aria-haspopup="dialog">
              {boton(carpeta || masActiva, "#e5007d", MoreHorizontal, "Más")}
            </button>
          )}
        </div>
      </nav>
    </>,
    document.body,
  );
}
