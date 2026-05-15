import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    category: "Pedidos / Orders",
    items: [
      {
        q: "¿Cómo hago un pedido? / How do I place an order?",
        a: "Agrega los productos que deseas al carrito, completa tus datos de envío en el checkout y realiza el pago a través de Bold. Recibirás una confirmación por email. / Add products to your cart, fill in your shipping details at checkout, and pay through Bold. You'll receive an email confirmation.",
      },
      {
        q: "¿Puedo modificar o cancelar mi pedido? / Can I modify or cancel my order?",
        a: "Puedes solicitar cambios dentro de las 2 horas siguientes a realizar el pedido escribiéndonos a hola@isekaiworld.co. Una vez en proceso de empaque, no es posible modificarlo. / You can request changes within 2 hours of placing your order by writing to hola@isekaiworld.co. Once in the packing process, modifications are not possible.",
      },
      {
        q: "¿Qué métodos de pago aceptan? / What payment methods do you accept?",
        a: "Aceptamos tarjetas de crédito y débito, PSE, Nequi y Daviplata a través de Bold, nuestra pasarela de pagos segura para Colombia. / We accept credit and debit cards, PSE, Nequi and Daviplata through Bold, our secure payment gateway for Colombia.",
      },
    ],
  },
  {
    category: "Envíos / Shipping",
    items: [
      {
        q: "¿Cuánto tiempo tarda mi pedido en llegar? / How long does delivery take?",
        a: "Envíos nacionales en Colombia: 3–7 días hábiles. Ciudades principales (Bogotá, Medellín, Cali, Barranquilla): 2–4 días hábiles. / National shipping within Colombia: 3–7 business days. Major cities (Bogotá, Medellín, Cali, Barranquilla): 2–4 business days.",
      },
      {
        q: "¿El envío tiene costo? / Is there a shipping fee?",
        a: "El envío es gratis en pedidos superiores a $150.000 COP. Para pedidos menores, el costo se calcula según la ciudad de destino al momento del checkout. / Shipping is free on orders over $150,000 COP. For smaller orders, the cost is calculated based on the destination city at checkout.",
      },
      {
        q: "¿Hacen envíos internacionales? / Do you ship internationally?",
        a: "Por el momento solo hacemos envíos dentro de Colombia. Estamos trabajando para ofrecer envíos internacionales pronto. / Currently we only ship within Colombia. We are working to offer international shipping soon.",
      },
      {
        q: "¿Cómo rastro mi pedido? / How do I track my order?",
        a: "Al confirmar el envío te enviaremos un número de guía al correo registrado para que puedas rastrear tu paquete en tiempo real. / When your order ships, we will send a tracking number to your registered email so you can track your package in real time.",
      },
    ],
  },
  {
    category: "Productos / Products",
    items: [
      {
        q: "¿Los productos son originales? / Are the products original?",
        a: "Sí, todos nuestros productos son originales y de alta calidad. Trabajamos con fabricantes certificados y proveedores de confianza. / Yes, all our products are original and high quality. We work with certified manufacturers and trusted suppliers.",
      },
      {
        q: "¿Qué pasa si mi producto llega dañado? / What if my product arrives damaged?",
        a: "Si tu producto llegó dañado durante el transporte, contáctanos dentro de las 48 horas siguientes a la entrega con fotos del daño y el empaque. Reemplazaremos el producto sin costo. Consulta nuestra política de devoluciones para más detalles. / If your product arrived damaged during transport, contact us within 48 hours of delivery with photos of the damage and packaging. We will replace the product at no cost. See our return policy for details.",
      },
      {
        q: "¿Los productos tienen garantía? / Do products have a warranty?",
        a: "Todos nuestros productos tienen garantía de 30 días contra defectos de fabricación o daños ocurridos durante el envío. / All our products have a 30-day warranty against manufacturing defects or damage that occurred during shipping.",
      },
    ],
  },
  {
    category: "Cuenta / Account",
    items: [
      {
        q: "¿Necesito una cuenta para comprar? / Do I need an account to buy?",
        a: "Puedes comprar como invitado, pero tener una cuenta te permite rastrear tus pedidos, guardar tu historial de compras y acceder a beneficios exclusivos. / You can buy as a guest, but having an account lets you track orders, save your purchase history, and access exclusive benefits.",
      },
      {
        q: "¿Cómo creo una cuenta? / How do I create an account?",
        a: "Haz clic en el ícono de usuario en la barra de navegación. Puedes registrarte con Google o con tu correo electrónico. / Click the user icon in the navigation bar. You can sign up with Google or with your email address.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#ebebeb] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-semibold text-[#1a1a1a] leading-snug">{q}</span>
        <ChevronDown
          size={18}
          className="shrink-0 text-[#888] transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-[#666] leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#1a1a1a] text-white py-20">
        <div className="container max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/50 mb-3">
              Preguntas Frecuentes / FAQ
            </p>
            <h1 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              ¿En qué podemos ayudarte?
            </h1>
            <p className="text-white/60 mt-3">How can we help you?</p>
          </motion.div>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="container max-w-3xl py-16 space-y-12">
        {faqs.map((section) => (
          <motion.section
            key={section.category}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-sm font-bold uppercase tracking-[0.15em] text-[#888] mb-4"
            >
              {section.category}
            </h2>
            <div className="rounded-2xl border border-[#ebebeb] px-6 divide-y-0">
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </motion.section>
        ))}

        {/* Still have questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#f5f5f5] rounded-2xl p-8 text-center"
        >
          <h3 className="text-xl font-black mb-2 text-[#1a1a1a]">¿Tienes más preguntas? / Still have questions?</h3>
          <p className="text-[14px] text-[#666] mb-5">Escríbenos y te respondemos pronto · Write to us and we'll get back to you shortly</p>
          <a
            href="mailto:hola@isekaiworld.co"
            className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-[14px] font-semibold px-6 py-3 rounded-full hover:bg-[#333] transition-colors"
          >
            hola@isekaiworld.co
          </a>
        </motion.div>
      </div>
    </div>
  );
}
