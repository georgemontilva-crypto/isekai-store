import { Handshake, Store, Swords, ScanLine, Ticket, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useApps } from "@/lib/appsAparte";

/**
 * Qué portales le tocan a cada persona según su rol. Así cada quien encuentra
 * lo suyo desde la web normal sin recordar direcciones:
 *
 *   tienda   → Vender boletos (y Dar EXP si está autorizada)
 *   personal → Dar EXP
 *   portero  → Control de acceso
 *   todos    → Level Pass (con boleto: «Mi Level Pass»; sin él, entra escaneando)
 *
 * En la web, los accesos de trabajo desaparecen cuando su app aparte ya
 * funciona (equipo.… y admin.…): ahí es donde se entra. El Level Pass es del
 * público y se queda.
 */
export type Portal = {
  clave: "vender" | "xp" | "acceso" | "pass" | "rueda" | "stands" | "misiones";
  href: string;
  texto: string;
  corto: string;
  descripcion: string;
  icono: typeof Ticket;
  color: string;
};

export function usePortales() {
  const { isAuthenticated } = useAuth();
  const apps = useApps();
  const opciones = { enabled: isAuthenticated, staleTime: 60_000, retry: false } as const;
  const { data: acceso, isLoading: cargando } = trpc.tickets.miAcceso.useQuery(undefined, opciones);
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
  // Tienda con stand en el Fest: escribe las misiones de su stand
  if (acceso?.planStand) {
    roles.push({ clave: "misiones", href: "/boleteria/misiones", texto: "Mis misiones", corto: "Misiones", descripcion: "Las misiones de tu stand en el Level Pass", icono: Swords, color: "#a78bfa" });
  }
  // Administrador: acceso directo a la venta de stands del Fest
  if (acceso?.rol === "admin") {
    roles.push({ clave: "stands", href: "/boleteria?v=stands", texto: "Stands del Fest", corto: "Stands", descripcion: "Pagos por revisar, saldos y mesas", icono: Store, color: "#fbbf24" });
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
  // Lo que ya se abre en su app no se ofrece en la web (los stands son del administrador)
  const visibles = apps.cargando ? [] : roles.filter(r => (r.clave === "stands" ? !(apps.admin || apps.equipo) : !apps.equipo));
  return { roles: visibles, pase, tieneBoleto: Boolean(boleto), todos: [...visibles, pase], planStand: acceso?.planStand ?? null, esAdmin: acceso?.rol === "admin", cargando: (isAuthenticated && cargando) || apps.cargando };
}
