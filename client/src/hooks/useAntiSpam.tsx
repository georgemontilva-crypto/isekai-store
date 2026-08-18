import { useRef } from "react";

/**
 * Antispam del lado del cliente.
 *
 * Devuelve los campos que hay que enviar junto al formulario y el campo
 * trampa que se pinta invisible. No pide nada al usuario: es transparente.
 *
 * Uso:
 *   const antiSpam = useAntiSpam();
 *   ...
 *   <antiSpam.HoneyPot />
 *   mutate({ email, ...antiSpam.fields() })
 */
export function useAntiSpam() {
  // Momento en que se montó el formulario
  const mountedAt = useRef(Date.now());
  const hpRef = useRef<HTMLInputElement>(null);

  const fields = () => ({
    hp: hpRef.current?.value ?? "",
    elapsedMs: Date.now() - mountedAt.current,
  });

  /**
   * Campo trampa. Invisible para las personas —incluidos lectores de
   * pantalla, gracias a aria-hidden y tabIndex -1— pero visible en el HTML
   * para un bot, que lo rellenará y quedará descartado.
   */
  const HoneyPot = () => (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
      <label htmlFor="website-url">No llenar este campo</label>
      <input
        ref={hpRef}
        id="website-url"
        name="website-url"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );

  return { fields, HoneyPot };
}
