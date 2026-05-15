import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";

type Section = "devoluciones" | "privacidad" | "cookies";

const sections: { id: Section; label: string }[] = [
  { id: "devoluciones", label: "Devoluciones / Returns" },
  { id: "privacidad",   label: "Privacidad / Privacy" },
  { id: "cookies",      label: "Cookies" },
];

function Devoluciones() {
  return (
    <div className="space-y-8 text-[15px] text-[#555] leading-relaxed">
      <section>
        <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Política de Devoluciones y Cambios</h2>
        <p className="text-xs text-[#888] mb-4">Return & Exchange Policy · Última actualización: Mayo 2025</p>
        <p>
          En <strong>Isekai World</strong> nos comprometemos a entregar cada pedido en perfectas condiciones. Lee esta política cuidadosamente antes de realizar tu compra.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">🚫 No realizamos devoluciones de dinero / No cash refunds</h3>
        <p className="mb-3">
          <strong>Isekai World no ofrece reembolsos en efectivo ni reversión de pagos</strong> por cambio de opinión, error en la selección del producto o insatisfacción con el diseño/características descritas claramente en la ficha del producto.
        </p>
        <p>
          We do not offer cash refunds or payment reversals for change of mind, incorrect product selection, or dissatisfaction with features clearly described in the product listing.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">✅ Cuándo aplica el cambio de producto / When product exchange applies</h3>
        <p className="mb-3">Aceptamos el cambio del producto <strong>únicamente</strong> en los siguientes casos:</p>
        <ul className="list-none space-y-3">
          {[
            { icon: "📦", text: "El producto llegó dañado o roto como consecuencia del transporte o manipulación durante el envío. / The product arrived damaged or broken as a result of transport or handling during shipping." },
            { icon: "🔧", text: "El producto presenta un defecto de fabricación comprobable que no fue causado por el uso del cliente. / The product has a verifiable manufacturing defect not caused by customer use." },
            { icon: "❌", text: "Recibiste un producto completamente diferente al que ordenaste. / You received a product completely different from what you ordered." },
          ].map(({ icon, text }) => (
            <li key={icon} className="flex gap-3 bg-[#f9f9f9] rounded-xl p-4">
              <span className="text-xl shrink-0">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">📸 Proceso para solicitar un cambio / How to request an exchange</h3>
        <div className="space-y-3">
          {[
            { n: "1", text: "Contáctanos dentro de las 48 horas siguientes a la recepción del pedido. / Contact us within 48 hours of receiving your order." },
            { n: "2", text: "Envía fotos claras del daño, el empaque exterior e interior, y la guía de envío a hola@isekaiworld.co. / Send clear photos of the damage, the outer and inner packaging, and the shipping label to hola@isekaiworld.co." },
            { n: "3", text: "Nuestro equipo evaluará el caso en máximo 3 días hábiles y te notificará la decisión. / Our team will evaluate the case within 3 business days and notify you of the decision." },
            { n: "4", text: "Si el cambio es aprobado, coordinaremos la recolección del producto dañado y el envío del reemplazo sin costo para ti. / If the exchange is approved, we will coordinate the pickup of the damaged product and ship the replacement at no cost to you." },
          ].map(({ n, text }) => (
            <div key={n} className="flex gap-4 items-start">
              <span className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white text-sm font-bold flex items-center justify-center shrink-0">{n}</span>
              <p className="pt-1">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">⚠️ Condiciones importantes / Important conditions</h3>
        <ul className="space-y-2">
          {[
            "El plazo máximo para reportar cualquier inconveniente es de 48 horas tras recibir el pedido. / The maximum time to report any issue is 48 hours after receiving the order.",
            "El producto a cambiar debe estar sin uso, en su empaque original y con todos sus accesorios. / The product to be exchanged must be unused, in its original packaging and with all accessories.",
            "No se aceptan cambios por productos que hayan sido usados, modificados o dañados por el cliente. / No exchanges for products that have been used, modified or damaged by the customer.",
            "Los gastos de envío del cambio corren por cuenta de Isekai World solo si el error fue nuestro o del transportista. / Shipping costs for the exchange are covered by Isekai World only if the error was ours or the carrier's.",
          ].map((text) => (
            <li key={text} className="flex gap-2">
              <span className="text-[#888] shrink-0">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="bg-[#fff8e1] border border-[#ffe082] rounded-2xl p-5 text-sm">
        <p className="font-semibold text-[#7a5c00] mb-1">📌 Recuerda / Remember</p>
        <p className="text-[#7a5c00]">Al realizar una compra en Isekai World aceptas esta política de devoluciones. Te recomendamos revisar bien las fotos y descripción de cada producto antes de comprar. · By purchasing from Isekai World you accept this return policy. We recommend reviewing all product photos and descriptions carefully before buying.</p>
      </div>
    </div>
  );
}

function Privacidad() {
  return (
    <div className="space-y-8 text-[15px] text-[#555] leading-relaxed">
      <section>
        <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Política de Privacidad / Privacy Policy</h2>
        <p className="text-xs text-[#888] mb-4">Última actualización / Last updated: Mayo 2025</p>
        <p>En <strong>Isekai World</strong> respetamos y protegemos la privacidad de nuestros usuarios conforme a la Ley 1581 de 2012 (Habeas Data) de Colombia y el RGPD de la UE donde aplique. / We respect and protect the privacy of our users in accordance with Colombian Law 1581 of 2012 (Habeas Data) and the EU GDPR where applicable.</p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Datos que recopilamos / Data we collect</h3>
        <ul className="space-y-2">
          {[
            "Nombre completo, correo electrónico y número de teléfono al crear una cuenta o realizar un pedido. / Full name, email address and phone number when creating an account or placing an order.",
            "Dirección de envío para procesar y entregar tus pedidos. / Shipping address to process and deliver your orders.",
            "Datos de navegación y uso del sitio (páginas visitadas, tiempo de sesión) mediante cookies técnicas y analíticas. / Browsing and site usage data (pages visited, session time) through technical and analytics cookies.",
            "Información de pago procesada de forma segura por Bold. Isekai World no almacena datos de tarjetas. / Payment information securely processed by Bold. Isekai World does not store card data.",
          ].map((text) => (
            <li key={text} className="flex gap-2">
              <span className="text-[#888] shrink-0">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Para qué usamos tus datos / How we use your data</h3>
        <ul className="space-y-2">
          {[
            "Procesar, enviar y hacer seguimiento a tus pedidos. / To process, ship and track your orders.",
            "Enviarte confirmaciones de pedido, actualizaciones de envío y notificaciones relacionadas con tu compra (vía Resend). / To send you order confirmations, shipping updates and purchase-related notifications (via Resend).",
            "Si te suscribes al newsletter, enviarte contenido relevante y ofertas (vía Mailchimp). Puedes cancelar en cualquier momento. / If you subscribe to the newsletter, to send you relevant content and offers (via Mailchimp). You may unsubscribe at any time.",
            "Mejorar la experiencia del sitio mediante análisis estadístico anónimo. / To improve the site experience through anonymous statistical analysis.",
          ].map((text) => (
            <li key={text} className="flex gap-2">
              <span className="text-[#888] shrink-0">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Compartir con terceros / Third-party sharing</h3>
        <p className="mb-3">No vendemos ni cedemos tus datos personales a terceros. Solo compartimos la información estrictamente necesaria con: / We do not sell or transfer your personal data to third parties. We only share strictly necessary information with:</p>
        <div className="grid gap-3">
          {[
            { name: "Bold", desc: "Procesamiento de pagos / Payment processing" },
            { name: "Resend", desc: "Envío de emails transaccionales / Transactional email delivery" },
            { name: "Mailchimp", desc: "Newsletter (solo si te suscribes) / Newsletter (only if you subscribe)" },
            { name: "Cloudflare R2", desc: "Almacenamiento de imágenes de productos / Product image storage" },
            { name: "Operadora logística", desc: "Entrega de pedidos / Order delivery" },
          ].map(({ name, desc }) => (
            <div key={name} className="flex gap-3 bg-[#f9f9f9] rounded-xl p-4">
              <strong className="shrink-0 text-[#1a1a1a]">{name}</strong>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Tus derechos / Your rights</h3>
        <p className="mb-3">Conforme a la Ley 1581 de 2012, tienes derecho a: / Under Law 1581 of 2012, you have the right to:</p>
        <ul className="space-y-2">
          {[
            "Conocer, actualizar y rectificar tus datos personales. / Know, update and rectify your personal data.",
            "Solicitar la eliminación de tus datos cuando no sean necesarios para los fines para los que fueron recogidos. / Request deletion of your data when it is no longer necessary for the purposes for which it was collected.",
            "Revocar la autorización y/o solicitar la supresión del dato. / Revoke authorization and/or request data deletion.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC). / File complaints with the Superintendence of Industry and Commerce (SIC).",
          ].map((text) => (
            <li key={text} className="flex gap-2">
              <span className="text-[#888] shrink-0">•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4">Para ejercer estos derechos escríbenos a <strong>hola@isekaiworld.co</strong> · To exercise these rights write to us at <strong>hola@isekaiworld.co</strong></p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Seguridad / Security</h3>
        <p>Implementamos medidas técnicas y organizativas para proteger tus datos contra acceso no autorizado, pérdida o alteración. Nuestro sitio usa HTTPS y los datos sensibles se procesan a través de plataformas certificadas. / We implement technical and organizational measures to protect your data against unauthorized access, loss or alteration. Our site uses HTTPS and sensitive data is processed through certified platforms.</p>
      </section>
    </div>
  );
}

function Cookies() {
  return (
    <div className="space-y-8 text-[15px] text-[#555] leading-relaxed">
      <section>
        <h2 className="text-xl font-black text-[#1a1a1a] mb-3">Política de Cookies / Cookie Policy</h2>
        <p className="text-xs text-[#888] mb-4">Última actualización / Last updated: Mayo 2025</p>
        <p>Esta política explica qué cookies usamos en <strong>isekaiworld.co</strong>, para qué sirven y cómo puedes gestionarlas. / This policy explains what cookies we use on <strong>isekaiworld.co</strong>, what they are for and how you can manage them.</p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">¿Qué son las cookies? / What are cookies?</h3>
        <p>Las cookies son pequeños archivos de texto que un sitio web guarda en tu dispositivo cuando lo visitas. Permiten que el sitio recuerde tus acciones y preferencias durante un tiempo determinado. / Cookies are small text files that a website saves on your device when you visit it. They allow the site to remember your actions and preferences for a set period of time.</p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Cookies que usamos / Cookies we use</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#f5f5f5]">
                <th className="text-left p-3 rounded-tl-xl font-semibold text-[#1a1a1a]">Nombre / Name</th>
                <th className="text-left p-3 font-semibold text-[#1a1a1a]">Tipo / Type</th>
                <th className="text-left p-3 font-semibold text-[#1a1a1a]">Duración / Duration</th>
                <th className="text-left p-3 rounded-tr-xl font-semibold text-[#1a1a1a]">Propósito / Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "app_session_id", type: "Esencial / Essential", duration: "1 año / 1 year", purpose: "Mantiene tu sesión iniciada / Keeps you logged in" },
                { name: "isekai-cart-*", type: "Esencial / Essential", duration: "Sesión / Session", purpose: "Guarda los ítems del carrito / Saves cart items" },
                { name: "_ga, _gid", type: "Analítica / Analytics", duration: "2 años / 1 día", purpose: "Google Analytics — estadísticas de uso anónimas / Anonymous usage stats" },
                { name: "_fbp", type: "Marketing", duration: "3 meses", purpose: "Facebook Pixel — seguimiento de conversiones / Conversion tracking" },
              ].map((row, i) => (
                <tr key={row.name} className={i % 2 === 0 ? "" : "bg-[#fafafa]"}>
                  <td className="p-3 font-mono text-[12px] text-[#1a1a1a]">{row.name}</td>
                  <td className="p-3">{row.type}</td>
                  <td className="p-3">{row.duration}</td>
                  <td className="p-3">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Cookies esenciales / Essential cookies</h3>
        <p>Son necesarias para el funcionamiento básico del sitio (sesión de usuario, carrito de compras). No pueden desactivarse. / These are necessary for the basic functioning of the site (user session, shopping cart). They cannot be disabled.</p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Cookies analíticas / Analytics cookies</h3>
        <p>Nos ayudan a entender cómo los usuarios interactúan con el sitio para mejorar la experiencia. Los datos son anónimos y agregados. / They help us understand how users interact with the site to improve the experience. Data is anonymous and aggregated.</p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Cómo gestionar las cookies / How to manage cookies</h3>
        <p className="mb-3">Puedes controlar y/o eliminar las cookies desde la configuración de tu navegador: / You can control and/or delete cookies from your browser settings:</p>
        <ul className="space-y-1">
          {[
            { name: "Chrome", url: "https://support.google.com/chrome/answer/95647" },
            { name: "Firefox", url: "https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web" },
            { name: "Safari", url: "https://support.apple.com/es-co/guide/safari/sfri11471/mac" },
            { name: "Edge", url: "https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" },
          ].map(({ name, url }) => (
            <li key={name}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:underline">
                {name} →
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[#888]">Ten en cuenta que deshabilitar algunas cookies puede afectar la funcionalidad del sitio. / Note that disabling some cookies may affect site functionality.</p>
      </section>

      <section>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Contacto / Contact</h3>
        <p>Si tienes preguntas sobre nuestra política de cookies, escríbenos a <strong>hola@isekaiworld.co</strong> / If you have questions about our cookie policy, write to us at <strong>hola@isekaiworld.co</strong></p>
      </section>
    </div>
  );
}

export default function Politicas() {
  const [active, setActive] = useState<Section>("devoluciones");

  const content = {
    devoluciones: <Devoluciones />,
    privacidad: <Privacidad />,
    cookies: <Cookies />,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-[#1a1a1a] text-white py-20">
        <div className="container max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/50 mb-3">
              Legal / Policies
            </p>
            <h1 className="text-4xl md:text-5xl font-black" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Políticas
            </h1>
          </motion.div>
        </div>
      </div>

      <div className="container max-w-4xl py-10">
        {/* Tab nav */}
        <div className="flex gap-2 flex-wrap mb-10">
          {sections.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
              style={{
                background: active === id ? "#1a1a1a" : "#f0f0f0",
                color: active === id ? "#fff" : "#555",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {content[active]}
        </motion.div>

        {/* Bottom nav to other policies */}
        <div className="mt-16 pt-8 border-t border-[#ebebeb] flex flex-wrap gap-3">
          {sections.filter(s => s.id !== active).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setActive(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-[13px] text-[#7c3aed] hover:underline font-medium"
            >
              Ver {label} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
