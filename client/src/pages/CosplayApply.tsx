import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { openLoginModal } from "@/const";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, ChevronDown, Sparkles, Info } from "lucide-react";
import { Link } from "wouter";

const COUNTRIES = [
  "Colombia", "Venezuela", "México", "Argentina", "Chile",
  "Perú", "Ecuador", "España", "Estados Unidos", "Otro",
];

const inputCls = "w-full px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-white text-sm placeholder-[#555] outline-none focus:border-[#e5007d] transition-colors";
const labelCls = "block text-[#ccc] text-sm font-medium mb-2";

function DarkSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm outline-none focus:border-[#e5007d] transition-colors"
      >
        <span className={selected ? "text-white" : "text-[#555]"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#555] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden z-50 shadow-xl">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#222] ${
                value === opt.value ? "text-[#e5007d] font-semibold" : "text-[#ccc]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CosplayApply() {
  const { user, isAuthenticated, loading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "", lastName: "", age: "", city: "", country: "Colombia",
    address: "", phone: "", email: user?.email ?? "",
    experience: "", instagram: "", tiktok: "", youtube: "", facebook: "", twitter: "",
    totalFollowers: "", whyIsekai: "",
  });

  const apply = trpc.cosplay.submitApplication.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.whyIsekai.length < 50) { toast.error("La motivación debe tener al menos 50 caracteres"); return; }
    const totalFollowers = parseInt(form.totalFollowers) || 0;
    if (totalFollowers < 1000) { toast.error("Necesitas al menos 1,000 seguidores en total para postularte al Cosplay Guild."); return; }
    if (!form.instagram && !form.tiktok && !form.youtube && !form.facebook && !form.twitter) { toast.error("Debes incluir al menos una red social."); return; }
    apply.mutate({
      userId: user?.id,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#333] border-t-[#e5007d] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md text-center">
          <Sparkles size={48} className="text-[#e5007d] mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="text-3xl font-black text-white mb-3">Primero crea tu cuenta</h2>
          <p className="text-[#888] mb-8 leading-relaxed">
            Para postularte al Cosplay Guild necesitas tener una cuenta en Isekai World.
            Es rápido y gratuito.
          </p>
          <button
            onClick={openLoginModal}
            className="w-full bg-[#e5007d] text-white py-4 rounded-full font-bold text-lg hover:bg-[#c4006b] transition-colors"
          >
            Crear cuenta o iniciar sesión
          </button>
          <p className="text-[#555] text-sm mt-4">¿Ya tienes cuenta? El mismo botón te lleva al login.</p>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <CheckCircle2 size={64} className="text-[#e5007d] mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="text-3xl font-black text-white mb-3">¡Solicitud enviada!</h2>
          <p className="text-[#888] leading-relaxed mb-8">
            Tu solicitud fue enviada. Revisamos cada postulación manualmente y te contactaremos en 24–48 horas al correo{" "}
            <strong className="text-[#ccc]">{form.email}</strong>.
          </p>
          <Link href="/cosplay">
            <button className="bg-[#e5007d] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors">
              Volver al Guild
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

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
          <p className="text-[#888] mb-12 leading-relaxed">
            Completa todos los campos. Revisaremos tu solicitud en 24–48 horas.
          </p>

          {/* Banner requisito mínimo */}
          <div className="flex items-start gap-3 bg-[#1a1a1a] border border-[#333] rounded-xl p-4 mb-8">
            <Info size={16} className="text-[#e5007d] flex-shrink-0 mt-0.5" />
            <p className="text-[#888] text-sm leading-relaxed">
              <strong className="text-white">Requisito mínimo:</strong> necesitas al menos{" "}
              <span className="text-[#e5007d] font-bold">1,000 seguidores</span>{" "}
              en total entre todas tus redes sociales para postularte.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* 1. Datos personales */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black shrink-0">1</span>
                <h2 className="text-lg font-bold text-white">Datos personales</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre *</label>
                  <input required value={form.fullName} onChange={set('fullName')} placeholder="Tu nombre" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido *</label>
                  <input required value={form.lastName} onChange={set('lastName')} placeholder="Tu apellido" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Edad *</label>
                  <input required type="number" min={16} max={99} value={form.age} onChange={set('age')} placeholder="18" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>País *</label>
                  <DarkSelect
                    value={form.country}
                    onChange={v => setForm(f => ({ ...f, country: v }))}
                    options={COUNTRIES.map(c => ({ value: c, label: c }))}
                    placeholder="Selecciona un país"
                  />
                </div>
                <div>
                  <label className={labelCls}>Ciudad *</label>
                  <input required value={form.city} onChange={set('city')} placeholder="Bogotá" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono *</label>
                  <input required value={form.phone} onChange={set('phone')} placeholder="+57 300 000 0000" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Dirección *</label>
                  <input required value={form.address} onChange={set('address')} placeholder="Calle, número, barrio..." className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Correo electrónico *</label>
                  <input required type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com" className={inputCls} />
                </div>
              </div>
            </div>

            <div className="border-t border-[#222]" />

            {/* 2. Experiencia */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black shrink-0">2</span>
                <h2 className="text-lg font-bold text-white">Experiencia cosplay</h2>
              </div>
              <div>
                <label className={labelCls}>Años de experiencia como cosplayer *</label>
                <input required type="number" min={0} max={50} value={form.experience} onChange={set('experience')} placeholder="0" className={inputCls + " max-w-[160px]"} />
              </div>
            </div>

            <div className="border-t border-[#222]" />

            {/* 3. Redes sociales */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black shrink-0">3</span>
                <h2 className="text-lg font-bold text-white">Redes sociales</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Instagram</label>
                  <input value={form.instagram} onChange={set('instagram')} placeholder="@usuario" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>TikTok</label>
                  <input value={form.tiktok} onChange={set('tiktok')} placeholder="@usuario" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>YouTube</label>
                  <input value={form.youtube} onChange={set('youtube')} placeholder="URL del canal" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Facebook</label>
                  <input value={form.facebook} onChange={set('facebook')} placeholder="URL o usuario" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>X / Twitter</label>
                  <input value={form.twitter} onChange={set('twitter')} placeholder="@usuario" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    Seguidores totales (suma de todas tus redes) *{" "}
                    <span className="text-[#555] font-normal">mínimo 1,000</span>
                  </label>
                  <input
                    required
                    type="number"
                    min={1000}
                    value={form.totalFollowers}
                    onChange={set('totalFollowers')}
                    placeholder="Ej: 15000"
                    className={inputCls}
                  />
                  {form.totalFollowers && parseInt(form.totalFollowers) < 1000 && (
                    <p className="text-red-400 text-xs mt-1.5">El mínimo es 1,000 seguidores.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[#222]" />

            {/* 4. Motivación */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black shrink-0">4</span>
                <h2 className="text-lg font-bold text-white">Motivación</h2>
              </div>
              <label className={labelCls}>
                ¿Por qué quieres ser representante de Isekai World? *{" "}
                <span className="text-[#555] font-normal">(mín. 50 caracteres)</span>
              </label>
              <textarea
                required
                rows={5}
                value={form.whyIsekai}
                onChange={set('whyIsekai')}
                placeholder="Cuéntanos tu historia, tu pasión por el cosplay y por qué quieres representar a Isekai World..."
                className={inputCls + " resize-none"}
              />
              <p className={`text-xs mt-1.5 ${form.whyIsekai.length < 50 ? "text-[#555]" : "text-green-500"}`}>
                {form.whyIsekai.length}/2000 caracteres
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={apply.isPending}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-4 bg-[#e5007d] text-white rounded-full font-bold text-sm hover:bg-[#c4006b] transition-colors disabled:opacity-50"
            >
              {apply.isPending ? "Enviando solicitud..." : "Enviar solicitud"}
            </motion.button>

          </form>
        </motion.div>
      </div>
    </div>
  );
}
