import { useState } from "react";
import { ExternalLink, Link2, Handshake, Users, UserPlus, Trash2, Loader2, Copy } from "lucide-react";
import { confirmar } from "./ui";
import { VentanaRueda, Hoja, campoRueda, etiquetaRueda } from "@/components/rueda/ListaRueda";
import { useSocketEvento } from "@/hooks/useSocket";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Acceso del administrador a la invitación de la rueda de negocios.
 * Muestra cuántos confirmaron asistencia (en tiempo real), abre la
 * invitación y copia su enlace para compartirlo o ponerlo en un QR.
 */
const URL_INVITACION = "https://isekaiworld.co/rueda-de-negocios";

export default function TarjetaRuedaPrensa() {
  const utils = trpc.useUtils();
  // El número llega en vivo; la consulta periódica queda solo de respaldo
  const { data, isLoading } = trpc.prensa.total.useQuery(undefined, { refetchInterval: 60_000 });
  const [destello, setDestello] = useState(0);
  const [verLista, setVerLista] = useState(false);
  const [verStaff, setVerStaff] = useState(false);

  useSocketEvento<{ total: number; hoy: number }>("prensa:confirmacion", conteo => {
    utils.prensa.total.setData(undefined, conteo);
    setDestello(d => d + 1);
    toast.success(`🎟️ Nueva confirmación · ya son ${conteo.total}`);
    void utils.prensa.lista.invalidate();
  });
  useSocketEvento("prensa:datos", () => { void utils.prensa.lista.invalidate(); });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(URL_INVITACION);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar: " + URL_INVITACION);
    }
  };

  // Colores fijos en línea: el tema claro/oscuro del panel no los altera
  return (
    <div
      className="rounded-2xl w-full p-4 sm:p-5"
      style={{ background: "#050505", border: "1px solid rgba(229,0,125,0.55)", boxShadow: "0 0 24px -8px rgba(229,0,125,0.45)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#ff3d9e" }}>
            <Handshake size={12} /> Rueda de negocios
          </p>
          <p className="text-[15px] font-bold leading-snug" style={{ color: "#ffffff" }}>Sábado 7 de noviembre</p>
          <p className="text-[15px] font-bold leading-snug" style={{ color: "#ffffff" }}>4:30 p. m.</p>
          <p className="mt-1 text-xs" style={{ color: "#9a9a9a" }}>Arena Panter, CC Costa Verde</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            key={destello}
            className={`text-4xl font-black leading-none ${destello > 0 ? "animate-[prensa-pop_0.6s_ease-out]" : ""}`}
            style={{ color: "#ff3d9e", textShadow: "0 0 18px rgba(255,61,158,0.45)" }}
          >
            {isLoading ? "…" : (data?.total ?? 0)}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#bdbdbd" }}>
            confirmados
          </p>
          {data && data.hoy > 0 && (
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#7a7a7a" }}>{data.hoy} hoy</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <a
          href="/rueda-de-negocios"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          style={{ background: "#e5007d", color: "#ffffff" }}
        >
          <ExternalLink size={14} /> Abrir invitación
        </a>
        <button
          onClick={copiar}
          className="rounded-full flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
          style={{ background: "#141414", color: "#ffffff", border: "1px solid rgba(255,255,255,0.18)" }}
        >
          <Link2 size={14} /> Copiar enlace
        </button>
      </div>
      <button
        onClick={() => setVerLista(true)}
        className="rounded-full mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
        style={{ background: "#141414", color: "#ff3d9e", border: "1px solid rgba(229,0,125,0.45)" }}
      >
        <Users size={14} /> Confirmados y asistencia
      </button>
      <button
        onClick={() => setVerStaff(true)}
        className="rounded-full mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold"
        style={{ background: "#141414", color: "#ffffff", border: "1px solid rgba(255,255,255,0.18)" }}
      >
        <UserPlus size={14} /> Staff de la rueda
      </button>
      {verLista && <VentanaRueda onCerrar={() => setVerLista(false)} />}
      {verStaff && <StaffRueda onCerrar={() => setVerStaff(false)} />}
    </div>
  );
}

const URL_STAFF = "https://isekaiworld.co/staff/rueda";

/**
 * Personas que ayudan en la entrada de la rueda. Solo ven la lista y marcan
 * quién llegó: no ven el panel, ni ventas, ni pueden borrar.
 */
function StaffRueda({ onCerrar }: { onCerrar: () => void }) {
  const utils = trpc.useUtils();
  const { data: staff = [], isLoading } = trpc.prensa.staff.useQuery();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const agregar = trpc.prensa.agregarStaff.useMutation({
    onSuccess: () => { toast.success("Agregado al staff"); setNombre(""); setEmail(""); void utils.prensa.staff.invalidate(); },
    onError: e => toast.error(e.message.includes("email") ? "Revisa el correo" : e.message),
  });
  const quitar = trpc.prensa.quitarStaff.useMutation({
    onSuccess: () => { toast.success("Quitado del staff"); void utils.prensa.staff.invalidate(); },
    onError: e => toast.error(e.message),
  });
  const copiarEnlace = async () => {
    try { await navigator.clipboard.writeText(URL_STAFF); toast.success("Enlace copiado"); } catch { toast.error(URL_STAFF); }
  };

  return (
    <Hoja titulo="Staff de la rueda" subtitulo="Solo ven la lista de tiendas y marcan «Asistió». No entran al panel." onCerrar={onCerrar}>
      <div className="mb-5 rounded-3xl bg-white/[0.04] p-4">
        <p className="text-[13px] leading-relaxed text-[#cfc9d8]">
          Pásales este enlace. Inician sesión con el <strong className="text-white">mismo correo</strong> que agregues aquí.
        </p>
        <button onClick={copiarEnlace} className="mt-3 flex w-full items-center gap-2 rounded-full bg-white/[0.07] px-4 py-3 text-left text-[13px] text-white">
          <span className="min-w-0 flex-1 truncate">isekaiworld.co/staff/rueda</span>
          <Copy size={15} className="shrink-0 text-[#9a93a6]" />
        </button>
      </div>

      <label className={etiquetaRueda}>Nombre</label>
      <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={80} placeholder="Ej. Ana" className={`${campoRueda} mb-3`} />
      <label className={etiquetaRueda}>Correo con el que inicia sesión</label>
      <input value={email} onChange={e => setEmail(e.target.value.trim())} inputMode="email" autoCapitalize="none" placeholder="ana@gmail.com" className={`${campoRueda} mb-4`} />
      <button
        onClick={() => agregar.mutate({ email, nombre })}
        disabled={!email.includes("@") || agregar.isPending}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[14px] font-bold text-white disabled:opacity-50"
        style={{ background: "#e5007d" }}
      >
        {agregar.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Agregar al staff
      </button>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9a93a6]">Con acceso · {staff.length}</p>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
      ) : staff.length === 0 ? (
        <p className="rounded-2xl bg-white/[0.03] px-4 py-4 text-[13px] text-[#9a93a6]">Todavía no hay nadie. Agrega a quien te ayude en la entrada.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {staff.map(s => (
            <li key={s.email} className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white">{s.nombre}</p>
                <p className="truncate text-[12px] text-[#9a93a6]">{s.email}</p>
              </div>
              <button
                onClick={async () => { if (await confirmar({ titulo: "Quitar acceso", mensaje: `${s.nombre} ya no podrá ver la lista.`, confirmar: "Quitar", peligro: true })) quitar.mutate({ email: s.email }); }}
                aria-label={`Quitar a ${s.nombre}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6f6878] hover:text-[#f87171]"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Hoja>
  );
}
