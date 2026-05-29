import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const COUNTRIES = ["Colombia", "Venezuela", "México", "Argentina", "Chile", "Perú", "Ecuador", "España", "Estados Unidos", "Otro"];

export default function CosplayApply() {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: "", lastName: "", age: "", city: "", country: "Colombia",
    address: "", phone: "", email: user?.email ?? "",
    experience: "", instagram: "", tiktok: "", youtube: "", facebook: "", twitter: "",
    whyIsekai: "",
  });

  const apply = trpc.cosplay.submitApplication.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.whyIsekai.length < 50) { toast.error("La motivación debe tener al menos 50 caracteres"); return; }
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <CheckCircle2 size={64} className="text-[#e5007d] mx-auto mb-6" />
          <h2 className="text-3xl font-black mb-4">¡Solicitud enviada!</h2>
          <p className="text-white/60 mb-8">Tu solicitud fue enviada exitosamente. Revisamos cada postulación manualmente y te contactaremos en menos de 72 horas al correo <strong className="text-white">{form.email}</strong>.</p>
          <Link href="/cosplay">
            <button className="px-8 py-3 bg-[#e5007d] rounded-full font-bold hover:bg-[#c4006b] transition-colors">Volver al Guild</button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#e5007d]/60 text-sm transition-colors";
  const labelCls = "block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-6">
        <Link href="/cosplay">
          <button className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm mb-8">
            <ArrowLeft size={16} /> Volver al Guild
          </button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e5007d]/20 border border-[#e5007d]/40 text-[#e5007d] text-xs font-bold uppercase tracking-widest mb-4">
            Cosplay Guild
          </span>
          <h1 className="text-4xl font-black mb-2">Únete como representante</h1>
          <p className="text-white/50 mb-10">Rellena todos los campos. Seleccionamos a representantes que compartan nuestra pasión por el anime y el cosplay.</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Datos personales */}
            <div>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black">1</span> Datos personales</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>Nombre *</label><input required value={form.fullName} onChange={set('fullName')} placeholder="Tu nombre" className={inputCls} /></div>
                <div><label className={labelCls}>Apellido *</label><input required value={form.lastName} onChange={set('lastName')} placeholder="Tu apellido" className={inputCls} /></div>
                <div><label className={labelCls}>Edad *</label><input required type="number" min={16} max={99} value={form.age} onChange={set('age')} placeholder="18" className={inputCls} /></div>
                <div>
                  <label className={labelCls}>País *</label>
                  <select required value={form.country} onChange={set('country')} className={inputCls + " appearance-none"}>
                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Ciudad *</label><input required value={form.city} onChange={set('city')} placeholder="Bogotá" className={inputCls} /></div>
                <div><label className={labelCls}>Teléfono *</label><input required value={form.phone} onChange={set('phone')} placeholder="+57 300 000 0000" className={inputCls} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Dirección *</label><input required value={form.address} onChange={set('address')} placeholder="Calle, número, barrio..." className={inputCls} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Correo electrónico *</label><input required type="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com" className={inputCls} /></div>
              </div>
            </div>

            {/* Experiencia */}
            <div>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black">2</span> Experiencia cosplay</h2>
              <div>
                <label className={labelCls}>Años de experiencia como cosplayer *</label>
                <input required type="number" min={0} max={50} value={form.experience} onChange={set('experience')} placeholder="0" className={inputCls + " max-w-[120px]"} />
              </div>
            </div>

            {/* Redes sociales */}
            <div>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black">3</span> Redes sociales</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>Instagram</label><input value={form.instagram} onChange={set('instagram')} placeholder="@usuario" className={inputCls} /></div>
                <div><label className={labelCls}>TikTok</label><input value={form.tiktok} onChange={set('tiktok')} placeholder="@usuario" className={inputCls} /></div>
                <div><label className={labelCls}>YouTube</label><input value={form.youtube} onChange={set('youtube')} placeholder="URL del canal" className={inputCls} /></div>
                <div><label className={labelCls}>Facebook</label><input value={form.facebook} onChange={set('facebook')} placeholder="URL o usuario" className={inputCls} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>X / Twitter</label><input value={form.twitter} onChange={set('twitter')} placeholder="@usuario" className={inputCls} /></div>
              </div>
            </div>

            {/* Motivación */}
            <div>
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-[#e5007d] text-white text-xs flex items-center justify-center font-black">4</span> Motivación</h2>
              <label className={labelCls}>¿Por qué quieres ser representante de Isekai World? * <span className="text-white/30">(mín. 50 caracteres)</span></label>
              <textarea
                required
                rows={5}
                value={form.whyIsekai}
                onChange={set('whyIsekai')}
                placeholder="Cuéntanos tu historia, tu pasión por el cosplay y por qué quieres representar a Isekai World..."
                className={inputCls + " resize-none"}
              />
              <p className={`text-xs mt-1 ${form.whyIsekai.length < 50 ? 'text-white/30' : 'text-green-400'}`}>{form.whyIsekai.length}/2000 caracteres</p>
            </div>

            <motion.button
              type="submit"
              disabled={apply.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-[#e5007d] rounded-full font-bold text-lg hover:bg-[#c4006b] transition-colors disabled:opacity-50"
            >
              {apply.isPending ? "Enviando..." : "Enviar solicitud"}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
