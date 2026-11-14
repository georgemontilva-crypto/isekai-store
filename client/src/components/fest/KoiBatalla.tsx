import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Crown, Loader2, Swords, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cargarSocketIo } from "@/lib/socketCliente";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import KoiVivo, { type KoiVivoRef } from "./KoiVivo";

/**
 * Koi-sama: batalla en vivo. Todos golpean a la vez, sin tope de golpes; los
 * golpes seguidos arman combos que multiplican el daño. La vida baja en vivo
 * para todos y, cuando llega a cero, gana quien dio el GOLPE FINAL (uno solo).
 * Para que los golpes cuenten hay que tener cuenta y unirse a la batalla.
 */
type Estado = {
  listo: boolean; estado: "espera" | "activo" | "derrotado"; vidaMax: number; vida: number; jugadores: number;
  ganador: string | null; top: { nombre: string; danio: number; golpes: number }[];
};
const NIVELES = [{ desde: 100, x: 4 }, { desde: 50, x: 3 }, { desde: 25, x: 2 }, { desde: 10, x: 1.5 }];
const PAUSA_COMBO_MS = 1500;
const n = (v: number) => v.toLocaleString("es-VE");
const multDe = (racha: number) => NIVELES.find(l => racha >= l.desde)?.x ?? 1;

/** El pez, dibujado: se usa mientras no haya un arte propio cargado */
export function KoiArte({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label="Koi-sama">
      <defs>
        <radialGradient id="koi-cuerpo" cx="50%" cy="38%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#dbe7ee" /></radialGradient>
        <linearGradient id="koi-aleta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb347" stopOpacity=".95" /><stop offset="1" stopColor="#ff5a36" stopOpacity=".55" /></linearGradient>
      </defs>
      {/* cola */}
      <path d="M120 232 C92 262 62 286 44 314 C80 304 106 292 120 272 C134 292 160 304 196 314 C178 286 148 262 120 232Z" fill="url(#koi-aleta)" />
      {/* aletas */}
      <path d="M78 118 C40 122 18 148 12 176 C44 170 70 156 86 138Z" fill="url(#koi-aleta)" />
      <path d="M162 118 C200 122 222 148 228 176 C196 170 170 156 154 138Z" fill="url(#koi-aleta)" />
      <path d="M92 196 C72 204 60 220 58 236 C76 230 90 220 98 208Z" fill="url(#koi-aleta)" opacity=".8" />
      <path d="M148 196 C168 204 180 220 182 236 C164 230 150 220 142 208Z" fill="url(#koi-aleta)" opacity=".8" />
      {/* cuerpo */}
      <path d="M120 10 C162 22 176 78 170 136 C165 186 142 226 120 246 C98 226 75 186 70 136 C64 78 78 22 120 10Z" fill="url(#koi-cuerpo)" stroke="#0b2430" strokeWidth="3" />
      {/* manchas */}
      <path d="M104 22 C132 16 156 44 150 72 C132 80 104 70 96 48 C92 36 96 26 104 22Z" fill="#ff4d2e" />
      <path d="M84 116 C108 104 140 112 150 138 C140 160 104 166 86 148 C78 138 78 124 84 116Z" fill="#ff6a2b" />
      <path d="M112 188 C128 182 144 192 142 208 C134 222 114 222 106 208 C104 198 106 192 112 188Z" fill="#ffb347" />
      <path d="M150 84 C160 86 166 98 162 108 C154 108 148 98 150 84Z" fill="#12222b" />
      {/* ojos y bigotes */}
      <circle cx="98" cy="50" r="6.5" fill="#0b2430" /><circle cx="142" cy="50" r="6.5" fill="#0b2430" />
      <circle cx="96" cy="48" r="2" fill="#7df9ff" /><circle cx="140" cy="48" r="2" fill="#7df9ff" />
      <path d="M102 18 C90 6 78 4 68 8 M138 18 C150 6 162 4 172 8" fill="none" stroke="#0b2430" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Canal en vivo de la batalla. Devuelve cómo mandar golpes por él. */
function useKoiSocket(alEstado: (e: Estado) => void, alAviso: (tipo: "inicio" | "fin" | "reinicio") => void, sesion: boolean) {
  const sock = useRef<Socket | null>(null);
  const cb = useRef({ alEstado, alAviso }); cb.current = { alEstado, alAviso };
  useEffect(() => {
    let cerrado = false, s: Socket | null = null;
    void cargarSocketIo().then(({ io }) => {
      if (cerrado) return;
      s = io(window.location.origin, { transports: ["websocket", "polling"], auth: { koi: true }, reconnectionDelay: 600, reconnectionDelayMax: 4000 });
      sock.current = s;
      s.on("koi:estado", (e: Estado) => cb.current.alEstado(e));
      s.on("koi:inicio", () => cb.current.alAviso("inicio"));
      s.on("koi:fin", () => cb.current.alAviso("fin"));
      s.on("koi:reinicio", () => cb.current.alAviso("reinicio"));
      s.io.on("reconnect", () => cb.current.alAviso("reinicio"));
    });
    const volver = () => { if (s && !s.connected) s.connect(); cb.current.alAviso("reinicio"); };
    window.addEventListener("iw:volver", volver);
    return () => { cerrado = true; window.removeEventListener("iw:volver", volver); s?.disconnect(); sock.current = null; };
    // Al iniciar o cerrar sesión se reconecta para que el canal sepa quién golpea
  }, [sesion]);
  return sock;
}

export default function KoiBatalla({ en, imagen, onEstado }: { en: boolean; imagen?: string; onEstado?: (puedeSalir: boolean) => void }) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data, refetch } = trpc.koi.estado.useQuery(undefined, { refetchInterval: 6000 });
  const [vivo, setVivo] = useState<Estado | null>(null);
  const e: Estado | null = vivo ?? (data ? { listo: data.listo, estado: data.estado, vidaMax: data.vidaMax, vida: data.vida, jugadores: data.jugadores, ganador: data.ganador, top: data.top } : null);
  const yo = data?.yo;
  const [misGolpes, setMisGolpes] = useState(0);
  const [miDanio, setMiDanio] = useState(0);
  const [racha, setRacha] = useState(0);
  /** Efectos de cada golpe, los mismos del jefe de rango S: onda, corte, chispas y número */
  const [impactos, setImpactos] = useState<{ id: number; x: number; y: number; rot: number; t: string; fuerte: boolean }[]>([]);
  const [anuncio, setAnuncio] = useState<{ id: number; texto: string } | null>(null);
  const pez = useRef<KoiVivoRef>(null);
  const pezCaja = useRef<HTMLSpanElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const [nombre, setNombre] = useState("");

  // En esta mazmorra la salida siempre está abierta
  useEffect(() => { onEstado?.(true); }, [onEstado]);
  // Con cada respuesta del servidor se toma la más reciente
  useEffect(() => { if (data) setVivo(null); }, [data]);
  useEffect(() => { if (yo) { setMisGolpes(g => Math.max(g, yo.golpes)); setMiDanio(d => Math.max(d, yo.danio)); } }, [yo]);
  useEffect(() => { if (!nombre && user?.name) setNombre(String(user.name).split(" ")[0].slice(0, 22)); }, [user, nombre]);

  const sock = useKoiSocket(
    est => setVivo(est),
    tipo => {
      if (tipo === "reinicio") { setMisGolpes(0); setMiDanio(0); setRacha(0); }
      if (tipo === "inicio") { try { navigator.vibrate?.([60, 40, 120]); } catch { /* */ } }
      void refetch();
    },
    isAuthenticated,
  );

  const unir = trpc.koi.unirme.useMutation({
    onSuccess: () => { toast.success(en ? "You're in!" : "¡Estás dentro!"); void utils.koi.estado.invalidate(); },
    onError: err => toast.error(err.message),
  });
  const respaldo = trpc.koi.golpear.useMutation();

  // ── Golpes: se acumulan y salen en lotes cortos ──
  const pendiente = useRef(0);
  const ultimoToque = useRef(0);
  const rachaLocal = useRef(0);
  const idFlot = useRef(0);
  const registrado = Boolean(yo?.registrado);
  const activo = e?.estado === "activo";

  // Al arrancar la quest la vista sube sola: vida, pez y combo quedan a la vista
  const cajaRef = useRef<HTMLElement>(null);
  useEffect(() => { if (activo) cajaRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [activo]);

  const recibir = useCallback((r: any) => {
    if (!r?.ok) { if (r?.sinRegistro) void utils.koi.estado.invalidate(); return; }
    if (r.contados) { setMisGolpes(g => g + r.contados); setMiDanio(d => d + r.danio); }
    // La racha del servidor más los toques que aún van de camino: así el combo no parpadea
    if (typeof r.racha === "number") { rachaLocal.current = r.racha + pendiente.current; setRacha(rachaLocal.current); }
    if (r.golpeFinal) void refetch();
  }, [refetch, utils]);

  // El envío no puede depender de nada que cambie con cada toque: si no, el
  // reloj se reiniciaría en cada golpe y los lotes solo saldrían al parar.
  const envio = useRef({ recibir, respaldar: respaldo.mutate });
  envio.current = { recibir, respaldar: respaldo.mutate };
  useEffect(() => {
    if (!activo || !registrado) return;
    const t = window.setInterval(() => {
      const lote = pendiente.current;
      if (lote <= 0) {
        if (rachaLocal.current && Date.now() - ultimoToque.current > PAUSA_COMBO_MS) { rachaLocal.current = 0; setRacha(0); }
        return;
      }
      pendiente.current = 0;
      const s = sock.current;
      if (s?.connected) s.emit("koi:golpes", Math.min(lote, 200), (r: unknown) => envio.current.recibir(r));
      else envio.current.respaldar({ n: Math.min(lote, 200) }, { onSuccess: r => envio.current.recibir(r) });
    }, 250);
    return () => window.clearInterval(t);
  }, [activo, registrado, sock]);

  /** Reinicia una animación CSS sin volver a montar el elemento */
  const reanimar = (el: HTMLElement | null, clase: string) => {
    if (!el) return;
    el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase);
  };

  const golpe = (ev: React.PointerEvent<HTMLButtonElement>) => {
    if (!ev.isTrusted || !activo || !registrado) return;
    const ahora = Date.now();
    if (ahora - ultimoToque.current > PAUSA_COMBO_MS) rachaLocal.current = 0;
    ultimoToque.current = ahora;
    rachaLocal.current += 1;
    pendiente.current += 1;
    const r = rachaLocal.current, x = multDe(r);
    setRacha(r);
    const caja = ev.currentTarget.getBoundingClientRect();
    const id = ++idFlot.current;
    const f = { id, x: ev.clientX - caja.left, y: ev.clientY - caja.top, rot: -60 + ((r * 47) % 120), t: `−${x}`, fuerte: x > 1 };
    setImpactos(l => [...l.slice(-8), f]);
    window.setTimeout(() => setImpactos(l => l.filter(q => q.id !== id)), 700);
    // El pez se estremece y huye del punto tocado
    const lienzo = pezCaja.current?.getBoundingClientRect();
    pez.current?.golpe(lienzo ? ev.clientX - lienzo.left : undefined, lienzo ? ev.clientY - lienzo.top : undefined);
    reanimar(pezCaja.current, "ev2-sacudir");
    reanimar(barra.current, "ev2-barra-golpe");
    if (r === 10 || r === 25 || r === 50 || r === 100) {
      setAnuncio({ id, texto: `COMBO ×${x}` });
      window.setTimeout(() => setAnuncio(a => (a?.id === id ? null : a)), 1100);
      reanimar(arena.current, "ev2-temblor-fuerte");
      try { navigator.vibrate?.([25, 30, 45]); } catch { /* */ }
    } else {
      try { navigator.vibrate?.(8); } catch { /* */ }
    }
  };

  if (!e) return <section className="koi"><div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#22d3ee]" /></div></section>;

  const pct = e.vidaMax > 0 ? Math.max(0, Math.min(100, (e.vida / e.vidaMax) * 100)) : 0;
  const x = multDe(racha);
  const siguiente = [...NIVELES].reverse().find(l => racha < l.desde);

  return (
    <section ref={cajaRef} className={`koi ${e.estado === "derrotado" ? "koi-fin" : ""}`}>
      <div className="koi-cab">
        <p className="pk-mono koi-rango">{en ? "LIVE BATTLE" : "BATALLA EN VIVO"} · {en ? "RANK" : "RANGO"} A</p>
        <h3 className="pk-cond koi-nombre">KOI-SAMA</h3>
        <div ref={barra} className="koi-vida" role="img" aria-label={`${en ? "Life" : "Vida"}: ${n(e.vida)} / ${n(e.vidaMax)}`}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="pk-mono koi-vida-num"><b>{n(e.vida)}</b> / {n(e.vidaMax)} HP <span><Users size={12} /> {n(e.jugadores)}</span></p>
      </div>

      {e.estado === "derrotado" ? (
        <div className="koi-ganador">
          <Crown size={44} className="koi-corona" />
          <p className="pk-mono koi-ganador-et">{en ? "FINAL BLOW" : "GOLPE FINAL"}</p>
          <p className="pk-cond koi-ganador-nombre">{e.ganador ?? "—"}</p>
          <p className="pk-mono koi-ganador-sub">{yo?.gane ? (en ? "IT WAS YOU. Show this screen to the staff." : "¡FUISTE TÚ! Muestra esta pantalla al equipo.") : (en ? "defeated Koi-sama" : "derrotó a Koi-sama")}</p>
        </div>
      ) : (
        <div ref={arena} className="koi-arena">
          <button
            type="button"
            className={`koi-blanco ${activo && registrado ? "koi-blanco-on" : ""}`}
            onPointerDown={golpe}
            disabled={!activo || !registrado}
            aria-label={en ? "Hit Koi-sama" : "Golpear a Koi-sama"}
          >
            <span className="koi-ondas" aria-hidden="true"><i /><i /><i /></span>
            {imagen
              ? <span ref={pezCaja} className="koi-pez koi-pez-img"><img src={imagen} alt="Koi-sama" className="koi-arte" draggable={false} /></span>
              : <span ref={pezCaja} className="koi-pez"><KoiVivo ref={pez} calma={!activo} /></span>}
            {impactos.map(k => (
              <span key={k.id} className="koi-impacto" style={{ left: k.x, top: k.y }} aria-hidden="true">
                <span className="ev2-impacto-onda" />
                <span className="ev2-impacto-corte" style={{ ["--rot" as string]: `${k.rot}deg` }} />
                {Array.from({ length: 6 }, (_, j) => {
                  const ang = (Math.PI * 2 * j) / 6 + k.rot / 60;
                  return <span key={j} className="ev2-chispa" style={{ ["--dx" as string]: `${Math.cos(ang) * 42}px`, ["--dy" as string]: `${Math.sin(ang) * 42}px` }} />;
                })}
                <span className={`ev2-danio koi-danio ${k.fuerte ? "koi-danio-x" : ""}`}>{k.t}</span>
              </span>
            ))}
            {anuncio && (
              <span key={anuncio.id} className="koi-anuncio" aria-hidden="true">
                <span className="ev2-flash-rojo" />
                <span className="ev2-anuncio ev-display">{anuncio.texto}</span>
              </span>
            )}
          </button>

          {activo && registrado && (
            <div className="koi-combo" aria-live="off">
              <p className="pk-cond koi-combo-n" style={{ opacity: racha ? 1 : 0.35 }}>{racha}<small>{en ? "COMBO" : "COMBO"}</small></p>
              <p className="pk-mono koi-combo-x" data-x={x}>×{x}</p>
              <p className="pk-mono koi-combo-sig">{siguiente ? (en ? `×${siguiente.x} at ${siguiente.desde} hits in a row` : `×${siguiente.x} a los ${siguiente.desde} golpes seguidos`) : (en ? "MAX COMBO. Don't stop!" : "COMBO MÁXIMO. ¡No pares!")}</p>
            </div>
          )}
        </div>
      )}

      {/* Qué hacer ahora */}
      <div className="koi-panel">
        {!isAuthenticated ? (
          <>
            <p className="koi-panel-t">{en ? "Register to fight" : "Regístrate para pelear"}</p>
            <p className="koi-panel-s">{en ? "Only registered hunters can land the final blow and win." : "Solo los cazadores registrados pueden dar el golpe final y ganar."}</p>
            <button className="koi-btn" onClick={openLoginModal}><Swords size={17} /> {en ? "Sign in / create account" : "Entrar o crear cuenta"}</button>
          </>
        ) : !registrado && e.estado !== "derrotado" ? (
          <>
            <p className="koi-panel-t">{en ? "Join the battle" : "Únete a la batalla"}</p>
            <p className="koi-panel-s">{en ? "This name appears on the big screen if you land the final blow." : "Este nombre sale en pantalla si das el golpe final."}</p>
            <input value={nombre} onChange={ev => setNombre(ev.target.value)} maxLength={22} placeholder={en ? "Hunter name" : "Nombre de cazador"} className="koi-input" />
            <button className="koi-btn" disabled={unir.isPending || nombre.trim().length < 2} onClick={() => unir.mutate({ nombre: nombre.trim() })}>
              {unir.isPending ? <Loader2 size={17} className="animate-spin" /> : <Swords size={17} />} {en ? "Join" : "Unirme"}
            </button>
          </>
        ) : e.estado === "espera" ? (
          <>
            <p className="koi-panel-t">{en ? `You're in, ${yo?.nombre}` : `Estás dentro, ${yo?.nombre}`}</p>
            <p className="koi-panel-s">{en ? "The quest hasn't started. When it does, tap Koi-sama as fast as you can: hits in a row build combos." : "La quest aún no empieza. Cuando arranque, toca a Koi-sama lo más rápido que puedas: los golpes seguidos arman combos."}</p>
          </>
        ) : (
          <div className="koi-mios">
            <div><b>{n(misGolpes)}</b><span>{en ? "Your hits" : "Tus golpes"}</span></div>
            <div><b>{n(miDanio)}</b><span>{en ? "Your damage" : "Tu daño"}</span></div>
            <div><b className="koi-yo">{yo?.nombre || "—"}</b><span>{en ? "Hunter" : "Cazador"}</span></div>
          </div>
        )}
      </div>

      {e.top.length > 0 && (
        <div className="koi-top">
          <p className="pk-mono koi-top-t"><Trophy size={13} /> {en ? "MOST DAMAGE" : "MÁS DAÑO"}</p>
          <ol>
            {e.top.slice(0, 5).map((t, i) => (
              <li key={`${t.nombre}-${i}`}><span>{i + 1}</span><b>{t.nombre}</b><em>{n(t.danio)}</em></li>
            ))}
          </ol>
        </div>
      )}

      {data?.admin && <ControlKoi estado={e} en={en} />}
    </section>
  );
}

/** Controles del organizador: solo los ve el administrador, dentro de la batalla */
function ControlKoi({ estado, en }: { estado: Estado; en: boolean }) {
  const utils = trpc.useUtils();
  const [vida, setVida] = useState(String(estado.vidaMax));
  useEffect(() => { setVida(String(estado.vidaMax)); }, [estado.vidaMax]);
  const { data: res } = trpc.koi.resultado.useQuery(undefined, { enabled: estado.estado === "derrotado" });
  const control = trpc.koi.control.useMutation({
    onSuccess: () => { void utils.koi.estado.invalidate(); void utils.koi.resultado.invalidate(); },
    onError: err => toast.error(err.message),
  });
  const v = Math.max(100, parseInt(vida.replace(/\D/g, ""), 10) || 0);
  // Guía: ~200 personas a ~6 toques/s con combo ×2,5 ≈ 3.000 de daño por segundo
  const minutos = v / 3000 / 60;
  return (
    <div className="koi-admin">
      <p className="pk-mono koi-admin-t">{en ? "ORGANIZER" : "ORGANIZADOR"} · {estado.estado === "espera" ? (en ? "waiting" : "en espera") : estado.estado === "activo" ? (en ? "live" : "en vivo") : (en ? "finished" : "terminada")}</p>
      {estado.estado === "derrotado" && res?.ganadorDatos && (
        <p className="koi-admin-gan">{en ? "Final blow" : "Golpe final"}: <b>{res.ganadorDatos.nombre}</b>{res.ganadorDatos.email ? ` · ${res.ganadorDatos.email}` : ""}</p>
      )}
      <label className="koi-admin-vida">
        <span>{en ? "Boss life" : "Vida del jefe"}</span>
        <input value={vida} onChange={ev => setVida(ev.target.value)} inputMode="numeric" disabled={estado.estado === "activo"} />
      </label>
      <p className="koi-admin-nota">{en ? `With ~200 people this lasts about ${minutos < 1 ? "under a minute" : `${minutos.toFixed(1)} min`}.` : `Con ~200 personas dura aprox. ${minutos < 1 ? "menos de un minuto" : `${minutos.toFixed(1)} min`}.`}</p>
      <div className="koi-admin-btns">
        {estado.estado === "espera" && <button disabled={control.isPending} onClick={() => control.mutate({ accion: "vida", vidaMax: v })}>{en ? "Save life" : "Guardar vida"}</button>}
        {estado.estado === "espera" && <button className="koi-admin-go" disabled={control.isPending} onClick={() => control.mutate({ accion: "iniciar" })}>{en ? "START QUEST" : "INICIAR QUEST"}</button>}
        {estado.estado === "activo" && <button disabled={control.isPending} onClick={() => control.mutate({ accion: "pausar" })}>{en ? "Pause" : "Pausar"}</button>}
        {estado.estado !== "activo" && <button disabled={control.isPending} onClick={() => { if (window.confirm(en ? "New battle? Life is refilled and scores go back to zero." : "¿Batalla nueva? Se llena la vida y los marcadores vuelven a cero.")) control.mutate({ accion: "reiniciar", vidaMax: v }); }}>{en ? "New battle" : "Batalla nueva"}</button>}
      </div>
    </div>
  );
}
