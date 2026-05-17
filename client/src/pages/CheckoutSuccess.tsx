import { motion } from "framer-motion";
import { CheckCircle, Package } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LangContext";

export default function CheckoutSuccess() {
  const { t } = useLang();
  const search = useSearch();
  const orderNumber = new URLSearchParams(search).get("order");

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
          className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-400" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-3xl font-black mb-3">¡Pago confirmado!</h1>
          <p className="text-muted-foreground mb-6">
            Tu pago fue procesado exitosamente. Recibirás una confirmación por correo pronto.
          </p>

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
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-purple"
              asChild
            >
              <Link href="/account">{t.checkout.success.viewAccount}</Link>
            </Button>
            <Button variant="outline" className="border-border/50" asChild>
              <Link href="/catalog">{t.checkout.success.continueShopping}</Link>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
