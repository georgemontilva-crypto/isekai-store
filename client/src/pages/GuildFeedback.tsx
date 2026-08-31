import { useState } from "react";
import { Loader2, Check, MessageSquare, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";

/**
 * Buzón de mejoras del Cosplay Guild.
 *
 * Un espacio para que los cosplayers digan qué mejorar. Su nombre NO se
 * muestra a nadie más — solo lo ve la organización — y quien quiera puede
 * enviar de forma totalmente anónima, sin que quede rastro de quién escribió.
 *
 * Se pide sesión iniciada para evitar spam, no para identificar a nadie.
 */

const CATEGORIAS = [
  { id: "experiencia",  label: "Mi experiencia en el Guild", desc: "Cómo te sientes formando parte" },
  { id: "actividades",  label: "Actividades y misiones",     desc: "Dificultad, plazos, recompensas" },
  { id: "comunicacion", label: "Comunicación",               desc: "Cómo nos explicamos y respondemos" },
  { id: "pagos",        label: "Comisiones y pagos",         desc: "Tiempos, montos, retiros" },
  { id: "eventos",      label: "Eventos",                    desc: "Organización, espacios, trato" },
  { id: "otro",         label: "Otra cosa",                  desc: "Lo que no encaje arriba" },
] as const;

export default function GuildFeedback() {
  const { user, isAuthenticated, loading } = useAuth();

  const [categoria, setCategoria] = useState<string>("");
  const [valoracion, setValoracion] = useState<number>(0);
  const [mensaje, setMensaje] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = trpc.feedback.enviar.useMutation({
    onSuccess: () => {
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (e) => toast.error(e.message),
  });

  const puedeEnviar = categoria && mensaje.trim().length >= 10 && !enviar.isPending;

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
      </div>
    );
  }

  // ── Enviado ──
  if (enviado) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0a0a0a] px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#e5007d]/15">
            <Check className="h-7 w-7 text-[#e5007d]" />
          </div>
          <h1 className="mb-3 text-2xl font-black text-white">Gracias por escribir</h1>
          <p className="mb-8 text-sm leading-relaxed text-[#b4b4c2]">
            Lo leemos todo. No siempre podremos responder uno por uno, pero cada mensaje
            cambia cómo hacemos las cosas.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setEnviado(false); setCategoria(""); setMensaje(""); setValoracion(0);
                window.scrollTo({ top: 0 });
              }}
              className="w-full rounded-xl border border-white/10 font-bold text-white"
              style={{ minHeight: 50 }}
            >
              Escribir otra cosa
            </button>

          </div>
        </div>
      </div>
    );
  }

  // ── Sin sesión ──
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-[#0a0a0a] px-6">
        <div className="max-w-sm text-center">
          <MessageSquare className="mx-auto mb-4 h-10 w-10 text-[#3a3a48]" />
          <h1 className="mb-3 text-xl font-black text-white">Buzón de mejoras</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#b4b4c2]">
            Entra con tu cuenta para escribirnos. Te lo pedimos solo para evitar mensajes
            automáticos: <strong className="text-white">tu nombre no se muestra a nadie</strong>.
          </p>
          <button
            onClick={openLoginModal}
            className="w-full rounded-xl bg-[#e5007d] font-bold text-white"
            style={{ minHeight: 52 }}
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  const campo = "w-full rounded-xl border border-white/10 bg-[#101319] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-white">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6">

        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#e5007d]">
          Cosplay Guild
        </p>
        <h1 className="mb-3 text-3xl font-black leading-tight sm:text-4xl">
          ¿Qué podemos hacer mejor?
        </h1>
        <p className="mb-8 text-[15px] leading-relaxed text-[#b4b4c2]">
          Este espacio existe para escucharte. Cuéntanos qué funciona, qué no, y qué
          cambiarías. Sin filtros.
        </p>

        {/* Cómo se trata su identidad: dicho claro y sin promesas falsas */}
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#ff45a0]" />
          <div className="text-xs leading-relaxed text-[#b4b4c2]">
            <p className="font-bold text-white">Tu nombre no se muestra a nadie</p>
            <p className="mt-1">
              Ningún otro cosplayer ve quién escribió qué. Solo la organización lo ve, para
              poder darte seguimiento si hace falta. Si prefieres que ni nosotros sepamos
              quién eres, marca el envío anónimo más abajo.
            </p>
          </div>
        </div>

        {/* Categoría */}
        <p className="mb-3 text-sm font-bold">¿De qué quieres hablar?</p>
        <div className="mb-8 grid gap-2 sm:grid-cols-2">
          {CATEGORIAS.map(c => (
            <button
              key={c.id}
              onClick={() => setCategoria(c.id)}
              className={`rounded-xl border px-4 py-3.5 text-left transition-colors ${
                categoria === c.id
                  ? "border-[#e5007d] bg-[#e5007d]/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <p className={`text-sm font-bold ${categoria === c.id ? "text-[#ff45a0]" : "text-white"}`}>
                {c.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#8a8a9c]">{c.desc}</p>
            </button>
          ))}
        </div>

        {/* Valoración */}
        <p className="mb-1 text-sm font-bold">¿Cómo va tu experiencia hasta ahora?</p>
        <p className="mb-3 text-xs text-[#8a8a9c]">Opcional</p>
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setValoracion(valoracion === n ? 0 : n)}
              aria-label={`${n} de 5`}
              className="transition-transform active:scale-90"
            >
              <Star
                size={30}
                className={n <= valoracion ? "fill-[#e5007d] text-[#e5007d]" : "text-white/20"}
              />
            </button>
          ))}
          {valoracion > 0 && (
            <span className="ml-2 text-sm text-[#b4b4c2]">{valoracion} de 5</span>
          )}
        </div>

        {/* Mensaje */}
        <p className="mb-3 text-sm font-bold">Cuéntanos</p>
        <textarea
          rows={7}
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          placeholder="Sé todo lo directo que quieras. Lo que más ayuda son los ejemplos concretos: qué pasó, cuándo, y qué habrías esperado."
          className={`${campo} resize-y py-3.5 leading-relaxed`}
        />
        <p className="mb-8 mt-2 text-right text-[11px] text-[#6a6a7c]">
          {mensaje.trim().length < 10
            ? `Escribe al menos ${10 - mensaje.trim().length} caracteres más`
            : `${mensaje.length} caracteres`}
        </p>

        {/* Anonimato real */}
        <button
          onClick={() => setAnonimo(!anonimo)}
          className={`mb-8 flex w-full items-start gap-3 rounded-xl border px-4 py-4 text-left transition-colors ${
            anonimo ? "border-[#e5007d] bg-[#e5007d]/10" : "border-white/10"
          }`}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              anonimo ? "border-[#e5007d] bg-[#e5007d]" : "border-white/25"
            }`}
          >
            {anonimo && <Check size={13} className="text-white" />}
          </span>
          <span>
            <span className={`block text-sm font-bold ${anonimo ? "text-[#ff45a0]" : "text-white"}`}>
              Enviar de forma totalmente anónima
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-[#8a8a9c]">
              No se guardará ningún dato tuyo junto al mensaje, ni siquiera para nosotros.
              Ten en cuenta que así no podremos responderte ni pedirte detalles.
            </span>
          </span>
        </button>

        <button
          onClick={() => enviar.mutate({
            categoria: categoria as any,
            valoracion: valoracion || undefined,
            mensaje: mensaje.trim(),
            anonimo,
          })}
          disabled={!puedeEnviar}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e5007d] text-base font-bold text-white transition-colors hover:bg-[#c4006b] disabled:bg-white/[0.06] disabled:text-[#6a6a7c]"
          style={{ minHeight: 54 }}
        >
          {enviar.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
          Enviar
        </button>

        <p className="mt-4 text-center text-xs leading-relaxed text-[#6a6a7c]">
          Puedes escribir tantas veces como quieras. Si algo cambia gracias a ti, lo contaremos.
        </p>
      </div>
    </div>
  );
}
