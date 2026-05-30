import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { User, Package, Zap, Wallet, Tag, Copy, Check, ExternalLink, X, Plus, Upload } from "lucide-react";
import { getLoginUrl } from "@/const";

type Tab = "profile" | "kit" | "activities" | "wallet" | "redeem";

const TIER_MULTIPLIERS: Record<string, number> = { bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5 };

export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronce: "#cd7f32", plata: "#c0c0c0", oro: "#ffd700", diamante: "#7dd3fc", platino: "#e8e8e8",
  };
  return colors[tier] ?? "#e5007d";
}

const DISCOUNT_OPTIONS = [
  { pct: 10, cost: 500,  label: "Descuento básico" },
  { pct: 20, cost: 1000, label: "Descuento estándar" },
  { pct: 30, cost: 2000, label: "Descuento premium" },
  { pct: 50, cost: 5000, label: "Descuento VIP" },
];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",    label: "Mi Perfil",   icon: User    },
  { id: "kit",        label: "Kit",         icon: Package },
  { id: "activities", label: "Actividades", icon: Zap     },
  { id: "wallet",     label: "Billetera",   icon: Wallet  },
  { id: "redeem",     label: "Canjear",     icon: Tag     },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1.5 rounded-lg bg-[#222] hover:bg-[#333] border border-[#333] transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-[#888]" />}
    </button>
  );
}

export default function CosplayDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [offsetY, setOffsetY] = useState(0);
  const [submitModal, setSubmitModal] = useState<any>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [profileForm, setProfileForm] = useState({
    artisticName: "", bio: "", photo: "", bannerImage: "",
    instagram: "", tiktok: "", youtube: "", facebook: "", twitter: "",
    gallery: [] as string[],
  });
  const [profileInit, setProfileInit] = useState(false);
  const utils = trpc.useUtils();
  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const textureEnabled = siteSettings?.["texture_enabled"] === "true";

  useEffect(() => {
    const h = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const { data: cosplayer, isLoading: cpLoading } = trpc.cosplay.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    onSuccess: (cp: any) => {
      if (!profileInit && cp) {
        setProfileForm({
          artisticName: cp.artisticName ?? "",
          bio: cp.bio ?? "",
          photo: cp.photo ?? "",
          bannerImage: (cp as any).bannerImage ?? "",
          instagram: cp.instagram ?? "",
          tiktok: cp.tiktok ?? "",
          youtube: cp.youtube ?? "",
          facebook: cp.facebook ?? "",
          twitter: cp.twitter ?? "",
          gallery: (cp.gallery as string[] | null) ?? [],
        });
        setProfileInit(true);
      }
    },
  } as any);

  const { data: activities = [] } = trpc.cosplay.getActivities.useQuery();
  const { data: submissions = [] } = trpc.cosplay.getMySubmissions.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });
  const { data: tickets }           = trpc.cosplay.getMyTickets.useQuery(undefined,       { enabled: isAuthenticated && !!cosplayer });
  const { data: discountCodes = [] } = trpc.cosplay.getMyDiscountCodes.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });

  const updateProfile = trpc.cosplay.updateMyProfile.useMutation({
    onSuccess: () => { utils.cosplay.getMyProfile.invalidate(); toast.success("Perfil actualizado"); },
    onError: (e) => toast.error(e.message),
  });
  const uploadImage = trpc.cosplay.uploadImage.useMutation({
    onError: () => toast.error("Error al subir imagen"),
  });
  const submitActivity = trpc.cosplay.submitActivity.useMutation({
    onSuccess: () => { utils.cosplay.getMySubmissions.invalidate(); setSubmitModal(null); setEvidenceUrl(""); toast.success("Actividad enviada"); },
    onError: (e) => toast.error(e.message),
  });
  const redeemDiscount = trpc.cosplay.redeemDiscount.useMutation({
    onSuccess: (data: any) => { utils.cosplay.getMyTickets.invalidate(); utils.cosplay.getMyDiscountCodes.invalidate(); toast.success(`Código generado: ${data.code}`); },
    onError: (e) => toast.error(e.message),
  });

  const toBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = ev => res((ev.target?.result as string).split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64Data = await toBase64(file);
    const { url } = await uploadImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data });
    setProfileForm(f => ({ ...f, bannerImage: url }));
    toast.success("Banner actualizado");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64Data = await toBase64(file);
    const { url } = await uploadImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data });
    setProfileForm(f => ({ ...f, photo: url }));
    toast.success("Foto actualizada");
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64Data = await toBase64(file);
    const { url } = await uploadImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data });
    setProfileForm(f => ({ ...f, gallery: [...f.gallery, url] }));
    toast.success("Foto agregada");
  };

  const removeGalleryImage = (i: number) =>
    setProfileForm(f => ({ ...f, gallery: f.gallery.filter((_, idx) => idx !== i) }));

  const handleSaveProfile = () =>
    updateProfile.mutate({
      bio: profileForm.bio || undefined,
      photo: profileForm.photo || undefined,
      bannerImage: profileForm.bannerImage || undefined,
      gallery: profileForm.gallery,
      instagram: profileForm.instagram || undefined,
      tiktok: profileForm.tiktok || undefined,
      youtube: profileForm.youtube || undefined,
      facebook: profileForm.facebook || undefined,
      twitter: profileForm.twitter || undefined,
    });

  if (loading || cpLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#333] border-t-[#e5007d] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Inicia sesión para continuar</h2>
          <button onClick={() => window.location.href = getLoginUrl()} className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">
            Iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!cosplayer) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-3">No eres cosplayer aún</h2>
          <p className="text-[#888] mb-6">Postúlate al Isekai Cosplay Guild para acceder a este panel.</p>
          <Link href="/cosplay/apply">
            <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">Postularme</button>
          </Link>
        </div>
      </div>
    );
  }

  const tierColor  = getTierColor(cosplayer.tier ?? 'bronce');
  const multiplier = TIER_MULTIPLIERS[cosplayer.tier ?? 'bronce'] ?? 1;
  const balance    = tickets?.balance ?? 0;

  const inputCls = "w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm placeholder-[#555] outline-none focus:border-[#e5007d] transition-colors";
  const labelCls = "block text-[#ccc] text-sm font-medium mb-2";

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-20">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden pb-10 pt-6 sm:py-16"
        style={{
          backgroundImage: textureEnabled ? 'url(/textura-isekai.svg)' : 'none',
          backgroundSize: 'cover',
          backgroundPosition: `center ${offsetY * 0.2}px`,
          backgroundColor: '#111',
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.5) 0%, rgba(13,13,13,1) 100%)' }} />
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] bg-[#222]" style={{ borderColor: tierColor }}>
            {cosplayer.photo
              ? <img src={cosplayer.photo} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-[#555]" /></div>
            }
          </div>
          <h1 className="text-xl font-black text-white">{cosplayer.artisticName}</h1>
          <span className="text-xs px-3 py-1 rounded-full font-bold capitalize" style={{ backgroundColor: tierColor, color: '#000' }}>
            {(cosplayer.tier ?? 'bronce').toUpperCase()} ✓
          </span>
          <p className="text-[#888] text-sm">🎫 {balance.toLocaleString()} tickets · ×{multiplier} multiplicador</p>
        </div>
      </motion.div>

      <div className="container max-w-4xl py-8">

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 mb-8"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  isActive ? "bg-[#e5007d] text-white" : "bg-[#1a1a1a] border border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >

            {/* ── MI PERFIL ── */}
            {activeTab === "profile" && (
              <div className="max-w-2xl mx-auto">

                {/* Banner */}
                <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-0 bg-[#1a1a1a] border border-[#333]">
                  {profileForm.bannerImage && (
                    <img src={profileForm.bannerImage} className="w-full h-full object-cover" alt="" />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black/30 transition-colors group">
                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={20} className="text-white" />
                      <span className="text-white text-xs font-semibold">Cambiar banner</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  </label>
                </div>

                {/* Foto de perfil superpuesta al banner */}
                <div className="flex flex-col items-center -mt-10 mb-6 relative z-10">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-[#0d0d0d] bg-[#222]" style={{ outline: `3px solid ${tierColor}`, outlineOffset: '0px' }}>
                    {profileForm.photo
                      ? <img src={profileForm.photo} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center"><User size={28} className="text-[#555]" /></div>
                    }
                    {uploadImage.isPending && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="mt-2 text-xs text-[#e5007d] font-semibold cursor-pointer hover:underline">
                    Cambiar foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                <div className="flex flex-col gap-4">

                  {/* Nombre artístico — solo lectura */}
                  <div>
                    <label className={labelCls}>Nombre artístico</label>
                    <input value={profileForm.artisticName} disabled className="w-full px-4 py-3 bg-[#111] border border-[#333] rounded-xl text-[#555] text-sm cursor-not-allowed" />
                    <p className="text-[#555] text-xs mt-1">El nombre artístico no se puede cambiar. Contacta al admin.</p>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className={labelCls}>Biografía</label>
                    <textarea
                      rows={4}
                      value={profileForm.bio}
                      onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Cuéntale al mundo quién eres como cosplayer..."
                      className={inputCls + " resize-none"}
                    />
                  </div>

                  {/* Redes sociales */}
                  <p className="text-[#ccc] text-sm font-medium mt-2">Redes sociales</p>
                  {[
                    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tunombre' },
                    { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@tunombre' },
                    { key: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@tuchannel' },
                    { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/tuperfil' },
                    { key: 'twitter',   label: 'Twitter / X', placeholder: 'https://x.com/tunombre' },
                  ].map(red => (
                    <div key={red.key}>
                      <label className="block text-[#888] text-xs mb-1">{red.label}</label>
                      <input
                        value={(profileForm as any)[red.key] ?? ''}
                        onChange={e => setProfileForm(f => ({ ...f, [red.key]: e.target.value }))}
                        placeholder={red.placeholder}
                        className={inputCls}
                      />
                    </div>
                  ))}

                  {/* Galería */}
                  <div>
                    <label className={labelCls}>Galería de cosplays</label>
                    <div className="grid grid-cols-3 gap-3">
                      {profileForm.gallery.map((img, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group bg-[#1a1a1a]">
                          <img src={img} className="w-full h-full object-cover" alt="" />
                          <button
                            onClick={() => removeGalleryImage(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {profileForm.gallery.length < 9 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-[#333] flex items-center justify-center cursor-pointer hover:border-[#e5007d] transition-colors bg-[#1a1a1a]">
                          {uploadImage.isPending ? (
                            <div className="w-6 h-6 border-2 border-[#333] border-t-[#e5007d] rounded-full animate-spin" />
                          ) : (
                            <Plus size={24} className="text-[#555]" />
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfile.isPending}
                    className="w-full bg-[#e5007d] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-50"
                  >
                    {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}

            {/* ── KIT ── */}
            {activeTab === "kit" && (
              <div>
                <div className="p-6 rounded-2xl bg-[#1a1a1a] border border-[#333]">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#222] border border-[#333] flex items-center justify-center">
                      <Package size={24} style={{ color: tierColor }} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Kit Isekai Cosplay Guild</p>
                      <p className="text-[#888] text-sm">Tu kit de bienvenida con productos exclusivos para representantes.</p>
                    </div>
                  </div>
                  <Link href="/account">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#222] border border-[#333] rounded-xl text-sm font-semibold text-[#ccc] hover:border-[#444] transition-colors">
                      Ver estado del envío <ExternalLink size={12} />
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {/* ── ACTIVIDADES ── */}
            {activeTab === "activities" && (
              <div>
                <p className="text-[#888] text-sm mb-6">
                  Completa actividades y envía evidencia. Tu multiplicador:{" "}
                  <strong style={{ color: tierColor }}>×{multiplier}</strong>
                </p>
                <div className="space-y-4 mb-10">
                  {activities.length === 0 && (
                    <div className="text-center py-16 border border-[#222] rounded-2xl">
                      <p className="text-[#555]">No hay actividades activas en este momento.</p>
                    </div>
                  )}
                  {activities.map((act: any) => {
                    const wouldEarn = Math.round(act.basePoints * multiplier);
                    const alreadyDone = submissions.some((s: any) => s.activityId === act.id && s.status !== 'rejected');
                    return (
                      <div key={act.id} className="flex items-start justify-between gap-4 p-5 rounded-2xl bg-[#1a1a1a] border border-[#333]">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#888] bg-[#222] border border-[#333] px-2 py-0.5 rounded-full">{act.type}</span>
                          </div>
                          <p className="font-bold text-white mb-1">{act.title}</p>
                          {act.description && <p className="text-[#888] text-sm mb-2">{act.description}</p>}
                          <div className="flex items-center gap-3 text-xs text-[#888]">
                            <span>Base: {act.basePoints} pts</span>
                            <span className="text-[#e5007d] font-bold">→ Ganarías: {wouldEarn} tickets</span>
                          </div>
                        </div>
                        <button
                          disabled={alreadyDone}
                          onClick={() => { setSubmitModal(act); setEvidenceUrl(""); }}
                          className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${alreadyDone ? 'bg-[#222] text-[#555] border border-[#333] cursor-not-allowed' : 'bg-[#e5007d] hover:bg-[#c4006b] text-white'}`}
                        >
                          {alreadyDone ? 'Enviada' : 'Completar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {submissions.length > 0 && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#555] mb-3">Mis envíos</p>
                    <div className="space-y-2">
                      {submissions.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-sm">
                          <a href={s.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-[#888] hover:text-[#ccc] flex items-center gap-1.5 truncate">
                            <ExternalLink size={11} /> <span className="truncate">{s.evidenceUrl}</span>
                          </a>
                          <span className={`ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-green-500/10 text-green-400' : s.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                            {s.status === 'approved' ? 'Aprobada' : s.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── BILLETERA ── */}
            {activeTab === "wallet" && (
              <div>
                <div className="p-6 rounded-2xl bg-[#1a1a1a] border-t-4 mb-8" style={{ borderColor: tierColor }}>
                  <p className="text-[#888] text-sm mb-1">Balance actual</p>
                  <p className="text-5xl font-black" style={{ color: tierColor }}>{balance.toLocaleString()}</p>
                  <p className="text-[#555] text-sm mt-1">tickets disponibles</p>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#555] mb-3">Historial</p>
                <div className="space-y-2">
                  {(tickets?.ledger ?? []).length === 0 && (
                    <div className="text-center py-12 border border-[#222] rounded-2xl">
                      <p className="text-[#555] text-sm">Sin movimientos aún.</p>
                    </div>
                  )}
                  {(tickets?.ledger ?? []).map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-sm">
                      <span className="text-[#ccc]">{e.description}</span>
                      <span className={`font-bold ${e.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {e.amount > 0 ? '+' : ''}{e.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CANJEAR ── */}
            {activeTab === "redeem" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white font-bold mb-0.5">Canjear tickets</p>
                    <p className="text-[#888] text-sm">Balance: <strong style={{ color: tierColor }}>{balance.toLocaleString()} tickets</strong></p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-10">
                  {DISCOUNT_OPTIONS.map(opt => {
                    const canAfford = balance >= opt.cost;
                    return (
                      <div key={opt.pct} className={`p-5 rounded-2xl bg-[#1a1a1a] border transition-all ${canAfford ? 'border-[#333] hover:border-[#e5007d]/60' : 'border-[#222] opacity-50'}`}>
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-3xl font-black text-[#e5007d]">{opt.pct}%</span>
                          <span className="text-xs text-[#888] font-semibold">{opt.cost.toLocaleString()} tickets</span>
                        </div>
                        <p className="text-sm font-semibold text-[#ccc] mb-4">{opt.label}</p>
                        <button
                          disabled={!canAfford || redeemDiscount.isPending}
                          onClick={() => redeemDiscount.mutate({ discountPercent: opt.pct as any })}
                          className={`w-full py-2 rounded-full text-sm font-bold transition-colors ${canAfford ? 'bg-[#e5007d] hover:bg-[#c4006b] text-white' : 'bg-[#222] text-[#555] cursor-not-allowed'}`}
                        >
                          {canAfford ? 'Canjear' : `Faltan ${(opt.cost - balance).toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {discountCodes.length > 0 && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#555] mb-3">Mis códigos</p>
                    <div className="space-y-2">
                      {discountCodes.map((c: any) => (
                        <div key={c.id} className={`flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1a1a] border text-sm ${c.used ? 'border-[#222] opacity-50' : 'border-[#333]'}`}>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-[#e5007d] tracking-widest text-base">{c.code}</span>
                            <CopyButton text={c.code} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#888] text-xs">{c.discountPercent}% OFF</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.used ? 'bg-[#222] text-[#555]' : 'bg-green-500/10 text-green-400'}`}>
                              {c.used ? 'Usado' : 'Disponible'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal evidencia */}
      {submitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#1a1a1a] border border-[#333] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Enviar evidencia</h3>
              <button onClick={() => setSubmitModal(null)} className="text-[#888] hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <p className="text-[#888] text-sm mb-5">{submitModal.title}</p>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#888] mb-1.5">Link de evidencia (post, reel, etc.)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full px-4 py-3 rounded-xl bg-[#222] border border-[#333] text-white placeholder-[#555] outline-none focus:border-[#e5007d] text-sm mb-5"
            />
            <div className="flex gap-3">
              <button
                disabled={!evidenceUrl || submitActivity.isPending}
                onClick={() => submitActivity.mutate({ activityId: submitModal.id, evidenceUrl })}
                className="flex-1 py-3 bg-[#e5007d] rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-50 text-white"
              >
                {submitActivity.isPending ? "Enviando..." : "Enviar actividad"}
              </button>
              <button onClick={() => setSubmitModal(null)} className="px-5 py-3 bg-[#222] border border-[#333] rounded-full font-bold text-sm text-[#ccc] hover:border-[#444] transition-colors">
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
