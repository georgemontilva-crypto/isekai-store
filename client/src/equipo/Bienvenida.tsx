import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { startAuthentication, startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import { Eye, EyeOff, Fingerprint, ScanFace } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import LetreroNeon from "./LetreroNeon";
import "@fontsource-variable/saira/wdth.css";
import "@/styles/equipo.css";
import "@/styles/bienvenida.css";

/**
 * La puerta de las apps del Equipo y de Admin.
 *
 * Entra solo el correo al que se le asignó el rol:
 *   · la primera vez confirma el correo con un enlace y crea su clave;
 *   · después entra con correo y clave, o con Face ID / huella del teléfono.
 *
 * <PuertaApp> envuelve la app: mientras no se haya entrado muestra la
 * bienvenida; al entrar, deja pasar a lo de dentro.
 */
type App = "equipo" | "admin";

/** Cómo llama cada teléfono a su desbloqueo */
function biometrico() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  if (ios) return { nombre: "Face ID", Icono: ScanFace };
  if (/Android/.test(ua)) return { nombre: "huella", Icono: Fingerprint };
  return { nombre: "huella o rostro", Icono: Fingerprint };
}

const guarda = {
  lee: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  pon: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* modo privado */ } },
  quita: (k: string) => { try { localStorage.removeItem(k); } catch { /* */ } },
};
/** Este teléfono ya tiene su llave biométrica */
const LLAVE_AQUI = "iw_llave_aqui";
/** Dijo «ahora no»: se le vuelve a ofrecer pasadas dos semanas */
const LLAVE_DESPUES = "iw_llave_despues";

const TEXTO: Record<App, { titulo: string; bajada: string }> = {
  equipo: { titulo: "Equipo Isekai", bajada: "La app de las tiendas y del personal del Isekai World Fest." },
  admin: { titulo: "Admin Isekai", bajada: "El panel de Isekai World: pedidos, boletería y todo lo demás." },
};

function Marco({ app, children }: { app: App; children: ReactNode }) {
  return (
    <div className="eq bv">
      <div className="bv__in">
        <header className="bv__marca">
          <LetreroNeon />
          <h1>{TEXTO[app].titulo}</h1>
          <p>{TEXTO[app].bajada}</p>
        </header>
        <section className="bv__caja">{children}</section>
      </div>
    </div>
  );
}

function CampoClave({ valor, onCambio, etiqueta, nueva, ayuda, foco }: { valor: string; onCambio: (v: string) => void; etiqueta: string; nueva?: boolean; ayuda?: string; foco?: boolean }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="field">
      <span className="field__label">{etiqueta}</span>
      <span className="bv__clave">
        <input value={valor} onChange={e => onCambio(e.target.value)} type={ver ? "text" : "password"} autoComplete={nueva ? "new-password" : "current-password"}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={nueva ? 8 : undefined} maxLength={200} required autoFocus={foco} />
        <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? "Ocultar la clave" : "Mostrar la clave"} aria-pressed={ver}>
          {ver ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </span>
      {ayuda && <span className="field__hint">{ayuda}</span>}
    </label>
  );
}

// ── Sin sesión: entrar ───────────────────────────────────────────────────────
type Paso = "llave" | "correo" | "clave" | "primera" | "enviado";

function Entrar({ app, alEntrar }: { app: App; alEntrar: () => void }) {
  const bio = useMemo(biometrico, []);
  const llaveAqui = useMemo(() => Boolean(guarda.lee(LLAVE_AQUI)) && browserSupportsWebAuthn(), []);
  const [paso, setPaso] = useState<Paso>(llaveAqui ? "llave" : "correo");
  const [correo, setCorreo] = useState(() => guarda.lee("iw_correo_app") ?? "");
  const [clave, setClave] = useState("");
  const [aviso, setAviso] = useState("");
  const [tieneLlave, setTieneLlave] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [motivoEnlace, setMotivoEnlace] = useState<"primera" | "olvido">("primera");

  // El enlace del correo ya se usó o venció
  useEffect(() => {
    try {
      const a = new URLSearchParams(window.location.search).get("auth");
      if (a === "expired" || a === "error") {
        setAviso("Ese enlace ya se usó o venció. Pide uno nuevo.");
        setPaso("correo");
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch { /* */ }
  }, []);

  const consultar = trpc.acceso.consultar.useMutation();
  const entrar = trpc.acceso.entrar.useMutation();
  const opcionesLlave = trpc.acceso.llaveOpcionesEntrada.useMutation();
  const entrarLlave = trpc.acceso.llaveEntrar.useMutation();

  const SIN_ACCESO = "Ese correo no tiene acceso a esta app. Usa el mismo correo al que te asignaron el rol; si no sabes cuál es, pregúntale al organizador.";
  const SIN_RED = "No pudimos conectar. Revisa tu señal e inténtalo otra vez.";

  const continuar = async (e: FormEvent) => {
    e.preventDefault();
    const c = correo.trim().toLowerCase();
    if (!c) return;
    setAviso(""); setOcupado(true);
    try {
      const r = await consultar.mutateAsync({ email: c });
      if (!r.acceso) { setAviso(SIN_ACCESO); return; }
      guarda.pon("iw_correo_app", c);
      setTieneLlave(r.tieneLlave && browserSupportsWebAuthn());
      setClave("");
      setPaso(r.tieneClave ? "clave" : "primera");
      setMotivoEnlace("primera");
    } catch (err: any) {
      setAviso(/Demasiados/.test(String(err?.message)) ? "Demasiados intentos. Espera 15 minutos." : /email/i.test(String(err?.message)) ? "Ese correo no parece válido." : SIN_RED);
    } finally { setOcupado(false); }
  };

  const conClave = async (e: FormEvent) => {
    e.preventDefault();
    setAviso(""); setOcupado(true);
    try {
      const r = await entrar.mutateAsync({ email: correo.trim().toLowerCase(), clave });
      if (r.ok) { alEntrar(); return; }
      if (r.motivo === "clave") setAviso(`La clave no coincide. ${r.quedan === 1 ? "Te queda 1 intento." : `Te quedan ${r.quedan} intentos.`}`);
      else if (r.motivo === "bloqueado") setAviso("Demasiados intentos con este correo. Espera 15 minutos o entra con «Olvidé mi clave».");
      else if (r.motivo === "sin_clave") setPaso("primera");
      else setAviso(SIN_ACCESO);
      setClave("");
    } catch { setAviso(SIN_RED); } finally { setOcupado(false); }
  };

  const conLlave = async () => {
    setAviso(""); setOcupado(true);
    try {
      const { id, opciones } = await opcionesLlave.mutateAsync();
      const respuesta = await startAuthentication({ optionsJSON: opciones as any });
      const r = await entrarLlave.mutateAsync({ id, respuesta });
      if (r.ok) { guarda.pon(LLAVE_AQUI, "1"); alEntrar(); return; }
      if (r.motivo === "sin_acceso") setAviso("Tu correo ya no tiene acceso a esta app. Habla con el organizador.");
      else {
        // La llave de este teléfono ya no sirve: se vuelve a la clave
        if (r.motivo === "desconocida") guarda.quita(LLAVE_AQUI);
        setAviso(`No pudimos reconocer tu ${bio.nombre}. Entra con tu correo y tu clave.`);
        setPaso("correo");
      }
    } catch (err: any) {
      // Cancelar el aviso del teléfono no es un error: se queda donde estaba
      if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") setAviso(`No se pudo usar ${bio.nombre} ahora. Entra con tu correo y tu clave.`);
    } finally { setOcupado(false); }
  };

  const pedirEnlace = async (motivo: "primera" | "olvido") => {
    setAviso(""); setOcupado(true); setMotivoEnlace(motivo);
    try {
      const r = await fetch("/api/auth/magic-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: correo.trim().toLowerCase(), app, clave: true }) });
      if (r.ok) setPaso("enviado");
      else if (r.status === 403) setAviso(SIN_ACCESO);
      else if (r.status === 429) setAviso("Ya pediste varios enlaces. Espera 15 minutos y revisa tu correo, incluida la carpeta de spam.");
      else setAviso("No pudimos enviar el correo. Inténtalo otra vez.");
    } catch { setAviso(SIN_RED); } finally { setOcupado(false); }
  };

  const otroCorreo = () => { setAviso(""); setClave(""); setPaso("correo"); };
  const Bio = bio.Icono;

  return (
    <>
      {paso === "llave" && (
        <div className="form">
          <h2>Entrar</h2>
          <button className="btn btn--wide bv__bio" type="button" onClick={conLlave} disabled={ocupado}>
            <Bio aria-hidden="true" /> {ocupado ? "Esperando…" : `Entrar con ${bio.nombre}`}
          </button>
          {aviso && <p className="notice" role="alert">{aviso}</p>}
          <p className="bv__otra"><button className="eq__link" type="button" onClick={otroCorreo}>Entrar con correo y clave</button></p>
        </div>
      )}

      {paso === "correo" && (
        <form className="form" onSubmit={continuar}>
          <h2>Entrar</h2>
          <label className="field">
            <span className="field__label">Tu correo</span>
            <input value={correo} onChange={e => setCorreo(e.target.value)} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="nombre@correo.com" maxLength={254} required />
            <span className="field__hint">El mismo correo al que te asignaron el acceso.</span>
          </label>
          {aviso && <p className="notice" role="alert">{aviso}</p>}
          <button className="btn btn--wide" type="submit" disabled={ocupado}>{ocupado ? "Buscando…" : "Continuar"}</button>
        </form>
      )}

      {paso === "clave" && (
        <form className="form" onSubmit={conClave}>
          <h2>Tu clave</h2>
          <p className="bv__quien"><span>{correo.trim().toLowerCase()}</span><button className="eq__link" type="button" onClick={otroCorreo}>Cambiar</button></p>
          {/* El correo va oculto para que el llavero del teléfono guarde la pareja correcta */}
          <input type="email" name="username" autoComplete="username" value={correo.trim().toLowerCase()} readOnly hidden />
          <CampoClave valor={clave} onCambio={setClave} etiqueta="Clave" foco />
          {aviso && <p className="notice" role="alert">{aviso}</p>}
          <button className="btn btn--wide" type="submit" disabled={ocupado || !clave}>{ocupado ? "Entrando…" : "Entrar"}</button>
          {tieneLlave && (
            <button className="btn btn--ghost btn--wide bv__bio" type="button" onClick={conLlave} disabled={ocupado}><Bio aria-hidden="true" /> Entrar con {bio.nombre}</button>
          )}
          <p className="bv__otra"><button className="eq__link" type="button" onClick={() => pedirEnlace("olvido")} disabled={ocupado}>Olvidé mi clave</button></p>
        </form>
      )}

      {paso === "primera" && (
        <div className="form">
          <h2>Primera vez aquí</h2>
          <p className="bv__quien"><span>{correo.trim().toLowerCase()}</span><button className="eq__link" type="button" onClick={otroCorreo}>Cambiar</button></p>
          <p className="bv__texto">Te enviamos un enlace a ese correo para confirmar que es tuyo. Al abrirlo creas tu clave, y desde entonces entras con ella.</p>
          {aviso && <p className="notice" role="alert">{aviso}</p>}
          <button className="btn btn--wide" type="button" onClick={() => pedirEnlace("primera")} disabled={ocupado}>{ocupado ? "Enviando…" : "Enviarme el enlace"}</button>
        </div>
      )}

      {paso === "enviado" && (
        <div className="form">
          <h2>Revisa tu correo</h2>
          <p className="notice notice--ok" role="status">Enviamos un enlace a <strong>{correo.trim().toLowerCase()}</strong>. Ábrelo en este mismo teléfono{motivoEnlace === "olvido" ? " para crear una clave nueva" : " para crear tu clave"}. Vence en 15 minutos.</p>
          <p className="bv__otra"><button className="eq__link" type="button" onClick={otroCorreo}>Usar otro correo</button></p>
        </div>
      )}
    </>
  );
}

// ── Con sesión: crear la clave y activar la biometría ────────────────────────
function CrearClave({ nueva, alGuardar }: { nueva: boolean; alGuardar: () => void }) {
  const { user } = useAuth();
  const [clave, setClave] = useState("");
  const [aviso, setAviso] = useState("");
  const crear = trpc.acceso.crearClave.useMutation();
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (clave.length < 8) { setAviso("La clave debe tener al menos 8 caracteres."); return; }
    setAviso("");
    try { await crear.mutateAsync({ clave }); alGuardar(); }
    catch { setAviso("No pudimos guardar la clave. Inténtalo otra vez."); }
  };
  return (
    <form className="form" onSubmit={guardar}>
      <h2>{nueva ? "Crea una clave nueva" : "Crea tu clave"}</h2>
      <p className="bv__texto">Con ella entras la próxima vez, sin esperar un correo.</p>
      <input type="email" name="username" autoComplete="username" value={user?.email ?? ""} readOnly hidden />
      <CampoClave valor={clave} onCambio={setClave} etiqueta="Clave nueva" nueva ayuda="Mínimo 8 caracteres." foco />
      {aviso && <p className="notice" role="alert">{aviso}</p>}
      <button className="btn btn--wide" type="submit" disabled={crear.isPending}>{crear.isPending ? "Guardando…" : "Guardar clave"}</button>
    </form>
  );
}

function ActivarLlave({ alTerminar }: { alTerminar: () => void }) {
  const bio = useMemo(biometrico, []);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const opciones = trpc.acceso.llaveOpcionesRegistro.useMutation();
  const registrar = trpc.acceso.llaveRegistrar.useMutation();
  const activar = async () => {
    setAviso(""); setOcupado(true);
    try {
      const o = await opciones.mutateAsync();
      const respuesta = await startRegistration({ optionsJSON: o as any });
      await registrar.mutateAsync({ respuesta, dispositivo: bio.nombre });
      guarda.pon(LLAVE_AQUI, "1");
      alTerminar();
    } catch (err: any) {
      // Ya estaba registrada en este teléfono: sirve igual
      if (err?.name === "InvalidStateError") { guarda.pon(LLAVE_AQUI, "1"); alTerminar(); return; }
      if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") setAviso(`No se pudo activar ${bio.nombre} en este teléfono. Puedes seguir entrando con tu clave.`);
    } finally { setOcupado(false); }
  };
  const despues = () => { guarda.pon(LLAVE_DESPUES, String(Date.now())); alTerminar(); };
  const Bio = bio.Icono;
  return (
    <div className="form">
      <h2>Entra con {bio.nombre}</h2>
      <p className="bv__texto">Actívalo en este teléfono y la próxima vez entras sin escribir nada.</p>
      {aviso && <p className="notice" role="alert">{aviso}</p>}
      <button className="btn btn--wide bv__bio" type="button" onClick={activar} disabled={ocupado}><Bio aria-hidden="true" /> {ocupado ? "Esperando…" : `Activar ${bio.nombre}`}</button>
      <button className="btn btn--ghost btn--wide" type="button" onClick={despues} disabled={ocupado}>Ahora no</button>
    </div>
  );
}

export default function PuertaApp({ app, children }: { app: App; children: ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const { data: estado, isLoading: viendoEstado } = trpc.acceso.estado.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000, retry: 1 });

  /** Llegó por el enlace de «crear / olvidé mi clave» */
  const [pideClave, setPideClave] = useState(() => { try { return sessionStorage.getItem("iw_crear_clave") === "1"; } catch { return false; } });
  const [ofrecerLlave, setOfrecerLlave] = useState(false);
  const [llaveVista, setLlaveVista] = useState(false);

  // ¿Se le ofrece la huella o el rostro? Solo si el teléfono la tiene y aún no la activó aquí
  useEffect(() => {
    if (!isAuthenticated || !estado?.tieneClave || !estado.biometria || llaveVista) return;
    if (guarda.lee(LLAVE_AQUI)) return;
    const despues = Number(guarda.lee(LLAVE_DESPUES) ?? 0);
    if (despues && Date.now() - despues < 14 * 86_400_000) return;
    let vivo = true;
    if (!browserSupportsWebAuthn()) return;
    void platformAuthenticatorIsAvailable().then(si => { if (vivo && si) setOfrecerLlave(true); }).catch(() => {});
    return () => { vivo = false; };
  }, [isAuthenticated, estado?.tieneClave, estado?.biometria, llaveVista]);

  const refrescar = () => { void utils.invalidate(); };
  const claveLista = () => {
    try { sessionStorage.removeItem("iw_crear_clave"); } catch { /* */ }
    setPideClave(false);
    void utils.acceso.estado.invalidate();
  };

  if (loading || (isAuthenticated && viendoEstado)) return <div className="eq bv" aria-busy="true" />;

  if (!isAuthenticated) return <Marco app={app}><Entrar app={app} alEntrar={refrescar} /></Marco>;

  // La app de Admin es solo para administradores
  if (app === "admin" && user?.role !== "admin") {
    return (
      <Marco app={app}>
        <div className="form">
          <h2>Sin acceso</h2>
          <p className="bv__texto">Entraste como <strong>{user?.email}</strong>, que no es una cuenta de administrador.</p>
          <button className="btn btn--wide" type="button" onClick={() => logout()}>Salir y usar otro correo</button>
        </div>
      </Marco>
    );
  }

  if (estado && (!estado.tieneClave || pideClave)) {
    return <Marco app={app}><CrearClave nueva={estado.tieneClave} alGuardar={claveLista} /></Marco>;
  }
  if (ofrecerLlave && !llaveVista) {
    return <Marco app={app}><ActivarLlave alTerminar={() => { setLlaveVista(true); setOfrecerLlave(false); }} /></Marco>;
  }
  return <>{children}</>;
}
