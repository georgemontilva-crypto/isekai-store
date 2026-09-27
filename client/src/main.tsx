import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { openLoginModal } from "./const";
import "./index.css";

/**
 * Ajustes de las consultas.
 *
 * Sin configuración, cada dato se consideraba viejo nada más llegar: al
 * desplazarse fuera y volver, o al cambiar de pestaña del navegador, se
 * pedía todo otra vez y la web parecía ir lenta.
 *
 * Con un minuto de vigencia, lo ya cargado se reutiliza. Los datos que sí
 * cambian a menudo —pedidos, boletería— piden su propio refresco periódico
 * allí donde se usan, así que no se ven afectados.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  openLoginModal();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

/**
 * Service worker: solo para notificaciones push (no guarda caché ni
 * intercepta la carga, así que la web siempre llega fresca). Al registrarse
 * también borra las cachés que hayan quedado de la versión antigua.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    if ('caches' in window) {
      caches.keys().then(claves => Promise.all(claves.map(k => caches.delete(k)))).catch(() => {});
    }
  });
}

/**
 * Al volver a la app (sobre todo instalada en el teléfono): el sistema la
 * congela en segundo plano y al despertarla mostraba datos viejos hasta
 * cerrarla del todo. Ahora, al volver tras más de 3 segundos fuera:
 *  - si se publicó una versión nueva del sitio, se recarga sola;
 *  - si no, se vuelven a pedir los datos en pantalla y se reconectan los
 *    canales en vivo (evento «iw:volver»).
 */
let versionInicial: string | null = null;
const leerVersion = () =>
  fetch('/api/version', { cache: 'no-store' }).then(r => r.json()).then((d: { v?: string }) => d.v ?? null).catch(() => null);
void leerVersion().then(v => { versionInicial = v; });

let ocultoDesde = 0;
let volviendo = false;
async function alVolver() {
  if (volviendo) return;
  volviendo = true;
  try {
    const v = await leerVersion();
    if (versionInicial && v && v !== 'dev' && v !== versionInicial) {
      window.location.reload();
      return;
    }
    await queryClient.invalidateQueries({ refetchType: 'active' });
    window.dispatchEvent(new Event('iw:volver'));
  } finally {
    volviendo = false;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { ocultoDesde = Date.now(); return; }
  if (ocultoDesde && Date.now() - ocultoDesde > 3000) void alVolver();
});
window.addEventListener('pageshow', e => { if (e.persisted) void alVolver(); });
window.addEventListener('online', () => void alVolver());
