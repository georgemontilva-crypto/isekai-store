import { ClipboardList, Settings2, Layers, Sparkles, Package, Truck, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ORDER_STEPS = [
  { key: "pending",       label: "Creada",      Icon: ClipboardList, desc: "Recibimos tu pedido y ya lo estamos procesando" },
  { key: "preparing",     label: "Preparación", Icon: Settings2,     desc: "Nuestro equipo está preparando tu figura" },
  { key: "printing",      label: "Impresión",   Icon: Layers,        desc: "Tu figura está siendo impresa en 3D" },
  { key: "post_printing", label: "Post-imp.",   Icon: Sparkles,      desc: "Aplicando los toques finales a tu figura" },
  { key: "packed",        label: "Empacada",    Icon: Package,       desc: "Tu pedido está listo y empacado" },
  { key: "shipped",       label: "Enviada",     Icon: Truck,         desc: "Tu pedido está en camino — pronto llegará" },
  { key: "delivered",     label: "Entregada",   Icon: CheckCircle2,  desc: "¡Llegó! Disfruta tu figura" },
] as const;

interface Props {
  currentStatus: string;
  interactive?: boolean;
  showDescriptions?: boolean;
  onStepClick?: (key: string) => void;
}

export function OrderTimeline({ currentStatus, interactive = false, showDescriptions = false, onStepClick }: Props) {
  const currentIdx = ORDER_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <>
      {/* ── Desktop: horizontal ── */}
      <div className="hidden sm:flex items-start w-full">
        {ORDER_STEPS.map((step, i) => {
          const isDone    = i < currentIdx;
          const isCurrent = i === currentIdx;
          const { Icon }  = step;

          return (
            <div key={step.key} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                {/* Circle */}
                <div className="relative">
                  {isCurrent && (
                    <span className="absolute -inset-1.5 rounded-full animate-ping bg-black/15 pointer-events-none" />
                  )}
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onStepClick?.(step.key)}
                    className={cn(
                      "relative w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isDone    && "bg-green-500 text-white",
                      isCurrent && "bg-[#1a1a1a] text-white",
                      !isDone && !isCurrent && "bg-[#f0f0f0] text-[#bbb]",
                      interactive ? "cursor-pointer" : "cursor-default",
                      interactive && !isDone && !isCurrent && "hover:bg-[#e0e0e0]",
                      interactive && isCurrent && "ring-2 ring-[#1a1a1a] ring-offset-2"
                    )}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </button>
                </div>
                {/* Label */}
                <span className={cn(
                  "text-[10px] text-center leading-tight mt-1.5 max-w-[64px] w-full",
                  isCurrent ? "font-bold text-[#1a1a1a]" :
                  isDone    ? "text-[#666]" :
                              "text-[#bbb]"
                )}>
                  {step.label}
                </span>
                {/* Motivational desc (Account only) */}
                {showDescriptions && isCurrent && (
                  <span className="text-[10px] text-center text-[#888] mt-0.5 leading-tight max-w-[96px]">
                    {step.desc}
                  </span>
                )}
              </div>
              {/* Connector line */}
              {i < ORDER_STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mt-5 mx-1 min-w-[6px]",
                  i < currentIdx ? "bg-green-500" : "bg-[#e5e5e5]"
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: vertical ── */}
      <div className="flex sm:hidden flex-col">
        {ORDER_STEPS.map((step, i) => {
          const isDone    = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isLast    = i === ORDER_STEPS.length - 1;
          const { Icon }  = step;

          return (
            <div key={step.key} className="flex items-start gap-3">
              {/* Left: circle + vertical connector */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative">
                  {isCurrent && (
                    <span className="absolute -inset-1.5 rounded-full animate-ping bg-black/15 pointer-events-none" />
                  )}
                  <button
                    type="button"
                    disabled={!interactive}
                    onClick={() => interactive && onStepClick?.(step.key)}
                    className={cn(
                      "relative w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                      isDone    && "bg-green-500 text-white",
                      isCurrent && "bg-[#1a1a1a] text-white",
                      !isDone && !isCurrent && "bg-[#f0f0f0] text-[#bbb]",
                      interactive ? "cursor-pointer" : "cursor-default",
                      interactive && !isDone && !isCurrent && "hover:bg-[#e0e0e0]",
                      interactive && isCurrent && "ring-2 ring-[#1a1a1a] ring-offset-2"
                    )}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-0.5 flex-1 min-h-[28px]",
                    isDone ? "bg-green-500" : "bg-[#e5e5e5]"
                  )} />
                )}
              </div>
              {/* Right: label + description */}
              <div className={cn("pt-1.5", !isLast && "pb-5")}>
                <p className={cn(
                  "text-sm leading-none",
                  isCurrent ? "font-bold text-[#1a1a1a]" :
                  isDone    ? "text-[#555]" :
                              "text-[#bbb]"
                )}>
                  {step.label}
                </p>
                {showDescriptions && isCurrent && (
                  <p className="text-xs text-[#888] mt-1 leading-snug">{step.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
