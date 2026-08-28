import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Loader2, Check, Store, Ticket, AlertCircle, Search, Camera } from "lucide-react";
import QrScanner from "@/components/admin/QrScanner";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";

/**
 * Portal de tiendas autorizadas.
 *
 * La tienda escanea el QR del boleto en blanco (o teclea su código), elige el
 * tipo que compró el cliente y registra sus datos. A partir de ahí el boleto
 * queda vendido y la tienda ya no puede modificarlo.
 *
 * El QR apunta a /vender/TOKEN, así que al escanearlo con la cámara del
 * teléfono se abre esta pantalla con el boleto ya cargado. Si quien escanea
 * no tiene sesión de tienda, no ve nada: un QR fotografiado no sirve de nada.
 */
export default function StorePortal() {
  const [, params] = useRoute("/vender/:token");
  const { user, isAuthenticated, loading: cargandoSesion } = useAuth();
  const utils = trpc.useUtils();

  const [token, setToken] = useState(params?.token ?? "");
  const [codigoManual, setCodigoManual] = useState("");
  const [tipoElegido, setTipoElegido] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vendido, setVendido] = useState<any>(null);
  const [escaneando2, setEscaneando2] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);

  const esTienda = user?.role === "store" || user?.role === "admin";

  const { data: tienda } = trpc.tickets.miTienda.useQuery(undefined, { enabled: esTienda });
  const { data: eventos = [] } = trpc.tickets.eventosActivos.useQuery(undefined, { enabled: esTienda });
  const evento = eventos[0];

  const { data: tipos = [] } = trpc.tickets.tipos.useQuery(
    { eventId: evento?.id ?? 0 },
    { enabled: esTienda && !!evento },
  );

  const { data: escaneo, isLoading: escaneando, error: errorEscaneo } =
    trpc.tickets.escanear.useQuery({ token }, { enabled: esTienda && token.trim().length >= 4, retry: false });

  const { data: misVentas } = trpc.tickets.misVentas.useQuery(
    { eventId: evento?.id ?? 0 },
    { enabled: esTienda && !!evento },
  );

  const vender = trpc.tickets.vender.useMutation({
    onSuccess: (r) => {
      setVendido(r);
      utils.tickets.misVentas.invalidate();
      utils.tickets.escanear.invalidate();
      toast.success("Boleto vendido");
    },
    onError: (e) => toast.error(e.message),
  });

  // Al cargar un boleto en blanco, el foco va al primer campo
  useEffect(() => {
    if (escaneo?.ticket?.status === "blank") nombreRef.current?.focus();
  }, [escaneo?.ticket?.status]);

  const limpiar = () => {
    setToken(""); setCodigoManual(""); setTipoElegido(null);
    setNombre(""); setApellido(""); setTelefono(""); setVendido(null);
  };

  const campo = "w-full rounded-xl border border-[#2e2e3a] bg-[#101016] px-4 text-white outline-none transition-colors placeholder:text-[#6a6a7c] focus:border-[#e5007d]";

  if (cargandoSesion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507]">
        <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
      </div>
    );
  }

  if (!isAuthenticated || !esTienda) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050507] px-6">
        <div className="max-w-sm text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-[#3a3a48]" />
          <h1 className="mb-2 text-xl font-black text-white">Portal de tiendas</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#b4b4c2]">
            {!isAuthenticated
              ? "Esta zona es solo para tiendas autorizadas. Entra con el correo que registramos para tu tienda."
              : "Tu cuenta no está registrada como tienda autorizada. Si crees que es un error, escríbenos."}
          </p>
          {!isAuthenticated && (
            <button
              onClick={openLoginModal}
              className="w-full rounded-full bg-[#e5007d] font-bold text-white"
              style={{ minHeight: 52 }}
            >
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] pb-16 text-white">
      {escaneando2 && (
        <QrScanner
          onDetectado={(t) => { setEscaneando2(false); setToken(t); }}
          onCerrar={() => setEscaneando2(false)}
        />
      )}
      <div className="mx-auto max-w-lg px-5 py-8">
        {/* Cabecera */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5007d]/15">
            <Ticket className="h-5 w-5 text-[#e5007d]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{tienda?.name ?? "Tienda"}</p>
            <p className="truncate text-xs text-[#8a8a9c]">{evento?.name ?? "Sin evento activo"}</p>
          </div>
        </div>

        {/* Resumen de la tienda */}
        {misVentas && (
          <div className="mb-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-[#2e2e3a] bg-[#15151b] p-3">
              <p className="text-[11px] text-[#8a8a9c]">Vendidos</p>
              <p className="text-lg font-black">{misVentas.cantidad}</p>
            </div>
            <div className="rounded-2xl border border-[#2e2e3a] bg-[#15151b] p-3">
              <p className="text-[11px] text-[#8a8a9c]">Total USD</p>
              <p className="text-lg font-black text-[#e5007d]">${misVentas.totalUsd.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-[#2e2e3a] bg-[#15151b] p-3">
              <p className="text-[11px] text-[#8a8a9c]">Total Bs</p>
              <p className="text-sm font-black">{misVentas.totalBs.toLocaleString("es-VE")}</p>
            </div>
          </div>
        )}

        {/* ── Venta completada ── */}
        {vendido ? (
          <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center">
            <Check className="mx-auto mb-3 h-9 w-9 text-green-400" />
            <p className="text-lg font-black">Boleto vendido</p>
            <p className="mt-1 font-mono text-sm text-[#b4b4c2]">{vendido.code}</p>
            <div className="mt-4 space-y-1 text-sm text-[#b4b4c2]">
              <p>{vendido.tipo}</p>
              <p className="font-bold text-white">{vendido.comprador}</p>
              <p className="text-lg font-black text-[#e5007d]">
                ${vendido.precioUsd.toFixed(2)} USD
                {vendido.precioBs ? ` · Bs ${vendido.precioBs.toLocaleString("es-VE")}` : ""}
              </p>
              {vendido.tasa > 0 && (
                <p className="text-[11px] text-[#6a6a7c]">Tasa: Bs {vendido.tasa.toLocaleString("es-VE")}/USD</p>
              )}
            </div>
            <button
              onClick={limpiar}
              className="mt-6 w-full rounded-full bg-[#e5007d] font-bold text-white"
              style={{ minHeight: 52 }}
            >
              Vender otro boleto
            </button>
          </div>
        ) : !token ? (
          /* ── Sin boleto cargado ── */
          <div className="rounded-2xl border border-[#2e2e3a] bg-[#15151b] p-5">
            <p className="mb-1 text-sm font-bold">Escanea el boleto</p>
            <p className="mb-4 text-xs leading-relaxed text-[#8a8a9c]">
              Abre la cámara y apunta al QR. Si no funciona, escribe el código impreso.
            </p>

            <button
              onClick={() => setEscaneando2(true)}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e5007d] font-bold text-white transition-transform active:scale-[0.98]"
              style={{ minHeight: 56, WebkitTapHighlightColor: "transparent" }}
            >
              <Camera size={20} /> Escanear con la cámara
            </button>

            <p className="mb-2 text-center text-[11px] uppercase tracking-wider text-[#6a6a7c]">o escribe el código</p>

            <div className="flex gap-2">
              <input
                value={codigoManual}
                onChange={e => setCodigoManual(e.target.value.toUpperCase())}
                placeholder="IW-XXXXXX"
                className={`${campo} font-mono uppercase`}
                style={{ minHeight: 50 }}
              />
              <button
                onClick={() => setToken(codigoManual.trim())}
                disabled={codigoManual.trim().length < 4}
                className="shrink-0 rounded-xl bg-[#e5007d] px-5 font-bold text-white disabled:bg-[#22222c] disabled:text-[#6a6a7c]"
                style={{ minHeight: 50 }}
              >
                <Search size={18} />
              </button>
            </div>
          </div>
        ) : escaneando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#e5007d]" />
          </div>
        ) : errorEscaneo ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <p className="font-bold">Código no válido</p>
            <p className="mt-1 text-sm text-[#b4b4c2]">{errorEscaneo.message}</p>
            <button onClick={limpiar} className="mt-5 w-full rounded-full border border-[#2e2e3a] font-bold text-[#b4b4c2]" style={{ minHeight: 48 }}>
              Escanear otro
            </button>
          </div>
        ) : escaneo?.ticket?.status !== "blank" ? (
          /* ── Ya vendido o anulado ── */
          <div className="rounded-2xl border border-[#ffd700]/40 bg-[#ffd700]/10 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-[#ffd700]" />
            <p className="font-bold">
              {escaneo?.ticket?.status === "void" ? "Boleto anulado" : "Este boleto ya fue vendido"}
            </p>
            {escaneo?.ticket?.status === "sold" && (
              <div className="mt-3 space-y-1 text-sm text-[#b4b4c2]">
                <p className="font-bold text-white">
                  {escaneo.ticket.buyerName} {escaneo.ticket.buyerLastName}
                </p>
                <p>{escaneo.tipo?.name}</p>
                <p className="text-xs">
                  Vendido por {escaneo.tienda?.name ?? "—"} el{" "}
                  {escaneo.ticket.soldAt ? new Date(escaneo.ticket.soldAt).toLocaleDateString("es-VE") : "—"}
                </p>
              </div>
            )}
            <button onClick={limpiar} className="mt-5 w-full rounded-full border border-[#2e2e3a] font-bold text-[#b4b4c2]" style={{ minHeight: 48 }}>
              Escanear otro
            </button>
          </div>
        ) : (
          /* ── Boleto en blanco: registrar la venta ── */
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[#2e2e3a] bg-[#15151b] p-4 text-center">
              <p className="text-xs text-[#8a8a9c]">Boleto</p>
              <p className="font-mono text-lg font-black text-[#e5007d]">{escaneo.ticket.code}</p>
            </div>

            {/* Tipo de boleto */}
            <div>
              <p className="mb-2 text-sm font-bold">¿Qué boleto compró?</p>
              <div className="flex flex-col gap-2">
                {tipos.filter((t: any) => t.active).map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setTipoElegido(t.id)}
                    className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                      tipoElegido === t.id ? "border-[#e5007d] bg-[#e5007d]/10" : "border-[#2e2e3a]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-bold ${tipoElegido === t.id ? "text-[#ff45a0]" : "text-white"}`}>
                          {t.name}
                        </p>
                        {t.perks && <p className="mt-0.5 text-[11px] leading-snug text-[#8a8a9c]">{t.perks}</p>}
                      </div>
                      <p className="shrink-0 font-black text-white">${parseFloat(t.priceUsd).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
                {tipos.length === 0 && (
                  <p className="py-6 text-center text-sm text-[#8a8a9c]">
                    No hay tipos de boleto configurados para este evento.
                  </p>
                )}
              </div>
            </div>

            {/* Datos del comprador */}
            <div>
              <p className="mb-2 text-sm font-bold">Datos del comprador</p>
              <div className="flex flex-col gap-2">
                <input ref={nombreRef} value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre" className={campo} style={{ minHeight: 50 }} />
                <input value={apellido} onChange={e => setApellido(e.target.value)}
                  placeholder="Apellido" className={campo} style={{ minHeight: 50 }} />
                <input value={telefono} onChange={e => setTelefono(e.target.value)}
                  inputMode="tel" placeholder="Teléfono" className={campo} style={{ minHeight: 50 }} />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[#8a8a9c]">
                Revisa bien los datos: una vez registrado el boleto no se puede editar.
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={limpiar} className="flex-1 rounded-full border border-[#2e2e3a] font-bold text-[#b4b4c2]" style={{ minHeight: 52 }}>
                Cancelar
              </button>
              <button
                onClick={() => vender.mutate({
                  token,
                  ticketTypeId: tipoElegido!,
                  buyerName: nombre.trim(),
                  buyerLastName: apellido.trim(),
                  buyerPhone: telefono.trim(),
                })}
                disabled={!tipoElegido || !nombre.trim() || !apellido.trim() || telefono.trim().length < 4 || vender.isPending}
                className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-[#e5007d] font-bold text-white disabled:bg-[#22222c] disabled:text-[#6a6a7c]"
                style={{ minHeight: 52 }}
              >
                {vender.isPending ? <Loader2 size={18} className="animate-spin" /> : null}
                Registrar venta
              </button>
            </div>
          </div>
        )}

        {/* Últimas ventas de esta tienda */}
        {!vendido && !token && (misVentas?.boletos.length ?? 0) > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#8a8a9c]">Tus últimas ventas</p>
            <div className="flex flex-col gap-2">
              {misVentas!.boletos.slice(0, 10).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#2e2e3a] bg-[#15151b] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{b.buyerName} {b.buyerLastName}</p>
                    <p className="truncate text-[11px] text-[#8a8a9c]">{b.tipoNombre} · {b.code}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-[#e5007d]">
                    ${parseFloat(b.priceUsd ?? "0").toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
