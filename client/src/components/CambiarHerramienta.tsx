import { Link, useLocation } from "wouter";
import { usePortales } from "@/hooks/usePortales";

/**
 * Fila de pastillas para saltar entre las herramientas de la persona (vender,
 * dar EXP, puerta, rueda) sin volver a la web. Solo aparece si tiene más de una.
 */
export default function CambiarHerramienta({ className = "", ocultar = [] }: { className?: string; ocultar?: string[] }) {
  const { roles: todos } = usePortales();
  // Las que ya viven dentro de esta pantalla (p. ej. Vender y Dar EXP) se agrupan en una sola
  const roles = todos.filter((r, i) => !ocultar.includes(r.clave) || todos.findIndex(x => ocultar.includes(x.clave)) === i);
  const [ubicacion] = useLocation();
  if (roles.length < 2) return null;
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const actual = (href: string) => {
    const [ruta, q] = href.split("?");
    if (!ubicacion.startsWith(ruta)) return false;
    const modo = new URLSearchParams(q ?? "").get("modo");
    return !modo || (params?.get("modo") ?? "vender") === modo;
  };
  return (
    <div className={`-mx-1 flex gap-1.5 overflow-x-auto px-1 ${className}`} style={{ scrollbarWidth: "none" }}>
      {roles.map(r => {
        const on = actual(r.href);
        return (
          <Link key={r.clave} href={r.href}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
            style={on ? { background: r.color, color: "#fff" } : { background: "rgba(255,255,255,0.06)", color: "#cfc9d8" }}
            aria-current={on ? "page" : undefined}
          >
            <r.icono size={13} /> {r.corto}
          </Link>
        );
      })}
    </div>
  );
}
