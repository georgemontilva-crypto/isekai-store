import { Briefcase, ChevronRight, Home, LayoutDashboard, Loader2, LogOut } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { usePortales } from "@/hooks/usePortales";

/**
 * «Mis herramientas» (/equipo): el punto de entrada único del equipo del
 * evento. Cada persona ve solo lo que le asignaron (vender, dar EXP, puerta,
 * rueda de negocios), sin tener que recordar direcciones sueltas.
 */
export default function Equipo() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { roles, esAdmin, pase, tieneBoleto } = usePortales();

  const marco = (hijos: React.ReactNode) => (
    <div className="min-h-[100dvh] bg-[#07060a] px-4 text-white" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>
      <div className="mx-auto max-w-md">{hijos}</div>
    </div>
  );

  if (loading) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#07060a]"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>;

  if (!isAuthenticated) {
    return marco(
      <div className="lc-hoja mt-16 rounded-[28px] p-7 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5007d]/15 text-[#ff3d9e]"><Briefcase size={24} /></span>
        <p className="text-[21px] font-bold">Equipo del evento</p>
        <p className="mb-6 mt-2 text-[14px] leading-relaxed text-[#9a93a6]">Entra con el correo que te registraron para ver tus herramientas.</p>
        <button onClick={openLoginModal} className="w-full rounded-full bg-[#e5007d] py-4 text-[15px] font-bold">Iniciar sesión</button>
        <Link href="/" className="mt-3 block py-2 text-[13px] text-[#9a93a6]">Volver a la web</Link>
      </div>,
    );
  }

  return marco(
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ff3d9e]">Equipo del evento</p>
          <p className="mt-1 truncate text-[22px] font-bold">Hola, {(user?.name || "").split(" ")[0] || "equipo"}</p>
        </div>
        <div className="flex gap-1.5">
          <Link href="/" aria-label="Ir a la web" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><Home size={17} /></Link>
          <button onClick={() => logout()} aria-label="Cerrar sesión" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><LogOut size={17} /></button>
        </div>
      </div>

      {roles.length === 0 && !esAdmin ? (
        <div className="rounded-3xl bg-white/[0.035] p-6 text-center">
          <p className="text-[15px] font-semibold">Tu cuenta no tiene funciones asignadas</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#9a93a6]">Entraste como <strong className="text-white">{user?.email}</strong>. Pídele al organizador que te agregue al equipo con este correo.</p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-[12px] font-semibold text-[#9a93a6]">Tus herramientas</p>
          <ul className="flex flex-col gap-2.5">
            {esAdmin && (
              <li>
                <Link href="/admin" className="flex items-center gap-4 rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4 active:bg-white/[0.06]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08]"><LayoutDashboard size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">Panel de administración</span>
                    <span className="block text-[12.5px] text-[#9a93a6]">Boletería, equipo, ventas y todo lo demás</span>
                  </span>
                  <ChevronRight size={18} className="text-[#6f6878]" />
                </Link>
              </li>
            )}
            {roles.map(r => (
              <li key={r.clave}>
                <Link href={r.href} className="flex items-center gap-4 rounded-3xl border p-4 active:opacity-80" style={{ borderColor: `${r.color}40`, background: `${r.color}0f` }}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${r.color}24`, color: r.color }}><r.icono size={22} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">{r.texto}</span>
                    <span className="block text-[12.5px] text-[#9a93a6]">{r.descripcion}</span>
                  </span>
                  <ChevronRight size={18} className="text-[#6f6878]" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {tieneBoleto && (
        <>
          <p className="mb-2 mt-6 text-[12px] font-semibold text-[#9a93a6]">Como asistente</p>
          <Link href={pase.href} className="flex items-center gap-4 rounded-3xl border border-white/[0.06] bg-white/[0.035] p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${pase.color}24`, color: pase.color }}><pase.icono size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{pase.texto}</span>
              <span className="block text-[12.5px] text-[#9a93a6]">{pase.descripcion}</span>
            </span>
            <ChevronRight size={18} className="text-[#6f6878]" />
          </Link>
        </>
      )}
    </>,
  );
}
