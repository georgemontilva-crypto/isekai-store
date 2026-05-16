import { ClipboardList, Settings2, Layers, Sparkles, Package, Truck, CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ORDER_STEPS = [
  { key: "pending",       Icon: ClipboardList, desc: "Recibimos tu pedido y ya lo estamos procesando", tooltip: ["Orden", "creada"]       },
  { key: "preparing",     Icon: Settings2,     desc: "Nuestro equipo está preparando tu figura",       tooltip: ["En", "preparación"]    },
  { key: "printing",      Icon: Layers,        desc: "Tu figura está siendo impresa en 3D",            tooltip: ["En impresión", "3D"]   },
  { key: "post_printing", Icon: Sparkles,      desc: "Aplicando los toques finales a tu figura",       tooltip: ["Post", "impresión"]    },
  { key: "packed",        Icon: Package,       desc: "Tu pedido está listo y empacado",                tooltip: ["Empacada"]             },
  { key: "shipped",       Icon: Truck,         desc: "Tu pedido está en camino — pronto llegará",      tooltip: ["Enviada"]              },
  { key: "delivered",     Icon: CheckCircle2,  desc: "¡Llegó! Disfruta tu figura",                    tooltip: ["Entregada"]            },
] as const;

interface Props {
  currentStatus: string;
  interactive?: boolean;
  onStepClick?: (key: string) => void;
}

export function OrderTimeline({ currentStatus, interactive = false, onStepClick }: Props) {
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
                {/* Circle + tooltip wrapper */}
                <div className="relative group">
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
                  {/* Tooltip */}
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs font-medium rounded-md px-3 py-2 whitespace-nowrap z-10 shadow-lg text-center leading-snug pointer-events-none">
                    {step.tooltip.map((line, li) => (
                      <span key={li}>{li > 0 && <br />}{line}</span>
                    ))}
                  </div>
                </div>
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
                <div className="relative group">
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
                  {/* Tooltip — appears to the right on mobile to avoid overflow */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-full ml-2 hidden group-hover:block bg-gray-900 text-white text-xs font-medium rounded-md px-2.5 py-1.5 whitespace-nowrap z-10 shadow-lg pointer-events-none">
                    {step.tooltip.join(" ")}
                  </div>
                </div>
                {!isLast && (
                  <div className={cn(
                    "w-0.5 flex-1 min-h-[28px]",
                    isDone ? "bg-green-500" : "bg-[#e5e5e5]"
                  )} />
                )}
              </div>
              <div className={cn(!isLast && "pb-5")} />
            </div>
          );
        })}
      </div>
    </>
  );
}
