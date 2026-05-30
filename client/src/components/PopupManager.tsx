import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

export function PopupManager({ productId }: { productId?: number }) {
  const [location] = useLocation();
  const [shown, setShown] = useState<number[]>([]);
  const [activePopup, setActivePopup] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: popupList } = trpc.popups.getActive.useQuery({
    page: location,
    productId,
  });

  const subscribeNewsletter = trpc.newsletter.subscribe.useMutation();

  useEffect(() => {
    if (!popupList?.length) return;

    const cleanups: (() => void)[] = [];

    popupList.forEach(popup => {
      const storageKey = `popup_shown_${popup.id}`;
      if (popup.showOnce && localStorage.getItem(storageKey)) return;
      if (shown.includes(popup.id)) return;

      const trigger = () => {
        setActivePopup(popup);
        setShown(prev => [...prev, popup.id]);
        setEmail('');
        setSubmitted(false);
        if (popup.showOnce) localStorage.setItem(storageKey, '1');
      };

      if (popup.triggerType === 'time' || popup.triggerType === 'page') {
        const delay = (popup.triggerDelay ?? 3) * 1000;
        const timer = setTimeout(trigger, delay);
        cleanups.push(() => clearTimeout(timer));
      } else if (popup.triggerType === 'entry') {
        trigger();
      } else if (popup.triggerType === 'exit') {
        const handleMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) trigger();
        };
        document.addEventListener('mouseleave', handleMouseLeave);
        cleanups.push(() => document.removeEventListener('mouseleave', handleMouseLeave));
      } else if (popup.triggerType === 'product' && productId) {
        const delay = (popup.triggerDelay ?? 5) * 1000;
        const timer = setTimeout(trigger, delay);
        cleanups.push(() => clearTimeout(timer));
      }
    });

    return () => cleanups.forEach(fn => fn());
  }, [popupList, location]);

  const handleSubmitEmail = async () => {
    if (!email) return;
    await subscribeNewsletter.mutateAsync({ email });
    setSubmitted(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activePopup.couponCode);
  };

  const positionClasses: Record<string, string> = {
    'center':       'fixed inset-0 flex items-center justify-center z-[100] p-4',
    'bottom-left':  'fixed bottom-6 left-6 z-[100]',
    'bottom-right': 'fixed bottom-6 right-6 z-[100]',
    'top':          'fixed top-6 left-1/2 -translate-x-1/2 z-[100]',
  };

  const getCardVariants = (position: string) => {
    if (position === 'top') {
      return {
        initial: { opacity: 0, y: -40 },
        animate: { opacity: 1, y: 0 },
        exit:    { opacity: 0, y: -20 },
      };
    }
    if (position === 'bottom-left' || position === 'bottom-right') {
      return {
        initial: { opacity: 0, y: 60 },
        animate: { opacity: 1, y: 0 },
        exit:    { opacity: 0, y: 40 },
      };
    }
    // center (default)
    return {
      initial: { opacity: 0, y: 40, scale: 0.95 },
      animate: { opacity: 1, y: 0,  scale: 1    },
      exit:    { opacity: 0, y: 20, scale: 0.95 },
    };
  };

  return (
    <AnimatePresence>
      {activePopup && (
        <div key={activePopup.id} className={positionClasses[activePopup.position ?? 'center']}>

          {/* Overlay — solo en center */}
          {(activePopup.position === 'center' || !activePopup.position) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setActivePopup(null)}
            />
          )}

          {/* Card */}
          <motion.div
            {...getCardVariants(activePopup.position ?? 'center')}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden
              ${(activePopup.position === 'center' || !activePopup.position) ? 'w-full max-w-md' : 'w-[320px]'}`}
          >
            {activePopup.image && (
              <div className="relative">
                <img
                  src={activePopup.image}
                  alt={activePopup.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}

            <div className="p-6">
              <button
                onClick={() => setActivePopup(null)}
                className="absolute top-3 right-3 bg-black/20 hover:bg-black/40 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </button>

              {activePopup.title && (
                <h3 className="text-xl font-black text-[#111] mb-2 leading-tight">
                  {activePopup.title}
                </h3>
              )}

              {activePopup.subtitle && (
                <p className="text-[#e5007d] font-semibold text-sm mb-3">
                  {activePopup.subtitle}
                </p>
              )}

              {activePopup.bodyText && (
                <p className="text-[#555] text-sm leading-relaxed mb-4">
                  {activePopup.bodyText}
                </p>
              )}

              {activePopup.couponCode && (
                <div
                  onClick={handleCopyCode}
                  className="flex items-center justify-between bg-[#f8f8f8] border-2 border-dashed border-[#e5007d] rounded-xl px-4 py-3 mb-4 cursor-pointer hover:bg-[#fff0f8] transition-colors"
                >
                  <span className="font-black text-[#e5007d] tracking-widest text-lg">
                    {activePopup.couponCode}
                  </span>
                  <span className="text-xs text-[#999]">Copiar</span>
                </div>
              )}

              {activePopup.showEmail && !submitted && (
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Tu correo electrónico"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#e5e5e5] rounded-xl outline-none focus:border-[#e5007d]"
                    />
                  </div>
                  <button
                    onClick={handleSubmitEmail}
                    className="bg-[#e5007d] text-white px-4 rounded-xl text-sm font-semibold hover:bg-[#c4006b] transition-colors"
                  >
                    ✓
                  </button>
                </div>
              )}

              {submitted && (
                <p className="text-green-600 text-sm font-semibold mb-4">
                  ✅ ¡Suscrito exitosamente!
                </p>
              )}

              {activePopup.buttonText && activePopup.buttonUrl && (
                <a
                  href={activePopup.buttonUrl}
                  onClick={() => setActivePopup(null)}
                  className="block w-full bg-[#111] text-white text-center py-3 rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors"
                >
                  {activePopup.buttonText}
                </a>
              )}
            </div>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
}
