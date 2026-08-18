import { useState } from "react";
import { Upload, Loader2, Copy, Trash2, FolderInput } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import ImageSlots from "./ImageSlots";

interface Props {
  onGoToTab?: (tab: string) => void;
}

/**
 * Pestaña "Medios": arriba el gestor de espacios (dónde va cada imagen)
 * y abajo la biblioteca, que es el depósito de archivos en R2.
 */
export default function MediaLibrary({ onGoToTab }: Props) {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.media.list.useQuery();
  const upload = trpc.media.upload.useMutation();
  const deleteAsset = trpc.media.delete.useMutation();
  const importExisting = trpc.media.importExisting.useMutation({
    onSuccess: async (d) => {
      await utils.media.list.invalidate();
      toast.success(d.imported > 0
        ? `${d.imported} imagen(es) añadida(s) a la biblioteca`
        : "No había imágenes nuevas que importar");
    },
    onError: () => toast.error("No se pudo importar"),
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`"${file.name}" supera los 10 MB y no se subió.`);
          continue;
        }
        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
          r.onerror = () => reject(new Error("read"));
          r.readAsDataURL(file);
        });
        await upload.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
      }
      await utils.media.list.invalidate();
      toast.success("Archivos subidos");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: any) => {
    try {
      const usage = await utils.media.usage.fetch({ id: item.id });
      if (usage.keys.length > 0) {
        setError(`"${item.fileName}" está asignado en: ${usage.keys.join(", ")}. Quítalo de ahí antes de borrarlo.`);
        return;
      }
      if (!confirm(`¿Borrar "${item.fileName}" de forma permanente?`)) return;
      const out = await deleteAsset.mutateAsync({ id: item.id });
      if (out && out.storageDeleted === false) {
        setError("Se quitó de la biblioteca, pero el archivo no se pudo borrar de R2.");
      }
      await utils.media.list.invalidate();
      toast.success("Archivo eliminado");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo borrar");
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada");
    } catch {
      prompt("Copia esta URL:", url);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Medios</h1>
          <p className="mt-1 text-sm text-[#666]">Sube tus archivos y asígnalos al espacio que les toca.</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => importExisting.mutate()}
          disabled={importExisting.isPending}
          className="flex items-center gap-2 rounded-xl border border-[#ddd] bg-white px-4 py-3 text-sm font-bold text-[#555] transition-colors hover:border-[#111] hover:text-[#111] disabled:opacity-50"
        >
          {importExisting.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderInput className="h-4 w-4" />}
          Importar las que ya usa el sitio
        </button>
        <label className={`flex cursor-pointer items-center gap-2 rounded-xl bg-[#111] px-5 py-3 text-sm font-bold text-white ${uploading ? "opacity-60" : ""}`}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Subiendo..." : "Subir archivos"}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={e => { handleUpload(e.target.files); e.target.value = ""; }}
          />
        </label>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-[#e5007d]/40 bg-[#e5007d]/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e5007d]">No se pudo completar</p>
          <p className="mt-1 text-[13px] text-[#111]">{error}</p>
          <button onClick={() => setError("")} className="mt-2 text-[11px] font-bold text-[#666] underline">
            Entendido
          </button>
        </div>
      )}

      <ImageSlots onGoToTab={onGoToTab} />

      <h3 className="mb-3 text-lg font-extrabold uppercase tracking-tight">Biblioteca de archivos</h3>

      {isLoading ? (
        <p className="p-10 text-center text-sm text-[#888]">Cargando biblioteca...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-[#e8e8ea] bg-white p-10 text-center text-sm text-[#888]">
          Tu biblioteca está vacía. Si ya tienes imágenes montadas en el sitio, usa
          "Importar las que ya usa el sitio" para traerlas aquí sin volver a subirlas.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
          {items.map((m: any) => (
            <div key={m.id} className="flex flex-col overflow-hidden rounded-xl border border-[#e8e8ea] bg-white">
              {/* Miniatura cuadrada fija: todas las tarjetas quedan alineadas */}
              <div className="relative aspect-square w-full shrink-0 bg-[#f6f6f7]">
                <img
                  src={m.url}
                  alt={m.altText ?? m.fileName}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-1 p-2">
                <div className="truncate text-[10px] font-bold" title={m.fileName}>{m.fileName}</div>
                <div className="truncate text-[9px] text-[#888]">
                  {(m.sizeBytes / 1024 / 1024).toFixed(2)} MB
                </div>
                <div className="mt-0.5 flex gap-1">
                  <button
                    onClick={() => copyUrl(m.url)}
                    className="flex flex-1 items-center justify-center gap-1 rounded border border-[#e8e8ea] px-1 py-1 text-[8px] font-bold uppercase text-[#666] hover:border-[#111] hover:text-[#111]"
                  >
                    <Copy className="h-2.5 w-2.5" /> Copiar
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="flex flex-1 items-center justify-center gap-1 rounded border border-[#e5007d]/30 px-1 py-1 text-[8px] font-bold uppercase text-[#e5007d] hover:bg-[#e5007d]/10"
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Borrar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
