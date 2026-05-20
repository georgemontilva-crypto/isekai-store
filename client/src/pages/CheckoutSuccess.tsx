import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangContext";

export default function CheckoutSuccess() {
  const { t } = useLang();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderNumber = params.get("order");
  const status = params.get("status");

  const isApproved = status === "APPROVED";
  const isDeclined = status === "DECLINED";

  const icon = isApproved ? (
    <CheckCircle className="w-12 h-12 text-green-400" />
  ) : isDeclined ? (
    <XCircle className="w-12 h-12 text-destructive" />
  ) : (
    <Clock className="w-12 h-12 text-amber-400" />
  );

  const ringClass = isApproved
    ? "bg-green-500/10 border-green-500/30"
    : isDeclined
    ? "bg-destructive/10 border-destructive/30"
    : "bg-amber-500/10 border-amber-500/30";

  const title = isApproved
    ? "¡Pago exitoso!"
    : isDeclined
    ? "Pago rechazado"
    : "Verificando tu pago...";

  const message = isApproved
    ? "Tu pago fue confirmado. Tu orden está en producción."
    : isDeclined
    ? "Pago rechazado. Intenta con otro método de pago."
    : "Estamos verificando el estado de tu pago. Te notificaremos por correo.";

  return (
    <div className="min-h-screen pt-24 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="text-center max-w-md mx-auto px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`w-24 h-24 rounded-full border flex items-center justify-center mx-auto mb-6 ${ringClass}`}
        >
          {icon}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-black mb-3">{title}</h1>
          <p className="text-muted-foreground mb-6">{message}</p>

          {orderNumber && (
            <div className="p-4 rounded-2xl bg-card border border-border/50 mb-6 flex items-center gap-3">
              <Package className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground">Número de pedido</p>
                <p className="text-lg font-bold text-primary">{orderNumber}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isDeclined ? (
              <>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple"
                  asChild
                >
                  <Link href="/checkout">Intentar de nuevo</Link>
                </Button>
                <Button variant="outline" className="border-border/50" asChild>
                  <Link href="/catalog">{t.checkout.success.continueShopping}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple"
                  asChild
                >
                  <Link href="/account">{t.checkout.success.viewAccount}</Link>
                </Button>
                <Button variant="outline" className="border-border/50" asChild>
                  <Link href="/catalog">{t.checkout.success.continueShopping}</Link>
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
