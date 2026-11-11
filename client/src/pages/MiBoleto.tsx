import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import QRCode from "qrcode";
import { trpc } from "@/lib/trpc";

/**
 * El boleto digital (/boleto/TOKEN): el mismo que llega por correo, para
 * mostrarlo en la puerta desde el teléfono. Brillo alto y QR grande.
 */
export default function MiBoleto() {
  const [, p] = useRoute("/boleto/:token");
  const token = p?.token ?? "";
  const { data: b, isLoading } = trpc.boletosOnline.boleto.useQuery({ token }, { enabled: /^[A-Za-z0-9]{20,64}$/.test(token), retry: false });
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!b) return;
    void QRCode.toDataURL(`https://www.isekaiworld.co/vender/${b.token}`, { width: 520, margin: 1 }).then(setQr).catch(() => {});
  }, [b]);

  const fecha = (d: any) => new Date(d).toLocaleDateString("es-VE", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  const fondo = "flex min-h-[100svh] flex-col items-center justify-center bg-[#06050a] px-5 py-10 text-white";

  if (isLoading) return <div className={fondo}><Loader2 className="animate-spin text-[#ff3d9e]" /></div>;
  if (!b) return (
    <div className={fondo}>
      <p className="text-[18px] font-bold">Este boleto no existe</p>
      <p className="mt-2 text-center text-[14px] text-[#9a93a6]">Revisa el enlace del correo o escríbenos a ventas@isekaiworld.co.</p>
      <Link href="/" className="mt-5 rounded-full bg-[#ff3d9e] px-6 py-3 font-bold">Ir al Fest</Link>
    </div>
  );

  const color = b.color ?? "#e5007d";
  const S = "#15121c";
  const muescas = (y: "100%" | "0") => ({ background: `radial-gradient(circle at 0 ${y}, transparent 11px, ${S} 11.5px) left / 51% 100% no-repeat, radial-gradient(circle at 100% ${y}, transparent 11px, ${S} 11.5px) right / 51% 100% no-repeat` });

  return (
    <div className={fondo}>
      <div className="w-full max-w-[360px]">
        <div className="overflow-hidden rounded-t-[28px]" style={muescas("100%")}>
          <div className="h-2" style={{ background: color }} />
          <div className="px-6 pb-5 pt-5">
            <p className="text-[12px] font-bold tracking-[0.2em] text-[#ff3d9e]">ISEKAI WORLD FEST</p>
            <p className="mt-1.5 text-[26px] font-black leading-tight">{b.tipo || "Boleto"}</p>
            <p className="mt-2 text-[14px] leading-snug text-[#bfb8c9]">{fecha(b.inicio) === fecha(b.fin) ? fecha(b.inicio) : `${fecha(b.inicio).replace(/ de \d{4}$/, "")} y ${fecha(b.fin)}`}{b.lugar ? <><br />{b.lugar}</> : ""}</p>
            <p className="mt-4 text-[12.5px] text-[#9a93a6]">A nombre de</p>
            <p className="text-[17px] font-bold">{b.nombre || "—"}</p>
          </div>
        </div>
        <div className="relative rounded-b-[28px] px-6 pb-7 pt-6 text-center" style={muescas("0")}>
          <span className="absolute left-5 right-5 top-0 border-t-2 border-dashed border-white/15" aria-hidden="true" />
          {b.anulado ? (
            <p className="rounded-2xl bg-[#7f1d1d]/50 px-4 py-8 text-[17px] font-bold text-[#fecaca]">Este boleto fue anulado</p>
          ) : (
            <div className="mx-auto w-[230px] rounded-2xl bg-white p-3">
              {qr ? <img src={qr} alt={`Código QR del boleto ${b.codigo}`} className="block w-full" /> : <div className="flex aspect-square items-center justify-center"><Loader2 className="animate-spin text-[#999]" /></div>}
            </div>
          )}
          <p className="mt-4 font-mono text-[26px] font-black tracking-[0.14em]">{b.codigo}</p>
          <p className="mt-1.5 text-[12.5px] text-[#9a93a6]">Muéstralo en la entrada. Vale para una persona{b.dias > 1 ? ", los dos días" : ""}.</p>
        </div>
        <Link href="/worldfest/pass" className="mt-5 block rounded-full bg-white/[0.08] py-3.5 text-center text-[14.5px] font-bold">Ver mi Level Pass</Link>
      </div>
    </div>
  );
}
