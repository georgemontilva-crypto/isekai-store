import { useState, type ReactNode } from "react";

/**
 * Piezas del panel de administración. Mismo esqueleto que el panel de Arena
 * Panter: paneles rectos, pestañas, filas, insignias y acciones de texto.
 */
export function Panel({ title, action, lead, children, className }: { title?: string; action?: ReactNode; lead?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel${className ? ` ${className}` : ""}`}>
      {(title || action) && <header className="panel__head">{title && <h2>{title}</h2>}{action}</header>}
      {lead && <p className="panel__lead pa-lead">{lead}</p>}
      {children}
    </section>
  );
}

export function Badge({ tone = "plain", children }: { tone?: "plain" | "ok" | "warn" | "hot" | "off"; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export const num = (v: unknown) => parseFloat(String(v ?? "0")) || 0;
export const dinero = (v: unknown) => `$${num(v).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const fecha = (v: unknown) => { try { return fmtFecha.format(new Date(v as string)); } catch { return ""; } };

/**
 * Número para abrir WhatsApp. Los teléfonos de Venezuela se escriben con el
 * cero delante (0414…), y así wa.me no los reconoce: va con el 58.
 */
export function paraWhatsApp(telefono: string | null | undefined): string {
  const d = (telefono ?? "").replace(/\D/g, "");
  if (/^0(4\d{9}|2\d{9})$/.test(d)) return `58${d.slice(1)}`;
  return d;
}

/** Acción de texto que pide confirmar en el mismo sitio, sin ventanas */
export function Confirmar({ texto, pregunta, si = "Sí", onSi, disabled }: { texto: string; pregunta: string; si?: string; onSi: () => void; disabled?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) return <button type="button" className="pa-accion" disabled={disabled} onClick={() => setAbierto(true)}>{texto}</button>;
  return (
    <span className="pa-confirma" role="group" aria-label={pregunta}>
      <span>{pregunta}</span>
      <button type="button" className="pa-accion pa-accion--peligro" disabled={disabled} onClick={() => { setAbierto(false); onSi(); }}>{si}</button>
      <button type="button" className="pa-accion" onClick={() => setAbierto(false)}>No</button>
    </span>
  );
}
