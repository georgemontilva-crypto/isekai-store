import { motion } from "framer-motion";
import { useLang } from "@/i18n/LangContext";

export default function Nosotros() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#1a1a1a] text-white py-20">
        <div className="container max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/50 mb-3">
              Nuestra Historia
            </p>
            <h1
              className="text-4xl md:text-5xl font-black mb-4"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              Isekai World
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl mx-auto">
              Nacimos de la pasión por el anime, el gaming y la cultura pop.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-3xl py-16 space-y-12">

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-black mb-4 text-[#1a1a1a]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            ¿Quiénes somos? / Who we are
          </h2>
          <p className="text-[15px] text-[#555] leading-relaxed mb-3">
            Somos una tienda colombiana especializada en figuras coleccionables, ropa y accesorios de anime y videojuegos. Cada producto es seleccionado a mano para garantizar la más alta calidad para nuestra comunidad de fans.
          </p>
          <p className="text-[15px] text-[#555] leading-relaxed">
            
          </p>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-black mb-4 text-[#1a1a1a]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Nuestra Misión
          </h2>
          <p className="text-[15px] text-[#555] leading-relaxed mb-3">
            Acercar la cultura del anime y los videojuegos a Colombia y Latinoamérica con productos premium, auténticos y accesibles. Creemos que cada fan merece tener en sus manos una pieza que represente lo que ama.
          </p>
          <p className="text-[15px] text-[#555] leading-relaxed">
            
          </p>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-black mb-4 text-[#1a1a1a]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            ¿Por qué Isekai? / Why Isekai?
          </h2>
          <p className="text-[15px] text-[#555] leading-relaxed mb-3">
            "Isekai" en japonés significa ser transportado a otro mundo. Eso es exactamente lo que queremos que sientas cuando recibes nuestros productos: que entras en el universo de tus personajes favoritos.
          </p>
          <p className="text-[15px] text-[#555] leading-relaxed">
            "Isekai" in Japanese means to be transported to another world. That's exactly what we want you to feel when you receive our products: that you step into the universe of your favorite characters.
          </p>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl font-black mb-4 text-[#1a1a1a]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Contacto
          </h2>
          <div className="bg-[#f5f5f5] rounded-2xl p-6 space-y-2 text-[15px] text-[#555]">
            <p>📧 <strong>Email:</strong> hola@isekaiworld.co</p>
            <p>📱 <strong>WhatsApp:</strong> +57 300 000-0000</p>
            <p>📍 <strong>País:</strong> Colombia 🇨🇴</p>
            <p>⏰ <strong>Atención:</strong> Lunes a Viernes · 9am – 6pm COT</p>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
