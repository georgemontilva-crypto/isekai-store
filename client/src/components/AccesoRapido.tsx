import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Briefcase, X } from "lucide-react";
import { usePortales } from "@/hooks/usePortales";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Acceso rápido al panel que corresponde a cada persona.
 *
 * Una tienda no tiene por qué recordar la dirección del portal de venta, ni
 * quien compró su entrada la del Level Pass. Este botón aparece pegado al
 * lado derecho y lleva directo a lo suyo:
 *
 *   - tienda o personal → portal de venta y experiencia
 *   - portero          → control de acceso
 *   - con boleto       → su perfil de cazador
 *
 * Solo se muestra a quien tiene algo que abrir: para el resto no existe.
 */
export default function AccesoRapido() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const [cerrado, setCerrado] = useState(false);

  const portales = usePortales();

  // No aparece dentro de los propios paneles ni en el admin
  const rutasOcultas = ["/vender", "/acceso", "/worldfest/pass", "/admin", "/guild/mejoras", "/rueda-de-prensa", "/rueda-de-negocios", "/staff/", "/equipo"];
  if (rutasOcultas.some(r => location.startsWith(r))) return null;
  if (!isAuthenticated || cerrado) return null;

  /** El primero que le toque: su rol, o su Level Pass si compró boleto */
  // Con más de una herramienta, el acceso lleva a «Mis herramientas»
  const p = portales.roles.length > 1
    ? { href: "/equipo", texto: "Mis herramientas", icono: Briefcase, color: "#e5007d" }
    : portales.roles[0] ?? (portales.tieneBoleto ? portales.pase : null);
  const destino = p ? { href: p.href, texto: p.texto, icono: p.icono, color: p.color } : null;

  if (!destino) return null;

  const Icono = destino.icono;

  return (
    <div className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center">
      {/* Cerrar: si estorba, se quita hasta recargar */}
      <button
        onClick={() => setCerrado(true)}
        aria-label="Ocultar acceso rápido"
        className="relative mr-1 flex h-6 w-6 after:absolute after:-inset-2.5 after:content-[''] items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/50 backdrop-blur transition-colors hover:text-white"
      >
        <X size={11} />
      </button>

      {/* Solo el icono: ocupa poco y no tapa contenido. El texto aparece al
          pasar por encima en escritorio, y el título lo describe para quien
          use lector de pantalla. */}
      <Link
        href={destino.href}
        title={destino.texto}
        aria-label={destino.texto}
        className="group flex items-center gap-0 overflow-hidden py-3.5 pl-3.5 pr-3.5 text-white shadow-2xl transition-all lg:hover:gap-2 lg:hover:pr-4"
        style={{ background: destino.color, borderRadius: "12px 0 0 12px" }}
      >
        <Icono size={18} className="shrink-0" />
        <span className="hidden max-w-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] transition-all lg:inline lg:group-hover:max-w-[180px]">
          {destino.texto}
        </span>
      </Link>
    </div>
  );
}
