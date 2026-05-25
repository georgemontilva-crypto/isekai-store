import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function WhatsAppChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const { data: siteSettings } = trpc.settings.getAll.useQuery();
  const waNumber = siteSettings?.['whatsapp_number'] ?? '';

  if (!waNumber) return null;

  const handleSend = () => {
    if (!message.trim()) return;
    const encoded = encodeURIComponent(message.trim());
    window.open(`https://wa.me/${waNumber}?text=${encoded}`, '_blank');
    setMessage('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Chat bubble */}
      {open && (
        <div className="w-[300px] bg-white rounded-2xl shadow-2xl border border-[#e5e5e5] overflow-hidden">

          {/* Header verde WhatsApp */}
          <div className="bg-[#25D366] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">Isekai World</p>
              <p className="text-white/80 text-xs">Responde en minutos</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Burbuja de mensaje de bienvenida */}
          <div className="p-4 bg-[#f0f2f5] min-h-[80px]">
            <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm inline-block max-w-[90%]">
              <p className="text-sm text-[#111] leading-relaxed">
                👋 ¡Hola! ¿En qué podemos ayudarte? Escríbenos y te respondemos enseguida.
              </p>
              <p className="text-[10px] text-[#999] mt-1 text-right">Isekai World</p>
            </div>
          </div>

          {/* Input de mensaje */}
          <div className="p-3 flex gap-2 border-t border-[#e5e5e5] bg-white">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              rows={2}
              className="flex-1 text-sm border border-[#e5e5e5] rounded-xl px-3 py-2 resize-none outline-none focus:border-[#25D366] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-[#25D366] text-white rounded-xl px-3 flex items-center justify-center disabled:opacity-40 hover:bg-[#20b858] transition-colors flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>

          <p className="text-[10px] text-[#999] text-center py-1.5 bg-white">
            Abre WhatsApp al enviar
          </p>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-[#25D366] rounded-full shadow-lg flex items-center justify-center hover:bg-[#20b858] transition-all hover:scale-110 active:scale-95"
        aria-label="Chat por WhatsApp"
      >
        {open
          ? <X size={22} className="text-white" />
          : <MessageCircle size={24} className="text-white" />
        }
      </button>

    </div>
  );
}
