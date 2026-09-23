/**
 * Fechas para <input type="datetime-local">.
 *
 * Ese campo trabaja en la hora local del navegador y sin zona horaria. Si se
 * manda tal cual, el servidor (en UTC) lo interpreta con horas de diferencia.
 * Por eso siempre se envía convertido a ISO con zona, y al editar se vuelve
 * a mostrar en la hora local.
 */

/** Fecha guardada → valor del campo, en la hora local del navegador */
export function aInputFechaLocal(fecha: string | Date | null | undefined): string {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Valor del campo → texto ISO con zona horaria */
export function deInputFechaLocal(valor: string): string {
  return new Date(valor).toISOString();
}
