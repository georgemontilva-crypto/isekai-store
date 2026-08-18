import { useState } from "react";
import { X, Upload, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export interface MediaItem {
  id: number;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string | null;
}

interface Props {
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}

/**
 * Selector de archivos de la biblioteca.
 * Trae su propio botón de subida para no obligar a salir del formulario.
 */
export default function MediaPickerModal({ onPick, onClose }: Props) {
  const { data: items = [], isLoading, refetch } = trpc.media.list.useQuery();
  const upload = trpc.media.upload.useMutation();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo no puede superar 10 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = () => reject(new Error("read"));
        r.readAsDataURL(file);
      });
      await upload.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
      await refetch();
      toast.success("Archivo subido a la biblioteca");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
      >
        {/* Cabecera fija */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#e8e8ea] px-5 py-4">
          <h3 className="text-base font-extrabold uppercase tracking-tight">Elegir archivo</h3>
          <div className="flex items-center gap-2">
            <label className={`flex cursor-pointer items-center gap-2 rounded-full bg-[#111] px-4 py-2 text-xs font-bold text-white ${uploading ? "opacity-60" : ""}`}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? "Subiendo..." : "Subir archivo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                disabled={uploading}
                onChange={e => handleUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#f0f0f0]" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo con scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-xl border border-[#e5007d]/40 bg-[#e5007d]/5 p-3">
              <p className="text-xs font-bold text-[#e5007d]">No se pudo subir</p>
              <p className="mt-0.5 text-xs text-[#555]">{error}</p>
            </div>
          )}

          {isLoading ? (
            <p className="py-10 text-center text-sm text-[#888]">Cargando biblioteca...</p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-[#e8e8ea] p-10 text-center text-sm text-[#888]">
              La biblioteca está vacía. Sube un archivo con el botón de arriba.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {items.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => onPick(m)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-[#e8e8ea] bg-white text-left transition-colors hover:border-[#e5007d]"
                >
                  <div className="relative aspect-square w-full shrink-0 bg-[#f6f6f7]">
                    <img src={m.url} alt={m.altText ?? m.fileName} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-0 hidden items-center justify-center bg-[#e5007d]/70 group-hover:flex">
                      <Check className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <div className="truncate p-1.5 text-[10px] font-bold" title={m.fileName}>{m.fileName}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
