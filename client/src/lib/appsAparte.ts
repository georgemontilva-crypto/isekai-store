import { trpc } from "@/lib/trpc";
import { APP } from "@/lib/appActual";

/**
 * Las apps aparte (Equipo y Admin) que ya funcionan en su propia dirección.
 *
 * En la web, cuando una app ya responde, sus accesos dejan de mostrarse y sus
 * direcciones viejas llevan a ella. Mientras no responda (dominio sin
 * conectar), todo sigue como siempre: nadie se queda sin su entrada.
 * Dentro de las propias apps no aplica.
 */
export function useApps() {
  const enWeb = APP === "web";
  const { data, isLoading } = trpc.apps.activas.useQuery(undefined, { enabled: enWeb, staleTime: 2 * 60_000, retry: 1 });
  return {
    equipo: enWeb ? data?.equipo ?? null : null,
    admin: enWeb ? data?.admin ?? null : null,
    cargando: enWeb && isLoading,
  };
}
