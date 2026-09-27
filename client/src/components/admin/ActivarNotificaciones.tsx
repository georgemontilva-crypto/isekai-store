import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Activa las notificaciones push en ESTE dispositivo (cada teléfono o
 * computador se activa por separado). En iPhone, Apple solo las permite con
 * la web instalada en la pantalla de inicio (iOS 16.4 o superior).
 */
type Estado = "cargando" | "sinSoporte" | "instalarIphone" | "sinClaves" | "bloqueadas" | "inactivas" | "activas";

const esIphone = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;

function claveABytes(base64: string): ArrayBuffer {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, c => c.charCodeAt(0)).buffer as ArrayBuffer;
}

export default function ActivarNotificaciones() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [trabajando, setTrabajando] = useState(false);
  const { data: clave, isLoading } = trpc.push.clave.useQuery(undefined, { staleTime: Infinity });
  const suscribir = trpc.push.suscribir.useMutation();
  const desuscribir = trpc.push.desuscribir.useMutation();
  const probar = trpc.push.probar.useMutation();

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      const soporta = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!soporta) { setEstado(esIphone() && !instalada() ? "instalarIphone" : "sinSoporte"); return; }
      if (!clave?.clave) { setEstado("sinClaves"); return; }
      if (Notification.permission === "denied") { setEstado("bloqueadas"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEstado(sub && Notification.permission === "granted" ? "activas" : "inactivas");
    })().catch(() => setEstado("inactivas"));
  }, [isLoading, clave]);

  const activar = async () => {
    if (!clave?.clave) return;
    setTrabajando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setEstado(permiso === "denied" ? "bloqueadas" : "inactivas"); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave.clave) }));
      const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await suscribir.mutateAsync({ endpoint: j.endpoint, keys: j.keys });
      setEstado("activas");
      const r = await probar.mutateAsync();
      toast.success(r.enviados > 0 ? "Listo: te enviamos una notificación de prueba" : "Notificaciones activadas");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudieron activar las notificaciones");
    } finally {
      setTrabajando(false);
    }
  };

  const desactivar = async () => {
    setTrabajando(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await desuscribir.mutateAsync({ endpoint: sub.endpoint }); await sub.unsubscribe(); }
      setEstado("inactivas");
      toast.success("Notificaciones desactivadas en este dispositivo");
    } finally {
      setTrabajando(false);
    }
  };

  if (estado === "cargando" || estado === "sinSoporte") return null;

  const caja = "ev-notch mb-5 flex flex-wrap items-center gap-3 border p-3.5";
  const estiloCaja = { background: "#0c0b10" };

  if (estado === "activas") {
    return (
      <div className={caja} style={{ ...estiloCaja, borderColor: "rgba(74,222,128,0.3)" }}>
        <BellRing size={18} className="shrink-0 text-[#4ade80]" />
        <p className="min-w-0 flex-1 text-sm text-[#d6d0de]">Notificaciones activas en este dispositivo.</p>
        <button onClick={() => probar.mutate(undefined, { onSuccess: r => toast.success(r.enviados ? "Prueba enviada" : "No hay dispositivos activos") })}
          disabled={probar.isPending} className="text-xs font-bold text-[#a39cad] hover:text-white">Enviar prueba</button>
        <button onClick={desactivar} disabled={trabajando} className="text-xs font-bold text-[#6f6878] hover:text-[#f87171]">Desactivar</button>
      </div>
    );
  }

  if (estado === "instalarIphone") {
    return (
      <div className={caja} style={{ ...estiloCaja, borderColor: "rgba(125,216,255,0.3)" }}>
        <Smartphone size={18} className="shrink-0 text-[#7dd8ff]" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#d6d0de]">
          Para recibir notificaciones en el iPhone, instala la app: toca <Share size={13} className="inline -mt-0.5" /> <strong>Compartir</strong> →
          <strong> Agregar a pantalla de inicio</strong>, ábrela desde ese ícono y actívalas aquí.
        </p>
      </div>
    );
  }

  if (estado === "bloqueadas") {
    return (
      <div className={caja} style={{ ...estiloCaja, borderColor: "rgba(248,113,113,0.3)" }}>
        <BellOff size={18} className="shrink-0 text-[#f87171]" />
        <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#d6d0de]">
          Las notificaciones están bloqueadas. Actívalas en los <strong>Ajustes</strong> del teléfono → <strong>Notificaciones</strong> → <strong>Isekai</strong> (o en los permisos del sitio en el navegador).
        </p>
      </div>
    );
  }

  if (estado === "sinClaves") {
    return (
      <div className={caja} style={{ ...estiloCaja, borderColor: "rgba(251,191,36,0.3)" }}>
        <Bell size={18} className="shrink-0 text-[#fbbf24]" />
        <p className="min-w-0 flex-1 text-sm text-[#d6d0de]">Las notificaciones aún no están configuradas en el servidor (faltan las claves VAPID en Railway).</p>
      </div>
    );
  }

  return (
    <div className={caja} style={{ ...estiloCaja, borderColor: "rgba(229,0,125,0.45)" }}>
      <Bell size={18} className="shrink-0 text-[#ff3d9e]" />
      <p className="min-w-0 flex-1 text-sm text-[#d6d0de]">
        Recibe en este dispositivo los pedidos, pagos y avisos al instante, aunque la app esté cerrada.
      </p>
      <button onClick={activar} disabled={trabajando}
        className="ev-notch flex items-center gap-2 bg-[#e5007d] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">
        {trabajando ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Activar notificaciones
      </button>
    </div>
  );
}
