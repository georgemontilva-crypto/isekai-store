import { Handshake, Home, Loader2, LogOut } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { ListaRueda } from "@/components/rueda/ListaRueda";

/**
 * Página del staff de la rueda de negocios (/staff/rueda). Se abre en el
 * teléfono en la entrada: lista de tiendas y botón «Asistió». Nada más.
 */
export default function StaffRueda() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { data: acceso, isLoading } = trpc.prensa.miAcceso.useQuery(undefined, { enabled: isAuthenticated, retry: false });

  const marco = (contenido: React.ReactNode) => (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#07060a] px-6 text-center">
      <div className="lc-hoja w-full max-w-sm rounded-[28px] p-7">{contenido}</div>
    </div>
  );

  if (loading || (isAuthenticated && isLoading)) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#07060a]"><Loader2 className="animate-spin text-[#ff3d9e]" /></div>;
  }

  const icono = (
    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(229,0,125,0.14)", color: "#ff3d9e" }}>
      <Handshake size={26} />
    </span>
  );

  if (!isAuthenticated) {
    return marco(<>
      {icono}
      <p className="text-[21px] font-bold text-white">Staff · Rueda de negocios</p>
      <p className="mb-6 mt-2 text-[14px] leading-relaxed text-[#9a93a6]">Entra con el correo que te registraron para marcar la asistencia de las tiendas.</p>
      <button onClick={openLoginModal} className="w-full rounded-full py-4 text-[15px] font-bold text-white" style={{ background: "#e5007d" }}>Iniciar sesión</button>
      <Link href="/" className="mt-3 block py-2 text-[13px] text-[#9a93a6]">Volver a la web</Link>
    </>);
  }

  if (!acceso?.puede) {
    return marco(<>
      {icono}
      <p className="text-[19px] font-bold text-white">Tu cuenta no tiene acceso</p>
      <p className="mb-6 mt-2 text-[14px] leading-relaxed text-[#9a93a6]">
        Entraste como <strong className="text-white">{user?.email}</strong>. Pídele al organizador que te agregue al staff con ese correo.
      </p>
      <button onClick={() => logout()} className="flex w-full items-center justify-center gap-2 rounded-full bg-white/[0.07] py-3.5 text-[14px] font-semibold text-white">
        <LogOut size={16} /> Entrar con otro correo
      </button>
      <Link href="/" className="mt-3 block py-2 text-[13px] text-[#9a93a6]">Volver a la web</Link>
    </>);
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-[#07060a]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto flex h-full w-full max-w-lg flex-col overflow-hidden">
        <ListaRueda
          modo={acceso.esAdmin ? "admin" : "staff"}
          arriba={
            <div className="flex items-center justify-between px-5 pt-3">
              <p className="truncate text-[12px] text-[#6f6878]">{user?.name || user?.email}</p>
              <div className="flex gap-1">
                <Link href="/" aria-label="Ir a la web" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><Home size={16} /></Link>
                <button onClick={() => logout()} aria-label="Cerrar sesión" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-[#cfc9d8]"><LogOut size={16} /></button>
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}
