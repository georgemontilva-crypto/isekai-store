import { useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { LayoutDashboard, LayoutGrid, Settings2 } from "lucide-react";
import { usePortales } from "@/hooks/usePortales";

/**
 * La barra única de las pantallas del evento: la misma fila de pastillas, en
 * el mismo orden, en Boletería, Vender, Puerta, Dar EXP, Stands y Rueda. Así
 * se salta de una a otra con un toque y siempre se ve dónde se está.
 * Cada persona ve solo sus herramientas; el administrador, todas más la
 * gestión y el panel general. Con una sola herramienta no aparece.
 */
type Item = { clave: string; href: string; corto: string; icono: typeof LayoutGrid; color: string };

export default function CambiarHerramienta({ className = "" }: { className?: string; ocultar?: string[] }) {
  const { roles, esAdmin } = usePortales();
  const [ubicacion] = useLocation();
  const busqueda = useSearch();
  const fila = useRef<HTMLDivElement>(null);

  const items: Item[] = [
    { clave: "inicio", href: "/boleteria", corto: "Inicio", icono: LayoutGrid, color: "#e5007d" },
    ...roles.filter(r => r.clave !== "stands"),
    ...(esAdmin ? [
      { clave: "gestion", href: "/boleteria?v=admin", corto: "Gestión", icono: Settings2, color: "#e5007d" },
      ...roles.filter(r => r.clave === "stands"),
      { clave: "panel", href: "/admin", corto: "Panel", icono: LayoutDashboard, color: "#64748b" },
    ] : []),
  ];

  const q = new URLSearchParams(busqueda);
  const actual = (href: string) => {
    const [ruta, consulta] = href.split("?");
    const p = new URLSearchParams(consulta ?? "");
    if (ruta === "/boleteria") return ubicacion === "/boleteria" && (q.get("v") ?? "") === (p.get("v") ?? "");
    if (ruta === "/vender") return ubicacion.startsWith("/vender") && ((q.get("modo") ?? "vender") === "xp") === (p.get("modo") === "xp");
    return ubicacion.startsWith(ruta);
  };

  // La pastilla activa siempre queda a la vista
  const activa = items.find(i => actual(i.href))?.clave;
  useEffect(() => {
    fila.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [activa, items.length]);

  if (items.length < 3) return null;
  return (
    <nav aria-label="Herramientas del evento" ref={fila} className={`-mx-1 flex gap-1.5 overflow-x-auto px-1 ${className}`} style={{ scrollbarWidth: "none" }}>
      {items.map(r => {
        const on = r.clave === activa;
        return (
          <Link key={r.clave} href={r.href}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold"
            style={{ minHeight: 36, ...(on ? { background: r.color, color: "#fff" } : { background: "rgba(255,255,255,0.06)", color: "#cfc9d8" }) }}
            aria-current={on ? "page" : undefined}
          >
            <r.icono size={14} /> {r.corto}
          </Link>
        );
      })}
    </nav>
  );
}
