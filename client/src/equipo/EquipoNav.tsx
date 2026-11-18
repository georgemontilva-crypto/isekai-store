import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useSearch } from "wouter";
import { Handshake, LayoutGrid, Receipt, ScanLine, Settings2, Swords, Ticket, Zap, type LucideIcon } from "lucide-react";
import { usePortales } from "@/hooks/usePortales";
import { APP } from "@/lib/appActual";
import "@fontsource-variable/saira/wdth.css";
import "@/styles/equipo.css";

/** Dónde queda el inicio de la app: la raíz en su propia dirección; /equipo dentro de la web */
export const INICIO_EQUIPO = APP === "web" ? "/equipo" : "/";

type Item = { clave: string; href: string; corto: string; icono: LucideIcon };

/**
 * Barra de la app del Equipo: en el teléfono va fija abajo, con la acción
 * principal de cada rol al centro (vender para una tienda, escanear para la
 * puerta, dar EXP para una estación); en computadora son pestañas arriba.
 * Solo aparece lo que la persona tiene asignado.
 */
export default function EquipoNav() {
  const { roles, esAdmin } = usePortales();
  const [movil, setMovil] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 820px)");
    const cambio = () => setMovil(m.matches);
    m.addEventListener("change", cambio);
    return () => m.removeEventListener("change", cambio);
  }, []);
  const [ubicacion] = useLocation();
  const busqueda = useSearch();
  const tiene = (c: string) => roles.some(r => r.clave === c);

  const vender: Item | null = tiene("vender") ? { clave: "vender", href: "/vender?modo=vender", corto: "Vender", icono: Ticket } : null;
  const puerta: Item | null = tiene("acceso") ? { clave: "acceso", href: "/acceso", corto: "Puerta", icono: ScanLine } : null;
  const exp: Item | null = tiene("xp") ? { clave: "xp", href: "/vender?modo=xp", corto: "Dar EXP", icono: Zap } : null;
  const principal = vender ?? puerta ?? exp;

  const resto = ([
    { clave: "inicio", href: INICIO_EQUIPO, corto: "Inicio", icono: LayoutGrid },
    vender && { clave: "ventas", href: "/vender?modo=ventas", corto: "Ventas", icono: Receipt },
    puerta, exp,
    tiene("misiones") && { clave: "misiones", href: "/boleteria/misiones", corto: "Misiones", icono: Swords },
    tiene("rueda") && { clave: "rueda", href: "/staff/rueda", corto: "Rueda", icono: Handshake },
    esAdmin && { clave: "gestion", href: "/boleteria?v=admin", corto: "Gestión", icono: Settings2 },
  ].filter(Boolean) as Item[]).filter(i => i.clave !== principal?.clave).slice(0, 4);

  if (resto.length < 2 && !principal) return null;

  const q = new URLSearchParams(busqueda);
  const actual = (href: string) => {
    const [ruta, consulta] = href.split("?");
    const p = new URLSearchParams(consulta ?? "");
    if (ruta === INICIO_EQUIPO) return ubicacion === INICIO_EQUIPO || (ubicacion === "/boleteria" && !q.get("v"));
    if (ruta === "/boleteria") return ubicacion === "/boleteria" && (q.get("v") ?? "") === (p.get("v") ?? "");
    if (ruta === "/vender") return ubicacion.startsWith("/vender") && (q.get("modo") ?? "vender") === (p.get("modo") ?? "vender");
    return ubicacion.startsWith(ruta);
  };

  // La principal queda en medio: dos a cada lado cuando hay cuatro más
  const mitad = Math.ceil(resto.length / 2);
  const orden: (Item & { principal?: boolean })[] = principal
    ? [...resto.slice(0, mitad), { ...principal, principal: true }, ...resto.slice(mitad)]
    : resto;

  const barra = (
    <nav className="eq-nav" aria-label="Secciones de la app">
      {orden.map(i => (
        <Link key={i.clave} href={i.href} className={`${i.principal ? "eq-nav__main" : ""} ${actual(i.href) ? "is-active" : ""}`} aria-current={actual(i.href) ? "page" : undefined}>
          <i.icono strokeWidth={1.7} aria-hidden="true" />
          <span>{i.corto}</span>
        </Link>
      ))}
    </nav>
  );
  // En el teléfono va fija abajo, y para eso tiene que colgar del documento:
  // dentro de una pantalla con efectos, «fija» dejaría de serlo.
  return movil ? createPortal(barra, document.body) : barra;
}
