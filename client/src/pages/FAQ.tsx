import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSEO } from "@/hooks/useSEO";

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#e5e5e5] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-[15px] font-semibold text-[#111] leading-snug group-hover:text-[#e5007d] transition-colors">
          {question}
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 text-[#aaa] transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-[#666] leading-relaxed pb-5 pr-6">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  useSEO({
    title: 'Preguntas Frecuentes',
    description: 'Respuestas sobre pedidos, envíos, pagos y el proceso de impresión 3D en Isekai World.',
    url: 'https://isekaiworld.co/faq',
  });

  const { data: items = [] } = trpc.faq.list.useQuery();
  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const faqImage = siteSettings?.["faq_image"] ?? "";

  const categories = [...new Set(items.map(i => i.category ?? "General"))];

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="container py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* ── Columna izquierda — FAQs ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs tracking-[0.3em] uppercase text-[#e5007d] mb-2 font-medium">FAQ</p>
              <h1 className="text-4xl font-black text-[#111] mb-10">Preguntas frecuentes</h1>
            </motion.div>

            {items.length === 0 ? (
              <p className="text-[#aaa] text-sm">No hay preguntas frecuentes configuradas aún.</p>
            ) : (
              categories.map((cat, ci) => (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ci * 0.07 }}
                  className="mb-10"
                >
                  <p className="text-xs tracking-[0.25em] uppercase text-[#999] mb-4 border-b border-[#e5e5e5] pb-2 font-medium">
                    {cat}
                  </p>
                  {items.filter(f => (f.category ?? "General") === cat).map(item => (
                    <FAQItem key={item.id} question={item.question} answer={item.answer} />
                  ))}
                </motion.div>
              ))
            )}

            {/* CTA contacto */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 bg-[#f8f8f8] rounded-2xl p-8"
            >
              <h3 className="text-lg font-black text-[#111] mb-2">¿No encontraste tu respuesta?</h3>
              <p className="text-sm text-[#666] mb-5 leading-relaxed">
                Escríbenos directamente y te respondemos en menos de 24 horas.
              </p>
              <a
                href="mailto:hola@isekaiworld.co"
                className="inline-flex items-center gap-2 bg-[#111] text-white text-sm font-semibold px-6 py-3 rounded-full hover:bg-[#333] transition-colors"
              >
                hola@isekaiworld.co
              </a>
            </motion.div>
          </div>

          {/* ── Columna derecha — imagen sticky ── */}
          <div className="lg:sticky lg:top-24">
            {faqImage ? (
              <motion.img
                src={faqImage}
                alt="FAQ"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-[#f0f0f0] rounded-2xl flex items-center justify-center">
                <p className="text-[#bbb] text-sm text-center px-6">
                  Configura la imagen desde<br />Admin → Configuración → Página FAQ
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
