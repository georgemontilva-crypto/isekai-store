import { Handshake, Swords, ScanLine, Ticket, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Qué portales le tocan a cada persona según su rol. Así cada quien encuentra
 * lo suyo desde la web normal sin recordar direcciones:
 *
 *   tienda   → Vender boletos (y Dar EXP si está autorizada)
 *   personal → Dar EXP
 *   portero  → Control de acceso
 *   todos    → Level Pass (con boleto: «Mi Level Pass»; sin él, entra escaneando)
 */
export type Portal = {
  clave: "vender" | "xp" | "acceso" | "pass" | "rueda";
  href: string;
  texto: string;
  corto: string;
  descripcion: string;
  icono: typeof Ticket;
  color: string;
};

export function usePortales() {
  const { isAuthenticated } = useAuth();
  const opciones = { enabled: isAuthenticated, staleTime: 60_000, retry: false } as const;
  const { data: acceso } = trpc.tickets.miAcceso.useQuery(undefined, opciones);
  const { data: boleto } = trpc.levelPass.miBoleto.useQuery(undefined, opciones);

  const roles: Portal[] = [];
  if (acceso?.esTienda) {
    roles.push({ clave: "vender", href: "/vender?modo=vender", texto: "Vender boletos", corto: "Vender", descripcion: "Escanea un boleto en blanco y regístralo", icono: Ticket, color: "#e5007d" });
  }
  if (acceso?.puedeXp) {
    roles.push({ clave: "xp", href: "/vender?modo=xp", texto: "Dar EXP", corto: "Dar EXP", descripcion: "Escanea boletos en tu estación", icono: Zap, color: "#38bdf8" });
  }
  if (acceso?.esPortero) {
    roles.push({ clave: "acceso", href: "/acceso", texto: "Control de acceso", corto: "Acceso", descripcion: "Valida la entrada en la puerta", icono: ScanLine, color: "#2dd4bf" });
  }
  // Staff de la rueda de negocios (el administrador la tiene en su panel)
  if (acceso?.esRueda) {
    roles.push({ clave: "rueda", href: "/staff/rueda", texto: "Rueda de negocios", corto: "Rueda", descripcion: "Marca qué tiendas llegaron", icono: Handshake, color: "#ff3d9e" });
  }
  const pase: Portal = {
    clave: "pass",
    href: "/worldfest/pass",
    texto: boleto ? "Mi Level Pass" : "Level Pass",
    corto: "Level Pass",
    descripcion: boleto ? "Tu rango, tu EXP y tus misiones" : "Escanea tu boleto y entra a tu perfil",
    icono: Swords,
    color: "#a78bfa",
  };
  return { roles, pase, tieneBoleto: Boolean(boleto), todos: [...roles, pase], esAdmin: acceso?.rol === "admin" };
}
