import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { User, Package, Zap, Wallet, Tag, Copy, Check, ExternalLink, ArrowLeft, Plus, X } from "lucide-react";
import { openLoginModal } from "@/const";
import { getLoginUrl } from "@/const";

type Tab = "profile" | "kit" | "activities" | "wallet" | "redeem";

const TIER_MULTIPLIERS: Record<string, number> = {
  bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5,
};
const TIER_COLORS: Record<string, string> = {
  bronce: "#cd7f32", plata: "#C0C0C0", oro: "#FFD700", diamante: "#b9f2ff", platino: "#e5e4e2",
};
const DISCOUNT_OPTIONS = [
  { pct: 10, cost: 500, label: "Descuento básico" },
  { pct: 20, cost: 1000, label: "Descuento estándar" },
  { pct: 30, cost: 2000, label: "Descuento premium" },
  { pct: 50, cost: 5000, label: "Descuento VIP" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-white/50" />}
    </button>
  );
}

export default function CosplayDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");
  const [submitModal, setSubmitModal] = useState<any>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [profileForm, setProfileForm] = useState({ bio: "", photo: "", instagram: "", tiktok: "", youtube: "", facebook: "", twitter: "" });
  const [profileInit, setProfileInit] = useState(false);
  const utils = trpc.useUtils();

  const { data: cosplayer, isLoading: cpLoading } = trpc.cosplay.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    onSuccess: (cp: any) => {
      if (!profileInit && cp) {
        setProfileForm({
          bio: cp.bio ?? "",
          photo: cp.photo ?? "",
          instagram: cp.instagram ?? "",
          tiktok: cp.tiktok ?? "",
          youtube: cp.youtube ?? "",
          facebook: cp.facebook ?? "",
          twitter: cp.twitter ?? "",
        });
        setProfileInit(true);
      }
    }
  } as any);

  const { data: activities = [] } = trpc.cosplay.getActivities.useQuery();
  const { data: submissions = [] } = trpc.cosplay.getMySubmissions.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });
  const { data: tickets } = trpc.cosplay.getMyTickets.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });
  const { data: discountCodes = [] } = trpc.cosplay.getMyDiscountCodes.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });

  const updateProfile = trpc.cosplay.updateMyProfile.useMutation({
    onSuccess: () => { utils.cosplay.getMyProfile.invalidate(); toast.success("Perfil actualizado"); },
    onError: (e) => toast.error(e.message),
  });
  const submitActivity = trpc.cosplay.submitActivity.useMutation({
    onSuccess: () => { utils.cosplay.getMySubmissions.invalidate(); setSubmitModal(null); setEvidenceUrl(""); toast.success("Actividad enviada"); },
    onError: (e) => toast.error(e.message),
  });
  const redeemDiscount = trpc.cosplay.redeemDiscount.useMutation({
    onSuccess: (data: any) => { utils.cosplay.getMyTickets.invalidate(); utils.cosplay.getMyDiscountCodes.invalidate(); toast.success(`Código generado: ${data.code}`); },
    onError: (e) => toast.error(e.message),
  });

  if (loading || cpLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#e5007d]/30 border-t-[#e5007d] rounded-full animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-3">Inicia sesión para continuar</h2>
          <button onClick={() => window.location.href = getLoginUrl()} className="px-8 py-3 bg-[#e5007d] rounded-full font-bold hover:bg-[#c4006b] transition-colors">Iniciar sesión</button>
        </div>
      </div>
    );
  }

  if (!cosplayer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-3">No eres cosplayer aún</h2>
          <p className="text-white/50 mb-6">Postúlate al Isekai Cosplay Guild para acceder a este panel.</p>
          <Link href="/cosplay/apply"><button className="px-8 py-3 bg-[#e5007d] rounded-full font-bold hover:bg-[#c4006b] transition-colors">Postularme</button></Link>
        </div>
      </div>
    );
  }

  const tierColor = TIER_COLORS[cosplayer.tier ?? 'bronce'] ?? '#cd7f32';
  const multiplier = TIER_MULTIPLIERS[cosplayer.tier ?? 'bronce'] ?? 1;
  const balance = tickets?.balance ?? 0;

  const tabs = [
    { id: "profile" as Tab, label: "Mi perfil", icon: User },
    { id: "kit" as Tab, label: "Kit", icon: Package },
    { id: "activities" as Tab, label: "Actividades", icon: Zap },
    { id: "wallet" as Tab, label: "Billetera", icon: Wallet },
    { id: "redeem" as Tab, label: "Canjear", icon: Tag },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/cosplay"><button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-2"><ArrowLeft size={14} /> Guild</button></Link>
            <h1 className="text-2xl font-black">Hola, <span style={{ color: tierColor }}>{cosplayer.artisticName}</span></h1>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold capitalize px-3 py-1 rounded-full" style={{ color: tierColor, backgroundColor: tierColor + '20' }}>{cosplayer.tier ?? 'Bronce'}</span>
            <p className="text-white/40 text-xs mt-1">{multiplier}x tickets</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-8 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 justify-center ${tab === t.id ? 'bg-[#e5007d] text-white' : 'text-white/50 hover:text-white'}`}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ── MI PERFIL ── */}
          {tab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-bold mb-6">Editar perfil</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5 block">Foto (URL)</label>
                  <input value={profileForm.photo} onChange={e => setProfileForm(f => ({ ...f, photo: e.target.value }))} placeholder="https://..." className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#e5007d]/60 text-sm" />
                  {profileForm.photo && <img src={profileForm.photo} className="mt-2 w-20 h-20 rounded-full object-cover border-2" style={{ borderColor: tierColor }} />}
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5 block">Bio</label>
                  <textarea rows={4} value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} placeholder="Cuéntanos sobre ti..." className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#e5007d]/60 text-sm resize-none" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(['instagram', 'tiktok', 'youtube', 'facebook', 'twitter'] as const).map(k => (
                    <div key={k}>
                      <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5 block capitalize">{k}</label>
                      <input value={(profileForm as any)[k]} onChange={e => setProfileForm(f => ({ ...f, [k]: e.target.value }))} placeholder={`@usuario`} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#e5007d]/60 text-sm" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => updateProfile.mutate(profileForm)}
                  disabled={updateProfile.isPending}
                  className="px-8 py-3 bg-[#e5007d] rounded-full font-bold hover:bg-[#c4006b] transition-colors disabled:opacity-50"
                >
                  {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── KIT ── */}
          {tab === "kit" && (
            <motion.div key="kit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-bold mb-6">Kit de bienvenida</h2>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4 mb-4">
                  <Package size={32} style={{ color: tierColor }} />
                  <div>
                    <p className="font-bold">Kit Isekai Cosplay Guild</p>
                    <p className="text-white/50 text-sm">Tu kit de bienvenida incluye productos exclusivos para representantes.</p>
                  </div>
                </div>
                <Link href="/account">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl text-sm font-semibold hover:bg-white/15 transition-colors">
                    Ver estado del envío <ExternalLink size={13} />
                  </button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── ACTIVIDADES ── */}
          {tab === "activities" && (
            <motion.div key="activities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="text-lg font-bold mb-2">Actividades disponibles</h2>
              <p className="text-white/40 text-sm mb-6">Completa actividades y gana tickets. Tu multiplicador: <strong style={{ color: tierColor }}>{multiplier}x</strong></p>

              <div className="space-y-4 mb-10">
                {activities.length === 0 && <p className="text-white/30 py-8 text-center">No hay actividades activas en este momento.</p>}
                {activities.map((act: any) => {
                  const wouldEarn = Math.round(act.basePoints * multiplier);
                  const alreadyDone = submissions.some((s: any) => s.activityId === act.id && s.status !== 'rejected');
                  return (
                    <div key={act.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-white/40 bg-white/10 px-2 py-0.5 rounded-full">{act.type}</span>
                        </div>
                        <p className="font-bold mb-1">{act.title}</p>
                        {act.description && <p className="text-white/50 text-sm mb-2">{act.description}</p>}
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-white/40">Base: {act.basePoints} pts</span>
                          <span className="text-[#e5007d] font-bold">→ Ganarías: {wouldEarn} tickets</span>
                        </div>
                      </div>
                      <button
                        disabled={alreadyDone}
                        onClick={() => { setSubmitModal(act); setEvidenceUrl(""); }}
                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${alreadyDone ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-[#e5007d] hover:bg-[#c4006b] text-white'}`}
                      >
                        {alreadyDone ? 'Enviada' : 'Completar'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {submissions.length > 0 && (
                <>
                  <h3 className="font-bold mb-4 text-white/60 text-sm uppercase tracking-wider">Mis envíos</h3>
                  <div className="space-y-3">
                    {submissions.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                        <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white flex items-center gap-1.5 truncate">
                          <ExternalLink size={12} /> {s.evidenceUrl}
                        </a>
                        <span className={`ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-green-500/20 text-green-400' : s.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {s.status === 'approved' ? 'Aprobada' : s.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── BILLETERA ── */}
          {tab === "wallet" && (
            <motion.div key="wallet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#e5007d]/20 to-violet-900/20 border border-[#e5007d]/30 mb-8">
                <p className="text-white/60 text-sm mb-1">Balance actual</p>
                <p className="text-5xl font-black" style={{ color: tierColor }}>{balance.toLocaleString()}</p>
                <p className="text-white/40 text-sm mt-1">tickets disponibles</p>
              </div>
              <h3 className="font-bold mb-4 text-white/60 text-sm uppercase tracking-wider">Historial</h3>
              <div className="space-y-2">
                {(tickets?.ledger ?? []).length === 0 && <p className="text-white/30 text-sm py-8 text-center">Sin movimientos aún.</p>}
                {(tickets?.ledger ?? []).map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm">
                    <span className="text-white/70">{e.description}</span>
                    <span className={`font-bold ${e.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {e.amount > 0 ? '+' : ''}{e.amount}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── CANJEAR ── */}
          {tab === "redeem" && (
            <motion.div key="redeem" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold mb-1">Canjear tickets</h2>
                  <p className="text-white/40 text-sm">Balance: <strong style={{ color: tierColor }}>{balance.toLocaleString()} tickets</strong></p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {DISCOUNT_OPTIONS.map(opt => {
                  const canAfford = balance >= opt.cost;
                  return (
                    <div key={opt.pct} className={`p-5 rounded-2xl border transition-all ${canAfford ? 'bg-white/5 border-white/10 hover:border-[#e5007d]/40' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl font-black text-[#e5007d]">{opt.pct}%</span>
                        <span className="text-xs text-white/40 font-semibold">{opt.cost.toLocaleString()} tickets</span>
                      </div>
                      <p className="text-sm font-semibold mb-3">{opt.label}</p>
                      <button
                        disabled={!canAfford || redeemDiscount.isPending}
                        onClick={() => redeemDiscount.mutate({ discountPercent: opt.pct as any })}
                        className={`w-full py-2 rounded-full text-sm font-bold transition-colors ${canAfford ? 'bg-[#e5007d] hover:bg-[#c4006b] text-white' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                      >
                        {canAfford ? 'Canjear' : `Faltan ${(opt.cost - balance).toLocaleString()}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {discountCodes.length > 0 && (
                <>
                  <h3 className="font-bold mb-4 text-white/60 text-sm uppercase tracking-wider">Mis códigos</h3>
                  <div className="space-y-3">
                    {discountCodes.map((c: any) => (
                      <div key={c.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${c.used ? 'bg-white/[0.02] border-white/5 opacity-50' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#e5007d] tracking-widest">{c.code}</span>
                          <CopyButton text={c.code} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-white/40 text-xs">{c.discountPercent}% OFF</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.used ? 'bg-white/10 text-white/30' : 'bg-green-500/20 text-green-400'}`}>{c.used ? 'Usado' : 'Disponible'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit activity modal */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111] rounded-2xl border border-white/10 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Enviar evidencia</h3>
              <button onClick={() => setSubmitModal(null)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-white/60 text-sm mb-4">{submitModal.title}</p>
            <label className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1.5 block">Link de evidencia (post, reel, etc.)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#e5007d]/60 text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                disabled={!evidenceUrl || submitActivity.isPending}
                onClick={() => submitActivity.mutate({ activityId: submitModal.id, evidenceUrl })}
                className="flex-1 py-3 bg-[#e5007d] rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-50"
              >
                {submitActivity.isPending ? "Enviando..." : "Enviar"}
              </button>
              <button onClick={() => setSubmitModal(null)} className="px-4 py-3 bg-white/10 rounded-full font-bold text-sm hover:bg-white/15 transition-colors">Cancelar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
