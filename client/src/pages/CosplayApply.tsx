import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, ChevronDown, Sparkles, Upload, User, X, Plus, Info } from "lucide-react";
import { Link } from "wouter";

const COUNTRIES = [
  "Venezuela", "Colombia", "México", "Argentina", "Chile",
  "Perú", "Ecuador", "España", "Estados Unidos", "Otro",
];

function DarkSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-[#222] border border-[#333] rounded-xl text-sm text-white outline-none transition-colors hover:border-[#444]">
        <span className={selected ? "text-white" : "text-[#555]"}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className={`text-[#555] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden z-50 shadow-xl">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#222] ${value === opt.value ? "text-[#e5007d] font-semibold" : "text-[#ccc]"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const sectionCls = "bg-[#1a1a1a] border border-[#333] rounded-2xl p-6 mb-6";
const inputCls = "w-full px-4 py-3 bg-[#222] border border-[#333] rounded-xl text-white text-sm placeholder-[#555] outline-none focus:border-[#e5007d] transition-colors";
const labelCls = "block text-[#ccc] text-sm font-medium mb-2";
const sectionTitle = "text-[#e5007d] text-xs tracking-widest uppercase font-semibold mb-1";
const sectionSub = "text-[#555] text-xs mb-4";

export default function CosplayApply() {
  const { user, isAuthenticated, loading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    artisticName: "", photo: "", bannerImage: "", gallery: [] as string[], bio: "",
    fullName: "", lastName: "", age: "", city: "", country: "Venezuela",
    address: "", phone: "", email: user?.email ?? "",
    experience: "", instagram: "", tiktok: "", youtube: "", facebook: "", twitter: "",
    totalFollowers: "", whyIsekai: "",
  });

  const apply = trpc.cosplay.submitApplication.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => {
      let msg = e.message;
      try {
        const parsed = JSON.parse(e.message);
        if (Array.isArray(parsed)) {
          msg = parsed.map((i: any) => i.message).filter(Boolean).join(', ');
        }
      } catch {}
      toast.error(msg || 'Error al enviar la postulación');
    },
  });
  const uploadImageMutation = trpc.cosplay.uploadImage.useMutation();

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const base64Data = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = ev => res((ev.target?.result as string).split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    const result = await uploadImageMutation.mutateAsync({
      fileName: `${folder}-${Date.now()}-${file.name}`,
      contentType: file.type,
      base64Data,
    });
    return result.url;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const url = await uploadFile(file, 'profile'); setForm(f => ({ ...f, photo: url })); toast.success("Foto de perfil subida"); }
    catch { toast.error("Error al subir la foto"); }
    finally { setUploading(false); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try { const url = await uploadFile(file, 'banner'); setForm(f => ({ ...f, bannerImage: url })); toast.success("Banner subido"); }
    catch { toast.error("Error al subir el banner"); }
    finally { setUploading(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setUploading(true);
    try {
      for (const file of files) {
        if (form.gallery.length >= 10) break;
        const url = await uploadFile(file, 'gallery');
        setForm(f => ({ ...f, gallery: [...f.gallery, url] }));
      }
      toast.success("Fotos agregadas a la galería");
    } catch { toast.error("Error al subir alguna foto"); }
    finally { setUploading(false); }
  };

  const removeGalleryImage = (i: number) =>
    setForm(f => ({ ...f, gallery: f.gallery.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.artisticName) return toast.error("El nombre artístico es obligatorio");
    if (!form.photo) return toast.error("La foto de perfil es obligatoria");
    if (!form.bannerImage) return toast.error("La imagen de banner es obligatoria");
    if (form.gallery.length < 5) return toast.error(`Necesitas al menos 5 fotos en la galería (tienes ${form.gallery.length})`);
    if (!form.bio) return toast.error("La biografía es obligatoria");
    if (!form.whyIsekai || form.whyIsekai.length < 50) return toast.error("La motivación debe tener al menos 50 caracteres");
    if (!form.instagram && !form.tiktok && !form.youtube && !form.facebook && !form.twitter)
      return toast.error("Debes incluir al menos una red social");
    const totalFollowers = parseInt(form.totalFollowers) || 0;
    if (totalFollowers < 500) return toast.error("Necesitas al menos 500 seguidores para postularte");

    apply.mutate({
      userId: user?.id,
      artisticName: form.artisticName,
      photo: form.photo,
      bannerImage: form.bannerImage,
      gallery: form.gallery,
      bio: form.bio,
      fullName: form.fullName,
      lastName: form.lastName,
      age: parseInt(form.age),
      city: form.city,
      country: form.country,
      address: form.address,
      phone: form.phone,
      email: form.email,
      experience: parseInt(form.experience) || 0,
      instagram: form.instagram || undefined,
      tiktok: form.tiktok || undefined,
      youtube: form.youtube || undefined,
      facebook: form.facebook || undefined,
      twitter: form.twitter || undefined,
      whyIsekai: form.whyIsekai,
    });
  };

  if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#333] border-t-[#e5007d] rounded-full animate-spin" /></div>;

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
        <Sparkles size={48} className="text-[#e5007d] mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="text-3xl font-black text-white mb-3">Primero crea tu cuenta</h2>
        <p className="text-[#888] mb-8 leading-relaxed">Para postularte al Cosplay Guild necesitas tener una cuenta en Isekai World.</p>
        <button onClick={openLoginModal} className="w-full bg-[#e5007d] text-white py-4 rounded-full font-bold text-lg hover:bg-[#c4006b] transition-colors">Crear cuenta o iniciar sesión</button>
        <p className="text-[#555] text-sm mt-4">¿Ya tienes cuenta? El mismo botón te lleva al login.</p>
      </motion.div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
        <CheckCircle2 size={64} className="text-[#e5007d] mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="text-3xl font-black text-white mb-3">¡Solicitud enviada!</h2>
        <p className="text-[#888] leading-relaxed mb-8">
          Tu solicitud fue enviada. Revisamos cada postulación manualmente y te contactaremos en 24–48 horas al correo{" "}
          <strong className="text-[#ccc]">{form.email}</strong>.
        </p>
        <Link href="/cosplay"><button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">Volver al Guild</button></Link>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] py-16">
      <div className="container max-w-2xl">
        <Link href="/cosplay">
          <button className="flex items-center gap-2 text-[#888] hover:text-white transition-colors text-sm mb-8">
            <ArrowLeft size={15} /> Cosplay Guild
          </button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-3 font-medium">Únete</p>
          <h1 className="text-4xl font-black text-white mb-2">Solicitud de ingreso</h1>
          <p className="text-[#888] mb-6 leading-relaxed">Completa todos los campos. Revisaremos tu solicitud en 24–48 horas.</p>

          {/* Requisito mínimo */}
          <div className="flex items-start gap-3 bg-[#1a1a1a] border border-[#333] rounded-xl p-4 mb-8">
            <Info size={16} className="text-[#e5007d] flex-shrink-0 mt-0.5" />
            <p className="text-[#888] text-sm leading-relaxed">
              <strong className="text-white">Requisito mínimo:</strong> al menos{" "}
              <span className="text-[#e5007d] font-bold">500 seguidores</span>{" "}
              en total entre todas tus redes sociales.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* ── SECCIÓN 1 — Datos personales ── */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Datos personales</p>
              <p className={sectionSub}>Tu nombre artístico es el que aparecerá en tu perfil público.</p>

              <div className="mb-4">
                <label className={labelCls}>Nombre artístico <span className="text-[#e5007d]">*</span></label>
                <input required value={form.artisticName} onChange={e => setForm(f => ({ ...f, artisticName: e.target.value }))} placeholder="El nombre con el que te conocen en redes" className={inputCls} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>Nombre *</label><input required value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Tu nombre" className={inputCls} /></div>
                <div><label className={labelCls}>Apellido *</label><input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Tu apellido" className={inputCls} /></div>
                <div><label className={labelCls}>Edad *</label><input required type="number" min={16} max={99} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="18" className={inputCls} /></div>
                <div><label className={labelCls}>País *</label><DarkSelect value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} options={COUNTRIES.map(c => ({ value: c, label: c }))} placeholder="Selecciona un país" /></div>
                <div><label className={labelCls}>Ciudad *</label><input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Bogotá" className={inputCls} /></div>
                <div><label className={labelCls}>Teléfono *</label><input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+57 300 000 0000" className={inputCls} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Dirección *</label><input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Calle, número, barrio..." className={inputCls} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Correo electrónico *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="tu@correo.com" className={inputCls} /></div>
                <div><label className={labelCls}>Años de experiencia *</label><input required type="number" min={0} max={50} value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="0" className={inputCls} /></div>
              </div>
            </div>

            {/* ── SECCIÓN 2 — Imagen pública ── */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Tu imagen pública</p>
              <p className={sectionSub}>Esta información será visible en tu perfil público dentro del Cosplay Guild.</p>

              {/* Foto de perfil */}
              <div className="mb-6">
                <label className={labelCls}>Foto de perfil <span className="text-[#e5007d]">*</span></label>
                <p className="text-[#555] text-xs mb-3">Preferiblemente con alguno de tus cosplays. Formato cuadrado 1:1 recomendado.</p>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-[#222] border-2 border-dashed border-[#333] flex-shrink-0 flex items-center justify-center">
                    {form.photo ? <img src={form.photo} className="w-full h-full object-cover object-top" alt="" /> : <User size={28} className="text-[#555]" />}
                  </div>
                  <label className={`flex-1 border-2 border-dashed border-[#333] rounded-xl px-4 py-6 text-center cursor-pointer hover:border-[#e5007d] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload size={20} className="text-[#555] mx-auto mb-2" />
                    <p className="text-[#888] text-sm">{form.photo ? 'Cambiar foto' : 'Subir foto de perfil'}</p>
                    <p className="text-[#555] text-xs mt-1">JPG, PNG o WebP · Máx 10MB</p>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              </div>

              {/* Banner */}
              <div className="mb-6">
                <label className={labelCls}>Imagen de banner <span className="text-[#e5007d]">*</span></label>
                <p className="text-[#555] text-xs mb-3">Aparece como fondo en la parte superior de tu perfil. Formato horizontal recomendado.</p>
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-[#222] border-2 border-dashed border-[#333]">
                  {form.bannerImage
                    ? <img src={form.bannerImage} className="w-full h-full object-cover" alt="" />
                    : <div className="absolute inset-0 flex items-center justify-center"><p className="text-[#555] text-sm">Sin banner</p></div>
                  }
                  <label className={`absolute bottom-2 right-2 bg-[#e5007d] text-white text-xs px-3 py-1.5 rounded-full cursor-pointer flex items-center gap-1 hover:bg-[#c4006b] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload size={12} />
                    {form.bannerImage ? 'Cambiar' : 'Subir banner'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  </label>
                </div>
              </div>

              {/* Galería */}
              <div className="mb-6">
                <label className={labelCls}>Galería de cosplays <span className="text-[#e5007d]">*</span></label>
                <p className="text-[#555] text-xs mb-3">
                  Sube al menos 5 fotos de tus cosplays. Se mostrarán en tu perfil público.{" "}
                  <strong className="text-[#888]">Resolución recomendada: 1080×1080 px.</strong>
                </p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {form.gallery.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                      <img src={img} className="w-full h-full object-cover object-top" alt="" />
                      <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {form.gallery.length < 10 && (
                    <label className={`aspect-square rounded-xl border-2 border-dashed border-[#333] flex flex-col items-center justify-center cursor-pointer hover:border-[#e5007d] transition-colors gap-1 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploading ? <div className="w-5 h-5 border-2 border-[#333] border-t-[#e5007d] rounded-full animate-spin" /> : <Plus size={20} className="text-[#555]" />}
                      <span className="text-[#555] text-xs">Agregar</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
                    </label>
                  )}
                </div>
                {form.gallery.length < 5 && (
                  <p className="text-[#e5007d] text-xs">Faltan {5 - form.gallery.length} foto(s) — mínimo 5 requeridas</p>
                )}
                {form.gallery.length >= 5 && (
                  <p className="text-green-500 text-xs">{form.gallery.length} foto(s) agregadas</p>
                )}
              </div>

              {/* Biografía */}
              <div>
                <label className={labelCls}>Biografía como cosplayer <span className="text-[#e5007d]">*</span></label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Cuéntanos tu historia como cosplayer, tus personajes favoritos, tus logros..."
                  className={inputCls + " resize-none"}
                />
              </div>
            </div>

            {/* ── SECCIÓN 3 — Redes sociales ── */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Redes sociales</p>
              <p className={sectionSub}>Pega el link completo de tus perfiles. Solo llena las redes que tengas activas.</p>
              {[
                { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tunombre' },
                { key: 'tiktok',    label: 'TikTok',    placeholder: 'https://tiktok.com/@tunombre' },
                { key: 'youtube',   label: 'YouTube',   placeholder: 'https://youtube.com/@tuchannel' },
                { key: 'facebook',  label: 'Facebook',  placeholder: 'https://facebook.com/tupagina' },
                { key: 'twitter',   label: 'Twitter / X', placeholder: 'https://x.com/tunombre' },
              ].map(red => (
                <div key={red.key} className="mb-4 last:mb-0">
                  <label className="block text-[#888] text-xs mb-1">{red.label}</label>
                  <input type="url" value={(form as any)[red.key] ?? ''} onChange={e => setForm(f => ({ ...f, [red.key]: e.target.value }))} placeholder={red.placeholder} className={inputCls} />
                </div>
              ))}
              <div className="mt-4">
                <label className={labelCls}>Seguidores totales (suma de todas tus redes) * <span className="text-[#555] font-normal">mínimo 500</span></label>
                <input required type="number" min={500} value={form.totalFollowers} onChange={e => setForm(f => ({ ...f, totalFollowers: e.target.value }))} placeholder="Ej: 15000" className={inputCls} />
                {form.totalFollowers && parseInt(form.totalFollowers) < 500 && <p className="text-red-400 text-xs mt-1.5">El mínimo es 500 seguidores.</p>}
              </div>
            </div>

            {/* ── SECCIÓN 4 — Motivación ── */}
            <div className={sectionCls}>
              <p className={sectionTitle}>Tu motivación</p>
              <p className={sectionSub}>Esta información es solo para el equipo de Isekai World.</p>
              <label className={labelCls}>¿Por qué quieres ser representante de Isekai World? <span className="text-[#e5007d]">*</span></label>
              <textarea
                rows={5}
                value={form.whyIsekai}
                onChange={e => setForm(f => ({ ...f, whyIsekai: e.target.value }))}
                placeholder="Cuéntanos por qué quieres formar parte del equipo, qué aportarías a la marca... (mínimo 50 caracteres)"
                className={inputCls + " resize-none"}
              />
              <p className={`text-xs mt-1.5 ${form.whyIsekai.length < 50 ? "text-[#555]" : "text-green-500"}`}>
                {form.whyIsekai.length}/2000 caracteres
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={apply.isPending || uploading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 bg-[#e5007d] text-white rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-50 mb-10"
            >
              {apply.isPending ? "Enviando solicitud..." : uploading ? "Subiendo imágenes..." : "Enviar solicitud"}
            </motion.button>

          </form>
        </motion.div>
      </div>
    </div>
  );
}
