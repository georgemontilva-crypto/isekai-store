import { Instagram } from 'lucide-react';
import { useCart } from "@/contexts/CartContext";
import { trpc } from '@/lib/trpc';

/**
 * Botón flotante de cotización por Instagram.
 *
 * Reemplaza al antiguo widget de WhatsApp. Instagram no permite prellenar el
 * texto de un DM, así que aquí no hay caja de mensaje: el botón abre
 * directamente el chat (ig.me/m/usuario) y la persona escribe allá.
 *
 * El usuario se configura en el panel admin → Instagram (clave `instagram_username`).
 */
export function InstagramChat() {
  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  // Mientras el carrito está abierto, la burbuja estorba (se monta encima del
  // botón de pagar), así que se esconde y vuelve al cerrarlo.
  const { isOpen: carritoAbierto } = useCart();
  const rawUsername = siteSettings?.['instagram_username'] ?? '';
  const username = rawUsername.trim().replace(/^@/, '');

  if (!username || carritoAbierto) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative flex items-center justify-center w-20 h-20">

        {/* Texto en arco sobre el botón */}
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <path id="igTopArc" d="M 10,40 A 30,30 0 0,1 70,40" />
          </defs>
          <text fontSize="7.5" fontWeight="800" fill="#e5007d" fontFamily="system-ui, sans-serif">
            <textPath href="#igTopArc" startOffset="50%" textAnchor="middle">
              Cotiza tu pieza aquí
            </textPath>
          </text>
        </svg>

        <a
          href={`https://ig.me/m/${username}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Cotizar por Instagram"
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
          }}
        >
          <Instagram size={24} className="text-white" />
        </a>
      </div>
    </div>
  );
}
