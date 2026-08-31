import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { REFERRAL_TIERS } from "@shared/referral";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { User, Package, Zap, Wallet, Tag, Copy, Check, ExternalLink, X, Plus, Upload, Gift, ClipboardList, Settings, Printer, Sparkles, Truck, CheckCircle, ChevronRight } from "lucide-react";
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
      className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-[#333] border border-white/10 transition-colors"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-[#888]" />}
    </button>
  );
}

export default function CosplayDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [submitModal, setSubmitModal] = useState<any>(null);
  // Enlace que el cosplayer escribe para cada misión, sin abrir modal
  const [linkPorActividad, setLinkPorActividad] = useState<Record<number, string>>({});
  // Qué descripción larga está desplegada ("Ver más")
  const [expandedAct, setExpandedAct] = useState<number | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', paymentMethod: '', paymentDetails: '' });
  const [profileForm, setProfileForm] = useState({
    artisticName: "", bio: "", photo: "", bannerImage: "",
    instagram: "", tiktok: "", youtube: "", facebook: "", twitter: "",
    gallery: [] as string[],
  });
  const [profileInit, setProfileInit] = useState(false);
  const utils = trpc.useUtils();
  const MIN_WITHDRAWAL_USD = 20;

  const enableProfile = trpc.cosplay.enableMyCosplayerProfile.useMutation({
    onSuccess: () => { utils.cosplay.getMyProfile.invalidate(); toast.success('Perfil de cosplayer activado'); },
    onError: () => toast.error('No se pudo activar el perfil'),
  });

  const cosplayerQuery = trpc.cosplay.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const cosplayer = cosplayerQuery.data as any;
  const cpLoading = cosplayerQuery.isLoading;

  useEffect(() => {
    if (cosplayer && !profileInit) {
      setProfileForm({
        artisticName: cosplayer.artisticName ?? '',
        bio:          cosplayer.bio ?? '',
        photo:        cosplayer.photo ?? '',
        bannerImage:  cosplayer.bannerImage ?? '',
        instagram:    cosplayer.instagram ?? '',
        tiktok:       cosplayer.tiktok ?? '',
        youtube:      cosplayer.youtube ?? '',
        facebook:     cosplayer.facebook ?? '',
        twitter:      cosplayer.twitter ?? '',
        gallery:      (cosplayer.gallery as string[] | null) ?? [],
      });
      setProfileInit(true);
    }
  }, [cosplayer]);

  const { data: activities = [] } = trpc.cosplay.getActivities.useQuery();
  const { data: submissions = [], refetch: refetchSubmissions } = trpc.cosplay.getMySubmissions.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });

  /** Misiones que todavía puede completar: alimentan el contador de la pestaña */
  const actividadesPendientes = (activities as any[]).filter((act: any) => {
    const totalFases = act.phases ?? 1;
    const hechas = (submissions as any[]).filter((sub: any) => sub.activityId === act.id && sub.status !== 'rejected').length;
    const vencida = act.deadline ? new Date(act.deadline).getTime() < Date.now() : false;
    return hechas < totalFases && !vencida;
  }).length;
  const [openLinks, setOpenLinks] = useState<Record<number, boolean>>({});
  const [newLinks, setNewLinks] = useState<Record<number, string>>({});
  const addEvidence = trpc.cosplay.addEvidence.useMutation({
    onSuccess: (_, vars) => {
      setOpenLinks(prev => ({ ...prev, [vars.submissionId]: false }));
      setNewLinks(prev => ({ ...prev, [vars.submissionId]: '' }));
      refetchSubmissions();
    },
  });
  const { data: tickets }           = trpc.cosplay.getMyTickets.useQuery(undefined,       { enabled: isAuthenticated && !!cosplayer });
  const { data: discountCodes = [] } = trpc.cosplay.getMyDiscountCodes.useQuery(undefined, { enabled: isAuthenticated && !!cosplayer });
  const kitOrderQuery = trpc.orders.myOrders.useQuery(undefined, {
    enabled: isAuthenticated && !!(cosplayer as any)?.kitOrderId,
  });
  const kitOrder = (kitOrderQuery.data?.items ?? []).find((o: any) => o.id === (cosplayer as any)?.kitOrderId);
  const kitSteps = [
    { key: 'pending',       label: 'Orden creada',   icon: ClipboardList },
    { key: 'preparing',     label: 'Preparando',      icon: Settings     },
    { key: 'printing',      label: 'Impresión 3D',    icon: Printer      },
    { key: 'post_printing', label: 'Post impresión',  icon: Sparkles     },
    { key: 'packed',        label: 'Empacado',        icon: Package      },
    { key: 'shipped',       label: 'Enviado',         icon: Truck        },
    { key: 'delivered',     label: 'Entregado',       icon: CheckCircle  },
  ];
  const statusOrder = ['pending', 'preparing', 'printing', 'post_printing', 'packed', 'shipped', 'delivered'];
  const currentStepIndex = kitOrder ? statusOrder.indexOf(kitOrder.status) : 0;

  const updateProfile = trpc.cosplay.updateMyProfile.useMutation({
    onSuccess: () => { utils.cosplay.getMyProfile.invalidate(); toast.success("Perfil actualizado"); },
    onError: (e) => toast.error(e.message),
  });
  const uploadImage = trpc.cosplay.uploadImage.useMutation({
    onError: () => toast.error("Error al subir imagen"),
  });
  const submitActivity = trpc.cosplay.submitActivity.useMutation({
    onSuccess: (_d, vars: any) => { utils.cosplay.getMySubmissions.invalidate(); setSubmitModal(null); setEvidenceUrl(""); setLinkPorActividad(prev => ({ ...prev, [vars.activityId]: "" })); toast.success("Fase cargada"); },
    onError: (e) => toast.error(e.message),
  });
  const redeemDiscount = trpc.cosplay.redeemDiscount.useMutation({
    onSuccess: (data: any) => { utils.cosplay.getMyTickets.invalidate(); utils.cosplay.getMyDiscountCodes.invalidate(); toast.success(`Código generado: ${data.code}`); },
    onError: (e) => toast.error(e.message),
  });

  const requestWithdrawal = trpc.cosplay.requestWithdrawal.useMutation({
    onSuccess: () => {
      utils.cosplay.getMyProfile.invalidate();
      setShowWithdraw(false);
      setWithdrawForm({ amount: '', paymentMethod: '', paymentDetails: '' });
      toast.success('Solicitud de retiro enviada');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount < 20) { toast.error('Monto mínimo: $20 USD'); return; }
    if (!withdrawForm.paymentMethod) { toast.error('Selecciona un método de pago'); return; }
    if (!withdrawForm.paymentDetails) { toast.error('Ingresa los datos de pago'); return; }
    requestWithdrawal.mutate({ amount, paymentMethod: withdrawForm.paymentMethod, paymentDetails: withdrawForm.paymentDetails });
  };

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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#e5007d] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
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
    // Al admin no se le pide postularse: se activa su propio perfil para que
    // pueda ver el panel tal como lo ven los cosplayers y probar cambios.
    if (user?.role === 'admin') {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-white mb-3">Activa tu perfil de cosplayer</h2>
            <p className="text-[#888] mb-6">
              Como administrador puedes crear tu propio perfil para ver este panel
              exactamente como lo ven los cosplayers y probar cambios.
            </p>
            <button
              onClick={() => enableProfile.mutate()}
              disabled={enableProfile.isPending}
              className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-60"
            >
              {enableProfile.isPending ? 'Activando...' : 'Activar mi perfil'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-3">No eres cosplayer aún</h2>
          {/* El Guild es por invitación: el acceso al formulario llega por QR,
              así que aquí no se ofrece postularse. */}
          <p className="text-[#888] mb-6">
            El Isekai Cosplay Guild es por invitación. Si recibiste una,
            escanea tu código para acceder al formulario.
          </p>
          <Link href="/">
            <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">
              Ir a la tienda
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const tierColor  = getTierColor(cosplayer.tier ?? 'bronce');
  const multiplier = TIER_MULTIPLIERS[cosplayer.tier ?? 'bronce'] ?? 1;

  function renderDescription(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-[#e5007d] underline break-all hover:text-[#c4006b]">{part}</a>
        : <span key={i}>{part}</span>
    );
  }
  const balance    = tickets?.balance ?? 0;

  const inputCls = "w-full px-4 py-3 bg-[#16191f] border border-white/10 rounded-xl text-white text-sm placeholder-[#555] outline-none focus:border-[#e5007d] transition-colors";
  const labelCls = "block text-[#ccc] text-sm font-medium mb-2";

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 md:pb-20">

      <div className="container max-w-4xl py-8">

        {/* Pestañas: en escritorio como pastillas; en teléfono se mueven a la
            barra inferior fija (ver al final del componente) para ganar espacio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 hidden gap-2 md:grid md:grid-cols-5"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const pendientes = tab.id === "activities" ? actividadesPendientes : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive ? "bg-[#e5007d] text-white" : "border border-white/10 bg-[#16191f] text-[#888] hover:border-[#444] hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {pendientes > 0 && (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-black ${
                    isActive ? "bg-white text-[#e5007d]" : "bg-[#e5007d] text-white"
                  }`}>
                    {pendientes > 9 ? "9+" : pendientes}
                  </span>
                )}
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


                {/* Banner editable */}
                <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-0 bg-[#16191f] border-2 border-dashed border-white/10">
                  {profileForm.bannerImage && (
                    <img src={profileForm.bannerImage} className="w-full h-full object-cover" />
                  )}
                  {!profileForm.bannerImage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-[#555] text-sm">Sin banner — sube una imagen</p>
                    </div>
                  )}
                  <label className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1 hover:bg-black/90 transition-colors">
                    <Upload size={12} />
                    {profileForm.bannerImage ? 'Cambiar' : 'Subir banner'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  </label>
                </div>

                {/* Foto de perfil centrada sobre el banner */}
                <div className="flex flex-col items-center -mt-10 mb-4 relative z-10">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-[#0d0d0d] mb-2"
                    style={{ outline: `3px solid ${tierColor}` }}>
                    {profileForm.photo
                      ? <img src={profileForm.photo} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-white/[0.06] flex items-center justify-center">
                          <User size={28} className="text-[#555]" />
                        </div>
                    }
                    {uploadImage.isPending && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="bg-[#16191f] border border-white/10 text-white text-xs px-4 py-2 rounded-full cursor-pointer flex items-center gap-2 hover:border-[#e5007d] transition-colors">
                    <Upload size={12} />
                    {profileForm.photo ? 'Cambiar foto' : 'Subir foto de perfil'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                {/* Nombre artístico — no editable */}
                <div className="text-center mb-3">
                  <h2 className="text-white font-black text-xl">{cosplayer?.artisticName}</h2>
                </div>

                {/* Badge tier + tickets + multiplicador */}
                <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full font-bold"
                    style={{ background: tierColor + '20', color: tierColor, border: `1px solid ${tierColor}40` }}>
                    {(cosplayer?.tier ?? 'bronce').toUpperCase()}
                  </span>
                  <span className="text-xs text-[#888]">
                    🎫 {balance.toLocaleString()} tickets
                  </span>
                  <span className="text-xs text-[#888]">
                    ×{multiplier} multiplicador
                  </span>
                </div>

                <hr className="border-white/[0.08] mb-6" />

                {/* Campos de edición */}
                <div className="flex flex-col gap-4">

                  {/* Biografía */}
                  <div>
                    <label className="block text-[#ccc] text-sm font-medium mb-2">Biografía</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                      rows={4}
                      placeholder="Cuéntale al mundo quién eres como cosplayer..."
                      className="w-full px-4 py-3 bg-[#16191f] border border-white/10 rounded-xl text-white text-sm placeholder-[#555] outline-none focus:border-[#e5007d] transition-colors resize-none"
                    />
                  </div>

                  {/* Redes sociales */}
                  <div>
                    <p className="text-[#ccc] text-sm font-medium mb-3">Redes sociales</p>
                    <div className="flex flex-col gap-3">
                      {[
                        { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tunombre' },
                        { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tunombre' },
                        { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@tuchannel' },
                        { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tuperfil' },
                        { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/tunombre' },
                      ].map(red => (
                        <div key={red.key}>
                          <label className="block text-[#888] text-xs mb-1">{red.label}</label>
                          <input
                            type="url"
                            value={(profileForm as any)[red.key] ?? ''}
                            onChange={e => setProfileForm(f => ({ ...f, [red.key]: e.target.value }))}
                            placeholder={red.placeholder}
                            className="w-full px-4 py-3 bg-[#16191f] border border-white/10 rounded-xl text-white text-sm placeholder-[#555] outline-none focus:border-[#e5007d] transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Galería */}
                  <div>
                    <label className="block text-[#ccc] text-sm font-medium mb-2">
                      Galería de cosplays
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {profileForm.gallery.map((img, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                          <img src={img} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeGalleryImage(i)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {profileForm.gallery.length < 9 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[#e5007d] transition-colors gap-1">
                          <Plus size={20} className="text-[#555]" />
                          <span className="text-[#555] text-xs">Agregar</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Botón guardar */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfile.isPending}
                    className="w-full bg-[#e5007d] text-white py-3 rounded-xl font-bold hover:bg-[#c4006b] transition-colors mt-2 disabled:opacity-50"
                  >
                    {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
                  </button>

                </div>
              </div>
            )}

            {/* ── KIT ── */}
            {activeTab === "kit" && (
              <div className="max-w-xl mx-auto">
                <p className="text-xs tracking-widest uppercase text-[#e5007d] mb-2">Kit de bienvenida</p>
                <h2 className="text-2xl font-black text-white mb-6">Tu kit está en camino</h2>

                {!(cosplayer as any)?.kitOrderId ? (
                  <div className="bg-[#16191f] border border-white/10 rounded-2xl p-8 text-center">
                    <Package size={40} className="text-[#555] mx-auto mb-3" />
                    <p className="text-[#888] text-sm">Tu kit de bienvenida será asignado pronto.</p>
                  </div>
                ) : !kitOrder ? (
                  <div className="bg-[#16191f] border border-white/10 rounded-2xl p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-[#e5007d] border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : (
                  <div className="bg-[#16191f] border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                      <div>
                        <p className="text-[#888] text-xs">Número de orden</p>
                        <p className="text-white font-black">{kitOrder.orderNumber}</p>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full bg-[#e5007d]/10 text-[#e5007d] font-semibold">
                        {kitOrder.status}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0">
                      {kitSteps.map((step, i) => {
                        const isDone    = i < currentStepIndex;
                        const isCurrent = i === currentStepIndex;
                        return (
                          <div key={step.key} className="flex items-start gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isDone    ? 'bg-green-500 text-white' :
                                isCurrent ? 'bg-[#e5007d] text-white' :
                                            'bg-white/[0.06] text-[#555]'
                              }`}>
                                <step.icon size={16} />
                              </div>
                              {i < kitSteps.length - 1 && (
                                <div className={`w-0.5 h-8 ${isDone ? 'bg-green-500' : 'bg-[#333]'}`} />
                              )}
                            </div>
                            <div className="pt-2 pb-6">
                              <p className={`text-sm font-semibold ${
                                isCurrent ? 'text-[#e5007d]' :
                                isDone    ? 'text-green-400' :
                                            'text-[#555]'
                              }`}>
                                {step.label}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {kitOrder.status === 'shipped' && (kitOrder as any).trackingNumber && (
                      <div className="mt-4 p-4 bg-white/[0.06] rounded-xl border border-white/10">
                        <p className="text-[#888] text-xs mb-1">Número de guía</p>
                        <p className="text-white font-bold">{(kitOrder as any).trackingNumber}</p>
                        {(kitOrder as any).trackingCarrier && (
                          <p className="text-[#555] text-xs mt-1">Transportadora: {(kitOrder as any).trackingCarrier}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                    <div className="text-center py-16 border border-white/[0.08] rounded-2xl">
                      <p className="text-[#555]">No hay actividades activas en este momento.</p>
                    </div>
                  )}
                  {activities.map((act: any) => {
                    const wouldEarn = Math.round(act.basePoints * multiplier);
                    const totalFases = act.phases ?? 1;
                    const entregadas = submissions.filter((s: any) => s.activityId === act.id && s.status !== 'rejected').length;
                    const siguienteFase = entregadas + 1;
                    const completada = entregadas >= totalFases;
                    const venceEl = act.deadline ? new Date(act.deadline) : null;
                    const vencida = venceEl ? venceEl.getTime() < Date.now() : false;
                    const bloqueada = completada || vencida;
                    const pct = Math.round((entregadas / totalFases) * 100);
                    const faltan = totalFases - entregadas;
                    const abierta = expandedAct === act.id;
                    const desc = act.description ?? '';
                    const descLarga = desc.length > 160;

                    const aliento = entregadas === 0
                      ? `Esta misión tiene ${totalFases} fases. Sube una publicación distinta en cada una y pega su enlace.`
                      : faltan === 1
                        ? '¡Última fase! Con esta entrega reclamas la recompensa completa.'
                        : `Vas ${pct}% del camino. Te faltan ${faltan} fases para la recompensa.`;

                    return (
                      <div key={act.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#16191f]">
                        {/* Cabecera compacta */}
                        <div className="p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#888]">
                              {act.type}
                            </span>
                            {totalFases > 1 && (
                              <span className="rounded-full bg-[#e5007d]/15 px-2 py-0.5 text-[10px] font-bold text-[#e5007d]">
                                {totalFases} fases
                              </span>
                            )}
                            {completada && (
                              <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-400">
                                Completada
                              </span>
                            )}
                            {vencida && !completada && (
                              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
                                Vencida
                              </span>
                            )}
                          </div>

                          <p className="text-[15px] font-bold leading-snug text-white">{act.title}</p>

                          {/* Descripción recortada, con "Ver más" */}
                          {desc && (
                            <div className="mt-1.5">
                              <p className={`text-sm leading-relaxed text-[#999] ${!abierta && descLarga ? 'line-clamp-3' : ''}`}
                                 style={{ overflowWrap: 'anywhere' }}>
                                {renderDescription(desc)}
                              </p>
                              {descLarga && (
                                <button
                                  onClick={() => setExpandedAct(abierta ? null : act.id)}
                                  className="mt-1 text-xs font-bold text-[#e5007d]"
                                >
                                  {abierta ? 'Ver menos' : 'Ver más'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Recompensa y plazo */}
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="font-bold text-[#e5007d]">{wouldEarn.toLocaleString()} tickets</span>
                            <span className="text-[#666]">·</span>
                            <span className={venceEl ? (vencida ? 'text-red-400' : 'text-[#aaa]') : 'text-[#666]'}>
                              {venceEl
                                ? (vencida ? 'Plazo vencido' : `Hasta el ${venceEl.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })}`)
                                : 'Sin fecha límite'}
                            </span>
                          </div>
                        </div>

                        {/* Progreso + carga del enlace */}
                        <div className="border-t border-[#2a2a2a] bg-[#141414] p-4">
                          {totalFases > 1 && (
                            <>
                              <div className="mb-2 flex items-center justify-between text-xs">
                                <span className="font-bold text-white">
                                  {completada ? `${totalFases} de ${totalFases} fases` : `Fase ${Math.min(siguienteFase, totalFases)} de ${totalFases}`}
                                </span>
                                <span className="font-bold text-[#e5007d]">{pct}%</span>
                              </div>
                              <div className="flex gap-1.5">
                                {Array.from({ length: totalFases }, (_, i) => (
                                  <div key={i} className={`h-2 flex-1 rounded-full ${i < entregadas ? 'bg-[#e5007d]' : 'bg-[#2e2e2e]'}`} />
                                ))}
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-[#888]">{aliento}</p>
                              {venceEl && !completada && (
                                <p className={`mt-1.5 text-xs font-semibold leading-relaxed ${vencida ? 'text-red-400' : 'text-[#ffd700]'}`}>
                                  {vencida
                                    ? 'El plazo pasó sin completar todas las fases: esta misión ya no otorga tickets.'
                                    : `Completa las ${totalFases} fases antes del plazo o la misión no paga.`}
                                </p>
                              )}
                            </>
                          )}

                          {/* Campo de enlace + botón, directo aquí */}
                          {!bloqueada ? (
                            <div className={totalFases > 1 ? 'mt-3' : ''}>
                              <label className="mb-1.5 block text-xs font-semibold text-[#aaa]">
                                {totalFases > 1 ? `Enlace de la fase ${siguienteFase}` : 'Enlace de tu publicación'}
                              </label>
                              <input
                                type="url"
                                inputMode="url"
                                value={linkPorActividad[act.id] ?? ''}
                                onChange={(e) => setLinkPorActividad(prev => ({ ...prev, [act.id]: e.target.value }))}
                                placeholder="https://instagram.com/p/..."
                                className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 text-sm text-white outline-none transition-colors placeholder:text-[#555] focus:border-[#e5007d]"
                                style={{ minHeight: 46 }}
                              />
                              <button
                                onClick={() => submitActivity.mutate({
                                  activityId: act.id,
                                  evidenceUrl: (linkPorActividad[act.id] ?? '').trim(),
                                  phase: siguienteFase,
                                })}
                                disabled={!(linkPorActividad[act.id] ?? '').trim() || submitActivity.isPending}
                                className="mt-2 w-full rounded-xl bg-[#e5007d] text-sm font-bold text-white transition-colors hover:bg-[#c4006b] disabled:cursor-not-allowed disabled:bg-[#2a2a2a] disabled:text-[#555]"
                                style={{ minHeight: 46, WebkitTapHighlightColor: 'transparent' }}
                              >
                                {submitActivity.isPending
                                  ? 'Cargando...'
                                  : totalFases > 1 ? `Cargar fase ${siguienteFase}` : 'Cargar enlace'}
                              </button>
                            </div>
                          ) : (
                            <p className={`text-center text-xs font-semibold ${completada ? 'text-green-400' : 'text-red-400'} ${totalFases > 1 ? 'mt-3' : ''}`}>
                              {completada ? '✓ Misión completada — en evaluación' : 'Esta misión ya no admite entregas'}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {submissions.length > 0 && (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#555] mb-3">Mis envíos</p>
                    <div className="space-y-2">
                      {submissions.map((s: any) => {
                        let evidenceUrls: string[] = [];
                        try { evidenceUrls = JSON.parse(s.evidenceUrl); } catch { evidenceUrls = [s.evidenceUrl]; }
                        return (
                          <div key={s.id} className="flex flex-col gap-2 bg-[#16191f] border border-white/10 rounded-xl px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {evidenceUrls.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="text-[#888] hover:text-[#ccc] flex items-center gap-1.5 text-xs truncate">
                                  <ExternalLink size={11} />
                                  <span className="truncate">{url}</span>
                                </a>
                              ))}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-green-500/10 text-green-400' : s.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                {s.status === 'approved' ? 'Aprobada' : s.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                              </span>
                              {s.status === 'pending' && (
                                <button
                                  onClick={() => setOpenLinks(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                                  className="text-xs text-[#e5007d] font-semibold"
                                >
                                  + Agregar link
                                </button>
                              )}
                            </div>
                            {openLinks[s.id] && (
                              <div className="flex gap-2 mt-1">
                                <input
                                  type="text"
                                  value={newLinks[s.id] ?? ''}
                                  onChange={e => setNewLinks(prev => ({ ...prev, [s.id]: e.target.value }))}
                                  placeholder="https://..."
                                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-[#e5007d]"
                                />
                                <button
                                  onClick={() => addEvidence.mutate({ submissionId: s.id, url: newLinks[s.id] ?? '' })}
                                  disabled={!newLinks[s.id] || addEvidence.isPending}
                                  className="bg-[#e5007d] text-white px-3 rounded-lg text-xs font-bold disabled:opacity-40"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── BILLETERA ── */}
            {activeTab === "wallet" && (
              <div className="max-w-2xl mx-auto">

                {/* Balance cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-[#16191f] border border-white/10 rounded-2xl p-6">
                    <p className="text-[#888] text-xs uppercase tracking-widest mb-2">Tickets</p>
                    <p className="text-xl sm:text-2xl font-black text-white">{balance.toLocaleString()}</p>
                    <p className="text-[#555] text-xs mt-1">Para canjear por descuentos</p>
                    <button
                      onClick={() => setActiveTab('redeem')}
                      className="mt-4 w-full bg-[#e5007d] text-white py-2 rounded-xl text-sm font-semibold hover:bg-[#c4006b] transition-colors"
                    >
                      Canjear →
                    </button>
                  </div>

                  <div className="bg-[#16191f] border border-[#ffd700]/30 rounded-2xl p-6">
                    <p className="text-[#888] text-xs uppercase tracking-widest mb-2">Cash</p>
                    <p className="text-2xl font-black text-[#ffd700]">
                      ${parseFloat(String(cosplayer?.cashBalance ?? '0')).toFixed(2)} USD
                    </p>
                    <p className="text-[#555] text-xs">Consumible o retirable</p>
                    <div className="flex gap-2 mt-4">
                      <button
                        disabled={parseFloat(String(cosplayer?.cashBalance ?? '0')) < MIN_WITHDRAWAL_USD}
                        onClick={() => setShowWithdraw(true)}
                        className="flex-1 bg-[#16191f] border border-[#ffd700]/50 text-[#ffd700] py-2 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-white/[0.06] transition-colors"
                      >
                        Retirar
                      </button>
                    </div>
                    {parseFloat(String(cosplayer?.cashBalance ?? '0')) < MIN_WITHDRAWAL_USD && (
                      <p className="text-[#555] text-[10px] mt-2 text-center">Mínimo $20.00 USD para retirar</p>
                    )}
                  </div>
                </div>

                {/* Referral code */}
                <div className="bg-[#16191f] border border-white/10 rounded-2xl p-6 mb-8">
                  <p className="text-[#888] text-xs uppercase tracking-widest mb-3">Mi código de referido</p>
                  <div className="flex items-center justify-between bg-[#0a0a0a] border border-dashed border-[#e5007d]/50 rounded-xl px-5 py-4">
                    <span className="text-[#e5007d] font-black tracking-widest text-lg">
                      {(cosplayer as any).referralCode ?? '—'}
                    </span>
                    {(cosplayer as any).referralCode && (
                      <button
                        onClick={() => { navigator.clipboard.writeText((cosplayer as any).referralCode); toast.success('Código copiado'); }}
                        className="text-xs text-[#888] hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Copy size={14} /> Copiar
                      </button>
                    )}
                  </div>
                  <p className="text-[#555] text-xs mt-3 leading-relaxed">
                    Comparte este código con tus seguidores. Cada vez que alguien compre usándolo y su pago sea confirmado,
                    recibes una <strong className="text-[#ffd700]">comisión fija en USD</strong> más
                    <strong className="text-[#e5007d]"> tickets</strong>, según el monto de la venta.
                    Además, quien lo use recibe un <strong className="text-white">obsequio secreto</strong> con su pedido.
                  </p>

                  {/* Cuánto se gana por cada tramo de venta */}
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                    {REFERRAL_TIERS.map((t, i) => (
                      <div
                        key={t.label}
                        className={`flex items-center justify-between gap-3 px-3 py-2 text-xs ${i % 2 ? 'bg-white/[0.03]' : ''}`}
                      >
                        <span className="text-[#888]">Venta de {t.label}</span>
                        <span className="flex items-center gap-2.5 shrink-0">
                          <strong className="text-[#ffd700]">${t.cash.toFixed(2)}</strong>
                          <span className="font-bold text-[#e5007d]">+{t.tickets.toLocaleString()}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Movement history */}
                <p className="text-[#888] text-xs uppercase tracking-widest mb-4">Historial de movimientos</p>
                <div className="flex flex-col gap-2">
                  {(tickets?.ledger ?? []).map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between bg-[#16191f] border border-white/10 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{e.description}</p>
                        <p className="text-[#555] text-xs">{new Date(e.createdAt).toLocaleDateString('es-VE')}</p>
                      </div>
                      <div className="text-right">
                        {e.amount > 0 && <p className="text-green-400 font-bold text-sm">+{e.amount} tickets</p>}
                        {parseFloat(e.cashAmount ?? '0') > 0 && (
                          <p className="text-[#ffd700] font-bold text-sm">+${parseFloat(e.cashAmount).toFixed(2)} USD</p>
                        )}
                        {e.amount < 0 && <p className="text-red-400 font-bold text-sm">{e.amount} tickets</p>}
                      </div>
                    </div>
                  ))}
                  {(!tickets?.ledger || tickets.ledger.length === 0) && (
                    <p className="text-center text-[#555] text-sm py-8">Sin movimientos aún</p>
                  )}
                </div>

                {/* Withdrawal modal */}
                {showWithdraw && (
                  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#16191f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
                      <h3 className="text-white font-black text-lg mb-4">Solicitar retiro</h3>
                      <p className="text-[#888] text-sm mb-4">
                        Balance disponible: <strong className="text-[#ffd700]">${parseFloat(String(cosplayer?.cashBalance ?? '0')).toFixed(2)} USD</strong>
                      </p>
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-[#ccc] text-sm mb-1 block">Monto a retirar en USD (mín. $20.00 USD)</label>
                          <input
                            type="number"
                            min={MIN_WITHDRAWAL_USD}
                            max={parseFloat(String(cosplayer?.cashBalance ?? '0'))}
                            value={withdrawForm.amount}
                            onChange={e => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#e5007d]"
                            placeholder="20.00"
                          />
                        </div>
                        <div>
                          <label className="text-[#ccc] text-sm mb-1 block">Método de pago</label>
                          <select
                            value={withdrawForm.paymentMethod}
                            onChange={e => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#e5007d]"
                          >
                            <option value="">Selecciona método</option>
                            <option value="binance">Binance Pay</option>
                            <option value="zelle">Zelle</option>
                            <option value="pago_movil">Pago Móvil</option>
                            <option value="paypal">PayPal</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[#ccc] text-sm mb-1 block">Datos de pago</label>
                          <textarea
                            value={withdrawForm.paymentDetails}
                            onChange={e => setWithdrawForm({ ...withdrawForm, paymentDetails: e.target.value })}
                            placeholder="Email de Binance, número de Zelle, etc."
                            rows={3}
                            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#e5007d] resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setShowWithdraw(false)}
                          className="flex-1 border border-white/10 text-[#888] py-3 rounded-xl text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleWithdraw}
                          disabled={requestWithdrawal.isPending}
                          className="flex-1 bg-[#ffd700] text-black py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                          {requestWithdrawal.isPending ? 'Enviando...' : 'Solicitar retiro'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                {/* Carril horizontal: se deslizan en vez de apilarse */}
                <div
                  className="mb-8 flex gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollSnapType: 'x mandatory' }}
                >
                  {DISCOUNT_OPTIONS.map(opt => {
                    const canAfford = balance >= opt.cost;
                    return (
                      <div
                        key={opt.pct}
                        style={{ scrollSnapAlign: 'start' }}
                        className={`w-[200px] shrink-0 rounded-2xl border bg-[#16191f] p-5 transition-all sm:w-[220px] ${canAfford ? 'border-white/10 hover:border-[#e5007d]/60' : 'border-white/[0.08] opacity-50'}`}>
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-3xl font-black text-[#e5007d]">{opt.pct}%</span>
                          <span className="text-xs text-[#888] font-semibold">{opt.cost.toLocaleString()} tickets</span>
                        </div>
                        <p className="text-sm font-semibold text-[#ccc] mb-4">{opt.label}</p>
                        <button
                          disabled={!canAfford || redeemDiscount.isPending}
                          onClick={() => redeemDiscount.mutate({ discountPercent: opt.pct as any })}
                          className={`w-full py-2 rounded-full text-sm font-bold transition-colors ${canAfford ? 'bg-[#e5007d] hover:bg-[#c4006b] text-white' : 'bg-white/[0.06] text-[#555] cursor-not-allowed'}`}
                        >
                          {canAfford ? 'Canjear' : `Faltan ${(opt.cost - balance).toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {discountCodes.length > 0 && (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#555]">Mis códigos</p>
                      <span className="text-xs text-[#555]">{discountCodes.length}</span>
                    </div>
                    {/* Scroll propio: el historial no alarga la página */}
                    <div className="iw-scroll-oculto max-h-[260px] space-y-2 overflow-y-auto pr-1">
                      {discountCodes.map((c: any) => (
                        <div key={c.id} className={`flex flex-col gap-2 rounded-xl border bg-[#16191f] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${c.used ? 'border-white/[0.08] opacity-50' : 'border-white/10'}`}>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-[15px] font-black tracking-wider text-[#e5007d]">{c.code}</span>
                            <CopyButton text={c.code} />
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[#888] text-xs">{c.discountPercent}% OFF</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.used ? 'bg-white/[0.06] text-[#555]' : 'bg-green-500/10 text-green-400'}`}>
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
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#16191f] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Enviar evidencia</h3>
              <button onClick={() => setSubmitModal(null)} className="text-[#888] hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <p className="text-[#888] text-sm mb-5">{submitModal.title}</p>
            {evidenceUrl !== 'Participación confirmada — me uní al grupo' ? (
              <div className="mb-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#888] mb-1.5">Link de evidencia (post, reel, etc.)</label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={e => setEvidenceUrl(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-[#555] outline-none focus:border-[#e5007d] text-sm"
                />
              </div>
            ) : (
              <div className="bg-[#16191f] border border-[#e5007d]/30 rounded-xl px-4 py-3 mb-5">
                <p className="text-[#e5007d] text-sm font-semibold">✓ Participación registrada</p>
                <p className="text-[#888] text-xs mt-1">El admin verificará tu participación y asignará los tickets.</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                disabled={!evidenceUrl || submitActivity.isPending}
                onClick={() => submitActivity.mutate({ activityId: submitModal.id, evidenceUrl, phase: submitModal._fase ?? 1 })}
                className="flex-1 py-3 bg-[#e5007d] rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-50 text-white"
              >
                {submitActivity.isPending ? "Enviando..." : "Enviar actividad"}
              </button>
              <button onClick={() => setSubmitModal(null)} className="px-5 py-3 bg-white/[0.06] border border-white/10 rounded-full font-bold text-sm text-[#ccc] hover:border-[#444] transition-colors">
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Barra inferior tipo app — solo en teléfono */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#111]/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const pendientes = tab.id === "activities" ? actividadesPendientes : 0;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-transform active:scale-95"
                style={{ minHeight: 58, WebkitTapHighlightColor: 'transparent' }}
              >
                {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[#e5007d]" />}
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#e5007d]' : 'text-[#777]'}`} />
                  {pendientes > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#e5007d] px-1 text-[10px] font-black text-white">
                      {pendientes > 9 ? '9+' : pendientes}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#e5007d]' : 'text-[#777]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
