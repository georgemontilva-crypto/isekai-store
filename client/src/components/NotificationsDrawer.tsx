import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Mail, User, BellOff } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Props = {
  open: boolean;
  onClose: () => void;
};

function relativeTime(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return "hace un momento";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

const typeIcon: Record<string, React.ReactNode> = {
  new_order: <ShoppingBag className="w-4 h-4 text-primary" />,
  new_subscriber: <Mail className="w-4 h-4 text-blue-500" />,
  new_user: <User className="w-4 h-4 text-green-500" />,
};

export default function NotificationsDrawer({ open, onClose }: Props) {
  const utils = trpc.useUtils();
  const { data: notifications } = trpc.notifications.getAll.useQuery(undefined, { enabled: open });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { utils.notifications.getAll.invalidate(); utils.notifications.unreadCount.invalidate(); },
  });

  const drawerRef = useRef<HTMLDivElement>(null);

  // Mark all read when drawer opens
  useEffect(() => {
    if (open) markAllRead.mutate();
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[998] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            ref={drawerRef}
            className="fixed right-0 top-0 bottom-0 z-[999] w-80 bg-background border-l border-border shadow-2xl flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-sm">Notificaciones</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <BellOff className="w-10 h-10 opacity-30" />
                  <p className="text-sm">Sin notificaciones</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      className={`px-4 py-3 flex items-start gap-3 ${n.read ? "bg-background" : "bg-muted/40"}`}
                    >
                      <div className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center">
                        {typeIcon[n.type] ?? <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">{relativeTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
