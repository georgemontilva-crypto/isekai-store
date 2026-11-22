import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Panel, Badge, Confirmar, num, dinero, fecha, paraWhatsApp } from "./ui";

/**
 * Cosplay Guild: el programa de embajadores.
 *
 * Tres bandejas esperan una decisión (solicitudes, entregas de misiones y
 * retiros de saldo) y dos son de mantenimiento (los cosplayers y las misiones).
 */
type Nivel = "bronce" | "plata" | "oro" | "diamante" | "platino";
const NIVEL: Record<Nivel, { texto: string; por: number }> = {
  bronce: { texto: "Bronce", por: 1 }, plata: { texto: "Plata", por: 1.5 }, oro: { texto: "Oro", por: 2 }, diamante: { texto: "Diamante", por: 3 }, platino: { texto: "Platino", por: 5 },
};
const nivelDe = (t: string | null | undefined) => NIVEL[(t ?? "bronce") as Nivel] ?? NIVEL.bronce;
const TIPO: Record<string, string> = { post: "Publicación", reel: "Reel", tiktok: "TikTok", story: "Historia", event: "Evento" };
const lista = <T,>(v: unknown): T[] => { if (Array.isArray(v)) return v as T[]; if (typeof v === "string") { try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return []; } } return []; };
const enlaceRed = (red: string, v: string) => /^https?:\/\//.test(v) ? v : `https://${red}.com/${red === "tiktok" || red === "youtube" ? "@" : ""}${v.replace(/^@/, "")}`;

type Solicitud = { id: number; artisticName: string | null; photo: string | null; gallery: unknown; bio: string | null; fullName: string; lastName: string; age: number; city: string; country: string; address: string; phone: string; email: string; experience: number; instagram: string | null; tiktok: string | null; youtube: string | null; facebook: string | null; twitter: string | null; whyIsekai: string | null; status: string; rejectionReason: string | null; createdAt: string };
type Cosplayer = { id: number; artisticName: string; photo: string | null; tier: string | null; totalFollowers: number | null; ticketBalance: number | null; cashBalance: string | null; referralCode: string | null; username: string | null; isActive: boolean | null; approvedAt: string | null; correoSolicitud?: string | null; correoCuenta?: string | null };
type Entrega = { id: number; cosplayerId: number; evidenceUrl: string; status: string; pointsAwarded: number | null; createdAt: string; artisticName: string | null; tier: string | null; activityTitle: string | null; activityBasePoints: number | null; phase: number; activityPhases: number | null };
type Retiro = { id: number; cosplayerId: number; amount: string; status: string; paymentMethod: string | null; paymentDetails: string | null; notes: string | null; createdAt: string };
type Mision = { id: number; title: string; description: string | null; basePoints: number; type: string; deadline: string | null; phases: number; active: boolean | null };

// ── Solicitudes ──────────────────────────────────────────────────────────────
function Solicitudes() {
  const utils = trpc.useUtils();
  const todas = trpc.cosplay.getApplications.useQuery({}, { refetchInterval: 60_000 });
  const refrescar = () => { void utils.cosplay.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const aprobar = trpc.cosplay.approveApplication.useMutation({ onSuccess: () => { toast.success("Aprobada: ya es parte del Guild"); setAbierta(null); refrescar(); }, onError: alFallar });
  const rechazar = trpc.cosplay.rejectApplication.useMutation({ onSuccess: () => { toast.success("Solicitud rechazada"); setAbierta(null); refrescar(); }, onError: alFallar });
  const [ver, setVer] = useState<"pending" | "rejected">("pending");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [f, setF] = useState({ nivel: "bronce" as Nivel, seguidores: "", motivo: "" });
  const items = ((todas.data ?? []) as unknown as Solicitud[]).filter(s => s.status === ver);
  const pendientes = ((todas.data ?? []) as unknown as Solicitud[]).filter(s => s.status === "pending").length;
  return (
    <Panel title="Solicitudes" lead="Quien quiere entrar al Guild. Al aprobar se crea su perfil con el nivel que elijas y, si hay un kit configurado, su pedido de kit.">
      <div className="tabs" role="tablist" aria-label="Solicitudes">
        <button type="button" role="tab" aria-selected={ver === "pending"} className={ver === "pending" ? "is-active" : undefined} onClick={() => { setVer("pending"); setAbierta(null); }}>Por decidir{pendientes ? <span className="tabs__n tabs__n--hot">{pendientes}</span> : null}</button>
        <button type="button" role="tab" aria-selected={ver === "rejected"} className={ver === "rejected" ? "is-active" : undefined} onClick={() => { setVer("rejected"); setAbierta(null); }}>Rechazadas</button>
      </div>
      {todas.isLoading ? <p className="empty">Cargando…</p> : items.length === 0 ? <p className="empty">{ver === "pending" ? "No hay solicitudes por decidir." : "No hay solicitudes rechazadas."}</p> : (
        <ul className="ped">
          {items.map(s => {
            const esta = abierta === s.id, tel = paraWhatsApp(s.phone), fotos = lista<string>(s.gallery);
            const redes = (["instagram", "tiktok", "youtube", "facebook", "twitter"] as const).filter(r => s[r]);
            return (
              <li key={s.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila tie__fila" aria-expanded={esta} onClick={() => { setAbierta(esta ? null : s.id); setF({ nivel: "bronce", seguidores: "", motivo: "" }); }}>
                  <span className="tie__mini">{s.photo ? <img src={s.photo} alt="" loading="lazy" /> : null}</span>
                  <span className="tie__texto"><span className="ped__quien"><strong>{s.artisticName || `${s.fullName} ${s.lastName}`}</strong></span>
                    <span className="ped__pie-fila"><small>{s.fullName} {s.lastName} · {s.city}, {s.country} · {s.experience === 1 ? "1 año" : `${s.experience} años`} de experiencia · {fecha(s.createdAt)}</small></span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    {s.status === "pending" ? (
                      <div className="ped__paso">
                        <h3>Decide la solicitud</h3>
                        <form className="form form--inline" onSubmit={(e: FormEvent) => { e.preventDefault(); aprobar.mutate({ applicationId: s.id, tier: f.nivel, totalFollowers: parseInt(f.seguidores, 10) || 0 }); }}>
                          <label className="field"><span className="field__label">Nivel con el que entra</span><select value={f.nivel} onChange={e => setF({ ...f, nivel: e.target.value as Nivel })}>{(Object.keys(NIVEL) as Nivel[]).map(n => <option key={n} value={n}>{NIVEL[n].texto} · tickets ×{NIVEL[n].por}</option>)}</select></label>
                          <label className="field"><span className="field__label">Seguidores en total</span><input value={f.seguidores} onChange={e => setF({ ...f, seguidores: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="0" /></label>
                          <button className="btn btn--small" type="submit" disabled={aprobar.isPending}>{aprobar.isPending ? "Aprobando…" : "Aprobar"}</button>
                        </form>
                        <form className="form form--inline" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!f.motivo.trim()) { toast.error("Escribe el motivo: se le envía a la persona"); return; } rechazar.mutate({ applicationId: s.id, reason: f.motivo.trim() }); }}>
                          <label className="field tie__ancho"><span className="field__label">Motivo, si la rechazas</span><input value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })} placeholder="Se le envía a la persona" maxLength={500} /></label>
                          <button className="btn btn--ghost btn--small" type="submit" disabled={rechazar.isPending}>Rechazar</button>
                        </form>
                      </div>
                    ) : s.rejectionReason ? <p className="notice notice--info">Rechazada: {s.rejectionReason}</p> : null}
                    <dl className="ped__datos">
                      <div><dt>Persona</dt><dd>{s.fullName} {s.lastName}<small>{s.age} años · {s.city}, {s.country}</small><small>{s.address}</small></dd></div>
                      <div><dt>Contacto</dt><dd>{s.email}{tel && <small><a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer">WhatsApp {s.phone}</a></small>}</dd></div>
                      <div><dt>Redes</dt><dd>{redes.length === 0 ? <span className="pa-tenue">No indicó redes</span> : redes.map(r => <small key={r}><a href={enlaceRed(r === "twitter" ? "x" : r, s[r]!)} target="_blank" rel="noreferrer">{({ instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", twitter: "X" } as const)[r]}: {s[r]}</a></small>)}</dd></div>
                      {s.bio && <div className="cot__largo"><dt>Sobre su trabajo</dt><dd>{s.bio}</dd></div>}
                      {s.whyIsekai && <div className="cot__largo"><dt>Por qué Isekai</dt><dd>{s.whyIsekai}</dd></div>}
                    </dl>
                    {fotos.length > 0 && <div className="cot__fotos">{fotos.map(u => <a key={u} className="cot__foto" href={u} target="_blank" rel="noreferrer"><img src={u} alt="Foto de su galería" loading="lazy" /></a>)}</div>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ── Entregas de misiones ─────────────────────────────────────────────────────
function Entregas() {
  const utils = trpc.useUtils();
  const pendientes = trpc.cosplay.getAllSubmissions.useQuery({ status: "pending" }, { refetchInterval: 60_000 });
  const evaluar = trpc.cosplay.evaluateSubmission.useMutation({ onSuccess: (_r, v) => { toast.success(v.status === "approved" ? "Entrega aprobada" : "Entrega rechazada"); setAbierta(null); void utils.cosplay.invalidate(); }, onError: e => toast.error(e.message) });
  const [abierta, setAbierta] = useState<number | null>(null);
  const [puntos, setPuntos] = useState("");
  const items = (pendientes.data ?? []) as unknown as Entrega[];
  return (
    <Panel title="Entregas por evaluar" lead="La evidencia que sube cada cosplayer al cumplir una misión. Los tickets que recibe son los puntos por el multiplicador de su nivel.">
      {pendientes.isLoading ? <p className="empty">Cargando…</p> : items.length === 0 ? <p className="empty">No hay entregas por evaluar.</p> : (
        <ul className="ped">
          {items.map(e => {
            const esta = abierta === e.id, por = nivelDe(e.tier).por, fases = e.activityPhases ?? 1;
            const base = Math.max(0, parseInt(puntos, 10) || 0);
            return (
              <li key={e.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => { setAbierta(esta ? null : e.id); setPuntos(String(e.activityBasePoints ?? "")); }}>
                  <span className="ped__quien"><strong>{e.artisticName ?? "Cosplayer"}</strong><span className="rows__side">{e.activityBasePoints ?? 0} pts</span></span>
                  <span className="ped__pidio">{e.activityTitle ?? "Misión eliminada"}</span>
                  <span className="ped__pie-fila"><small>{fases > 1 ? `Fase ${e.phase} de ${fases} · ` : ""}{nivelDe(e.tier).texto} · {fecha(e.createdAt)}</small><span className="ped__insignias"><Badge tone="hot">Por evaluar</Badge></span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    <div className="ped__paso">
                      <h3>Evalúa la entrega</h3>
                      <p><a href={e.evidenceUrl} target="_blank" rel="noreferrer">Abrir la evidencia</a></p>
                      {fases > 1 && <p className="fes__aviso">Misión de {fases} fases: los tickets se entregan completos al aprobar la última. Aprobar una fase suelta todavía no paga.</p>}
                      <form className="form form--inline" onSubmit={(ev: FormEvent) => { ev.preventDefault(); evaluar.mutate({ submissionId: e.id, pointsAwarded: base, status: "approved" }); }}>
                        <label className="field"><span className="field__label">Puntos que le das</span><input value={puntos} onChange={ev => setPuntos(ev.target.value.replace(/\D/g, ""))} inputMode="numeric" /><span className="field__hint">Con su nivel {nivelDe(e.tier).texto} (×{por}) son {Math.round(base * por)} tickets.</span></label>
                        <button className="btn btn--small" type="submit" disabled={evaluar.isPending}>Aprobar</button>
                        <Confirmar texto="Rechazar" pregunta="¿Rechazar esta entrega?" si="Sí, rechazar" disabled={evaluar.isPending} onSi={() => evaluar.mutate({ submissionId: e.id, pointsAwarded: 0, status: "rejected" })} />
                      </form>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ── Retiros de saldo ─────────────────────────────────────────────────────────
function Retiros({ nombres }: { nombres: Map<number, string> }) {
  const utils = trpc.useUtils();
  const todos = trpc.cosplay.getWithdrawals.useQuery({}, { refetchInterval: 60_000 });
  const procesar = trpc.cosplay.processWithdrawal.useMutation({ onSuccess: (_r, v) => { toast.success(v.status === "completed" ? "Retiro marcado como pagado" : "Retiro rechazado: el saldo vuelve al cosplayer"); setAbierto(null); void utils.cosplay.invalidate(); }, onError: e => toast.error(e.message) });
  const [abierto, setAbierto] = useState<number | null>(null);
  const [nota, setNota] = useState("");
  const [historial, setHistorial] = useState(false);
  const items = (todos.data ?? []) as unknown as Retiro[];
  const pendientes = items.filter(r => r.status === "pending"), resto = items.filter(r => r.status !== "pending");
  return (
    <Panel title="Retiros de saldo" lead="Lo que cada cosplayer pide cobrar de sus comisiones. Le pagas por fuera y aquí lo marcas como pagado.">
      {todos.isLoading ? <p className="empty">Cargando…</p> : pendientes.length === 0 ? <p className="empty">No hay retiros por pagar.</p> : (
        <ul className="ped">
          {pendientes.map(r => {
            const esta = abierto === r.id;
            return (
              <li key={r.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => { setAbierto(esta ? null : r.id); setNota(""); }}>
                  <span className="ped__quien"><strong>{nombres.get(r.cosplayerId) ?? `Cosplayer ${r.cosplayerId}`}</strong><span className="rows__side">{dinero(r.amount)}</span></span>
                  <span className="ped__pie-fila"><small>{r.paymentMethod ?? "Sin método"} · pedido el {fecha(r.createdAt)}</small><span className="ped__insignias"><Badge tone="hot">Por pagar</Badge></span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    <div className="ped__paso">
                      <h3>Paga {dinero(r.amount)}</h3>
                      <p>Por {r.paymentMethod ?? "un método sin indicar"}, a estos datos:</p>
                      <p className="cot__enlace gui__datos">{r.paymentDetails || "No dejó datos de pago."}</p>
                      <label className="field"><span className="field__label">Nota (opcional)</span><input value={nota} onChange={e => setNota(e.target.value)} placeholder="Referencia del pago, o por qué se rechaza" maxLength={500} /></label>
                      <div className="eq-acciones">
                        <button className="btn btn--small" type="button" disabled={procesar.isPending} onClick={() => procesar.mutate({ withdrawalId: r.id, status: "completed", notes: nota.trim() || undefined })}>Ya le pagué</button>
                        <Confirmar texto="Rechazar" pregunta="¿Rechazar el retiro? El saldo vuelve al cosplayer." si="Sí, rechazar" disabled={procesar.isPending} onSi={() => procesar.mutate({ withdrawalId: r.id, status: "rejected", notes: nota.trim() || undefined })} />
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {resto.length > 0 && (
        <>
          <p className="ped__pie"><button type="button" className="pa-accion" onClick={() => setHistorial(h => !h)}>{historial ? "Ocultar" : "Ver"} los {resto.length} retiros ya atendidos</button></p>
          {historial && <ul className="rows">{resto.slice(0, 80).map(r => <li key={r.id} className="tie__variante"><span className="rows__main"><strong>{nombres.get(r.cosplayerId) ?? `Cosplayer ${r.cosplayerId}`}</strong><small>{r.status === "completed" ? "Pagado" : "Rechazado"} · {fecha(r.createdAt)}{r.notes ? ` · ${r.notes}` : ""}</small></span><span className={`rows__side${r.status === "completed" ? "" : " fes__tachado"}`}>{dinero(r.amount)}</span></li>)}</ul>}
        </>
      )}
    </Panel>
  );
}

// ── Cosplayers ───────────────────────────────────────────────────────────────
/** Correos con los que se registró: el de su solicitud y, si es otro, el de su cuenta */
function CorreosCosplayer({ c }: { c: Cosplayer }) {
  const solicitud = (c.correoSolicitud ?? "").trim();
  const cuenta = (c.correoCuenta ?? "").trim();
  const iguales = solicitud.toLowerCase() === cuenta.toLowerCase();
  const copiar = (v: string) => navigator.clipboard.writeText(v).then(() => toast.success("Correo copiado"), () => toast.error("No se pudo copiar"));
  const fila = (titulo: string, v: string) => (
    <div><dt>{titulo}</dt><dd><a href={`mailto:${v}`}>{v}</a><small><button type="button" className="pa-accion" onClick={() => copiar(v)}>Copiar</button></small></dd></div>
  );
  return (
    <dl className="ped__datos">
      {!solicitud && !cuenta && <div><dt>Correo</dt><dd><span className="pa-tenue">No tiene correo registrado</span></dd></div>}
      {solicitud && fila(iguales || !cuenta ? "Correo" : "Correo de la solicitud", solicitud)}
      {cuenta && !iguales && fila(solicitud ? "Correo de la cuenta" : "Correo", cuenta)}
    </dl>
  );
}

function FichaCosplayer({ c, alCerrar }: { c: Cosplayer; alCerrar: () => void }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.cosplay.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const nivel = trpc.cosplay.updateCosplayerTier.useMutation({ onSuccess: () => { toast.success("Nivel actualizado"); refrescar(); }, onError: alFallar });
  const dar = trpc.cosplay.grantTickets.useMutation({ onSuccess: (r: any) => { toast.success(`Le diste ${r?.finalPoints ?? ""} tickets`); setT({ puntos: "", motivo: "" }); refrescar(); }, onError: alFallar });
  const suspender = trpc.cosplay.suspendCosplayer.useMutation({ onSuccess: () => { toast.success("Suspendido"); refrescar(); }, onError: alFallar });
  const reactivar = trpc.cosplay.reactivarCosplayer.useMutation({ onSuccess: () => { toast.success("De vuelta en el Guild"); refrescar(); }, onError: alFallar });
  const borrar = trpc.cosplay.deleteCosplayer.useMutation({ onSuccess: () => { toast.success("Cosplayer eliminado"); refrescar(); alCerrar(); }, onError: alFallar });
  const [f, setF] = useState({ nivel: (c.tier ?? "bronce") as Nivel, seguidores: String(c.totalFollowers ?? 0) });
  const [t, setT] = useState({ puntos: "", motivo: "" });
  const [eliminando, setEliminando] = useState(false);
  const resumen = trpc.cosplay.resumenEliminar.useQuery({ cosplayerId: c.id }, { enabled: eliminando });
  const r = resumen.data as any;
  const base = Math.max(0, parseInt(t.puntos, 10) || 0), por = nivelDe(c.tier).por;
  return (
    <div className="ped__ficha">
      {c.isActive === false && <p className="notice" role="status">Suspendido: no aparece en el Guild ni puede hacer misiones.</p>}
      <CorreosCosplayer c={c} />
      <form className="form form--inline" onSubmit={(e: FormEvent) => { e.preventDefault(); nivel.mutate({ cosplayerId: c.id, tier: f.nivel, totalFollowers: parseInt(f.seguidores, 10) || 0 }); }}>
        <label className="field"><span className="field__label">Nivel</span><select value={f.nivel} onChange={e => setF({ ...f, nivel: e.target.value as Nivel })}>{(Object.keys(NIVEL) as Nivel[]).map(n => <option key={n} value={n}>{NIVEL[n].texto} · tickets ×{NIVEL[n].por}</option>)}</select></label>
        <label className="field"><span className="field__label">Seguidores en total</span><input value={f.seguidores} onChange={e => setF({ ...f, seguidores: e.target.value.replace(/\D/g, "") })} inputMode="numeric" /></label>
        <button className="btn btn--ghost btn--small" type="submit" disabled={nivel.isPending}>Guardar nivel</button>
      </form>
      <h3 className="ped__sub">Darle tickets</h3>
      <form className="form form--inline" onSubmit={(e: FormEvent) => { e.preventDefault(); if (base < 1 || !t.motivo.trim()) { toast.error("Escribe los puntos y el motivo"); return; } dar.mutate({ cosplayerId: c.id, basePoints: base, reason: t.motivo.trim() }); }}>
        <label className="field"><span className="field__label">Puntos</span><input value={t.puntos} onChange={e => setT({ ...t, puntos: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="50" /><span className="field__hint">Con su nivel (×{por}) son {Math.round(base * por)} tickets.</span></label>
        <label className="field tie__ancho"><span className="field__label">Motivo</span><input value={t.motivo} onChange={e => setT({ ...t, motivo: e.target.value })} placeholder="Se le envía por correo" maxLength={500} /></label>
        <button className="btn btn--ghost btn--small" type="submit" disabled={dar.isPending}>Dar tickets</button>
      </form>
      <div className="ped__otras">
        {c.username && <a className="pa-accion tie__enlace" href={`https://www.isekaiworld.co/cosplay/guild/${c.username}`} target="_blank" rel="noreferrer">Ver su perfil</a>}
        {c.isActive === false ? <button type="button" className="pa-accion" disabled={reactivar.isPending} onClick={() => reactivar.mutate({ cosplayerId: c.id })}>Reactivar</button>
          : <Confirmar texto="Suspender" pregunta="¿Suspenderlo? Deja de aparecer y de hacer misiones; se puede reactivar." si="Sí, suspender" disabled={suspender.isPending} onSi={() => suspender.mutate({ cosplayerId: c.id })} />}
        {!eliminando ? <button type="button" className="pa-accion" onClick={() => setEliminando(true)}>Eliminar</button> : (
          <span className="pa-confirma">
            {!r ? "Revisando qué tiene pendiente…" : <>Se pierde: {dinero(r.saldo)} de saldo, {r.tickets} tickets{r.retirosPendientes ? `, ${r.retirosPendientes} retiro(s) por ${dinero(r.montoRetirosPendientes)}` : ""}{r.codigosSinUsar ? `, ${r.codigosSinUsar} código(s) sin usar` : ""}{r.pedidosSinPagar ? `, ${r.pedidosSinPagar} pedido(s) referidos sin pagar` : ""}. ¿Eliminar para siempre?</>}
            {r && <button type="button" className="pa-accion pa-accion--peligro" disabled={borrar.isPending} onClick={() => borrar.mutate({ cosplayerId: c.id })}>Sí, eliminar</button>}
            <button type="button" className="pa-accion" onClick={() => setEliminando(false)}>No</button>
          </span>
        )}
      </div>
    </div>
  );
}

function Cosplayers({ todos, cargando }: { todos: Cosplayer[]; cargando: boolean }) {
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const q = buscar.trim().toLowerCase();
  const visibles = todos.filter(c => !q || [c.artisticName, c.username ?? "", c.referralCode ?? "", c.correoSolicitud ?? "", c.correoCuenta ?? ""].some(v => v.toLowerCase().includes(q)));
  return (
    <Panel title="Cosplayers" lead="Quienes ya están en el Guild: su nivel, sus tickets y su saldo.">
      <label className="field ped__buscar"><span className="field__label">Buscar</span><input value={buscar} onChange={e => setBuscar(e.target.value)} type="search" placeholder="Nombre artístico, usuario, código o correo" /></label>
      {cargando ? <p className="empty">Cargando…</p> : visibles.length === 0 ? <p className="empty">{q ? `Nadie coincide con «${buscar.trim()}».` : "Todavía no hay cosplayers en el Guild."}</p> : (
        <ul className="ped">
          {visibles.map(c => {
            const esta = abierto === c.id;
            return (
              <li key={c.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila tie__fila" aria-expanded={esta} onClick={() => setAbierto(esta ? null : c.id)}>
                  <span className="tie__mini">{c.photo ? <img src={c.photo} alt="" loading="lazy" /> : null}</span>
                  <span className="tie__texto"><span className="ped__quien"><strong>{c.artisticName}</strong><span className="rows__side">{dinero(c.cashBalance)}</span></span>
                    <span className="ped__pie-fila"><small>{c.username ? `@${c.username} · ` : ""}{(c.totalFollowers ?? 0).toLocaleString("es-VE")} seguidores · {c.ticketBalance ?? 0} tickets{c.referralCode ? ` · código ${c.referralCode}` : ""}</small>
                      <span className="ped__insignias"><Badge>{nivelDe(c.tier).texto}</Badge>{c.isActive === false && <Badge tone="off">Suspendido</Badge>}</span></span></span>
                </button>
                {esta && <FichaCosplayer key={c.id} c={c} alCerrar={() => setAbierto(null)} />}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ── Misiones ─────────────────────────────────────────────────────────────────
type FormMision = { title: string; description: string; puntos: string; type: string; deadline: string; fases: string; notificar: boolean };
const MISION_VACIA: FormMision = { title: "", description: "", puntos: "", type: "post", deadline: "", fases: "1", notificar: false };

function FormularioMision({ inicial, texto, enviando, alEnviar, alCancelar, editando }: { inicial: FormMision; texto: string; enviando: boolean; alEnviar: (f: FormMision) => void; alCancelar?: () => void; editando?: boolean }) {
  const [f, setF] = useState(inicial);
  return (
    <form className="form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!f.title.trim() || !(parseInt(f.puntos, 10) >= 1)) { toast.error("Escribe el título y los puntos"); return; } alEnviar(f); }}>
      <div className="form form--inline">
        <label className="field tie__ancho"><span className="field__label">Misión</span><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Reel con tu cosplay y la pieza de Isekai" maxLength={300} required /></label>
        <label className="field"><span className="field__label">Puntos</span><input value={f.puntos} onChange={e => setF({ ...f, puntos: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="50" required /></label>
        <label className="field"><span className="field__label">Formato</span><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span className="field__label">Fases</span><input value={f.fases} onChange={e => setF({ ...f, fases: e.target.value.replace(/\D/g, "") })} inputMode="numeric" /></label>
        <label className="field"><span className="field__label">Fecha límite</span><input value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} type="date" /></label>
      </div>
      <label className="field"><span className="field__label">Qué hay que hacer</span><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={3} maxLength={5000} /></label>
      {editando && <div className="tie__checks"><label className="check"><input type="checkbox" checked={f.notificar} onChange={e => setF({ ...f, notificar: e.target.checked })} /> Avisar del cambio a los cosplayers</label></div>}
      <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={enviando}>{enviando ? "Guardando…" : texto}</button>{alCancelar && <button type="button" className="pa-accion" onClick={alCancelar}>Cancelar</button>}</div>
    </form>
  );
}
const datosMision = (f: FormMision) => ({ title: f.title.trim(), basePoints: parseInt(f.puntos, 10), type: f.type as "post" | "reel" | "tiktok" | "story" | "event", phases: Math.min(20, Math.max(1, parseInt(f.fases, 10) || 1)) });

function Misiones() {
  const utils = trpc.useUtils();
  const todas = trpc.cosplay.getAllActivities.useQuery();
  const refrescar = () => { void utils.cosplay.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const crear = trpc.cosplay.createActivity.useMutation({ onSuccess: () => { toast.success("Misión creada"); setNueva(false); refrescar(); }, onError: alFallar });
  const editar = trpc.cosplay.updateActivity.useMutation({ onSuccess: () => { toast.success("Misión guardada"); refrescar(); }, onError: alFallar });
  const alternar = trpc.cosplay.toggleActivity.useMutation({ onSuccess: refrescar, onError: alFallar });
  const borrar = trpc.cosplay.deleteActivity.useMutation({ onSuccess: () => { toast.success("Misión eliminada"); refrescar(); }, onError: alFallar });
  const [nueva, setNueva] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const items = (todas.data ?? []) as unknown as Mision[];
  return (
    <Panel title="Misiones" lead="Lo que los cosplayers pueden hacer para ganar tickets." action={<button className="btn btn--small" type="button" onClick={() => setNueva(n => !n)}>{nueva ? "Cerrar" : "Nueva misión"}</button>}>
      {nueva && <div className="tie__nuevo"><FormularioMision inicial={MISION_VACIA} texto="Crear misión" enviando={crear.isPending} alEnviar={f => crear.mutate({ ...datosMision(f), description: f.description || undefined, deadline: f.deadline || undefined })} /></div>}
      {todas.isLoading ? <p className="empty">Cargando…</p> : items.length === 0 ? <p className="empty">Todavía no hay misiones.</p> : (
        <ul className="ped">
          {items.map(m => {
            const esta = abierta === m.id;
            return (
              <li key={m.id} className={esta ? "is-open" : undefined}>
                <button type="button" className="ped__fila" aria-expanded={esta} onClick={() => setAbierta(esta ? null : m.id)}>
                  <span className="ped__quien"><strong>{m.title}</strong><span className="rows__side">{m.basePoints} pts</span></span>
                  <span className="ped__pie-fila"><small>{TIPO[m.type] ?? m.type}{m.phases > 1 ? ` · ${m.phases} fases` : ""}{m.deadline ? ` · hasta el ${new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short" }).format(new Date(m.deadline))}` : " · sin fecha límite"}</small>
                    <span className="ped__insignias">{m.active === false && <Badge tone="off">Pausada</Badge>}</span></span>
                </button>
                {esta && (
                  <div className="ped__ficha">
                    <FormularioMision key={m.id} editando texto="Guardar cambios" enviando={editar.isPending} inicial={{ title: m.title, description: m.description ?? "", puntos: String(m.basePoints), type: m.type, deadline: m.deadline ? new Date(m.deadline).toISOString().slice(0, 10) : "", fases: String(m.phases), notificar: false }}
                      alEnviar={f => editar.mutate({ id: m.id, ...datosMision(f), description: f.description || null, deadline: f.deadline || null, notificar: f.notificar })} />
                    <div className="ped__otras">
                      <button type="button" className="pa-accion" disabled={alternar.isPending} onClick={() => alternar.mutate({ id: m.id, active: m.active === false })}>{m.active === false ? "Volver a activar" : "Pausar"}</button>
                      <Confirmar texto="Eliminar" pregunta="¿Eliminar esta misión?" si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: m.id })} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/** Cuánto espera una decisión en el Guild: para el aviso de la pestaña */
export function usePendientesGuild(activo: boolean) {
  const sol = trpc.cosplay.getApplications.useQuery({ status: "pending" }, { enabled: activo, refetchInterval: 60_000 });
  const ent = trpc.cosplay.getAllSubmissions.useQuery({ status: "pending" }, { enabled: activo, refetchInterval: 60_000 });
  const ret = trpc.cosplay.getWithdrawals.useQuery({ status: "pending" }, { enabled: activo, refetchInterval: 60_000 });
  const n = (d: unknown) => (Array.isArray(d) ? d.length : 0);
  return { solicitudes: n(sol.data), entregas: n(ent.data), retiros: n(ret.data), total: n(sol.data) + n(ent.data) + n(ret.data) };
}

export default function Guild() {
  const pend = usePendientesGuild(true);
  const [vista, setVista] = useState<"solicitudes" | "entregas" | "retiros" | "cosplayers" | "misiones">("solicitudes");
  const cosplayers = trpc.cosplay.getAllCosplayers.useQuery();
  const todos = (cosplayers.data ?? []) as unknown as Cosplayer[];
  const nombres = useMemo(() => new Map(todos.map(c => [c.id, c.artisticName])), [todos]);
  const PESTANAS = [
    { id: "solicitudes" as const, texto: "Solicitudes", n: pend.solicitudes }, { id: "entregas" as const, texto: "Entregas", n: pend.entregas }, { id: "retiros" as const, texto: "Retiros", n: pend.retiros },
    { id: "cosplayers" as const, texto: "Cosplayers", n: 0 }, { id: "misiones" as const, texto: "Misiones", n: 0 },
  ];
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Cosplay Guild">
        {PESTANAS.map(p => <button key={p.id} type="button" role="tab" aria-selected={vista === p.id} className={vista === p.id ? "is-active" : undefined} onClick={() => setVista(p.id)}>{p.texto}{p.n ? <span className="tabs__n tabs__n--hot">{p.n}</span> : null}</button>)}
      </div>
      {vista === "solicitudes" && <Solicitudes />}
      {vista === "entregas" && <Entregas />}
      {vista === "retiros" && <Retiros nombres={nombres} />}
      {vista === "cosplayers" && <Cosplayers todos={todos} cargando={cosplayers.isLoading} />}
      {vista === "misiones" && <Misiones />}
    </>
  );
}
