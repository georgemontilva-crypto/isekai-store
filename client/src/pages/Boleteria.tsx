import { useMemo, useRef, useState, type RefObject } from "react";
import { ChevronRight, Gift, Home, Loader2, LogOut, Receipt, Settings2, Ticket } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { usePortales, type Portal } from "@/hooks/usePortales";
import TicketsAdmin from "@/components/admin/TicketsAdmin";
import TiendasStandAdmin from "@/components/admin/TiendasStandAdmin";
import { trpc } from "@/lib/trpc";
import TutorialGuiado, { type PasoTutorial } from "@/components/TutorialGuiado";

/**
 * Boletería (/boleteria): la interfaz propia del evento, aparte de la tienda
 * y del panel general. Todo lo de boletos vive aquí —vender, canjear, puerta,
 * dar EXP, Level Pass y, para el administrador, la gestión completa— y cada
 * persona ve únicamente lo que tiene asignado.
 */
type Tarjeta = Pick<Portal, "href" | "texto" | "descripcion" | "icono" | "color"> & { clave: string };

type Refs = Record<string, RefObject<HTMLLIElement | null>>;

function Fila({ t, refs }: { t: Tarjeta; refs?: Refs }) {
  return (
    <li ref={refs?.[t.clave]}>
      <Link href={t.href} className="flex items-center gap-4 rounded-3xl border p-4 active:opacity-80" style={{ borderColor: `${t.color}40`, background: `${t.color}0f` }}>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${t.color}24`, color: t.color }}><t.icono size={22} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">{t.texto}</span>
          <span className="block text-[12.5px] text-[#9a93a6]">{t.descripcion}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-[#6f6878]" />
      </Link>
    </li>
  );
}

function Grupo({ titulo, tarjetas, refs }: { titulo: string; tarjetas: Tarjeta[]; refs?: Refs }) {
  if (!tarjetas.length) return null;
  return (
    <section className="mb-6">
      <p className="mb-2 text-[12px] font-semibold text-[#9a93a6]">{titulo}</p>
      <ul className="flex flex-col gap-2.5">{tarjetas.map(t => <Fila key={t.clave} t={t} refs={refs} />)}</ul>
    </section>
  );
}

/** Lo que lleva una tienda con stand: cupo de boletos, comisión y misiones */
function ResumenStand({ panel, refCaja }: { panel: { cupo: any; misiones: any }; refCaja: RefObject<HTMLElement | null> }) {
  const c = panel.cupo, m = panel.misiones;
  const pct = c.cupo ? Math.min(100, Math.round((c.vendidos / c.cupo) * 100)) : 0;
  return (
    <section ref={refCaja} className="mb-6 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[#fbbf24]">{m?.tienda} · Stand {c.planNombre}</p>
      {c.vende ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[22px] font-black tabular-nums">{c.vendidos}</p><p className="text-[11px] text-[#9a93a6]">Vendidos</p></div>
            <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-[22px] font-black tabular-nums">{c.restantes}</p><p className="text-[11px] text-[#9a93a6]">Te quedan</p></div>
            <div className="rounded-2xl bg-[#4ade80]/10 p-3"><p className="text-[22px] font-black tabular-nums text-[#4ade80]">${c.ganancia}</p><p className="text-[11px] text-[#9a93a6]">Tu ganancia</p></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-[#e5007d]" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#9a93a6]">
            {c.agotado
              ? `Vendiste tus ${c.cupo} boletos: tu punto de venta ya cerró. ¡Gracias!`
              : `Cupo de ${c.cupo} boletos · ganas $${c.comisionPorBoleto} por cada uno (hasta $${c.gananciaMaxima}). Al llegar a cero, la venta se cierra sola.`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[13px] leading-relaxed text-[#9a93a6]">Tu plan incluye {m?.incluidas ?? 1} misión en el Level Pass. La venta de boletos es para los stands Gremio y Gran Gremio.</p>
      )}
      {m && <p className="mt-2 text-[12.5px] text-[#bfb8c9]">Misiones puestas: <strong className="text-white">{m.usadas} de {m.cupo}</strong>{m.libres > 0 ? " · te falta escribir " + m.libres : ""}</p>}
    </section>
  );
}

export default function Boleteria() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { roles, esAdmin, pase, tieneBoleto, cargando, planStand } = usePortales();
  const { data: panel } = trpc.standTienda.miPanel.useQuery(undefined, { enabled: isAuthenticated && Boolean(planStand), refetchInterval: 60_000 });
  const [vista, setVistaLocal] = useState<"operar" | "admin">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("v") === "admin" ? "admin" : "operar");
  const setVista = (v: "operar" | "admin") => {
    setVistaLocal(v);
    try { const u = new URL(window.location.href); v === "admin" ? u.searchParams.set("v", "admin") : u.searchParams.delete("v"); window.history.replaceState(null, "", u.pathname + u.search); } catch { /* */ }
  };

  // Tutorial de la primera vez (tiendas con stand): explica cada parte
  const refResumen = useRef<HTMLElement | null>(null);
  const rVender = useRef<HTMLLIElement | null>(null), rVentas = useRef<HTMLLIElement | null>(null), rMisiones = useRef<HTMLLIElement | null>(null), rXp = useRef<HTMLLIElement | null>(null);
  const refs: Refs = useMemo(() => ({ vender: rVender, ventas: rVentas, misiones: rMisiones, xp: rXp }), []);
  const abrirTutorial = useRef<(() => void) | null>(null);
  const vendeStand = Boolean(panel?.cupo.vende), agotadoStand = Boolean(panel?.cupo.agotado);
  const cupoStand = panel?.cupo.cupo ?? 0, misionesStand = panel?.misiones?.cupo ?? 1;
  const pasos: PasoTutorial[] = useMemo(() => {
    const p: PasoTutorial[] = [{
      objetivo: refResumen, titulo: "Tu panel de stand",
      texto: vendeStand
        ? `Aquí ves cuántos boletos llevas vendidos, cuántos te quedan de tu cupo de ${cupoStand} y tu ganancia: $1 por cada boleto.`
        : "Aquí ves tu plan y cuántas misiones llevas puestas.",
    }];
    if (vendeStand && !agotadoStand) p.push({ objetivo: rVender, titulo: "Vender boletos", texto: "Escanea el QR de un boleto en blanco, elige el tipo y anota al comprador. Cada venta descuenta uno de tu cupo; al llegar a cero, tu venta se cierra sola." });
    if (vendeStand) p.push({ objetivo: rVentas, titulo: "Mis ventas", texto: "La lista de todo lo que has vendido, con el total y tu comisión acumulada." });
    p.push({ objetivo: rMisiones, titulo: "Mis misiones", texto: `Escribe ${misionesStand === 1 ? "la misión" : `las ${misionesStand} misiones`} de tu stand para el Level Pass. Ojo: una vez guardada, no se puede cambiar. Si es de compra, ponla entre $2 y $5. También puedes comprar misiones extra.` });
    p.push({ objetivo: rXp, titulo: "Dar EXP", texto: "El día del evento, cuando alguien cumpla tu misión, escanea su boleto aquí para darle la experiencia." });
    return p;
  }, [vendeStand, agotadoStand, cupoStand, misionesStand]);

  const fondo = "min-h-[100dvh] bg-[#07060a] px-4 text-white";
  const relleno = { paddingTop: "calc(env(safe-area-inset-top) + 1rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" };

  if (loading) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#07060a]"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>;

  if (!isAuthenticated) {
    return (
      <div className={fondo} style={relleno}>
        <div className="mx-auto max-w-md">
          <div className="lc-hoja mt-16 rounded-[28px] p-7 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5007d]/15 text-[#ff3d9e]"><Ticket size={24} /></span>
            <p className="text-[21px] font-bold">Boletería</p>
            <p className="mb-6 mt-2 text-[14px] leading-relaxed text-[#9a93a6]">Entra con tu correo: verás tus herramientas del evento o tu Level Pass, según lo que tengas asignado.</p>
            <button onClick={openLoginModal} className="w-full rounded-full bg-[#e5007d] py-4 text-[15px] font-bold">Iniciar sesión</button>
            <Link href="/" className="mt-3 block py-2 text-[13px] text-[#9a93a6]">Volver a la web</Link>
          </div>
        </div>
      </div>
    );
  }

  const por = (c: Portal["clave"]) => roles.find(r => r.clave === c);
  const vender = por("vender"), xp = por("xp"), acceso = por("acceso");

  // Venta: lo que hace una tienda (o el administrador en la taquilla propia)
  const venta: Tarjeta[] = vender ? [
    vender,
    { clave: "bonos", href: "/vender?modo=bonos", texto: "Canjear bonos", descripcion: "Descuenta los bonos de consumo de un boleto", icono: Gift, color: "#34d399" },
    { clave: "ventas", href: "/vender?modo=ventas", texto: "Mis ventas", descripcion: "Lo que llevas vendido y cuánto suma", icono: Receipt, color: "#a78bfa" },
  ] : [];
  // El día del evento: puerta y estaciones de experiencia
  const evento: Tarjeta[] = [acceso, xp].filter(Boolean) as Tarjeta[];
  const otras: Tarjeta[] = roles.filter(r => r.clave === "rueda" || r.clave === "stands");
  const stand: Tarjeta[] = roles.filter(r => r.clave === "misiones");
  const levelPass: Tarjeta[] = tieneBoleto ? [pase] : [];
  const sinNada = !esAdmin && !stand.length && !venta.length && !evento.length && !otras.length && !levelPass.length;

  return (
    <div className={fondo} style={relleno}>
      <div className={`mx-auto ${vista === "admin" && esAdmin ? "max-w-3xl" : "max-w-md"}`}>
        <div className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff3d9e]">Boletería · Isekai World Fest</p>
            <p className="mt-1 truncate text-[22px] font-bold">Hola, {(user?.name || "").split(" ")[0] || "equipo"}</p>
          </div>
          <div className="flex gap-1.5">
            <Link href="/" aria-label="Ir a la web" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><Home size={17} /></Link>
            <button onClick={() => logout()} aria-label="Cerrar sesión" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><LogOut size={17} /></button>
          </div>
        </div>

        {esAdmin && (
          <div className="lc-segmento mb-5 grid grid-cols-2 rounded-full p-1">
            {([["operar", "Operar", Ticket], ["admin", "Administrar", Settings2]] as const).map(([id, texto, Icono]) => (
              <button key={id} onClick={() => setVista(id)} aria-pressed={vista === id}
                className={`flex items-center justify-center gap-2 rounded-full text-[14px] font-semibold ${vista === id ? "bg-[#e5007d] text-white" : "text-[#9a93a6]"}`} style={{ minHeight: 44 }}>
                <Icono size={16} /> {texto}
              </button>
            ))}
          </div>
        )}

        {vista === "admin" && esAdmin ? (
          <div className="flex flex-col gap-4"><TiendasStandAdmin soloPendientes /><TicketsAdmin compact /></div>
        ) : cargando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>
        ) : sinNada ? (
          <div className="rounded-3xl bg-white/[0.035] p-6 text-center">
            <p className="text-[15px] font-semibold">Tu cuenta no tiene nada asignado todavía</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#9a93a6]">Entraste como <strong className="text-white">{user?.email}</strong>. Si eres del equipo, pídele al organizador que te agregue con este correo. Si compraste tu entrada, tu Level Pass aparece aquí cuando la tienda la registre con este mismo correo.</p>
            <Link href="/worldfest/pass" className="mt-4 inline-block rounded-full bg-white/[0.08] px-5 py-3 text-[13.5px] font-semibold">Tengo mi boleto en la mano</Link>
          </div>
        ) : (
          <>
            {panel && <ResumenStand panel={panel} refCaja={refResumen} />}
            <Grupo titulo="Venta de boletos" tarjetas={panel?.cupo.agotado ? venta.filter(v => v.clave !== "vender") : venta} refs={refs} />
            <Grupo titulo="Tu stand en el Level Pass" tarjetas={stand} refs={refs} />
            <Grupo titulo="Durante el evento" tarjetas={evento} refs={refs} />
            <Grupo titulo={venta.length || evento.length ? "Como asistente" : "Tu entrada"} tarjetas={levelPass} />
            <Grupo titulo="Otras herramientas" tarjetas={otras} />
            {panel && (
              <>
                <button onClick={() => abrirTutorial.current?.()} className="mx-auto mt-2 block py-2 text-[13px] font-semibold text-[#7dd8ff]">Ver el tutorial otra vez</button>
                <TutorialGuiado pasos={pasos} disparador={refResumen} claveVisto="iw_tutorial_boleteria_stand_v1" abrirRef={abrirTutorial}
                  textos={{ saltar: "Saltar", siguiente: "Siguiente", entendido: "Entendido", paso: "Paso {n} de {t}", tocaAqui: "Toca aquí" }} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
