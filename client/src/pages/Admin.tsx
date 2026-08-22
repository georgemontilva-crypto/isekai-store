import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, TrendingUp, Users,
  Plus, Pencil, Trash2, Check, X, Upload, ChevronDown, Loader2,
  DollarSign, ArrowUpRight, Lock, CheckCircle2, Settings, Instagram, ExternalLink, Save,
  Facebook, Twitter, Youtube, Megaphone, XCircle, Search, HelpCircle,
  CreditCard, Eye, CheckCheck, Ban, MessageCircle, Link2, ChevronUp, Sparkles, Gift, Menu, BookOpen, Ticket, Copy, LogOut, Phone, Clock, Archive, ArchiveRestore, FolderOpen, Mail, MapPin, ChevronRight, Image as ImageIcon, RotateCcw,
} from "lucide-react";
import { OrderTimeline } from "@/components/OrderTimeline";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { getLoginUrl } from "@/const";

type AdminTab = "dashboard" | "products" | "categories" | "orders" | "payments" | "subscribers" | "media" | "settings" | "faq" | "linkbio" | "users" | "popups" | "cosplay" | "blog" | "giftcards";

// ─── Variant Manager ─────────────────────────────────────────────────────────
function VariantManager({ productId }: { productId: number }) {
  const utils = trpc.useUtils();
  const { data: productData } = trpc.products.byId.useQuery({ id: productId });
  const variants = productData?.variants ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const [vForm, setVForm] = useState({ name: "", price: "", stock: 0, sku: "", image: "" });
  const [vUploading, setVUploading] = useState(false);

  const uploadVariantImage = trpc.products.uploadImage.useMutation();

  const upsertVariant = trpc.products.upsertVariant.useMutation({
    onSuccess: () => { utils.products.byId.invalidate({ id: productId }); setShowForm(false); setEditingVariant(null); toast.success("Variante guardada"); },
  });
  const deleteVariant = trpc.products.deleteVariant.useMutation({
    onSuccess: () => { utils.products.byId.invalidate({ id: productId }); toast.success("Variante eliminada"); },
  });

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadVariantImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
      setVForm(f => ({ ...f, image: url }));
      toast.success("Imagen subida");
    } catch {
      toast.error("Error al subir imagen");
    } finally {
      setVUploading(false);
    }
  };

  const handleSave = () => {
    upsertVariant.mutate({
      id: editingVariant?.id,
      productId,
      name: vForm.name,
      price: vForm.price || undefined,
      stock: vForm.stock,
      sku: vForm.sku || undefined,
      image: vForm.image || undefined,
    });
  };

  const startEdit = (v: any) => {
    setEditingVariant(v);
    setVForm({ name: v.name, price: v.price ?? "", stock: v.stock, sku: v.sku ?? "", image: v.image ?? "" });
    setShowForm(true);
  };

  return (
    <div className="mt-4 border-t border-border/30 pt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">Variantes ({variants.length})</span>
        <Button size="sm" variant="ghost" className="text-xs text-primary" onClick={() => { setEditingVariant(null); setVForm({ name: "", price: "", stock: 0, sku: "", image: "" }); setShowForm(!showForm); }}>
          <Plus className="w-3 h-3 mr-1" />Agregar variante
        </Button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 p-4 rounded-xl bg-muted/50 border border-border/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nombre *</Label>
                <Input value={vForm.name} onChange={(e) => setVForm({ ...vForm, name: e.target.value })} className="mt-1 h-8 text-xs bg-muted border-border/50" placeholder="Ej: Talla M / Rojo" />
              </div>
              <div>
                <Label className="text-xs">Precio</Label>
                <Input type="number" step="0.01" value={vForm.price} onChange={(e) => setVForm({ ...vForm, price: e.target.value })} className="mt-1 h-8 text-xs bg-muted border-border/50" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs">Stock</Label>
                <Input type="number" value={vForm.stock} onChange={(e) => setVForm({ ...vForm, stock: parseInt(e.target.value) || 0 })} className="mt-1 h-8 text-xs bg-muted border-border/50" />
              </div>
            </div>

            {/* Image upload */}
            <div className="mt-3">
              <Label className="text-xs">Imagen de variante</Label>
              <div className="flex items-center gap-2 mt-1">
                {vForm.image && (
                  <img src={vForm.image} className="w-14 h-14 rounded-lg object-cover border border-border/40 shrink-0" />
                )}
                <label className="cursor-pointer">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors ${vUploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {vUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {vUploading ? "Subiendo..." : "Subir imagen"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleVariantImageUpload} disabled={vUploading} />
                </label>
                {vForm.image && (
                  <button onClick={() => setVForm(f => ({ ...f, image: "" }))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button size="sm" className="bg-primary text-primary-foreground text-xs h-7" onClick={handleSave} disabled={!vForm.name || upsertVariant.isPending}>
                <Check className="w-3 h-3 mr-1" />{editingVariant ? "Actualizar" : "Crear"}
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowForm(false); setEditingVariant(null); }}>
                <X className="w-3 h-3 mr-1" />Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {variants.length > 0 && (
        <div className="space-y-1.5">
          {variants.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 text-xs">
              <div className="flex items-center gap-2">
                {v.image && (
                  <img src={v.image} className="w-8 h-8 rounded-md object-cover border border-border/30 shrink-0" />
                )}
                <div>
                  <span className="font-medium">{v.name}</span>
                  {v.price && <span className="ml-2 text-primary">${parseFloat(v.price).toFixed(2)} USD</span>}
                  <span className="ml-2 text-muted-foreground">Stock: {v.stock}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(v)} className="p-1 hover:text-primary transition-colors"><Pencil className="w-3 h-3" /></button>
                <button onClick={() => { if (confirm("¿Eliminar variante?")) deleteVariant.mutate({ id: v.id }); }} className="p-1 hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  pending:       "Orden creada",
  preparing:     "En preparación",
  printing:      "En impresión 3D",
  post_printing: "Post impresión",
  packed:        "Empacada",
  shipped:       "Enviada",
  delivered:     "Entregada",
  cancelled:     "Cancelada",
};

const ORDER_STEPS = ["pending", "preparing", "printing", "post_printing", "packed", "shipped", "delivered"] as const;

// ─── Admin Order Detail ───────────────────────────────────────────────────────
function AdminOrderDetail({
  order,
  onSaved,
  onClose,
}: {
  order: any;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { data: detail } = trpc.orders.adminById.useQuery({ id: order.id });
  const [pendingStatus, setPendingStatus] = useState<string>(order.status);
  const [trackingNumber, setTrackingNumber] = useState<string>(order.trackingNumber ?? "");
  const [trackingCarrier, setTrackingCarrier] = useState<string>(order.trackingCarrier ?? "");
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { onSaved(); toast.success("Pedido actualizado"); },
  });
  const updatePaymentStatus = trpc.orders.updatePaymentStatus.useMutation({
    onSuccess: () => { onSaved(); toast.success("Pago actualizado"); },
  });

  const isShippedOrLater = ["shipped", "delivered"].includes(pendingStatus);

  return (
    <div className="border-t border-border/30 pt-4 mt-3 space-y-5">
      {/* Referral / gift badges */}
      {(order.hasSecretGift || order.referralCode) && (
        <div className="flex flex-wrap gap-2">
          {order.hasSecretGift && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
              <Gift className="w-4 h-4 flex-shrink-0" />
              <span><strong>Obsequio secreto</strong> — incluir en el paquete</span>
            </div>
          )}
          {order.referralCode && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border/30">
              Código de referido: <strong className="text-foreground">{order.referralCode}</strong>
            </p>
          )}
        </div>
      )}

      {/* Items */}
      {detail?.items && detail.items.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Productos</p>
          <div className="space-y-2">
            {detail.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                {item.imageUrl && <img src={item.imageUrl} className="w-9 h-9 rounded-lg object-cover bg-muted shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                </div>
                <span className="text-muted-foreground shrink-0">×{item.quantity}</span>
                <span className="font-semibold shrink-0">${(parseFloat(item.price) * item.quantity).toFixed(2)} USD</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive timeline */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estado del pedido</p>
        <OrderTimeline
          currentStatus={pendingStatus}
          interactive
          onStepClick={setPendingStatus}
        />
        {/* Cancelled option */}
        <button
          onClick={() => setPendingStatus("cancelled")}
          className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            pendingStatus === "cancelled"
              ? "bg-red-500 text-white border-red-500"
              : "border-border/50 text-muted-foreground hover:border-red-400 hover:text-red-500"
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancelar pedido
        </button>
      </div>

      {/* Tracking fields */}
      {isShippedOrLater && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium">Número de guía / tracking</Label>
            <Input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="Ej: 123456789"
              className="mt-1 text-sm bg-muted border-border/50"
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Transportadora</Label>
            <Input
              value={trackingCarrier}
              onChange={e => setTrackingCarrier(e.target.value)}
              placeholder="Ej: Envia, Servientrega, Coordinadora"
              className="mt-1 text-sm bg-muted border-border/50"
            />
          </div>
        </div>
      )}

      {/* Actualizar pago */}
      <div className="mt-4 pt-4 border-t border-[#f0f0f0]">
        <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-2">Actualizar pago</p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {([
            { value: 'pending', label: 'Pendiente' },
            { value: 'partial', label: 'Parcial' },
            { value: 'approved', label: 'Pagado' },
          ] as const).map(opt => (
            <button key={opt.value}
              onClick={() => updatePaymentStatus.mutate({ orderId: order.id, paymentStatus: opt.value })}
              disabled={updatePaymentStatus.isPending}
              className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                order.paymentStatus === opt.value
                  ? 'bg-[#111] text-white border-[#111]'
                  : 'bg-white text-[#666] border-[#e5e5e5]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="bg-primary text-primary-foreground"
          disabled={updateStatus.isPending}
          onClick={() => updateStatus.mutate({
            id: order.id,
            status: pendingStatus as any,
            trackingNumber: trackingNumber || undefined,
            trackingCarrier: trackingCarrier || undefined,
          })}
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {updateStatus.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          <X className="w-3.5 h-3.5 mr-1.5" /> Cerrar
        </Button>
      </div>
    </div>
  );
}

// ─── Product Form ─────────────────────────────────────────────────────────────
function ProductForm({
  product,
  categories,
  onSave,
  onCancel,
}: {
  product?: any;
  categories: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: product?.price ?? "",
    compareAtPrice: product?.compareAtPrice ?? "",
    categoryId: product?.categoryId ?? "",
    stock: product?.stock ?? 0,
    status: product?.status ?? "draft",
    featured: product?.featured ?? false,
    installmentsEnabled: product?.installmentsEnabled ?? false,
    initialPayment: product?.initialPayment ?? "",
  });
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(product?.images?.[0]?.url ?? "");
  const [previewUrl, setPreviewUrl] = useState<string>(product?.images?.[0]?.url ?? "");

  const uploadImage = trpc.products.uploadImage.useMutation();
  const addImage = trpc.products.addImage.useMutation();
  const deleteImageMutation = trpc.products.deleteImage.useMutation();
  const productImagesQuery = trpc.products.getImages.useQuery(
    { productId: product?.id ?? 0 },
    { enabled: !!product?.id }
  );
  const productImages = productImagesQuery.data ?? [];

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deleteImageMutation.mutateAsync({ imageId });
      await productImagesQuery.refetch();
      toast.success("Imagen eliminada");
    } catch {
      toast.error("Error al eliminar imagen");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url, key } = await uploadImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
      setImageUrl(url);
      if (product?.id) {
        await addImage.mutateAsync({ productId: product.id, url, fileKey: key });
        toast.success("Imagen subida");
      }
    } catch {
      toast.error("Error al subir imagen");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre *</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
            className="mt-1 bg-muted border-border/50"
            placeholder="Nombre del producto"
          />
        </div>
        <div>
          <Label>Slug *</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="mt-1 bg-muted border-border/50"
          />
        </div>
        <div>
          <Label>Precio *</Label>
          <Input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="mt-1 bg-muted border-border/50"
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Precio comparación</Label>
          <Input
            type="number"
            step="0.01"
            value={form.compareAtPrice}
            onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
            className="mt-1 bg-muted border-border/50"
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select
            value={form.categoryId ? String(form.categoryId) : "none"}
            onValueChange={(val) => setForm({ ...form, categoryId: val === "none" ? "" : parseInt(val) })}
          >
            <SelectTrigger className="mt-1 w-full bg-muted border-border/50">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Stock</Label>
          <Input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
            className="mt-1 bg-muted border-border/50"
          />
        </div>
        <div>
          <Label>Estado</Label>
          <Select
            value={form.status}
            onValueChange={(val) => setForm({ ...form, status: val as "draft" | "published" })}
          >
            <SelectTrigger className="mt-1 w-full bg-muted border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <Label htmlFor="featured">Destacado en homepage</Label>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <input
            type="checkbox"
            id="installmentsEnabled"
            checked={form.installmentsEnabled}
            onChange={(e) => setForm({ ...form, installmentsEnabled: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          <Label htmlFor="installmentsEnabled">Permitir pago en cuotas (CredIsekai · mínimo $150)</Label>
        </div>
        {form.installmentsEnabled && (
          <div className="mt-2">
            <Label>Cuota inicial ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.initialPayment}
              onChange={(e) => setForm({ ...form, initialPayment: e.target.value })}
              className="mt-1 bg-muted border-border/50 max-w-[160px]"
              placeholder="0.00"
            />
          </div>
        )}
      </div>

      <div>
        <Label>Descripción</Label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="mt-1 w-full bg-muted border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground resize-none"
          placeholder="Descripción del producto..."
        />
      </div>

      <div>
        <Label>Imagen del producto</Label>
        <div className="mt-2 flex items-start gap-4">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-border/50 shrink-0" />
          )}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/50 cursor-pointer hover:bg-muted/80 text-sm w-fit">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Subiendo..." : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
            {!product?.id && imageUrl && (
              <p className="text-xs text-amber-500">La imagen se asociará al guardar el producto.</p>
            )}
            {imageUrl && product?.id && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="w-3 h-3" /> Imagen subida
              </span>
            )}
          </div>
        </div>

        {product?.id && productImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {productImages.map((img: any) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.url}
                  alt={img.altText ?? ""}
                  className="w-20 h-20 object-cover rounded-lg border border-border/50"
                />
                {img.position === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                    Principal
                  </span>
                )}
                {productImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onSave({
            ...form,
            categoryId: form.categoryId ? Number(form.categoryId) : undefined,
            compareAtPrice: form.compareAtPrice || undefined,
            firstImageUrl: imageUrl || undefined,
            initialPayment: form.initialPayment || undefined,
          })}
        >
          <Check className="w-4 h-4 mr-2" />
          {product ? "Actualizar" : "Crear producto"}
        </Button>
        <Button variant="outline" className="border-border/50" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ─── Cosplay helpers ──────────────────────────────────────────────────────────
function getTierByFollowers(followers: number): string {
  if (followers >= 300000) return 'platino';
  if (followers >= 50000)  return 'diamante';
  if (followers >= 6000)   return 'oro';
  if (followers >= 3000)   return 'plata';
  return 'bronce';
}

const isExpired = (deadline: string | null) => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

// ─── Main Admin Component ─────────────────────────────────────────────────────

/** El panel admin se ve siempre en claro, aunque la tienda sea oscura.
    La clase va en <html> porque los diálogos se dibujan en un portal fuera
    del árbol del componente. */
function useAdminLightTheme() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("admin-light");
    return () => html.classList.remove("admin-light");
  }, []);
}

export default function Admin() {
  useAdminLightTheme();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const utils = trpc.useUtils();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const handleTabChange = (t: AdminTab) => setTab(t);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const [orderSearch, setOrderSearch] = useState('');

  /**
   * Abre el panel donde pide la URL. Lo usan las notificaciones de la
   * campanita: ?tab=orders&orden=ISK-1234 abre Pedidos y despliega ese pedido.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const destino = params.get("tab");
    if (destino) setTab(destino as AdminTab);
    const orden = params.get("orden");
    if (orden) setOrderSearch(orden);
    if (destino || orden) {
      // Se limpia la URL para que al recargar no vuelva a saltar ahí
      window.history.replaceState({}, "", "/admin");
    }
  }, []);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [manualForm, setManualForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', notes: '', items: [{ productName: '', quantity: 1, price: '' }], paymentStatus: 'pending' as 'pending' | 'partial' | 'approved', amountPaid: '', referralCode: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [igToken, setIgToken] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [bsRate, setBsRate] = useState("");
  const [igCtaText, setIgCtaText] = useState("");
  const [socialFb, setSocialFb] = useState("");
  const [socialTw, setSocialTw] = useState("");
  const [socialIg, setSocialIg] = useState("");
  const [socialYt, setSocialYt] = useState("");
  const [promoBarText, setPromoBarText] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "", imageUrl: "", featured: false });
  const [categoryUploading, setCategoryUploading] = useState(false);
  const [categoryPreviewUrl, setCategoryPreviewUrl] = useState<string>("");
  const [bannerDrafts, setBannerDrafts] = useState<Record<string, string>>({});
  const pendingProductImageRef = useRef<string | null>(null);

  // Payments state
  const [paymentsFilter, setPaymentsFilter] = useState<string>("all");
  const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null);

  // FAQ state
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "General", position: 0, active: true });
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [showFaqForm, setShowFaqForm] = useState(false);

  // Users state
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // LinkBio state
  const [linkBioForm, setLinkBioForm] = useState({ label: "", url: "" });
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [showLinkForm, setShowLinkForm] = useState(false);

  // Cosplay state
  const [cosplaySubTab, setCosplaySubTab] = useState<'applications'|'cosplayers'|'activities'|'evaluations'|'withdrawals'>('applications');
  const [cosplayAppFilter, setCosplayAppFilter] = useState('pending');
  const [cosplaySubFilter, setCosplaySubFilter] = useState('pending');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState<any>(null);
  const [approveForm, setApproveForm] = useState({ tier: 'bronce', totalFollowers: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ title: '', description: '', basePoints: 100, type: 'post' as const, deadline: '' });
  const [showEvalModal, setShowEvalModal] = useState<any>(null);
  const [evalForm, setEvalForm] = useState({ pointsAwarded: 0, status: 'approved' as 'approved' | 'rejected' });
  const [grantTicketsModal, setGrantTicketsModal] = useState<any>(null);
  const [grantForm, setGrantForm] = useState({ basePoints: 100, reason: '' });
  const [showTierModal, setShowTierModal] = useState<any>(null);
  const [tierForm, setTierForm] = useState({ tier: 'bronce', totalFollowers: 0 });

  // Popups state
  const emptyPopupForm = {
    name: "", active: false, title: "", subtitle: "", bodyText: "", buttonText: "", buttonUrl: "",
    image: "", showEmail: false, couponCode: "", triggerType: "time" as const,
    triggerDelay: 3, triggerPage: "", triggerProductId: "" as string | number,
    showOnce: true, position: "center" as const, audience: "all" as const, startDate: "", endDate: "",
  };
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [editingPopup, setEditingPopup] = useState<any | null>(null);
  const [popupForm, setPopupForm] = useState<typeof emptyPopupForm>(emptyPopupForm);
  const [popupImageUploading, setPopupImageUploading] = useState(false);

  // Blog state
  const [blogSubTab, setBlogSubTab] = useState<'posts' | 'categories' | 'comments'>('posts');
  const [showBlogPostModal, setShowBlogPostModal] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<any | null>(null);
  const [blogModalTab, setBlogModalTab] = useState<'content' | 'seo'>('content');
  const [blogTagInput, setBlogTagInput] = useState('');
  const [blogImageUploading, setBlogImageUploading] = useState(false);
  const emptyBlogForm = { title: '', slug: '', excerpt: '', content: '', coverImage: '', category: '', tags: [] as string[], status: 'draft' as 'draft' | 'published', authorName: 'Isekai World', metaTitle: '', metaDescription: '', metaKeywords: '' };
  const [blogPostForm, setBlogPostForm] = useState(emptyBlogForm);
  const [blogCategoryForm, setBlogCategoryForm] = useState({ name: '', description: '' });

  // Gift Cards state
  const [showNewGiftCard, setShowNewGiftCard] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const emptyGiftCardForm = { amount: '', discountType: 'fixed' as 'fixed' | 'percent', discountPercent: '', maxUses: 1, minOrderAmount: '', expiresAt: '', onlyNewUsers: false, oncePerUser: false, notes: '', quantity: 1 };
  const [giftCardForm, setGiftCardForm] = useState(emptyGiftCardForm);

  // Queries
  const { data: metrics } = trpc.admin.metrics.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  // La tienda opera en dólares: los totales ya vienen en USD, no se convierten.
  const revenueUSD = metrics?.totalRevenue ?? 0;
  const { data: productsData, refetch: refetchProducts } = trpc.products.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: categories, refetch: refetchCategories } = trpc.categories.list.useQuery();
  const [ordersView, setOrdersView] = useState<"active" | "archived">("active");
  // Guardamos las categorías ABIERTAS: así arrancan todas cerradas
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const { data: ordersData, refetch: refetchOrders } = trpc.orders.adminList.useQuery(
    { archived: ordersView === "archived" },
    { enabled: isAuthenticated && user?.role === "admin" },
  );

  const setOrderArchived = trpc.orders.setArchived.useMutation({
    onSuccess: (_d, vars) => {
      refetchOrders();
      toast.success(vars.archived ? "Pedido archivado" : "Pedido restaurado");
    },
    onError: () => toast.error("No se pudo cambiar el archivado"),
  });

  const [subsFilter, setSubsFilter] = useState<"all" | "worldfest" | "newsletter">("all");
  const { data: subscribers = [], refetch: refetchSubscribers } = trpc.subscribers.list.useQuery(
    subsFilter === "all" ? {} : { source: subsFilter },
    { enabled: isAuthenticated && user?.role === "admin" },
  );
  const deleteSubscriber = trpc.subscribers.delete.useMutation({
    onSuccess: () => { refetchSubscribers(); toast.success("Correo eliminado"); },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const { data: myCosplayer, refetch: refetchMyCosplayer } = trpc.cosplay.myCosplayerVisibility.useQuery(
    undefined, { enabled: isAuthenticated && user?.role === "admin" },
  );
  const setMyVisibility = trpc.cosplay.setMyCosplayerVisibility.useMutation({
    onSuccess: (d) => {
      refetchMyCosplayer();
      utils.cosplay.getApprovedCosplayers?.invalidate?.();
      toast.success(d.visible ? "Tu perfil ya se ve en el directorio" : "Tu perfil quedó oculto del directorio");
    },
    onError: () => toast.error("No se pudo cambiar la visibilidad"),
  });

  const resetRevenue = trpc.revenue.reset.useMutation({
    onSuccess: () => { utils.admin.metrics.invalidate(); toast.success("Contador reiniciado"); },
    onError: () => toast.error("No se pudo reiniciar"),
  });
  const undoResetRevenue = trpc.revenue.undoReset.useMutation({
    onSuccess: () => { utils.admin.metrics.invalidate(); toast.success("Contador restaurado"); },
    onError: () => toast.error("No se pudo restaurar"),
  });

  const archiveOldOrders = trpc.orders.archiveOld.useMutation({
    onSuccess: (d) => {
      refetchOrders();
      toast.success(d.count > 0 ? `${d.count} pedido(s) archivado(s)` : "No había pedidos para archivar");
    },
    onError: () => toast.error("No se pudieron archivar los pedidos"),
  });

  const products = productsData?.items ?? [];
  const filteredProducts = products.filter(p => {
    const q = productSearch.toLowerCase();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      (p as any).categoryName?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q)
    );
  });
  const orders = ordersData?.items ?? [];

  // Mutations
  const addProductImage = trpc.products.addImage.useMutation();
  const uploadProductImage = trpc.products.uploadImage.useMutation();

  const createProduct = trpc.products.create.useMutation({
    onSuccess: async (newProduct) => {
      if (pendingProductImageRef.current && newProduct?.id) {
        await addProductImage.mutateAsync({ productId: newProduct.id, url: pendingProductImageRef.current });
        pendingProductImageRef.current = null;
      }
      refetchProducts(); setShowProductForm(false); toast.success("Producto creado");
    }
  });
  const updateProduct = trpc.products.update.useMutation({ onSuccess: () => { refetchProducts(); setEditingProduct(null); toast.success("Producto actualizado"); } });
  const updateProductPaymentSettings = trpc.products.updatePaymentSettings.useMutation();
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: () => { refetchProducts(); toast.success("Producto eliminado"); } });
  const createCategory = trpc.categories.create.useMutation({ onSuccess: () => { refetchCategories(); setEditingCategory(null); setCategoryForm({ name: "", slug: "", description: "", imageUrl: "", featured: false }); toast.success("Categoría creada"); } });
  const updateCategory = trpc.categories.update.useMutation({ onSuccess: () => { refetchCategories(); setEditingCategory(null); toast.success("Categoría actualizada"); } });
  const deleteCategory = trpc.categories.delete.useMutation({ onSuccess: () => { refetchCategories(); toast.success("Categoría eliminada"); } });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => { refetchOrders(); toast.success("Estado actualizado"); } });
  const findUserQuery = trpc.users.findByEmail.useQuery(
    { email: manualForm.customerEmail },
    { enabled: manualForm.customerEmail.includes('@') && manualForm.customerEmail.includes('.') },
  );
  const userSuggestions = trpc.users.searchByEmail.useQuery(
    { query: emailSearch },
    { enabled: emailSearch.length >= 2 },
  );
  const createManualOrder = trpc.orders.createManual.useMutation({
    onSuccess: (data) => {
      setShowManualOrder(false);
      setShowConfirm(false);
      setManualForm({ customerName: '', customerEmail: '', customerPhone: '', notes: '', items: [{ productName: '', quantity: 1, price: '' }], paymentStatus: 'pending', amountPaid: '' });
      toast.success(`Pedido ${data.orderNumber} creado exitosamente`);
      refetchOrders();
    },
    onError: (err) => {
      toast.error(`Error al crear pedido: ${err.message}`);
    },
  });
  const { data: siteSettings, refetch: refetchSettings } = trpc.settings.getAdmin.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => { refetchSettings(); toast.success("Configuración guardada"); } });

  // Payments queries + mutations
  const { data: paymentsData, refetch: refetchPayments } = trpc.orders.adminPayments.useQuery(
    { paymentStatus: paymentsFilter === "all" ? undefined : paymentsFilter },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const verifyPayment = trpc.orders.verifyPayment.useMutation({ onSuccess: () => { refetchPayments(); toast.success("Pago verificado"); } });

  // FAQ queries + mutations
  const { data: faqItems = [], refetch: refetchFaq } = trpc.faq.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const createFaq = trpc.faq.create.useMutation({ onSuccess: () => { refetchFaq(); setShowFaqForm(false); setFaqForm({ question: "", answer: "", category: "General", position: 0, active: true }); toast.success("Pregunta creada"); } });
  const updateFaq = trpc.faq.update.useMutation({ onSuccess: () => { refetchFaq(); setShowFaqForm(false); setEditingFaqId(null); setFaqForm({ question: "", answer: "", category: "General", position: 0, active: true }); toast.success("Pregunta actualizada"); } });
  const deleteFaq = trpc.faq.delete.useMutation({ onSuccess: () => { refetchFaq(); toast.success("Pregunta eliminada"); } });

  const { data: pendingCount = 0 } = trpc.orders.pendingCount.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin", refetchInterval: 30000 });
  const { data: pendingPaymentsCount = 0 } = trpc.orders.pendingPaymentsCount.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin", refetchInterval: 30000 });
  const { data: pendingCosplayApps } = trpc.cosplay.getApplications.useQuery({ status: 'pending' }, { enabled: isAuthenticated && user?.role === "admin", refetchInterval: 30000 });
  const pendingCosplayCount = pendingCosplayApps?.length ?? 0;

  // LinkBio queries + mutations
  const { data: linkBioItems = [], refetch: refetchLinkBio } = trpc.linkBio.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const createLink = trpc.linkBio.create.useMutation({ onSuccess: () => { refetchLinkBio(); setShowLinkForm(false); setLinkBioForm({ label: "", url: "" }); toast.success("Link creado"); } });
  const updateLink = trpc.linkBio.update.useMutation({ onSuccess: () => { refetchLinkBio(); setShowLinkForm(false); setEditingLinkId(null); setLinkBioForm({ label: "", url: "" }); toast.success("Link actualizado"); } });
  const deleteLink = trpc.linkBio.delete.useMutation({ onSuccess: () => { refetchLinkBio(); toast.success("Link eliminado"); } });
  const reorderLinks = trpc.linkBio.reorder.useMutation({ onSuccess: () => refetchLinkBio() });

  // Users queries + mutations
  const usersQuery = trpc.users.list.useQuery(
    { search: userSearch, role: userRoleFilter as 'user' | 'admin' | 'all' },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const filteredUsers = usersQuery.data ?? [];

  const updateUserRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { usersQuery.refetch(); toast.success("Rol actualizado"); },
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => { usersQuery.refetch(); toast.success("Usuario eliminado"); },
  });

  // Popups queries + mutations
  const { data: popupItems = [], refetch: refetchPopups } = trpc.popups.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const createPopupMutation = trpc.popups.create.useMutation({ onSuccess: () => { refetchPopups(); setShowPopupModal(false); toast.success("Popup creado"); } });
  const updatePopupMutation = trpc.popups.update.useMutation({ onSuccess: () => { refetchPopups(); setShowPopupModal(false); setEditingPopup(null); toast.success("Popup actualizado"); } });
  const deletePopupMutation = trpc.popups.delete.useMutation({ onSuccess: () => { refetchPopups(); toast.success("Popup eliminado"); } });
  const togglePopupActive = trpc.popups.toggleActive.useMutation({ onSuccess: () => refetchPopups() });

  // Cosplay queries + mutations
  const { data: cosplayApps = [], refetch: refetchApps } = trpc.cosplay.getApplications.useQuery(
    { status: cosplayAppFilter === 'all' ? undefined : cosplayAppFilter },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: cosplayersData = [], refetch: refetchCosplayers } = trpc.cosplay.getAllCosplayers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: cosplayActivities = [], refetch: refetchActivities } = trpc.cosplay.getAllActivities.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: cosplaySubs = [], refetch: refetchSubs } = trpc.cosplay.getAllSubmissions.useQuery(
    { status: cosplaySubFilter === 'all' ? undefined : cosplaySubFilter },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const approveApp = trpc.cosplay.approveApplication.useMutation({ onSuccess: () => { refetchApps(); setShowApproveModal(null); toast.success("Cosplayer aprobado"); } });
  const rejectApp = trpc.cosplay.rejectApplication.useMutation({ onSuccess: () => { refetchApps(); setShowRejectModal(null); toast.success("Solicitud rechazada"); } });
  const updateTier = trpc.cosplay.updateCosplayerTier.useMutation({ onSuccess: () => { refetchCosplayers(); setShowTierModal(null); toast.success("Tier actualizado"); } });
  const suspendCp = trpc.cosplay.suspendCosplayer.useMutation({ onSuccess: () => { refetchCosplayers(); toast.success("Cosplayer suspendido"); } });
  const deleteCosplayerMut = trpc.cosplay.deleteCosplayer.useMutation({ onSuccess: () => { refetchCosplayers(); toast.success("Cosplayer eliminado"); } });
  const createActivity = trpc.cosplay.createActivity.useMutation({ onSuccess: () => { refetchActivities(); setShowActivityModal(false); toast.success("Actividad creada"); } });
  const toggleActivity = trpc.cosplay.toggleActivity.useMutation({ onSuccess: () => refetchActivities() });
  const evaluateSub = trpc.cosplay.evaluateSubmission.useMutation({ onSuccess: () => { refetchSubs(); setShowEvalModal(null); toast.success("Evaluación guardada"); } });
  const GRANT_MULTIPLIERS: Record<string, number> = { bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5 };
  const grantTicketsMut = trpc.cosplay.grantTickets.useMutation({
    onSuccess: (data) => { toast.success(`${data.finalPoints} tickets otorgados`); setGrantTicketsModal(null); refetchCosplayers(); },
  });
  const { data: withdrawalsData = [], refetch: refetchWithdrawals } = trpc.cosplay.getWithdrawals.useQuery(
    { status: undefined },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const processWithdrawalMut = trpc.cosplay.processWithdrawal.useMutation({
    onSuccess: () => { refetchWithdrawals(); toast.success("Retiro procesado"); },
    onError: (e) => toast.error(e.message),
  });

  // Blog queries & mutations
  const { data: blogPostsList = [], refetch: refetchBlogPosts } = trpc.blog.getAllPosts.useQuery({ status: undefined }, { enabled: isAuthenticated && user?.role === 'admin' });
  const { data: blogCategoriesList = [], refetch: refetchBlogCategories } = trpc.blog.getCategories.useQuery();
  const { data: blogCommentsList = [], refetch: refetchBlogComments } = trpc.blog.getAllComments.useQuery({ status: undefined }, { enabled: isAuthenticated && user?.role === 'admin' });
  const createBlogPostMut = trpc.blog.createPost.useMutation({ onSuccess: () => { refetchBlogPosts(); setShowBlogPostModal(false); setBlogPostForm(emptyBlogForm); toast.success('Artículo creado'); } });
  const updateBlogPostMut = trpc.blog.updatePost.useMutation({ onSuccess: () => { refetchBlogPosts(); setShowBlogPostModal(false); setEditingBlogPost(null); toast.success('Artículo actualizado'); } });
  const deleteBlogPostMut = trpc.blog.deletePost.useMutation({ onSuccess: () => { refetchBlogPosts(); toast.success('Artículo eliminado'); } });
  const createBlogCategoryMut = trpc.blog.createCategory.useMutation({ onSuccess: () => { refetchBlogCategories(); setBlogCategoryForm({ name: '', description: '' }); toast.success('Categoría creada'); } });
  const deleteBlogCategoryMut = trpc.blog.deleteCategory.useMutation({ onSuccess: () => { refetchBlogCategories(); toast.success('Categoría eliminada'); } });
  const updateBlogCommentMut = trpc.blog.updateCommentStatus.useMutation({ onSuccess: () => refetchBlogComments() });
  const deleteBlogCommentMut = trpc.blog.deleteComment.useMutation({ onSuccess: () => { refetchBlogComments(); toast.success('Comentario eliminado'); } });

  // Gift Cards queries + mutations
  const { data: giftCardsList = [], refetch: refetchGiftCards } = trpc.giftCards.list.useQuery(undefined, { enabled: isAuthenticated && user?.role === 'admin' });
  const createGiftCardMutation = trpc.giftCards.create.useMutation({
    onSuccess: (data) => { refetchGiftCards(); setGeneratedCodes(data.codes); },
    onError: (e) => toast.error(e.message),
  });
  const deleteGiftCardMut = trpc.giftCards.delete.useMutation({ onSuccess: () => { refetchGiftCards(); toast.success('Tarjeta eliminada'); }, onError: (e) => toast.error(e.message) });
  const [selectedGiftCards, setSelectedGiftCards] = useState<number[]>([]);
  const deleteGiftCardsMut = trpc.giftCards.deleteMany.useMutation({
    onSuccess: (d) => { refetchGiftCards(); setSelectedGiftCards([]); toast.success(`${d.deleted} tarjeta(s) eliminada(s)`); },
    onError: (e) => toast.error(e.message),
  });

  const moveLinkUp = (i: number) => {
    if (i === 0) return;
    const ids = linkBioItems.map(it => it.id);
    [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
    reorderLinks.mutate({ ids });
  };
  const moveLinkDown = (i: number) => {
    if (i === linkBioItems.length - 1) return;
    const ids = linkBioItems.map(it => it.id);
    [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
    reorderLinks.mutate({ ids });
  };
  const handleLinkSubmit = () => {
    if (!linkBioForm.label.trim() || !linkBioForm.url.trim()) { toast.error("Label y URL son requeridos"); return; }
    if (editingLinkId !== null) {
      updateLink.mutate({ id: editingLinkId, ...linkBioForm });
    } else {
      createLink.mutate({ ...linkBioForm, position: linkBioItems.length });
    }
  };

  const handleFaqSubmit = () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) { toast.error("Pregunta y respuesta son requeridas"); return; }
    if (editingFaqId !== null) {
      updateFaq.mutate({ id: editingFaqId, ...faqForm });
    } else {
      createFaq.mutate(faqForm);
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCategoryPreviewUrl(URL.createObjectURL(file));
    setCategoryUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
      setCategoryForm(f => ({ ...f, imageUrl: url }));
      toast.success("Imagen subida");
    } catch {
      toast.error("Error al subir imagen");
      setCategoryPreviewUrl("");
    } finally {
      setCategoryUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen pt-24 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4 opacity-50">
            <Lock className="w-14 h-14" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold mb-3">Acceso restringido</h2>
          <p className="text-muted-foreground mb-6">Necesitas permisos de administrador</p>
          {!isAuthenticated && (
            <Button className="bg-primary text-primary-foreground" onClick={() => (window.location.href = getLoginUrl())}>
              Iniciar sesión
            </Button>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as AdminTab, label: "Dashboard", icon: LayoutDashboard },
    { id: "products" as AdminTab, label: "Productos", icon: Package },
    { id: "categories" as AdminTab, label: "Categorías", icon: Tag },
    { id: "orders" as AdminTab, label: "Pedidos", icon: ShoppingBag },
    { id: "payments" as AdminTab, label: "Pagos", icon: CreditCard },
    { id: "subscribers" as AdminTab, label: "Suscriptores", icon: Mail },
    { id: "media" as AdminTab,    label: "Medios",        icon: ImageIcon },
    { id: "settings" as AdminTab, label: "Configuración", icon: Settings },
    { id: "faq" as AdminTab,      label: "FAQ",           icon: HelpCircle },
    { id: "linkbio" as AdminTab,  label: "LinkBio",       icon: Link2 },
    { id: "users" as AdminTab,    label: "Usuarios",      icon: Users },
    { id: "popups" as AdminTab,   label: "Popups",        icon: Megaphone },
    { id: "cosplay" as AdminTab,  label: "Cosplay Guild", icon: Sparkles },
    { id: "blog" as AdminTab,      label: "Blog",               icon: BookOpen },
    { id: "giftcards" as AdminTab, label: "Tarjetas de regalo", icon: Gift },
  ];

  const activeTab = tabs.find(t => t.id === tab);
  const badgeFor = (id: AdminTab) =>
    id === "orders" ? pendingCount
    : id === "payments" ? pendingPaymentsCount
    : id === "cosplay" ? pendingCosplayCount
    : 0;

  return (
    /* App shell: alto fijo, solo scrollea el contenido de la derecha */
    <div className="admin-shell h-[100dvh] overflow-hidden bg-[#f6f6f7] flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 z-40 h-[100dvh] w-60 shrink-0 bg-white border-r border-[#e8e8ea] flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="shrink-0 h-16 px-5 border-b border-[#e8e8ea] flex items-center justify-between">
          <div className="text-base font-black tracking-tight text-[#0f0f0f]">
            ISEKAI <span className="text-[11px] font-bold uppercase tracking-widest text-[#e5007d]">Admin</span>
          </div>
          <button
            className="lg:hidden w-8 h-8 rounded-full border border-[#e8e8ea] flex items-center justify-center"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {tabs.map((t) => {
            const badge = badgeFor(t.id);
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { handleTabChange(t.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[#0f0f0f] text-white"
                    : "text-[#4a4a4a] hover:bg-[#f6f6f7] hover:text-[#0f0f0f]"
                }`}
              >
                <t.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1 text-left truncate">{t.label}</span>
                {badge > 0 && (
                  <span className={`shrink-0 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                    isActive ? "bg-white text-[#0f0f0f]" : "bg-[#e5007d] text-white"
                  }`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-[#e8e8ea]">
          <div className="text-xs font-bold text-[#4a4a4a] mb-3 truncate">{user?.email}</div>
          <Link
            href="/"
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#4a4a4a] hover:text-[#0f0f0f] mb-2.5"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} /> Ver sitio
          </Link>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#e5007d] hover:text-[#c4006b]"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Fondo oscuro del menú en móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Barra superior con el nombre de la sección */}
        <header className="shrink-0 z-20 bg-white border-b border-[#e8e8ea] px-5 lg:px-8 h-16 flex items-center gap-4">
          <button
            className="lg:hidden w-9 h-9 rounded-full border border-[#e8e8ea] flex items-center justify-center shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-extrabold uppercase tracking-tight text-[#0f0f0f] truncate">
            {activeTab?.label ?? "Admin"}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain bg-[#f6f6f7] text-[#111] px-5 lg:px-8 py-6 min-w-0">
          <AnimatePresence mode="wait">
            {/* ─── Dashboard ──────────────────────────────────────────────────── */}
            {tab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 w-full mb-6 md:grid-cols-4">
                  {[
                    { label: "Ingresos totales", value: `$${revenueUSD.toFixed(2)} USD`, icon: DollarSign, color: "text-green-400" },
                    { label: "Total pedidos", value: metrics?.totalOrders ?? 0, icon: ShoppingBag, color: "text-primary" },
                    { label: "Productos", value: products.length, icon: Package, color: "text-accent" },
                    { label: "Categorías", value: categories?.length ?? 0, icon: Tag, color: "text-yellow-400" },
                  ].map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-5 rounded-2xl bg-white border border-[#e5e5e5] min-w-0 overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">{m.label}</span>
                        <m.icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Contador de ganancias: se puede reiniciar sin borrar pedidos */}
                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e5e5e5] bg-white px-4 py-3">
                  <span className="text-xs text-[#888]">
                    {(metrics as any)?.revenueResetAt
                      ? <>Contando desde el <strong className="text-[#111]">{new Date((metrics as any).revenueResetAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}</strong></>
                      : "Contando desde el primer pedido"}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {(metrics as any)?.revenueResetAt && (
                      <button
                        onClick={() => undoResetRevenue.mutate()}
                        disabled={undoResetRevenue.isPending}
                        className="rounded-full border border-[#e5e5e5] px-3.5 py-1.5 text-xs font-bold text-[#666] transition-colors hover:border-[#111] hover:text-[#111] disabled:opacity-50"
                      >
                        Contar todo de nuevo
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("¿Reiniciar el contador de ganancias? Los pedidos NO se borran: el dashboard empieza a contar desde ahora.")) {
                          resetRevenue.mutate();
                        }
                      }}
                      disabled={resetRevenue.isPending}
                      className="flex items-center gap-1.5 rounded-full border border-[#e5e5e5] px-3.5 py-1.5 text-xs font-bold text-[#666] transition-colors hover:border-[#e5007d] hover:text-[#e5007d] disabled:opacity-50"
                    >
                      {resetRevenue.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Reiniciar contador
                    </button>
                  </div>
                </div>

                {/* Recent orders */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                  <div className="p-4 rounded-2xl bg-card border border-border/50 w-full">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Pedidos recientes
                    </h3>
                    <div className="space-y-3">
                      {(metrics?.recentOrders ?? []).map((order: any) => (
                        <div key={order.id} className="flex items-start justify-between gap-2 text-sm w-full min-w-0">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{order.orderNumber}</p>
                            <p className="text-muted-foreground text-xs truncate">{order.customerName}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-primary font-semibold text-xs">${parseFloat(order.total).toFixed(2)} USD</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full status-${order.status}`}>
                              {statusLabels[order.status]}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(metrics?.recentOrders ?? []).length === 0 && (
                        <p className="text-muted-foreground text-sm">No hay pedidos aún</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/50 w-full">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-accent" />
                      Productos más vendidos
                    </h3>
                    <div className="space-y-3">
                      {(metrics?.topProducts ?? []).map((p: any, i: number) => (
                        <div key={p.productId} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.productName}</p>
                            <p className="text-muted-foreground text-xs">{p.totalSold} vendidos</p>
                          </div>
                          <p className="text-primary font-semibold">${parseFloat(p.revenue).toFixed(2)} USD</p>
                        </div>
                      ))}
                      {(metrics?.topProducts ?? []).length === 0 && (
                        <p className="text-muted-foreground text-sm">Sin datos de ventas aún</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Products ───────────────────────────────────────────────────── */}
            {tab === "products" && (
              <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold">Productos</h1>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => { setShowProductForm(true); setEditingProduct(null); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo producto
                  </Button>
                </div>

                {/* New product form */}
                <AnimatePresence>
                  {showProductForm && !editingProduct && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-6 rounded-2xl bg-card border border-primary/30"
                    >
                      <h3 className="font-semibold mb-4">Nuevo producto</h3>
                      <ProductForm
                        categories={categories ?? []}
                        onSave={(data) => {
                          const { firstImageUrl, ...productData } = data;
                          if (firstImageUrl) pendingProductImageRef.current = firstImageUrl;
                          createProduct.mutate(productData);
                        }}
                        onCancel={() => setShowProductForm(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o categoría..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg outline-none focus:border-[#111] transition-colors"
                  />
                </div>

                {(() => {
                  // Agrupar por categoría, respetando el orden de la lista de categorías
                  const groups = new Map<string, typeof filteredProducts>();
                  for (const cat of (categories ?? [])) groups.set(cat.name, []);
                  for (const prod of filteredProducts) {
                    const key = prod.category?.name ?? "Sin categoría";
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(prod);
                  }
                  // Solo mostramos categorías con productos
                  const visible = Array.from(groups.entries()).filter(([, list]) => list.length > 0);

                  return (
                <div className="space-y-3">
                  {filteredProducts.length === 0 && productSearch && (
                    <p className="text-center text-[#999] text-sm py-8">
                      No se encontraron productos para "{productSearch}"
                    </p>
                  )}

                  {visible.map(([groupName, groupProducts]) => {
                    // Al buscar, todo abierto; si no, se respeta lo que el usuario haya plegado
                    const isOpen = productSearch
                      ? true
                      : openCategories.includes(groupName);
                    return (
                    <div key={groupName} className="rounded-2xl border border-[#e5e5e5] bg-white overflow-hidden">
                      <button
                        onClick={() => setOpenCategories(prev =>
                          prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
                        )}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors text-left"
                      >
                        <FolderOpen className="w-4 h-4 text-[#999] shrink-0" />
                        <span className="font-bold text-sm text-[#111] flex-1 truncate">{groupName}</span>
                        <span className="text-xs font-semibold text-[#999] shrink-0">{groupProducts.length}</span>
                        <ChevronDown className={`w-4 h-4 text-[#999] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="p-3 pt-0 space-y-3 border-t border-[#f0f0f0]">
                  {groupProducts.map((product: typeof filteredProducts[number]) => (
                    <div key={product.id}>
                      <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors">
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {(product as any).images?.[0]?.url && (
                              <img
                                src={(product as any).images[0].url}
                                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border/30"
                                alt=""
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <p className="font-medium truncate">{product.name}</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${product.status === "published" ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                                  {product.status === "published" ? "Publicado" : "Borrador"}
                                </span>
                                {product.featured && <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary shrink-0">Destacado</span>}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                ${parseFloat(product.price).toFixed(2)} USD · Stock: {product.stock} · {product.category?.name ?? "Sin categoría"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground h-9 w-9 p-0"
                              onClick={() => { setEditingProduct(product); setShowProductForm(false); }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive h-9 w-9 p-0"
                              onClick={() => { if (confirm("¿Eliminar producto?")) deleteProduct.mutate({ id: product.id }); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Edit form */}
                      <AnimatePresence>
                        {editingProduct?.id === product.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 p-6 rounded-2xl bg-card border border-primary/30"
                          >
                            <h3 className="font-semibold mb-4">Editar producto</h3>
                            <ProductForm
                              product={editingProduct}
                              categories={categories ?? []}
                              onSave={(data) => {
                                const { firstImageUrl, installmentsEnabled, initialPayment, ...productData } = data;
                                updateProduct.mutate({ id: product.id, ...productData });
                                updateProductPaymentSettings.mutate({
                                  id: product.id,
                                  installmentsEnabled: installmentsEnabled ?? false,
                                  initialPayment: initialPayment || undefined,
                                });
                              }}
                              onCancel={() => setEditingProduct(null)}
                            />
                            <VariantManager productId={product.id} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                        </div>
                      )}
                    </div>
                    );
                  })}

                  {products.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay productos aún</p>
                    </div>
                  )}
                </div>
                  );
                })()}
              </motion.div>
            )}

            {/* ─── Categories ─────────────────────────────────────────────────── */}
            {tab === "categories" && (
              <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold">Categorías</h1>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => { setEditingCategory("new"); setCategoryForm({ name: "", slug: "", description: "", imageUrl: "" }); setCategoryPreviewUrl(""); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva categoría
                  </Button>
                </div>

                <AnimatePresence>
                  {editingCategory === "new" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-6 rounded-2xl bg-card border border-primary/30"
                    >
                      <h3 className="font-semibold mb-4">Nueva categoría</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Nombre *</Label>
                          <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} className="mt-1 bg-muted border-border/50" />
                        </div>
                        <div>
                          <Label>Slug *</Label>
                          <Input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} className="mt-1 bg-muted border-border/50" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Descripción</Label>
                          <Input value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} className="mt-1 bg-muted border-border/50" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label>Imagen de la categoría</Label>
                        <div className="mt-2 flex items-start gap-4">
                          {categoryPreviewUrl && (
                            <img src={categoryPreviewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-border/50 shrink-0" />
                          )}
                          <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/50 cursor-pointer hover:bg-muted/80 text-sm w-fit">
                            {categoryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {categoryUploading ? "Subiendo..." : "Subir imagen"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageUpload} disabled={categoryUploading} />
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="checkbox"
                          id="cat-featured-new"
                          checked={categoryForm.featured}
                          onChange={(e) => setCategoryForm({ ...categoryForm, featured: e.target.checked })}
                          className="w-4 h-4 accent-primary"
                        />
                        <Label htmlFor="cat-featured-new">Destacar en menú principal</Label>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button className="bg-primary text-primary-foreground" onClick={() => createCategory.mutate(categoryForm)}>
                          <Check className="w-4 h-4 mr-2" />Crear
                        </Button>
                        <Button variant="outline" className="border-border/50" onClick={() => setEditingCategory(null)}>
                          <X className="w-4 h-4 mr-2" />Cancelar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {(categories ?? []).map((cat) => (
                    <div key={cat.id}>
                      <div className="p-4 rounded-2xl bg-card border border-border/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-sm text-muted-foreground">/categorias/{cat.slug}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => { setEditingCategory(cat.id); setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "", imageUrl: cat.imageUrl ?? "", featured: cat.featured ?? false }); setCategoryPreviewUrl(cat.imageUrl ?? ""); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => { if (confirm("¿Eliminar categoría?")) deleteCategory.mutate({ id: cat.id }); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {editingCategory === cat.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 p-6 rounded-2xl bg-card border border-primary/30">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <Label>Nombre</Label>
                                <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="mt-1 bg-muted border-border/50" />
                              </div>
                              <div>
                                <Label>Slug</Label>
                                <Input value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} className="mt-1 bg-muted border-border/50" />
                              </div>
                            </div>
                            <div className="mt-4">
                              <Label>Imagen de la categoría</Label>
                              <div className="mt-2 flex items-start gap-4">
                                {categoryPreviewUrl && (
                                  <img src={categoryPreviewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-border/50 shrink-0" />
                                )}
                                <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/50 cursor-pointer hover:bg-muted/80 text-sm w-fit">
                                  {categoryUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                  {categoryUploading ? "Subiendo..." : "Cambiar imagen"}
                                  <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageUpload} disabled={categoryUploading} />
                                </label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              <input
                                type="checkbox"
                                id={`cat-featured-${cat.id}`}
                                checked={categoryForm.featured}
                                onChange={(e) => setCategoryForm({ ...categoryForm, featured: e.target.checked })}
                                className="w-4 h-4 accent-primary"
                              />
                              <Label htmlFor={`cat-featured-${cat.id}`}>Destacar en menú principal</Label>
                            </div>
                            <div className="flex gap-3 mt-4">
                              <Button className="bg-primary text-primary-foreground" onClick={() => updateCategory.mutate({ id: cat.id, ...categoryForm })}>
                                <Check className="w-4 h-4 mr-2" />Guardar
                              </Button>
                              <Button variant="outline" className="border-border/50" onClick={() => setEditingCategory(null)}>
                                <X className="w-4 h-4 mr-2" />Cancelar
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                  {(categories ?? []).length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay categorías aún</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Orders ─────────────────────────────────────────────────────── */}
            {tab === "orders" && (
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold">Pedidos</h1>
                  <button onClick={() => setShowManualOrder(true)} className="flex items-center gap-2 bg-[#111] text-white px-5 py-3.5 rounded-xl text-sm font-bold">
                    <Plus size={16} /> Crear pedido
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo o número de orden..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg outline-none focus:border-[#111] transition-colors"
                  />
                </div>

                {/* Activos vs archivados */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {([["active", "En producción"], ["archived", "Archivados"]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => { setOrdersView(id); setExpandedOrderId(null); }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        ordersView === id ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#666] hover:bg-[#e5e5e5]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {ordersView === "active" && (
                    <button
                      onClick={() => {
                        if (confirm("¿Archivar los pedidos entregados o cancelados de hace más de 30 días?")) {
                          archiveOldOrders.mutate({ days: 30 });
                        }
                      }}
                      disabled={archiveOldOrders.isPending}
                      className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border border-[#e5e5e5] text-[#666] hover:border-[#111] hover:text-[#111] transition-colors disabled:opacity-50"
                    >
                      {archiveOldOrders.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                      Archivar completados de +30 días
                    </button>
                  )}
                </div>
                {(() => {
                  const filteredOrders = orders.filter(order => {
                    const q = orderSearch.toLowerCase();
                    if (!q) return true;
                    return (
                      order.orderNumber?.toLowerCase().includes(q) ||
                      order.customerName?.toLowerCase().includes(q) ||
                      order.customerEmail?.toLowerCase().includes(q)
                    );
                  });
                  return (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    return (
                      <div key={order.id} className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                        {/* Header row */}
                        <button
                          className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className="font-semibold">{order.orderNumber}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0f0f0] text-[#999]">
                                  {statusLabels[order.status] ?? order.status}
                                </span>
                                {order.status === "cancelled" && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Cancelada</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate overflow-hidden max-w-full">{order.customerName} · {order.customerEmail}</p>
                              {order.customerPhone && (
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{order.customerPhone}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleString("es-VE")}</p>
                              {/* Mini progress timeline */}
                              {order.status !== "cancelled" && (
                                <div className="flex items-center gap-0.5 mt-2">
                                  {ORDER_STEPS.map((step, i) => {
                                    const currentIdx = ORDER_STEPS.indexOf(order.status as typeof ORDER_STEPS[number]);
                                    const done = i <= currentIdx;
                                    return (
                                      <div key={step} className="flex items-center gap-0.5">
                                        <div className={`w-2 h-2 rounded-full transition-colors ${done ? "bg-[#e5007d]" : "bg-[#e5e5e5]"}`} />
                                        {i < ORDER_STEPS.length - 1 && (
                                          <div className={`w-3 h-0.5 transition-colors ${done && i < currentIdx ? "bg-[#e5007d]" : "bg-[#e5e5e5]"}`} />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {order.paymentStatus === 'partial' && (
                                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs">
                                  <p className="text-blue-600 font-semibold">Pago parcial</p>
                                  <p className="text-blue-500">Pagado: ${parseFloat(order.amountPaid ?? '0').toFixed(2)} USD</p>
                                  <p className="text-blue-500">Restante: ${(parseFloat(order.total) - parseFloat(order.amountPaid ?? '0')).toFixed(2)} USD</p>
                                </div>
                              )}
                              {order.paymentStatus === 'approved' && (
                                <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Pagado completo</p>
                              )}
                              {order.paymentStatus === 'pending' && (
                                <p className="text-xs text-orange-500 font-semibold mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />Pago pendiente</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-base">${parseFloat(order.total).toFixed(2)} USD</span>
                              {/* Archivar / restaurar — va dentro de la fila, por eso corta el clic del acordeón */}
                              <span
                                role="button"
                                tabIndex={0}
                                title={(order as any).archived ? "Restaurar a producción" : "Archivar pedido"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOrderArchived.mutate({ id: order.id, archived: !(order as any).archived });
                                }}
                                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setOrderArchived.mutate({ id: order.id, archived: !(order as any).archived }); } }}
                                className="p-1.5 rounded-lg text-[#999] hover:text-[#111] hover:bg-[#f0f0f0] transition-colors"
                              >
                                {(order as any).archived
                                  ? <ArchiveRestore className="w-4 h-4" />
                                  : <Archive className="w-4 h-4" />}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4">
                                <AdminOrderDetail
                                  order={order}
                                  onSaved={() => { refetchOrders(); }}
                                  onClose={() => setExpandedOrderId(null)}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                  {filteredOrders.length === 0 && orderSearch && (
                    <p className="text-center text-[#999] text-sm py-8">
                      No se encontraron pedidos para "{orderSearch}"
                    </p>
                  )}
                  {filteredOrders.length === 0 && !orderSearch && (
                    <div className="text-center py-16 text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay pedidos aún</p>
                    </div>
                  )}
                </div>
                  );
                })()}

                {/* Modal crear pedido manual */}
                {showManualOrder && (() => {
                  const total = manualForm.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * item.quantity, 0).toFixed(0);
                  return (<>
                    <div className="fixed inset-0 flex items-center justify-center p-4"
                      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-black">Crear pedido manual</h3>
                          <button onClick={() => setShowManualOrder(false)}><X size={20} /></button>
                        </div>
                        <div className="flex flex-col gap-4">
                          <div>
                            <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">Datos del cliente</p>
                            <div className="flex flex-col gap-3">
                              <div>
                                <label className="text-sm font-medium block mb-1">Email del cliente</label>
                                <div className="relative">
                                  <input type="email" value={manualForm.customerEmail}
                                    onChange={e => {
                                      setManualForm({ ...manualForm, customerEmail: e.target.value });
                                      setEmailSearch(e.target.value);
                                      setShowSuggestions(true);
                                    }}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    placeholder="correo@ejemplo.com"
                                    className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                                  {showSuggestions && userSuggestions.data && userSuggestions.data.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-[#e5e5e5] rounded-xl shadow-lg z-50 mt-1 overflow-hidden">
                                      {userSuggestions.data.map((user: any) => (
                                        <button
                                          key={user.id}
                                          type="button"
                                          onClick={() => {
                                            setManualForm({ ...manualForm, customerEmail: user.email, customerName: user.name ?? manualForm.customerName });
                                            setShowSuggestions(false);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f8f8] transition-colors text-left border-b border-[#f0f0f0] last:border-0"
                                        >
                                          <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {user.name?.charAt(0).toUpperCase() ?? '?'}
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[#111] truncate">{user.name}</p>
                                            <p className="text-xs text-[#999] truncate">{user.email}</p>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {findUserQuery.data && (
                                  <p className="text-xs text-green-600 mt-1 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Cliente registrado: {findUserQuery.data.name}</p>
                                )}
                                {manualForm.customerEmail.includes('@') && !findUserQuery.data && !findUserQuery.isLoading && (
                                  <p className="text-xs text-[#999] mt-1">Sin cuenta registrada — se enviará email igual</p>
                                )}
                              </div>
                              <input type="text" value={manualForm.customerName}
                                onChange={e => setManualForm({ ...manualForm, customerName: e.target.value })}
                                placeholder="Nombre completo *"
                                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                              <input type="text" value={manualForm.customerPhone}
                                onChange={e => setManualForm({ ...manualForm, customerPhone: e.target.value })}
                                placeholder="Teléfono"
                                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">Productos / Servicios</p>
                            <div className="flex flex-col gap-2">
                              {manualForm.items.map((item, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input type="text" value={item.productName}
                                    onChange={e => { const items = [...manualForm.items]; items[i].productName = e.target.value; setManualForm({ ...manualForm, items }); }}
                                    placeholder="Nombre del producto/servicio"
                                    className="flex-1 border border-[#e5e5e5] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#111]" />
                                  <input type="number" value={item.quantity} min={1}
                                    onChange={e => { const items = [...manualForm.items]; items[i].quantity = parseInt(e.target.value) || 1; setManualForm({ ...manualForm, items }); }}
                                    className="w-14 border border-[#e5e5e5] rounded-xl px-2 py-2 text-sm outline-none text-center" />
                                  <input type="text" value={item.price}
                                    onChange={e => { const items = [...manualForm.items]; items[i].price = e.target.value; setManualForm({ ...manualForm, items }); }}
                                    placeholder="Precio"
                                    className="w-24 border border-[#e5e5e5] rounded-xl px-2 py-2 text-sm outline-none" />
                                  {manualForm.items.length > 1 && (
                                    <button onClick={() => setManualForm({ ...manualForm, items: manualForm.items.filter((_, j) => j !== i) })} className="text-red-400 p-1">
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button onClick={() => setManualForm({ ...manualForm, items: [...manualForm.items, { productName: '', quantity: 1, price: '' }] })}
                                className="text-sm text-[#e5007d] font-semibold text-left">
                                + Agregar otro producto
                              </button>
                            </div>
                          </div>
                          <div className="bg-[#f8f8f8] rounded-xl px-4 py-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-[#999]">Total</span>
                            <span className="text-xl font-black text-[#111]">${parseFloat(total).toFixed(2)} USD</span>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">Notas internas</label>
                            <textarea value={manualForm.notes} rows={2}
                              onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                              placeholder="Instrucciones especiales, detalles del encargo..."
                              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111] resize-none" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#999] uppercase tracking-wider mb-3">Estado del pago</p>
                            <div className="flex flex-col gap-3">
                              <div className="grid grid-cols-3 gap-2">
                                {([
                                  { value: 'pending', label: 'Pendiente', color: '#f59e0b' },
                                  { value: 'partial', label: 'Parcial', color: '#3b82f6' },
                                  { value: 'approved', label: 'Pagado', color: '#22c55e' },
                                ] as const).map(opt => (
                                  <button key={opt.value}
                                    onClick={() => setManualForm({ ...manualForm, paymentStatus: opt.value })}
                                    className="py-2.5 rounded-xl text-xs font-bold border transition-colors"
                                    style={{
                                      background: manualForm.paymentStatus === opt.value ? opt.color + '20' : '#f8f8f8',
                                      borderColor: manualForm.paymentStatus === opt.value ? opt.color : '#e5e5e5',
                                      color: manualForm.paymentStatus === opt.value ? opt.color : '#666',
                                    }}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                              {manualForm.paymentStatus === 'partial' && (
                                <div>
                                  <label className="text-sm font-medium block mb-1">Monto pagado (USD)</label>
                                  <input
                                    type="number"
                                    value={manualForm.amountPaid}
                                    onChange={e => setManualForm({ ...manualForm, amountPaid: e.target.value })}
                                    placeholder="Ej: 25.00"
                                    className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]"
                                  />
                                  {manualForm.amountPaid && total && (
                                    <p className="text-xs text-[#999] mt-1">
                                      Restante: ${(parseFloat(total) - parseFloat(manualForm.amountPaid || '0')).toFixed(2)} USD
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium block mb-1">
                              Código de referido <span className="text-[#999] font-normal text-xs">(opcional)</span>
                            </label>
                            <select
                              value={manualForm.referralCode ?? ''}
                              onChange={e => setManualForm({ ...manualForm, referralCode: e.target.value })}
                              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111] bg-white"
                            >
                              <option value="">Sin código de referido</option>
                              {cosplayersData.filter((c: any) => c.referralCode).map((c: any) => (
                                <option key={c.id} value={c.referralCode}>
                                  {c.artisticName} — {c.referralCode}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => setShowManualOrder(false)} className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">Cancelar</button>
                            <button
                              onClick={() => setShowConfirm(true)}
                              disabled={!manualForm.customerName || !manualForm.customerEmail || !manualForm.items[0].productName}
                              className="flex-1 bg-[#e5007d] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40"
                            >
                              Revisar pedido
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {showConfirm && (
                      <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                          <h3 className="font-black text-lg text-[#111] mb-1">Confirmar pedido</h3>
                          <p className="text-[#999] text-sm mb-4">¿Estás seguro de crear este pedido?</p>
                          <div className="bg-[#f8f8f8] rounded-xl p-4 mb-4 flex flex-col gap-2 text-sm">
                            <p><span className="text-[#999]">Cliente:</span> <strong>{manualForm.customerName}</strong></p>
                            <p><span className="text-[#999]">Email:</span> {manualForm.customerEmail}</p>
                            <div>
                              <p className="text-[#999] mb-1">Productos:</p>
                              {manualForm.items.map((item, i) => (
                                <p key={i} className="text-[#111]">• {item.productName} ×{item.quantity} — ${parseFloat(item.price || '0').toFixed(2)} USD</p>
                              ))}
                            </div>
                            <p className="border-t border-[#e5e5e5] pt-2 mt-1">
                              <span className="text-[#999]">Total:</span>
                              <strong className="text-[#e5007d] ml-1">${parseFloat(total).toFixed(2)} USD</strong>
                            </p>
                          </div>
                          <p className="text-xs text-[#999] mb-4">
                            Se enviará un correo de confirmación a <strong>{manualForm.customerEmail}</strong>
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowConfirm(false)}
                              className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm font-semibold"
                            >
                              Revisar
                            </button>
                            <button
                              onClick={() => {
                                setShowConfirm(false);
                                createManualOrder.mutate({
                                  customerName: manualForm.customerName,
                                  customerEmail: manualForm.customerEmail,
                                  customerPhone: manualForm.customerPhone,
                                  userId: findUserQuery.data?.id,
                                  items: manualForm.items,
                                  total,
                                  notes: manualForm.notes,
                                  paymentStatus: manualForm.paymentStatus,
                                  amountPaid: manualForm.amountPaid || undefined,
                                  referralCode: manualForm.referralCode || undefined,
                                });
                              }}
                              disabled={createManualOrder.isPending}
                              className="flex-1 bg-[#e5007d] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40"
                            >
                              {createManualOrder.isPending ? 'Creando...' : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>);
                })()}
              </motion.div>
            )}
          </AnimatePresence>
            {/* ─── Payments Tab ───────────────────────────────────────────────── */}
            {tab === "payments" && (
              <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h1 className="text-2xl font-bold">Pagos</h1>
                  <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                    {[
                      { id: "all", label: "Todos" },
                      { id: "pending", label: "Pendiente" },
                      { id: "verifying", label: "En revisión" },
                      { id: "approved", label: "Aprobado" },
                      { id: "rejected", label: "Rechazado" },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setPaymentsFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          paymentsFilter === f.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {(paymentsData?.items ?? []).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">No hay pagos en esta categoría</div>
                  )}
                  {(paymentsData?.items ?? []).map((order: any) => {
                    const isExpanded = expandedPaymentId === order.id;
                    const statusColors: Record<string, string> = {
                      pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                      verifying: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                      approved: "bg-green-500/10 text-green-400 border-green-500/30",
                      rejected: "bg-red-500/10 text-red-400 border-red-500/30",
                    };
                    const statusLabels: Record<string, string> = {
                      pending: "Pendiente", verifying: "En revisión", approved: "Aprobado", rejected: "Rechazado",
                    };
                    return (
                      <div key={order.id} className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedPaymentId(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm">{order.orderNumber}</p>
                              <p className="text-xs text-muted-foreground truncate overflow-hidden max-w-full">{order.customerName} · {order.customerEmail}</p>
                              {order.customerPhone && (
                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{order.customerPhone}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4 shrink-0">
                            <span className="font-bold text-primary text-sm">${parseFloat(order.total).toFixed(2)} USD</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.paymentStatus ?? "pending"]}`}>
                              {statusLabels[order.paymentStatus ?? "pending"]}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                            {(order.hasSecretGift || order.referralCode) && (
                              <div className="flex flex-wrap gap-2">
                                {order.hasSecretGift && (
                                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
                                    <Gift className="w-4 h-4 flex-shrink-0" />
                                    <span><strong>Obsequio secreto</strong> — incluir en el paquete</span>
                                  </div>
                                )}
                                {order.referralCode && (
                                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border/30">
                                    Referido: <strong className="text-foreground">{order.referralCode}</strong>
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="grid sm:grid-cols-2 gap-3 text-sm">
                              <div><span className="text-muted-foreground">Método:</span> <span className="font-medium">{order.paymentMethod ?? "—"}</span></div>
                              <div><span className="text-muted-foreground">País:</span> <span className="font-medium">{order.country ?? "—"}</span></div>
                              <div><span className="text-muted-foreground">Referencia:</span> <span className="font-mono font-medium">{order.paymentReference ?? "—"}</span></div>
                              <div><span className="text-muted-foreground">Titular:</span> <span className="font-medium">{order.receiptHolder ?? "—"}</span></div>
                            </div>

                            {order.receiptUrl && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2">Comprobante:</p>
                                {order.receiptUrl.endsWith(".pdf") ? (
                                  <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary underline">
                                    <Eye className="w-4 h-4" /> Ver PDF
                                  </a>
                                ) : (
                                  <a href={order.receiptUrl} target="_blank" rel="noreferrer">
                                    <img src={order.receiptUrl} alt="Comprobante" className="max-h-48 rounded-xl border border-border/50 object-contain" />
                                  </a>
                                )}
                              </div>
                            )}

                            {(order.paymentStatus === "pending" || order.paymentStatus === "verifying") && (
                              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                <Button
                                  className="w-full py-3 text-sm font-bold bg-green-600 hover:bg-green-700 text-white"
                                  disabled={verifyPayment.isPending}
                                  onClick={() => verifyPayment.mutate({ orderId: order.id, approved: true })}
                                >
                                  <CheckCheck className="w-4 h-4 mr-1.5" /> Aprobar pago
                                </Button>
                                <Button
                                  variant="outline"
                                  className="w-full py-3 text-sm font-bold border-red-400 text-red-500 hover:bg-red-50"
                                  disabled={verifyPayment.isPending}
                                  onClick={() => verifyPayment.mutate({ orderId: order.id, approved: false })}
                                >
                                  <Ban className="w-4 h-4 mr-1.5" /> Rechazar
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          {/* ─── Suscriptores ─────────────────────────────────────────────────── */}
            {tab === "subscribers" && (
              <motion.div key="subscribers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold">Suscriptores</h1>
                    <p className="mt-1 text-sm text-[#666]">Correos que dejó la gente en World Fest y en la newsletter.</p>
                  </div>
                  <button
                    onClick={() => {
                      const csv = "correo,origen,fecha\n" + (subscribers as any[])
                        .map(s => `${s.email},${s.source},${new Date(s.createdAt).toISOString()}`)
                        .join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `suscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                    }}
                    disabled={(subscribers as any[]).length === 0}
                    className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-2.5 text-sm font-bold text-[#555] transition-colors hover:border-[#111] hover:text-[#111] disabled:opacity-40"
                  >
                    <ArrowUpRight className="h-4 w-4" /> Descargar CSV
                  </button>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {([["all", "Todos"], ["worldfest", "World Fest"], ["newsletter", "Newsletter"]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSubsFilter(id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        subsFilter === id ? "bg-[#111] text-white" : "bg-[#f0f0f0] text-[#666] hover:bg-[#e5e5e5]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-[#888]">{(subscribers as any[]).length} correo(s)</span>
                </div>

                {(subscribers as any[]).length === 0 ? (
                  <div className="rounded-2xl border border-[#e5e5e5] bg-white p-12 text-center text-sm text-[#888]">
                    Todavía no hay correos registrados.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white">
                    {(subscribers as any[]).map((sub: any) => (
                      <div key={sub.id} className="flex items-center gap-3 px-4 py-3">
                        <Mail className="h-4 w-4 shrink-0 text-[#ccc]" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#111]">{sub.email}</p>
                          <p className="text-xs text-[#999]">
                            {new Date(sub.createdAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          sub.source === "worldfest" ? "bg-[#5db4ff]/15 text-[#1a6fbd]" : "bg-[#f0f0f0] text-[#666]"
                        }`}>
                          {sub.source === "worldfest" ? "World Fest" : "Newsletter"}
                        </span>
                        <button
                          onClick={() => { if (confirm(`¿Eliminar ${sub.email}?`)) deleteSubscriber.mutate({ id: sub.id }); }}
                          className="shrink-0 rounded-lg p-2 text-[#ccc] transition-colors hover:bg-[#f8f8f8] hover:text-red-500"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          {/* ─── Media Tab ────────────────────────────────────────────────────── */}
            {tab === "media" && (
              <motion.div key="media" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <MediaLibrary onGoToTab={(t: string) => handleTabChange(t as AdminTab)} />
              </motion.div>
            )}

          {/* ─── Settings Tab ─────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {tab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="p-8"
              >
                <h2 className="text-2xl font-bold mb-1">Configuración</h2>
                <p className="text-muted-foreground text-sm mb-8">Personaliza la tienda y conecta tus redes sociales.</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Identidad de la tienda — left col */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Identidad de la tienda</h3>
                      <p className="text-xs text-muted-foreground">Logo y nombre que aparecen en navbar y footer</p>
                    </div>
                  </div>

                  {/* Store name */}
                  <div className="mb-5">
                    <Label className="text-sm font-medium">Nombre de la tienda</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">Aparece en la navbar si no hay logo</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej: Isekai World"
                        defaultValue={siteSettings?.["store_name"] ?? ""}
                        onChange={(e) => setBannerDrafts(d => ({ ...d, store_name: e.target.value }))}
                        className="bg-muted border-border/50"
                      />
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["store_name"] !== undefined ? bannerDrafts["store_name"] : siteSettings?.["store_name"] ?? "";
                          if (val) upsertSetting.mutate({ key: "store_name", value: val });
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Navbar logo height */}
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Tamaño del logo (navbar)</Label>
                    <p className="text-xs text-muted-foreground mb-2">Alto en píxeles — recomendado entre 28 y 48</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={20} max={80}
                        placeholder="36"
                        defaultValue={siteSettings?.["store_logo_height"] ?? "36"}
                        onChange={(e) => setBannerDrafts(d => ({ ...d, store_logo_height: e.target.value }))}
                        className="w-24 bg-muted border-border/50 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["store_logo_height"] !== undefined ? bannerDrafts["store_logo_height"] : siteSettings?.["store_logo_height"] ?? "36";
                          upsertSetting.mutate({ key: "store_logo_height", value: val });
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Footer logo height */}
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Tamaño del logo (footer)</Label>
                    <p className="text-xs text-muted-foreground mb-2">Alto en píxeles — recomendado entre 28 y 48</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={20} max={80}
                        placeholder="36"
                        defaultValue={siteSettings?.["store_logo_height_footer"] ?? "36"}
                        onChange={(e) => setBannerDrafts(d => ({ ...d, store_logo_height_footer: e.target.value }))}
                        className="w-24 bg-muted border-border/50 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">px</span>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["store_logo_height_footer"] !== undefined ? bannerDrafts["store_logo_height_footer"] : siteSettings?.["store_logo_height_footer"] ?? "36";
                          upsertSetting.mutate({ key: "store_logo_height_footer", value: val });
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Texture toggle */}
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Textura de fondo</p>
                      <p className="text-xs text-muted-foreground">Muestra la textura Isekai en secciones clave</p>
                    </div>
                    <button
                      onClick={() => {
                        const current = siteSettings?.["texture_enabled"] === "true";
                        upsertSetting.mutate({ key: "texture_enabled", value: current ? "false" : "true" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${siteSettings?.["texture_enabled"] === "true" ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteSettings?.["texture_enabled"] === "true" ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>
                </div>

                {/* Tasa del día en bolívares */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#e5007d]/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-[#e5007d]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Tasa del día (Bs por USD)</h3>
                      <p className="text-xs text-muted-foreground">Se muestra en el popup de Pago Móvil para que el cliente sepa cuánto transferir</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Bolívares por 1 USD</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">Ej: 36.50 — déjalo vacío para no mostrar el monto en Bs</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="36.50"
                        defaultValue={siteSettings?.["bs_rate"] ?? ""}
                        onChange={(e) => setBsRate(e.target.value)}
                        className="bg-muted border-border/50"
                      />
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bsRate.trim();
                          upsertSetting.mutate({ key: "bs_rate", value: val });
                          upsertSetting.mutate({ key: "bs_rate_updated", value: new Date().toISOString() });
                          toast.success(val ? "Tasa actualizada" : "Tasa desactivada");
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    {siteSettings?.["bs_rate"] && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Tasa activa: <strong className="text-[#e5007d]">Bs {parseFloat(siteSettings["bs_rate"]).toLocaleString("es-VE", { minimumFractionDigits: 2 })}</strong> por USD
                        {siteSettings["bs_rate_updated"] && (
                          <> · actualizada el {new Date(siteSettings["bs_rate_updated"]).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* 2. Instagram Feed — right col */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e1306c] to-[#833ab4] flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Instagram Feed</h3>
                      <p className="text-xs text-muted-foreground">Conecta tu cuenta para mostrar fotos reales en la homepage</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Usuario de Instagram</Label>
                      <p className="text-xs text-muted-foreground mb-1.5">Ej: @isekaistore (solo para mostrar en la sección)</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="@isekaistore"
                          defaultValue={siteSettings?.["instagram_username"] ?? ""}
                          onChange={(e) => setIgUsername(e.target.value)}
                          className="bg-muted border-border/50"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => upsertSetting.mutate({ key: "instagram_username", value: igUsername })}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Access Token de Instagram</Label>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Obtén tu token en{" "}
                        <a href="https://developers.facebook.com/docs/instagram-basic-display-api/getting-started" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                          Meta for Developers <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder="IGQVJx..."
                          defaultValue={siteSettings?.["instagram_access_token"] ? "••••••••••••••••" : ""}
                          onChange={(e) => setIgToken(e.target.value)}
                          className="bg-muted border-border/50 font-mono text-sm"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => upsertSetting.mutate({ key: "instagram_access_token", value: igToken })}
                          disabled={!igToken}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                      {siteSettings?.["instagram_access_token"] && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Token configurado
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Texto del llamado a la acción</Label>
                      <p className="text-xs text-muted-foreground mb-1.5">Aparece debajo del título "Ve el Feed" en la homepage</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Síguenos en Instagram para contenido exclusivo..."
                          defaultValue={siteSettings?.["instagram_cta_text"] ?? ""}
                          onChange={(e) => setIgCtaText(e.target.value)}
                          className="bg-muted border-border/50"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => upsertSetting.mutate({ key: "instagram_cta_text", value: igCtaText })}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Brand Story — left col */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Sección Filosofía / Brand Story</h3>
                      <p className="text-xs text-muted-foreground">Texto e imagen de la sección destacada en la home</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { k: "brand_story_label", label: "Etiqueta superior", ph: "Ej: Nuestra Filosofía" },
                      { k: "brand_story_heading", label: "Título parte normal", ph: "Ej: Colecciones del" },
                      { k: "brand_story_highlight", label: "Título parte destacada", ph: "Ej: Otro Mundo" },
                      { k: "brand_story_body", label: "Descripción", ph: "Ej: Figuras de edición limitada..." },
                    ].map(({ k, label, ph }) => (
                      <div key={k}>
                        <Label className="text-xs font-medium">{label}</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder={ph}
                            defaultValue={siteSettings?.[k] ?? ""}
                            onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                            className="bg-muted border-border/50 text-sm"
                          />
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground shrink-0"
                            onClick={() => {
                              const val = bannerDrafts[k] !== undefined ? bannerDrafts[k] : siteSettings?.[k] ?? "";
                              if (val) upsertSetting.mutate({ key: k, value: val });
                            }}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Redes sociales / Promo bar — right col */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Barra Social Flotante</h3>
                      <p className="text-xs text-muted-foreground">Links de redes sociales y botón de promoción lateral</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Facebook */}
                    {[
                      { key: "social_facebook",  label: "Facebook",    icon: Facebook,  state: socialFb,  set: setSocialFb,  placeholder: "https://facebook.com/isekaistore" },
                      { key: "social_twitter",   label: "X (Twitter)", icon: Twitter,   state: socialTw,  set: setSocialTw,  placeholder: "https://x.com/isekaistore" },
                      { key: "social_instagram", label: "Instagram",   icon: Instagram, state: socialIg,  set: setSocialIg,  placeholder: "https://instagram.com/isekaistore" },
                      { key: "social_youtube",   label: "YouTube",     icon: Youtube,   state: socialYt,  set: setSocialYt,  placeholder: "https://youtube.com/@isekaistore" },
                    ].map(({ key, label, icon: Icon, state, set, placeholder }) => (
                      <div key={key}>
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5" /> {label}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder={placeholder}
                            defaultValue={siteSettings?.[key] ?? ""}
                            onChange={(e) => set(e.target.value)}
                            className="bg-muted border-border/50"
                          />
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground shrink-0"
                            onClick={() => state && upsertSetting.mutate({ key, value: state })}
                            disabled={!state}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Marquee de la franja superior */}
                    <div className="border-t border-border/30 pt-4">
                      <Label className="text-sm font-medium">Textos de la franja superior (marquee)</Label>
                      <p className="text-xs text-muted-foreground mb-1.5">
                        Uno por línea. Corren en bucle en la barra de arriba de toda la tienda.
                        Si lo dejas vacío, se usan los textos por defecto.
                      </p>
                      <div className="flex gap-2 items-start">
                        <textarea
                          rows={4}
                          placeholder={"Envío gratis en pedidos +$150 USD\nNuevos drops cada semana\n..."}
                          defaultValue={siteSettings?.["topbar_marquee_texts"] ?? ""}
                          onChange={(e) => setBannerDrafts(d => ({ ...d, topbar_marquee_texts: e.target.value }))}
                          className="flex-1 rounded-lg bg-muted border border-border/50 px-3 py-2 text-sm outline-none focus:border-[#111] resize-y"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => {
                            const val = bannerDrafts["topbar_marquee_texts"] !== undefined
                              ? bannerDrafts["topbar_marquee_texts"]
                              : siteSettings?.["topbar_marquee_texts"] ?? "";
                            upsertSetting.mutate({ key: "topbar_marquee_texts", value: val });
                          }}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/30 pt-4">
                      <Label className="text-sm font-medium">Texto del botón de descuento</Label>
                      <p className="text-xs text-muted-foreground mb-1.5">Ej: "20% OFF" — se muestra como "OBTÉN 20% OFF" / "GET 20% OFF"</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="20% OFF"
                          defaultValue={siteSettings?.["promo_bar_text"] ?? ""}
                          onChange={(e) => setPromoBarText(e.target.value)}
                          className="bg-muted border-border/50"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => promoBarText && upsertSetting.mutate({ key: "promo_bar_text", value: promoBarText })}
                          disabled={!promoBarText}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Promo enabled toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Mostrar botón de descuento</Label>
                        <p className="text-xs text-muted-foreground">Activa o desactiva el botón en la barra flotante</p>
                      </div>
                      <button
                        onClick={() => {
                          const current = siteSettings?.["promo_bar_enabled"] !== "false";
                          upsertSetting.mutate({ key: "promo_bar_enabled", value: current ? "false" : "true" });
                        }}
                        className={`relative w-11 h-6 rounded-full transition-colors ${siteSettings?.["promo_bar_enabled"] !== "false" ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteSettings?.["promo_bar_enabled"] !== "false" ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. Banner lateral producto — right col */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Banner lateral página de producto</h3>
                      <p className="text-xs text-muted-foreground">Aparece a la izquierda del producto en desktop</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">URL destino (al hacer click)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="Ej: /catalog o https://..."
                          defaultValue={siteSettings?.["product_sidebar_banner_url"] ?? ""}
                          onChange={(e) => setBannerDrafts(d => ({ ...d, product_sidebar_banner_url: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => {
                            const val = bannerDrafts["product_sidebar_banner_url"] !== undefined ? bannerDrafts["product_sidebar_banner_url"] : siteSettings?.["product_sidebar_banner_url"] ?? "";
                            if (val) upsertSetting.mutate({ key: "product_sidebar_banner_url", value: val });
                          }}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7. Hero Slides + Video Banner — full width */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 lg:col-span-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Hero Slides</h3>
                      <p className="text-xs text-muted-foreground">Imágenes y textos de los 3 slides del hero principal</p>
                    </div>
                  </div>
                  {[1, 2, 3].map((n) => {
                    return (
                      <div key={n} className="mb-6">
                        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Slide {n}</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          {[
                            { k: `hero_slide_${n}_tag`,     label: "Tag / etiqueta",   ph: "Ej: Temporada 2025" },
                            { k: `hero_slide_${n}_title`,   label: "Título",           ph: "Ej: Nueva colección" },
                            { k: `hero_slide_${n}_cta`,     label: "Texto del botón",  ph: "Ej: Ver colección" },
                            { k: `hero_slide_${n}_cta_url`, label: "URL del botón",    ph: "/catalog o https://..." },
                          ].map(({ k, label, ph }) => (
                            <div key={k}>
                              <Label className="text-xs font-medium">{label}</Label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  placeholder={ph}
                                  defaultValue={siteSettings?.[k] ?? ""}
                                  onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                                  className="bg-muted border-border/50 text-sm"
                                />
                                <Button
                                  size="sm"
                                  className="bg-primary text-primary-foreground shrink-0"
                                  onClick={() => {
                                    const val = bannerDrafts[k] !== undefined ? bannerDrafts[k] : siteSettings?.[k] ?? "";
                                    if (val) upsertSetting.mutate({ key: k, value: val });
                                  }}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {n < 3 && <div className="border-t border-border/20 mt-5" />}
                      </div>
                    );
                  })}
                  <div className="border-t border-border/30 pt-5">
                    <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Banner de video</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { k: "video_banner_title", label: "Título", ph: "Ej: Sumérgete en el anime" },
                        { k: "video_banner_subtitle", label: "Subtítulo", ph: "Ej: Descubre nuestra colección" },
                        { k: "video_banner_cta", label: "Texto del botón", ph: "Ej: Ver más" },
                        { k: "video_banner_video_url", label: "URL del video (mp4 o YouTube embed)", ph: "https://..." },
                      ].map(({ k, label, ph }) => (
                        <div key={k}>
                          <Label className="text-xs font-medium">{label}</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              placeholder={ph}
                              defaultValue={siteSettings?.[k] ?? ""}
                              onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                              className="bg-muted border-border/50 text-sm"
                            />
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground shrink-0"
                              onClick={() => {
                                const val = bannerDrafts[k] !== undefined ? bannerDrafts[k] : siteSettings?.[k] ?? "";
                                if (val) upsertSetting.mutate({ key: k, value: val });
                              }}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 12. World Fest */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 lg:col-span-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#e5007d]/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#e5007d]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">World Fest</h3>
                      <p className="text-xs text-muted-foreground">Textos de la página del festival — las imágenes se asignan en Medios</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { k: "worldfest_kicker",     label: "Línea superior",  ph: "Maracaibo · Venezuela" },
                      { k: "worldfest_title",      label: "Título",          ph: "WORLD FEST" },
                      { k: "worldfest_date_label", label: "Estado / fecha",  ph: "Fecha por anunciar" },
                      { k: "worldfest_subtitle",   label: "Descripción",     ph: "El primer festival de Isekai World..." },
                    ].map(({ k, label, ph }) => (
                      <div key={k}>
                        <Label className="text-xs font-medium">{label}</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            placeholder={ph}
                            defaultValue={siteSettings?.[k] ?? ""}
                            onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                            className="bg-muted border-border/50 text-sm"
                          />
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground shrink-0"
                            onClick={() => {
                              const val = bannerDrafts[k] !== undefined ? bannerDrafts[k] : siteSettings?.[k] ?? "";
                              if (val) upsertSetting.mutate({ key: k, value: val });
                            }}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Video de fondo */}
                  <div className="mt-5 pt-5 border-t border-border/30">
                    <Label className="text-xs font-medium">Video de fondo (estática)</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      MP4 o WebM, máximo 60 MB. Se reproduce en bucle, sin sonido, detrás de toda la página.
                      Déjalo vacío para usar solo el degradado azul.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://... o sube un video"
                        value={bannerDrafts["worldfest_bg_video"] ?? siteSettings?.["worldfest_bg_video"] ?? ""}
                        onChange={(e) => setBannerDrafts(d => ({ ...d, worldfest_bg_video: e.target.value }))}
                        className="bg-muted border-border/50 text-sm"
                      />
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 60 * 1024 * 1024) { toast.error("El video no puede superar 60 MB"); return; }
                          const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                          try {
                            const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                            setBannerDrafts(d => ({ ...d, worldfest_bg_video: url }));
                            upsertSetting.mutate({ key: "worldfest_bg_video", value: url });
                            toast.success("Video subido");
                          } catch { toast.error("Error al subir el video"); }
                        }} />
                      </label>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["worldfest_bg_video"] !== undefined
                            ? bannerDrafts["worldfest_bg_video"]
                            : siteSettings?.["worldfest_bg_video"] ?? "";
                          upsertSetting.mutate({ key: "worldfest_bg_video", value: val });
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                    {(bannerDrafts["worldfest_bg_video"] ?? siteSettings?.["worldfest_bg_video"]) && (
                      <video
                        src={bannerDrafts["worldfest_bg_video"] ?? siteSettings?.["worldfest_bg_video"]}
                        muted loop autoPlay playsInline
                        className="mt-2 h-28 w-full rounded-lg border border-border/30 object-cover"
                      />
                    )}
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    Si dejas un campo vacío, la página usa su texto por defecto.
                  </p>
                </div>

                {/* 11. Cosplay Guild */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Cosplay Guild</p>
                      <p className="text-xs text-muted-foreground">Imágenes para las páginas del Cosplay Guild</p>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-border/30">
                    <Label className="text-sm font-medium">Producto Kit de Bienvenida</Label>
                    <p className="text-xs text-muted-foreground mb-2">ID del producto que se enviará automáticamente al aprobar un cosplayer</p>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        placeholder="Ej: 12"
                        defaultValue={siteSettings?.["cosplay_kit_product_id"] ?? ""}
                        onChange={e => setBannerDrafts(d => ({ ...d, cosplay_kit_product_id: e.target.value }))}
                        className="bg-muted border-border/50 text-sm w-40"
                      />
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["cosplay_kit_product_id"] ?? siteSettings?.["cosplay_kit_product_id"] ?? "";
                          if (val) upsertSetting.mutate({ key: "cosplay_kit_product_id", value: val });
                        }}
                        disabled={!(bannerDrafts["cosplay_kit_product_id"] ?? siteSettings?.["cosplay_kit_product_id"])}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      {siteSettings?.["cosplay_kit_product_id"] && (
                        <span className="text-xs text-green-600 font-medium">Producto #{siteSettings["cosplay_kit_product_id"]} configurado</span>
                      )}
                    </div>
                  </div>
                </div>

                </div>{/* end grid */}
              </motion.div>
            )}

            {/* ─── FAQ ───────────────────────────────────────────────────────── */}
            {tab === "faq" && (
              <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold">FAQ</h1>
                  <Button onClick={() => { setEditingFaqId(null); setFaqForm({ question: "", answer: "", category: "General", position: 0, active: true }); setShowFaqForm(true); }}
                    className="bg-primary text-primary-foreground">
                    <Plus className="w-4 h-4 mr-2" /> Nueva pregunta
                  </Button>
                </div>

                {/* Form crear/editar */}
                {showFaqForm && (
                  <div className="bg-card border border-border/50 rounded-2xl p-6 mb-6">
                    <h2 className="font-semibold mb-4">{editingFaqId !== null ? "Editar pregunta" : "Nueva pregunta"}</h2>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium">Pregunta</Label>
                        <Input value={faqForm.question} onChange={e => setFaqForm(f => ({ ...f, question: e.target.value }))} placeholder="¿Cómo hago un pedido?" className="bg-muted border-border/50 mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Respuesta</Label>
                        <textarea
                          value={faqForm.answer}
                          onChange={e => setFaqForm(f => ({ ...f, answer: e.target.value }))}
                          placeholder="Explicación detallada..."
                          rows={4}
                          className="w-full mt-1 px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium">Categoría</Label>
                          <Input value={faqForm.category} onChange={e => setFaqForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej: Pedidos, Envíos, Pagos" className="bg-muted border-border/50 mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Orden</Label>
                          <Input type="number" value={faqForm.position} onChange={e => setFaqForm(f => ({ ...f, position: Number(e.target.value) }))} className="bg-muted border-border/50 mt-1" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-xs font-medium">Activa</Label>
                        <button
                          onClick={() => setFaqForm(f => ({ ...f, active: !f.active }))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${faqForm.active ? "bg-primary" : "bg-muted-foreground/30"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${faqForm.active ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button onClick={handleFaqSubmit} disabled={createFaq.isPending || updateFaq.isPending} className="bg-primary text-primary-foreground">
                        {(createFaq.isPending || updateFaq.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => { setShowFaqForm(false); setEditingFaqId(null); }}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {/* Tabla de preguntas */}
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
                  {faqItems.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm">No hay preguntas aún. Crea la primera.</div>
                  ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -12px' }}>
                    <table style={{ minWidth: '600px', width: '100%' }} className="text-sm">
                      <thead className="border-b border-border/50 bg-muted/30">
                        <tr>
                          <th className="text-left p-4 font-medium text-muted-foreground">Pregunta</th>
                          <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Categoría</th>
                          <th className="text-center p-4 font-medium text-muted-foreground">Activa</th>
                          <th className="text-right p-4 font-medium text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqItems.map((item) => (
                          <tr key={item.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="p-4 font-medium max-w-xs truncate">{item.question}</td>
                            <td className="p-4 text-muted-foreground hidden md:table-cell">{item.category ?? "General"}</td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => updateFaq.mutate({ id: item.id, active: !item.active })}
                                className={`relative w-10 h-5 rounded-full transition-colors ${item.active ? "bg-primary" : "bg-muted-foreground/30"}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.active ? "translate-x-5" : "translate-x-0"}`} />
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => {
                                  setEditingFaqId(item.id);
                                  setFaqForm({ question: item.question, answer: item.answer, category: item.category ?? "General", position: item.position ?? 0, active: item.active ?? true });
                                  setShowFaqForm(true);
                                }}>
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                                  onClick={() => { if (confirm("¿Eliminar esta pregunta?")) deleteFaq.mutate({ id: item.id }); }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {/* ─── LINKBIO ───────────────────────────────────────────────────── */}
            {tab === "linkbio" && (
              <motion.div key="linkbio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <h1 className="text-2xl font-bold mb-6">LinkBio</h1>

                {/* Copy link banner */}
                <div className="flex items-center gap-3 mb-6 p-4 bg-[#f8f8f8] rounded-xl border border-border/50">
                  <p className="text-sm font-mono text-[#999] flex-1">https://isekaiworld.co/links</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText("https://isekaiworld.co/links"); toast.success("Link copiado"); }}
                    className="text-sm font-semibold bg-[#111] text-white px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
                  >
                    Copiar
                  </button>
                  <a href="/links" target="_blank" className="text-sm text-[#e5007d] underline whitespace-nowrap">
                    Ver página
                  </a>
                </div>

                {/* Visual settings */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6 space-y-5">
                  <h2 className="font-semibold">Configuración visual</h2>

                  {/* Bio text */}
                  <div>
                    <Label className="text-xs font-medium">Texto descriptivo</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Figuras anime 3D hechas con amor"
                        defaultValue={siteSettings?.["linkbio_bio_text"] ?? ""}
                        onChange={e => setBannerDrafts(d => ({ ...d, linkbio_bio_text: e.target.value }))}
                        className="bg-muted border-border/50"
                      />
                      <Button size="sm" className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => { const val = bannerDrafts["linkbio_bio_text"] !== undefined ? bannerDrafts["linkbio_bio_text"] : siteSettings?.["linkbio_bio_text"] ?? ""; if (val !== undefined) upsertSetting.mutate({ key: "linkbio_bio_text", value: val }); }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Las imágenes del Link in bio se asignan desde Medios */}
                  <div className="rounded-xl border border-dashed border-[#dcdcdc] bg-[#fafafa] p-4">
                    <p className="text-sm font-bold text-[#111]">Imágenes del Link in bio</p>
                    <p className="mt-1 text-xs text-[#666]">
                      El avatar, el banner y la imagen inferior se asignan desde la sección Medios,
                      junto al resto de las imágenes del sitio.
                    </p>
                    <button
                      onClick={() => handleTabChange("media")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#ddd] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555] transition-colors hover:border-[#111] hover:text-[#111]"
                    >
                      Ir a Medios <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Lista de links */}
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-4">
                  {linkBioItems.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm">No hay links aún. Agrega el primero.</div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {linkBioItems.map((item, i) => (
                        <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveLinkUp(i)} disabled={i === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveLinkDown(i)} disabled={i === linkBioItems.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-20 transition-colors">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                          </div>
                          <button
                            onClick={() => updateLink.mutate({ id: item.id, active: !item.active })}
                            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${item.active ? "bg-primary" : "bg-muted-foreground/30"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.active ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingLinkId(item.id); setLinkBioForm({ label: item.label, url: item.url }); setShowLinkForm(true); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("¿Eliminar este link?")) deleteLink.mutate({ id: item.id }); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form nuevo/editar link — aparece debajo de la lista */}
                {showLinkForm && (
                  <div className="bg-card border border-border/50 rounded-2xl p-6 mb-4">
                    <h2 className="font-semibold mb-4">{editingLinkId !== null ? "Editar link" : "Nuevo link"}</h2>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium">Etiqueta</Label>
                        <Input value={linkBioForm.label} onChange={e => setLinkBioForm(f => ({ ...f, label: e.target.value }))} placeholder="Ej: Tienda online" className="bg-muted border-border/50 mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">URL</Label>
                        <Input value={linkBioForm.url} onChange={e => setLinkBioForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="bg-muted border-border/50 mt-1" />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <Button onClick={handleLinkSubmit} disabled={createLink.isPending || updateLink.isPending} className="bg-primary text-primary-foreground">
                        {(createLink.isPending || updateLink.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => { setShowLinkForm(false); setEditingLinkId(null); }}>Cancelar</Button>
                    </div>
                  </div>
                )}

                <Button onClick={() => { setEditingLinkId(null); setLinkBioForm({ label: "", url: "" }); setShowLinkForm(true); }} className="bg-primary text-primary-foreground w-full">
                  <Plus className="w-4 h-4 mr-2" /> Agregar link
                </Button>
              </motion.div>
            )}

            {/* ─── Users Tab ──────────────────────────────────────────────── */}
            {tab === "users" && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Usuarios</h2>
                    <p className="text-sm text-[#999]">{filteredUsers.length} usuarios registrados</p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="flex gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg outline-none focus:border-[#111]"
                    />
                  </div>
                  <select
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value)}
                    className="text-sm border border-[#e5e5e5] rounded-lg px-3 py-2.5 outline-none bg-background"
                  >
                    <option value="all">Todos</option>
                    <option value="user">Clientes</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>

                {/* Tabla de usuarios */}
                <div className="border border-[#e5e5e5] rounded-xl overflow-x-auto">
                  <table style={{ minWidth: '600px', width: '100%' }} className="text-sm">
                    <thead className="bg-[#f8f8f8] border-b border-[#e5e5e5]">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-[#999]">Usuario</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#999]">Método</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#999]">Rol</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#999]">Registro</th>
                        <th className="text-right px-4 py-3 font-semibold text-[#999]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: any) => (
                        <tr key={u.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#111] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {u.name?.charAt(0).toUpperCase() ?? '?'}
                              </div>
                              <div>
                                <p className="font-medium text-[#111]">{u.name ?? 'Sin nombre'}</p>
                                <p className="text-xs text-[#999]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-[#f0f0f0] px-2 py-1 rounded-full">
                              {u.loginMethod === 'google' ? 'Google' : 'Magic Link'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              onChange={e => updateUserRole.mutate({ userId: u.id, role: e.target.value as 'user' | 'admin' })}
                              className={`text-xs px-2 py-1 rounded-full border outline-none font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                                  : 'bg-green-50 border-green-200 text-green-700'
                              }`}
                            >
                              <option value="user">Cliente</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#999]">
                            {new Date(u.createdAt).toLocaleDateString('es-VE', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) {
                                  deleteUser.mutate({ userId: u.id });
                                }
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredUsers.length === 0 && (
                    <p className="text-center text-[#999] text-sm py-8">
                      No se encontraron usuarios
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Popups ─────────────────────────────────────────────────────── */}
            {tab === "popups" && (
              <motion.div key="popups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold">Popups</h1>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => { setEditingPopup(null); setPopupForm(emptyPopupForm); setShowPopupModal(true); }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Nuevo popup
                  </Button>
                </div>

                {/* Popup list */}
                <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                  {popupItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12 text-sm">No hay popups creados aún</p>
                  ) : (
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -12px' }}>
                    <table style={{ minWidth: '600px', width: '100%' }} className="text-sm">
                      <thead className="bg-muted/40 border-b border-border/50">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Nombre</th>
                          <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Trigger</th>
                          <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Posición</th>
                          <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Creado</th>
                          <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Activo</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {popupItems.map((p: any) => (
                          <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">{p.triggerType}</td>
                            <td className="px-4 py-3 text-muted-foreground capitalize">{p.position ?? 'center'}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => togglePopupActive.mutate({ id: p.id, active: !p.active })}
                                className={`relative w-10 h-5 rounded-full transition-colors ${p.active ? "bg-primary" : "bg-muted-foreground/30"}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.active ? "translate-x-5" : "translate-x-0"}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingPopup(p);
                                    setPopupForm({
                                      name: p.name ?? "",
                                      active: p.active ?? false,
                                      title: p.title ?? "",
                                      subtitle: p.subtitle ?? "",
                                      bodyText: p.bodyText ?? "",
                                      buttonText: p.buttonText ?? "",
                                      buttonUrl: p.buttonUrl ?? "",
                                      image: p.image ?? "",
                                      showEmail: p.showEmail ?? false,
                                      couponCode: p.couponCode ?? "",
                                      triggerType: p.triggerType ?? "time",
                                      triggerDelay: p.triggerDelay ?? 3,
                                      triggerPage: p.triggerPage ?? "",
                                      triggerProductId: p.triggerProductId ?? "",
                                      showOnce: p.showOnce ?? true,
                                      position: p.position ?? "center",
                                      audience: p.audience ?? "all",
                                      startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0,16) : "",
                                      endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0,16) : "",
                                    });
                                    setShowPopupModal(true);
                                  }}
                                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`¿Eliminar popup "${p.name}"?`)) deletePopupMutation.mutate({ id: p.id }); }}
                                  className="text-red-400 hover:text-red-600 transition-colors p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>

                {/* Popup modal */}
                {showPopupModal && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
                      <div className="flex items-center justify-between p-6 border-b border-border/30">
                        <h2 className="text-lg font-bold">{editingPopup ? "Editar popup" : "Nuevo popup"}</h2>
                        <button onClick={() => { setShowPopupModal(false); setEditingPopup(null); }} className="text-muted-foreground hover:text-foreground">
                          <X size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-5">
                        {/* Name + active */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs mb-1 block">Nombre (interno) *</Label>
                            <Input value={popupForm.name} onChange={e => setPopupForm(f => ({ ...f, name: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="Ej: Popup descuento verano" />
                          </div>
                          <div className="flex items-center gap-3 mt-5">
                            <button
                              onClick={() => setPopupForm(f => ({ ...f, active: !f.active }))}
                              className={`relative w-11 h-6 rounded-full transition-colors ${popupForm.active ? "bg-primary" : "bg-muted-foreground/30"}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${popupForm.active ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                            <Label className="text-xs">Activo</Label>
                          </div>
                        </div>

                        {/* Título, subtítulo */}
                        <div>
                          <Label className="text-xs mb-1 block">Título</Label>
                          <Input value={popupForm.title} onChange={e => setPopupForm(f => ({ ...f, title: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="¡Oferta especial!" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Subtítulo</Label>
                          <Input value={popupForm.subtitle} onChange={e => setPopupForm(f => ({ ...f, subtitle: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="Solo por hoy" />
                        </div>

                        {/* Cuerpo */}
                        <div>
                          <Label className="text-xs mb-1 block">Texto del cuerpo</Label>
                          <textarea
                            value={popupForm.bodyText}
                            onChange={e => setPopupForm(f => ({ ...f, bodyText: e.target.value }))}
                            rows={3}
                            className="w-full text-sm px-3 py-2 rounded-xl border border-border/50 bg-muted outline-none focus:border-primary resize-none"
                            placeholder="Descripción del popup..."
                          />
                        </div>

                        {/* Imagen */}
                        <div>
                          <Label className="text-xs mb-1 block">Imagen (URL o subir)</Label>
                          <div className="flex gap-2">
                            <Input value={popupForm.image} onChange={e => setPopupForm(f => ({ ...f, image: e.target.value }))} className="bg-muted border-border/50 text-sm flex-1" placeholder="https://..." />
                            <label className={`cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border/50 text-xs font-medium hover:bg-muted transition-colors ${popupImageUploading ? "opacity-50 pointer-events-none" : ""}`}>
                              <Upload size={13} />
                              {popupImageUploading ? "Subiendo..." : "Subir"}
                              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setPopupImageUploading(true);
                                try {
                                  const base64 = await new Promise<string>((res, rej) => {
                                    const reader = new FileReader();
                                    reader.onload = ev => res((ev.target?.result as string).split(",")[1]);
                                    reader.onerror = rej;
                                    reader.readAsDataURL(file);
                                  });
                                  const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                                  setPopupForm(f => ({ ...f, image: url }));
                                  toast.success("Imagen subida");
                                } catch { toast.error("Error al subir imagen"); }
                                finally { setPopupImageUploading(false); }
                              }} />
                            </label>
                          </div>
                          {popupForm.image && <img src={popupForm.image} className="mt-2 h-24 rounded-xl object-cover border border-border/30" />}
                        </div>

                        {/* Botón CTA */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs mb-1 block">Texto del botón CTA</Label>
                            <Input value={popupForm.buttonText} onChange={e => setPopupForm(f => ({ ...f, buttonText: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="Ver oferta" />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">URL del botón CTA</Label>
                            <Input value={popupForm.buttonUrl} onChange={e => setPopupForm(f => ({ ...f, buttonUrl: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="/catalog" />
                          </div>
                        </div>

                        {/* Código cupón + email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs mb-1 block">Código de cupón</Label>
                            <Input value={popupForm.couponCode} onChange={e => setPopupForm(f => ({ ...f, couponCode: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="VERANO20" />
                          </div>
                          <div className="flex items-center gap-3 mt-5">
                            <button
                              onClick={() => setPopupForm(f => ({ ...f, showEmail: !f.showEmail }))}
                              className={`relative w-11 h-6 rounded-full transition-colors ${popupForm.showEmail ? "bg-primary" : "bg-muted-foreground/30"}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${popupForm.showEmail ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                            <Label className="text-xs">Incluir campo email</Label>
                          </div>
                        </div>

                        {/* Trigger */}
                        <div>
                          <Label className="text-xs mb-1 block">Tipo de trigger</Label>
                          <div className="flex flex-wrap gap-2">
                            {(['time', 'entry', 'exit', 'page', 'product'] as const).map(t => (
                              <button
                                key={t}
                                onClick={() => setPopupForm(f => ({ ...f, triggerType: t }))}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${popupForm.triggerType === t ? "bg-primary text-white border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                              >
                                {t === 'time' ? 'Tiempo' : t === 'entry' ? 'Al entrar' : t === 'exit' ? 'Al salir' : t === 'page' ? 'Página' : 'Producto'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {(popupForm.triggerType === 'time' || popupForm.triggerType === 'product') && (
                          <div>
                            <Label className="text-xs mb-1 block">Demora en segundos</Label>
                            <Input type="number" value={popupForm.triggerDelay} onChange={e => setPopupForm(f => ({ ...f, triggerDelay: parseInt(e.target.value) || 0 }))} className="bg-muted border-border/50 text-sm max-w-[120px]" />
                          </div>
                        )}

                        {popupForm.triggerType === 'page' && (
                          <div>
                            <Label className="text-xs mb-1 block">Ruta de página (ej: /catalog)</Label>
                            <Input value={popupForm.triggerPage} onChange={e => setPopupForm(f => ({ ...f, triggerPage: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="/catalog" />
                          </div>
                        )}

                        {popupForm.triggerType === 'product' && (
                          <div>
                            <Label className="text-xs mb-1 block">ID del producto</Label>
                            <Input type="number" value={popupForm.triggerProductId as string} onChange={e => setPopupForm(f => ({ ...f, triggerProductId: e.target.value }))} className="bg-muted border-border/50 text-sm max-w-[120px]" placeholder="123" />
                          </div>
                        )}

                        {/* Posición */}
                        <div>
                          <Label className="text-xs mb-1 block">Posición</Label>
                          <div className="flex flex-wrap gap-2">
                            {(['center', 'bottom-left', 'bottom-right', 'top'] as const).map(pos => (
                              <button
                                key={pos}
                                onClick={() => setPopupForm(f => ({ ...f, position: pos }))}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${popupForm.position === pos ? "bg-primary text-white border-primary" : "border-border/50 text-muted-foreground hover:border-primary/50"}`}
                              >
                                {pos === 'center' ? 'Centro' : pos === 'bottom-left' ? 'Abajo izq.' : pos === 'bottom-right' ? 'Abajo der.' : 'Arriba'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Show once */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPopupForm(f => ({ ...f, showOnce: !f.showOnce }))}
                            className={`relative w-11 h-6 rounded-full transition-colors ${popupForm.showOnce ? "bg-primary" : "bg-muted-foreground/30"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${popupForm.showOnce ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                          <Label className="text-xs">Mostrar solo una vez por visitante</Label>
                        </div>

                        {/* Audiencia */}
                        <div>
                          <Label className="text-xs mb-1 block">Audiencia</Label>
                          <select
                            value={popupForm.audience}
                            onChange={e => setPopupForm(f => ({ ...f, audience: e.target.value as any }))}
                            className="w-full bg-muted border border-border/50 rounded-md px-3 py-2 text-sm text-foreground"
                          >
                            <option value="all">Todos</option>
                            <option value="cosplayers">Solo cosplayers aprobados</option>
                            <option value="users">Solo usuarios registrados</option>
                            <option value="guests">Solo visitantes (no registrados)</option>
                          </select>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs mb-1 block">Fecha de inicio (opcional)</Label>
                            <Input type="datetime-local" value={popupForm.startDate} onChange={e => setPopupForm(f => ({ ...f, startDate: e.target.value }))} className="bg-muted border-border/50 text-sm" />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">Fecha de fin (opcional)</Label>
                            <Input type="datetime-local" value={popupForm.endDate} onChange={e => setPopupForm(f => ({ ...f, endDate: e.target.value }))} className="bg-muted border-border/50 text-sm" />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 border-t border-border/30">
                          <Button
                            className="bg-primary text-primary-foreground"
                            disabled={!popupForm.name.trim() || createPopupMutation.isPending || updatePopupMutation.isPending}
                            onClick={() => {
                              const payload: any = {
                                name: popupForm.name,
                                active: popupForm.active,
                                title: popupForm.title || undefined,
                                subtitle: popupForm.subtitle || undefined,
                                bodyText: popupForm.bodyText || undefined,
                                buttonText: popupForm.buttonText || undefined,
                                buttonUrl: popupForm.buttonUrl || undefined,
                                image: popupForm.image || undefined,
                                showEmail: popupForm.showEmail,
                                couponCode: popupForm.couponCode || undefined,
                                triggerType: popupForm.triggerType,
                                triggerDelay: popupForm.triggerDelay,
                                triggerPage: popupForm.triggerPage || undefined,
                                triggerProductId: popupForm.triggerProductId ? Number(popupForm.triggerProductId) : undefined,
                                showOnce: popupForm.showOnce,
                                position: popupForm.position,
                                audience: popupForm.audience,
                                startDate: popupForm.startDate || undefined,
                                endDate: popupForm.endDate || undefined,
                              };
                              if (editingPopup) {
                                updatePopupMutation.mutate({ id: editingPopup.id, ...payload });
                              } else {
                                createPopupMutation.mutate(payload);
                              }
                            }}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {editingPopup ? "Actualizar" : "Crear popup"}
                          </Button>
                          <Button variant="outline" className="border-border/50" onClick={() => { setShowPopupModal(false); setEditingPopup(null); }}>
                            <X className="w-4 h-4 mr-2" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Cosplay Guild ──────────────────────────────────────────────── */}
            {tab === "cosplay" && (
              <motion.div key="cosplay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-[#e5007d]" /> Cosplay Guild</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Mostrar u ocultar mi propia tarjeta en el directorio */}
                    {myCosplayer?.exists && (
                      <button
                        onClick={() => setMyVisibility.mutate({ visible: !myCosplayer.visible })}
                        disabled={setMyVisibility.isPending}
                        title={myCosplayer.visible
                          ? "Tu perfil de admin se está mostrando en el directorio público"
                          : "Tu perfil de admin está oculto del directorio público"}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                          myCosplayer.visible
                            ? "border-[#e5007d] bg-[#e5007d]/10 text-[#e5007d]"
                            : "border-[#e5e5e5] bg-white text-[#555] hover:border-[#111] hover:text-[#111]"
                        }`}
                      >
                        <span className={`relative h-4 w-7 rounded-full transition-colors ${myCosplayer.visible ? "bg-[#e5007d]" : "bg-[#ccc]"}`}>
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${myCosplayer.visible ? "left-3.5" : "left-0.5"}`} />
                        </span>
                        Mi perfil en el directorio
                      </button>
                    )}

                    {/* Ver el panel tal como lo ven los cosplayers */}
                    <a
                      href="/cosplay/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-bold text-[#555] transition-colors hover:border-[#e5007d] hover:text-[#e5007d]"
                    >
                      Ver panel de cosplayer <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {(() => {
                  const pendingApps = cosplayApps.filter((a: any) => a.status === 'pending').length;
                  const pendingSubs = cosplaySubs.filter((s: any) => s.status === 'pending').length;
                  const pendingWd   = (withdrawalsData as any[]).filter((w: any) => w.status === 'pending').length;
                  const needsAction = pendingApps + pendingSubs + pendingWd;

                  return (
                    <>
                      {/* Qué necesita tu atención */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: 'Solicitudes por revisar', value: pendingApps, icon: Users,      go: 'applications' },
                          { label: 'Evaluaciones pendientes', value: pendingSubs, icon: CheckCheck, go: 'evaluations'  },
                          { label: 'Retiros por pagar',       value: pendingWd,   icon: DollarSign, go: 'withdrawals'  },
                          { label: 'Cosplayers activos',      value: cosplayersData.length, icon: Sparkles, go: 'cosplayers' },
                        ].map(c => (
                          <button
                            key={c.label}
                            onClick={() => setCosplaySubTab(c.go as any)}
                            className={`text-left p-4 rounded-2xl border bg-white transition-colors ${
                              c.value > 0 && c.go !== 'cosplayers'
                                ? 'border-[#e5007d]/40 hover:border-[#e5007d]'
                                : 'border-[#e5e5e5] hover:border-[#ccc]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-[#888] leading-tight pr-2">{c.label}</span>
                              <c.icon className={`w-4 h-4 shrink-0 ${c.value > 0 && c.go !== 'cosplayers' ? 'text-[#e5007d]' : 'text-[#ccc]'}`} />
                            </div>
                            <p className={`text-2xl font-black ${c.value > 0 && c.go !== 'cosplayers' ? 'text-[#e5007d]' : 'text-[#111]'}`}>{c.value}</p>
                          </button>
                        ))}
                      </div>

                      {needsAction === 0 && (
                        <p className="mb-5 flex items-center gap-2 text-sm text-green-600 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> Todo al día, no hay nada pendiente por revisar
                        </p>
                      )}

                      {/* Sub-tabs */}
                      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-6 overflow-x-auto w-full lg:w-fit scrollbar-hide">
                        {([
                          { id: 'applications', label: 'Solicitudes',  count: cosplayApps.length,       alert: pendingApps },
                          { id: 'cosplayers',   label: 'Cosplayers',   count: cosplayersData.length,    alert: 0 },
                          { id: 'activities',   label: 'Actividades',  count: cosplayActivities.length, alert: 0 },
                          { id: 'evaluations',  label: 'Evaluaciones', count: cosplaySubs.length,       alert: pendingSubs },
                          { id: 'withdrawals',  label: 'Retiros',      count: (withdrawalsData as any[]).length, alert: pendingWd },
                        ] as const).map(st => (
                          <button
                            key={st.id}
                            onClick={() => setCosplaySubTab(st.id as any)}
                            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${cosplaySubTab === st.id ? 'bg-white text-[#111] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {st.label}
                            <span className="text-xs text-[#aaa]">{st.count}</span>
                            {st.alert > 0 && (
                              <span className="bg-[#e5007d] text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] flex items-center justify-center px-1">
                                {st.alert}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* SOLICITUDES */}
                {cosplaySubTab === 'applications' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {['all','pending','approved','rejected'].map(f => (
                        <button key={f} onClick={() => setCosplayAppFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${cosplayAppFilter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Rechazadas'}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {cosplayApps.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay solicitudes</p>}
                      {cosplayApps.map((app: any) => {
                        const statusLabel = app.status === 'pending' ? 'Pendiente'
                          : app.status === 'approved' ? 'Aprobada' : 'Rechazada';
                        const statusClass = app.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                          : app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                        const socials = [
                          { key: 'instagram', label: 'Instagram' },
                          { key: 'tiktok',    label: 'TikTok'    },
                          { key: 'youtube',   label: 'YouTube'   },
                          { key: 'facebook',  label: 'Facebook'  },
                          { key: 'twitter',   label: 'Twitter/X' },
                        ].filter(r => app[r.key]);

                        return (
                        <div key={app.id} className={`rounded-2xl bg-card border overflow-hidden ${app.status === 'pending' ? 'border-[#e5007d]/30' : 'border-border/50'}`}>
                          <div className="p-5">
                            <div className="flex items-start gap-3.5">
                              {/* Inicial como avatar */}
                              <div className="w-11 h-11 shrink-0 rounded-full bg-[#e5007d]/10 text-[#e5007d] flex items-center justify-center font-black text-base">
                                {(app.fullName ?? '?').charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <p className="font-bold text-[15px]">{app.fullName} {app.lastName}</p>
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                </div>

                                {/* Datos en filas legibles */}
                                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 shrink-0" />{app.email}</span>
                                  <span className="flex items-center gap-1.5 truncate"><Phone className="w-3 h-3 shrink-0" />{app.phone}</span>
                                  <span className="flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3 shrink-0" />{app.city}, {app.country}</span>
                                  <span className="flex items-center gap-1.5 truncate"><Sparkles className="w-3 h-3 shrink-0" />{app.age} años · {app.experience} años de experiencia</span>
                                </div>

                                {/* Redes como pastillas, sin volcar la URL entera */}
                                {socials.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {socials.map(r => (
                                      <a
                                        key={r.key}
                                        href={app[r.key]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#e5e5e5] text-[11px] font-semibold text-[#555] hover:border-[#e5007d] hover:text-[#e5007d] transition-colors"
                                      >
                                        {r.label}
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    ))}
                                  </div>
                                )}

                                {app.whyIsekai && (
                                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2 border-l-2 border-[#e5e5e5] pl-3 italic">
                                    {app.whyIsekai}
                                  </p>
                                )}

                                <button onClick={() => setSelectedApplication(app)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#e5007d] hover:underline">
                                  Ver detalle completo <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {app.status === 'pending' && (
                            <div className="flex flex-col sm:flex-row gap-2 px-5 py-3.5 bg-[#fafafa] border-t border-[#f0f0f0]">
                              <button
                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#111] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#333] transition-colors"
                                onClick={() => { setShowApproveModal(app); setApproveForm({ tier: getTierByFollowers(0), totalFollowers: 0 }); }}
                              >
                                <CheckCircle2 className="w-4 h-4" /> Aprobar
                              </button>
                              <button
                                className="flex-1 flex items-center justify-center gap-1.5 border border-red-200 text-red-500 py-2.5 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors"
                                onClick={() => { setShowRejectModal(app); setRejectReason(''); }}
                              >
                                <X className="w-4 h-4" /> Rechazar
                              </button>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* COSPLAYERS */}
                {cosplaySubTab === 'cosplayers' && (
                  <div>
                    {cosplayersData.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay cosplayers aún</p>}

                    {/* Desktop — tabla */}
                    <div className="hidden sm:block rounded-2xl bg-card border border-border/50 overflow-x-auto">
                      <table style={{ minWidth: '600px', width: '100%' }} className="text-sm">
                        <thead className="bg-muted/40 border-b border-border/50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Nombre artístico</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Tier</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Tickets</th>
                            <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Estado</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {cosplayersData.map((cp: any) => (
                            <tr key={cp.id} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {cp.photo && <img src={cp.photo} className="w-8 h-8 rounded-full object-cover" />}
                                  <span className="font-medium">{cp.artisticName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 capitalize text-sm">{cp.tier ?? 'bronce'}</td>
                              <td className="px-4 py-3 text-primary font-semibold">{cp.ticketBalance ?? 0}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {cp.isActive ? 'Activo' : 'Suspendido'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowTierModal(cp); setTierForm({ tier: cp.tier ?? 'bronce', totalFollowers: cp.totalFollowers ?? 0 }); }}>
                                    <Pencil className="w-3 h-3 mr-1" /> Tier
                                  </Button>
                                  {cp.isActive && (
                                    <Button size="sm" variant="ghost" className="text-xs h-7 text-red-500 hover:text-red-600" onClick={() => { if (confirm(`¿Suspender a ${cp.artisticName}?`)) suspendCp.mutate({ cosplayerId: cp.id }); }}>
                                      <Ban className="w-3 h-3 mr-1" /> Suspender
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => { setGrantTicketsModal(cp); setGrantForm({ basePoints: 100, reason: '' }); }}
                                    className="text-[#e5007d] hover:text-[#c4006b] transition-colors p-1"
                                    title="Dar tickets"
                                  >
                                    <Ticket size={14} />
                                  </button>
                                  <button
                                    onClick={() => { if (confirm(`¿Eliminar permanentemente a ${cp.artisticName}? Esta acción no se puede deshacer.`)) deleteCosplayerMut.mutate({ cosplayerId: cp.id }); }}
                                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                                    title="Eliminar cosplayer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Móvil — cards */}
                    <div className="sm:hidden flex flex-col gap-3">
                      {cosplayersData.map((cp: any) => (
                        <div key={cp.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4">
                          <div className="flex items-center gap-3 mb-3">
                            {cp.photo && <img src={cp.photo} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />}
                            <div className="min-w-0">
                              <p className="font-bold text-[#111] truncate">{cp.artisticName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize bg-muted text-muted-foreground">
                                  {cp.tier ?? 'bronce'}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cp.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                  {cp.isActive ? 'Activo' : 'Suspendido'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-[#999] mb-3">
                            <span className="inline-flex items-center gap-1"><Ticket className="w-3 h-3" />{cp.ticketBalance ?? 0} tickets</span>
                            <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />${parseFloat(cp.cashBalance ?? '0').toFixed(2)} USD</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowTierModal(cp); setTierForm({ tier: cp.tier ?? 'bronce', totalFollowers: cp.totalFollowers ?? 0 }); }}
                              className="flex-1 bg-[#f8f8f8] border border-[#e5e5e5] text-[#111] py-2.5 rounded-xl text-xs font-semibold"
                            >
                              Cambiar tier
                            </button>
                            {cp.isActive && (
                              <button
                                onClick={() => { if (confirm(`¿Suspender a ${cp.artisticName}?`)) suspendCp.mutate({ cosplayerId: cp.id }); }}
                                className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-xl text-xs font-semibold"
                              >
                                Suspender
                              </button>
                            )}
                            <button
                              onClick={() => { setGrantTicketsModal(cp); setGrantForm({ basePoints: 100, reason: '' }); }}
                              className="p-2.5 border border-pink-100 text-[#e5007d] rounded-xl"
                              title="Dar tickets"
                            >
                              <Ticket size={14} />
                            </button>
                            <button
                              onClick={() => { if (confirm(`¿Eliminar a ${cp.artisticName}?`)) deleteCosplayerMut.mutate({ cosplayerId: cp.id }); }}
                              className="p-2.5 border border-red-100 text-red-400 rounded-xl"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ACTIVIDADES */}
                {cosplaySubTab === 'activities' && (
                  <div>
                    <div className="flex justify-end mb-4">
                      <Button className="bg-primary text-white text-xs" onClick={() => { setShowActivityModal(true); setActivityForm({ title: '', description: '', basePoints: 100, type: 'post', deadline: '' }); }}>
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Nueva actividad
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {cosplayActivities.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay actividades</p>}
                      {cosplayActivities.map((act: any) => (
                        <div key={act.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
                          <div>
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="font-medium text-sm">{act.title}</p>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{act.type}</span>
                              {isExpired(act.deadline) && (
                                <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                                  Vencida
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{act.basePoints} pts base{act.deadline ? ` · Hasta ${new Date(act.deadline).toLocaleDateString('es-VE')}` : ''}</p>
                          </div>
                          <button
                            onClick={() => toggleActivity.mutate({ id: act.id, active: !act.active })}
                            className={`relative w-10 h-5 rounded-full transition-colors ${act.active ? "bg-primary" : "bg-muted-foreground/30"}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${act.active ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* EVALUACIONES */}
                {cosplaySubTab === 'evaluations' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {['all','pending','approved','rejected'].map(f => (
                        <button key={f} onClick={() => setCosplaySubFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${cosplaySubFilter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Rechazadas'}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {cosplaySubs.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay submissions</p>}
                      {cosplaySubs.map((sub: any) => {
                        const TIER_COLORS_SUB: Record<string, string> = { bronce: '#cd7f32', plata: '#c0c0c0', oro: '#ffd700', diamante: '#b9f2ff', platino: '#e8e8e8' };
                        let evidenceUrls: string[] = [];
                        try { evidenceUrls = JSON.parse(sub.evidenceUrl); } catch { evidenceUrls = [sub.evidenceUrl]; }
                        return (
                          <div key={sub.id} className="bg-white rounded-2xl border border-[#e5e5e5] p-4 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                              {sub.photo && <img src={sub.photo} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />}
                              <div className="min-w-0 flex-1">
                                <p className="font-black text-[#111] text-sm">{sub.artisticName ?? '—'}</p>
                                <span className="text-xs font-bold capitalize" style={{ color: TIER_COLORS_SUB[sub.tier] ?? '#888' }}>{sub.tier}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-bold flex-shrink-0 ${sub.status === 'pending' ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : sub.status === 'approved' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                                {sub.status === 'pending' ? 'Pendiente' : sub.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                              </span>
                            </div>
                            <div className="bg-[#f8f8f8] rounded-xl p-3 mb-3">
                              <p className="text-xs text-[#999] mb-0.5">Actividad</p>
                              <p className="text-sm font-semibold text-[#111]">{sub.activityTitle ?? '—'}</p>
                              <p className="text-xs text-[#999]">Puntos base: {sub.activityBasePoints}</p>
                            </div>
                            <div className="mb-3">
                              <p className="text-xs text-[#999] mb-1">Evidencia enviada</p>
                              {evidenceUrls.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#e5007d] underline break-all block">{url}</a>
                              ))}
                            </div>
                            <p className="text-xs text-[#999] mb-3">Enviado: {new Date(sub.createdAt).toLocaleDateString('es-VE')}</p>
                            {sub.status === 'pending' && (
                              <Button size="sm" className="w-full bg-[#111] text-white text-sm font-bold" onClick={() => { setShowEvalModal(sub); setEvalForm({ pointsAwarded: sub.activityBasePoints ?? 100, status: 'approved' }); }}>
                                Evaluar y aprobar
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RETIROS */}
                {cosplaySubTab === 'withdrawals' && (
                  <div className="space-y-3">
                    {(withdrawalsData as any[]).length === 0 && (
                      <p className="text-muted-foreground text-sm py-8 text-center">No hay retiros</p>
                    )}
                    {(withdrawalsData as any[]).map((w: any) => (
                      <div key={w.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl bg-card">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : w.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {w.status === 'pending' ? 'Pendiente' : w.status === 'completed' ? 'Completado' : 'Rechazado'}
                            </span>
                            <span className="font-bold text-primary">${parseFloat(w.amount).toFixed(2)} USD</span>
                          </div>
                          <p className="text-sm font-medium">{w.paymentMethod}</p>
                          <p className="text-xs text-muted-foreground">{w.paymentDetails}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{new Date(w.createdAt).toLocaleString('es-VE')}</p>
                        </div>
                        {w.status === 'pending' && (
                          <div className="flex gap-2 ml-4 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              disabled={processWithdrawalMut.isPending}
                              onClick={() => processWithdrawalMut.mutate({ withdrawalId: w.id, status: 'completed' })}
                            >
                              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Pagado
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-400 text-red-500 hover:bg-red-50 text-xs"
                              disabled={processWithdrawalMut.isPending}
                              onClick={() => processWithdrawalMut.mutate({ withdrawalId: w.id, status: 'rejected' })}
                            >
                              <Ban className="w-3.5 h-3.5 mr-1" /> Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Modal detalle solicitud */}
                {selectedApplication && (() => {
                  const TIER_COLORS_MAP: Record<string, string> = { bronce: '#cd7f32', plata: '#c0c0c0', oro: '#ffd700', diamante: '#b9f2ff', platino: '#e8e8e8' };
                  return (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
                        <div className="flex items-center justify-between p-6 border-b border-border/30">
                          <h3 className="text-lg font-black">Solicitud de {selectedApplication.fullName}</h3>
                          <button onClick={() => setSelectedApplication(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-xs text-muted-foreground mb-0.5">Nombre completo</p><p className="font-semibold">{selectedApplication.fullName} {selectedApplication.lastName}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-0.5">Edad</p><p className="font-semibold">{selectedApplication.age} años</p></div>
                            <div><p className="text-xs text-muted-foreground mb-0.5">País / Ciudad</p><p className="font-semibold">{selectedApplication.country}, {selectedApplication.city}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-0.5">Teléfono</p><p className="font-semibold">{selectedApplication.phone}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-0.5">Email</p><p className="font-semibold">{selectedApplication.email}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-0.5">Experiencia</p><p className="font-semibold">{selectedApplication.experience} años</p></div>
                            <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Dirección</p><p className="font-semibold">{selectedApplication.address}</p></div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Redes sociales</p>
                            <div className="flex flex-col gap-2">
                              {['instagram','tiktok','youtube','facebook','twitter'].filter(r => selectedApplication[r]).map(r => (
                                <a key={r} href={selectedApplication[r]} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline capitalize hover:opacity-70">
                                  {r}: {selectedApplication[r]}
                                </a>
                              ))}
                              {!['instagram','tiktok','youtube','facebook','twitter'].some(r => selectedApplication[r]) && (
                                <p className="text-sm text-muted-foreground">No indicó redes sociales.</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Por qué quiere ser representante</p>
                            <p className="text-sm text-foreground leading-relaxed bg-muted/50 rounded-xl p-4">{selectedApplication.whyIsekai}</p>
                          </div>

                          {selectedApplication.status === 'pending' && (
                            <div className="flex gap-3 pt-2">
                              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowApproveModal(selectedApplication); setApproveForm({ tier: getTierByFollowers(0), totalFollowers: 0 }); setSelectedApplication(null); }}>
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Aprobar solicitud
                              </Button>
                              <Button variant="outline" className="flex-1 border-red-400 text-red-500 hover:bg-red-50" onClick={() => { setShowRejectModal(selectedApplication); setRejectReason(''); setSelectedApplication(null); }}>
                                <X className="w-4 h-4 mr-2" /> Rechazar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal aprobar */}
                {showApproveModal && (() => {
                  const TIER_COLORS_MAP: Record<string, string> = { bronce: '#cd7f32', plata: '#c0c0c0', oro: '#ffd700', diamante: '#b9f2ff', platino: '#e8e8e8' };
                  return (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                        <h3 className="font-bold mb-1">Aprobar cosplayer</h3>
                        <p className="text-sm text-muted-foreground mb-5">{showApproveModal.fullName} {showApproveModal.lastName}</p>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Nombre artístico (de la solicitud)</Label>
                            <div className="mt-1 px-3 py-2.5 rounded-xl bg-muted/50 border border-border/30 text-sm font-semibold">
                              {showApproveModal.artisticName ?? `${showApproveModal.fullName} ${showApproveModal.lastName}`}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Seguidores totales (suma de todas las redes)</Label>
                            <Input
                              type="number"
                              placeholder="Ej: 15000"
                              value={approveForm.totalFollowers || ''}
                              onChange={e => {
                                const followers = parseInt(e.target.value) || 0;
                                setApproveForm(f => ({ ...f, totalFollowers: followers, tier: getTierByFollowers(followers) }));
                              }}
                              className="mt-1 bg-muted border-border/50 text-sm"
                            />
                            {approveForm.totalFollowers > 0 && (
                              <p className="text-xs mt-1.5 text-muted-foreground">
                                Tier asignado:{' '}
                                <span className="font-black" style={{ color: TIER_COLORS_MAP[approveForm.tier] }}>
                                  {approveForm.tier.toUpperCase()}
                                </span>
                              </p>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Tier (calculado automáticamente)</Label>
                            <div
                              className="mt-1 px-3 py-2.5 rounded-xl bg-muted border border-border/50 text-sm font-black"
                              style={{ color: TIER_COLORS_MAP[approveForm.tier] }}
                            >
                              {approveForm.tier.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={approveApp.isPending} onClick={() => approveApp.mutate({ applicationId: showApproveModal.id, tier: approveForm.tier as any, totalFollowers: approveForm.totalFollowers })}>
                            {approveApp.isPending ? "Aprobando..." : "Confirmar aprobación"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowApproveModal(null)}>Cancelar</Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal rechazar */}
                {showRejectModal && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                      <h3 className="font-bold mb-4">Rechazar solicitud</h3>
                      <p className="text-sm text-muted-foreground mb-4">{showRejectModal.fullName} {showRejectModal.lastName}</p>
                      <Label className="text-xs">Razón del rechazo *</Label>
                      <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none focus:border-primary resize-none" placeholder="Explica el motivo del rechazo..." />
                      <div className="flex gap-3 mt-4">
                        <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={!rejectReason || rejectApp.isPending} onClick={() => rejectApp.mutate({ applicationId: showRejectModal.id, reason: rejectReason })}>
                          {rejectApp.isPending ? "Rechazando..." : "Confirmar rechazo"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowRejectModal(null)}>Cancelar</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal cambiar tier */}
                {showTierModal && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                      <h3 className="font-bold mb-4">Cambiar tier — {showTierModal.artisticName}</h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Tier</Label>
                          <select value={tierForm.tier} onChange={e => setTierForm(f => ({ ...f, tier: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none">
                            {['bronce','plata','oro','diamante','platino'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                          </select>
                        </div>
                        <div><Label className="text-xs">Seguidores totales</Label><Input type="number" value={tierForm.totalFollowers} onChange={e => setTierForm(f => ({ ...f, totalFollowers: parseInt(e.target.value) || 0 }))} className="mt-1 bg-muted border-border/50 text-sm" /></div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button className="flex-1 bg-primary text-white" onClick={() => updateTier.mutate({ cosplayerId: showTierModal.id, tier: tierForm.tier as any, totalFollowers: tierForm.totalFollowers })} disabled={updateTier.isPending}>
                          Guardar
                        </Button>
                        <Button variant="outline" onClick={() => setShowTierModal(null)}>Cancelar</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal nueva actividad */}
                {showActivityModal && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                      <h3 className="font-bold mb-4">Nueva actividad</h3>
                      <div className="space-y-3">
                        <div><Label className="text-xs">Título *</Label><Input value={activityForm.title} onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" /></div>
                        <div><Label className="text-xs">Descripción</Label><textarea rows={2} value={activityForm.description} onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none resize-none" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><Label className="text-xs">Puntos base</Label><Input type="number" value={activityForm.basePoints} onChange={e => setActivityForm(f => ({ ...f, basePoints: parseInt(e.target.value) || 0 }))} className="mt-1 bg-muted border-border/50 text-sm" /></div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <select value={activityForm.type} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value as any }))} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none">
                              {['post','reel','tiktok','story','event'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div><Label className="text-xs">Fecha límite (opcional)</Label><Input type="datetime-local" value={activityForm.deadline} onChange={e => setActivityForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" /></div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button className="flex-1 bg-primary text-white" disabled={!activityForm.title || createActivity.isPending} onClick={() => createActivity.mutate({ title: activityForm.title, description: activityForm.description || undefined, basePoints: activityForm.basePoints, type: activityForm.type, deadline: activityForm.deadline || undefined })}>
                          {createActivity.isPending ? "Creando..." : "Crear actividad"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowActivityModal(false)}>Cancelar</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal dar tickets manualmente */}
                {grantTicketsModal && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                      <h3 className="text-lg font-black mb-1">Dar tickets manualmente</h3>
                      <p className="text-[#999] text-sm mb-5">
                        Cosplayer: <strong>{grantTicketsModal.artisticName}</strong> —{' '}
                        Tier: <strong className="capitalize">{grantTicketsModal.tier}</strong>
                      </p>
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-sm font-medium block mb-1">Puntos base</label>
                          <input
                            type="number"
                            min={1}
                            value={grantForm.basePoints}
                            onChange={e => setGrantForm({ ...grantForm, basePoints: parseInt(e.target.value) || 1 })}
                            className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]"
                          />
                        </div>
                        <div className="bg-[#f8f8f8] rounded-xl p-4 border border-[#e5e5e5]">
                          <p className="text-xs text-[#999] mb-2">Tickets que recibirá según su tier:</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#999]">
                              {grantForm.basePoints} base × {GRANT_MULTIPLIERS[grantTicketsModal.tier] ?? 1} ({grantTicketsModal.tier})
                            </p>
                            <p className="text-2xl font-black text-[#e5007d]">
                              {Math.round(grantForm.basePoints * (GRANT_MULTIPLIERS[grantTicketsModal.tier] ?? 1))} tickets
                            </p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium block mb-1">Motivo</label>
                          <input
                            type="text"
                            value={grantForm.reason}
                            onChange={e => setGrantForm({ ...grantForm, reason: e.target.value })}
                            placeholder="Ej: Participación en evento, bonus especial..."
                            className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 mt-6">
                        <button
                          onClick={() => setGrantTicketsModal(null)}
                          className="flex-1 border border-[#e5e5e5] text-[#666] py-2.5 rounded-xl text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => grantTicketsMut.mutate({ cosplayerId: grantTicketsModal.id, basePoints: grantForm.basePoints, reason: grantForm.reason })}
                          disabled={!grantForm.reason || grantTicketsMut.isPending}
                          className="flex-1 bg-[#e5007d] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                        >
                          {grantTicketsMut.isPending ? "Otorgando..." : "Otorgar tickets"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal evaluar submission */}
                {showEvalModal && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
                      <h3 className="font-bold mb-2">Evaluar submission</h3>
                      <a href={showEvalModal.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mb-4 hover:underline">
                        <ExternalLink size={12} /> {showEvalModal.evidenceUrl}
                      </a>
                      {(() => {
                        const MULTS: Record<string, number> = { bronce: 1, plata: 1.5, oro: 2, diamante: 3, platino: 5 };
                        const multiplier = MULTS[showEvalModal.tier ?? 'bronce'] ?? 1;
                        const finalPoints = Math.round(evalForm.pointsAwarded * multiplier);
                        return (
                          <div className="space-y-3">
                            <div className="bg-[#f8f8f8] rounded-xl p-4 border border-[#e5e5e5]">
                              <p className="text-xs text-[#999] mb-3">Puntos base de la actividad</p>
                              <Input type="number" min={0} value={evalForm.pointsAwarded} onChange={e => setEvalForm(f => ({ ...f, pointsAwarded: parseInt(e.target.value) || 0 }))} className="bg-white border-border/50 text-sm mb-3" />
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-[#999]">{evalForm.pointsAwarded} base × {multiplier} ({showEvalModal.tier})</p>
                                <div className="text-right">
                                  <p className="text-2xl font-black text-[#e5007d]">{finalPoints}</p>
                                  <p className="text-xs text-[#999]">tickets finales</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={evaluateSub.isPending} onClick={() => evaluateSub.mutate({ submissionId: showEvalModal.id, pointsAwarded: evalForm.pointsAwarded, status: 'approved' })}>
                                {evaluateSub.isPending ? "Guardando..." : "Aprobar"}
                              </Button>
                              <Button variant="outline" onClick={() => setShowEvalModal(null)}>Cancelar</Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}



            {/* ─── Blog Tab ───────────────────────────────────────────────────── */}
            {tab === "blog" && (
              <motion.div key="blog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-[#e5007d]" /> Blog</h1>
                  <div className="flex gap-2">
                    {(['posts', 'categories', 'comments'] as const).map(st => (
                      <button key={st} onClick={() => setBlogSubTab(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${blogSubTab === st ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                        {st === 'posts' ? 'Artículos' : st === 'categories' ? 'Categorías' : 'Comentarios'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUB-TAB: ARTÍCULOS */}
                {blogSubTab === 'posts' && (
                  <div>
                    <div className="flex justify-end mb-4">
                      <Button className="bg-primary text-white" onClick={() => { setBlogPostForm(emptyBlogForm); setEditingBlogPost(null); setBlogModalTab('content'); setShowBlogPostModal(true); }}>
                        <Plus className="w-4 h-4 mr-2" /> Nuevo artículo
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {(blogPostsList as any[]).length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay artículos aún</p>}
                      {(blogPostsList as any[]).map((post: any) => (
                        <div key={post.id} className="p-4 rounded-2xl bg-card border border-border/50 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-semibold truncate">{post.title}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                {post.status === 'published' ? 'Publicado' : 'Borrador'}
                              </span>
                              {post.category && <span className="text-xs text-[#e5007d]">{post.category}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{post.views ?? 0} vistas · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('es-VE') : 'Sin publicar'}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setEditingBlogPost(post); setBlogPostForm({ title: post.title, slug: post.slug, excerpt: post.excerpt ?? '', content: post.content ?? '', coverImage: post.coverImage ?? '', category: post.category ?? '', tags: (post.tags as string[]) ?? [], status: post.status as 'draft' | 'published', authorName: post.authorName ?? 'Isekai World', metaTitle: post.metaTitle ?? '', metaDescription: post.metaDescription ?? '', metaKeywords: post.metaKeywords ?? '' }); setBlogModalTab('content'); setShowBlogPostModal(true); }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { if (confirm('¿Eliminar artículo?')) deleteBlogPostMut.mutate({ id: post.id }); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUB-TAB: CATEGORÍAS */}
                {blogSubTab === 'categories' && (
                  <div>
                    <div className="p-5 rounded-2xl bg-card border border-border/50 mb-6">
                      <h3 className="font-semibold mb-4 text-sm">Nueva categoría</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nombre *</Label>
                          <Input value={blogCategoryForm.name} onChange={e => setBlogCategoryForm(f => ({ ...f, name: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" placeholder="Ej: Cosplay" />
                        </div>
                        <div>
                          <Label className="text-xs">Descripción</Label>
                          <Input value={blogCategoryForm.description} onChange={e => setBlogCategoryForm(f => ({ ...f, description: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" placeholder="Opcional" />
                        </div>
                      </div>
                      <Button size="sm" className="mt-3 bg-primary text-white" disabled={!blogCategoryForm.name || createBlogCategoryMut.isPending} onClick={() => createBlogCategoryMut.mutate(blogCategoryForm)}>
                        <Plus className="w-3 h-3 mr-1" /> Crear categoría
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(blogCategoriesList as any[]).map((cat: any) => (
                        <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
                          <div>
                            <p className="font-medium text-sm">{cat.name}</p>
                            <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => { if (confirm('¿Eliminar categoría?')) deleteBlogCategoryMut.mutate({ id: cat.id }); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {(blogCategoriesList as any[]).length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">No hay categorías</p>}
                    </div>
                  </div>
                )}

                {/* SUB-TAB: COMENTARIOS */}
                {blogSubTab === 'comments' && (
                  <div className="space-y-3">
                    {(blogCommentsList as any[]).length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay comentarios</p>}
                    {(blogCommentsList as any[]).map((c: any) => (
                      <div key={c.id} className="p-4 rounded-2xl bg-card border border-border/50">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold text-sm">{c.guestName ?? 'Usuario'}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.status === 'approved' ? 'bg-green-100 text-green-700' : c.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                              <span className="text-xs text-muted-foreground">Post #{c.postId}</span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">{c.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(c.createdAt).toLocaleString('es-VE')}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {c.status !== 'approved' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8" onClick={() => updateBlogCommentMut.mutate({ id: c.id, status: 'approved' })}>Aprobar</Button>
                            )}
                            {c.status !== 'rejected' && (
                              <Button size="sm" variant="outline" className="border-red-400 text-red-500 text-xs h-8" onClick={() => updateBlogCommentMut.mutate({ id: c.id, status: 'rejected' })}>Rechazar</Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => { if (confirm('¿Eliminar?')) deleteBlogCommentMut.mutate({ id: c.id }); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Modal crear/editar artículo */}
                {showBlogPostModal && (
                  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
                      <div className="flex items-center justify-between p-5 border-b border-border/30">
                        <h2 className="text-lg font-bold">{editingBlogPost ? 'Editar artículo' : 'Nuevo artículo'}</h2>
                        <div className="flex gap-3 items-center">
                          <div className="flex gap-1">
                            {(['content', 'seo'] as const).map(t => (
                              <button key={t} onClick={() => setBlogModalTab(t)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${blogModalTab === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                {t === 'content' ? 'Contenido' : 'SEO'}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => { setShowBlogPostModal(false); setEditingBlogPost(null); }} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        {blogModalTab === 'content' && (
                          <>
                            <div>
                              <Label className="text-xs">Título *</Label>
                              <Input value={blogPostForm.title} onChange={e => { const t = e.target.value; const slug = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); setBlogPostForm(f => ({ ...f, title: t, slug: editingBlogPost ? f.slug : slug })); }} className="mt-1 bg-muted border-border/50 text-sm" placeholder="Título del artículo" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Slug</Label>
                                <Input value={blogPostForm.slug} onChange={e => setBlogPostForm(f => ({ ...f, slug: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm font-mono" />
                              </div>
                              <div>
                                <Label className="text-xs">Categoría</Label>
                                <Select value={blogPostForm.category || 'none'} onValueChange={v => setBlogPostForm(f => ({ ...f, category: v === 'none' ? '' : v }))}>
                                  <SelectTrigger className="mt-1 bg-muted border-border/50 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin categoría</SelectItem>
                                    {(blogCategoriesList as any[]).map((cat: any) => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Autor</Label>
                                <Input value={blogPostForm.authorName} onChange={e => setBlogPostForm(f => ({ ...f, authorName: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" />
                              </div>
                              <div>
                                <Label className="text-xs">Estado</Label>
                                <Select value={blogPostForm.status} onValueChange={v => setBlogPostForm(f => ({ ...f, status: v as 'draft' | 'published' }))}>
                                  <SelectTrigger className="mt-1 bg-muted border-border/50 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Borrador</SelectItem>
                                    <SelectItem value="published">Publicado</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Imagen de portada</Label>
                              <div className="flex items-center gap-2 mt-1">
                                {blogPostForm.coverImage && <img src={blogPostForm.coverImage} className="w-20 h-14 rounded-lg object-cover border border-border/40 shrink-0" alt="" />}
                                <Input value={blogPostForm.coverImage} onChange={e => setBlogPostForm(f => ({ ...f, coverImage: e.target.value }))} className="bg-muted border-border/50 text-sm" placeholder="URL de la imagen..." />
                                <label className="cursor-pointer shrink-0">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 ${blogImageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {blogImageUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    {blogImageUploading ? 'Subiendo...' : 'Subir'}
                                  </span>
                                  <input type="file" accept="image/*" className="hidden" disabled={blogImageUploading} onChange={async e => {
                                    const file = e.target.files?.[0]; if (!file) return;
                                    setBlogImageUploading(true);
                                    try {
                                      const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = ev => res((ev.target?.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
                                      const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                                      setBlogPostForm(f => ({ ...f, coverImage: url })); toast.success('Imagen subida');
                                    } catch { toast.error('Error al subir imagen'); } finally { setBlogImageUploading(false); }
                                  }} />
                                </label>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Extracto / Resumen</Label>
                              <textarea value={blogPostForm.excerpt} onChange={e => setBlogPostForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none focus:border-primary resize-none" placeholder="Breve descripción del artículo..." />
                            </div>
                            <div>
                              <Label className="text-xs">Tags</Label>
                              <div className="mt-1 flex flex-wrap gap-1.5 mb-2">
                                {blogPostForm.tags.map(tag => (
                                  <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                    {tag}<button onClick={() => setBlogPostForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}><X className="w-3 h-3" /></button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input value={blogTagInput} onChange={e => setBlogTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && blogTagInput.trim()) { e.preventDefault(); setBlogPostForm(f => ({ ...f, tags: [...f.tags, blogTagInput.trim()] })); setBlogTagInput(''); } }} className="bg-muted border-border/50 text-sm" placeholder="Escribe un tag y pulsa Enter..." />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Contenido (HTML)</Label>
                              <textarea value={blogPostForm.content} onChange={e => setBlogPostForm(f => ({ ...f, content: e.target.value }))} rows={12} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm font-mono outline-none focus:border-primary resize-y" placeholder="<p>Contenido del artículo en HTML...</p>" />
                            </div>
                          </>
                        )}

                        {blogModalTab === 'seo' && (
                          <>
                            <div>
                              <Label className="text-xs">Meta título</Label>
                              <Input value={blogPostForm.metaTitle} onChange={e => setBlogPostForm(f => ({ ...f, metaTitle: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" placeholder="Título para Google..." />
                              <p className="text-xs text-muted-foreground mt-1">{blogPostForm.metaTitle.length}/60 caracteres</p>
                            </div>
                            <div>
                              <Label className="text-xs">Meta descripción</Label>
                              <textarea value={blogPostForm.metaDescription} onChange={e => setBlogPostForm(f => ({ ...f, metaDescription: e.target.value }))} rows={3} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none focus:border-primary resize-none" placeholder="Descripción para Google (150-160 caracteres)..." />
                              <p className="text-xs text-muted-foreground mt-1">{blogPostForm.metaDescription.length}/160 caracteres</p>
                            </div>
                            <div>
                              <Label className="text-xs">Keywords</Label>
                              <Input value={blogPostForm.metaKeywords} onChange={e => setBlogPostForm(f => ({ ...f, metaKeywords: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" placeholder="cosplay, anime, impresión 3D..." />
                            </div>
                          </>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-border/30">
                          <Button className="bg-primary text-white flex-1" disabled={!blogPostForm.title || createBlogPostMut.isPending || updateBlogPostMut.isPending} onClick={() => {
                            const blogData = { ...blogPostForm, category: blogPostForm.category === 'none' ? '' : blogPostForm.category };
                            if (editingBlogPost) updateBlogPostMut.mutate({ id: editingBlogPost.id, ...blogData });
                            else createBlogPostMut.mutate(blogData);
                          }}>
                            {(createBlogPostMut.isPending || updateBlogPostMut.isPending) ? 'Guardando...' : editingBlogPost ? 'Actualizar' : 'Publicar'}
                          </Button>
                          <Button variant="outline" onClick={() => { setShowBlogPostModal(false); setEditingBlogPost(null); }}>Cancelar</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Gift Cards Tab ─────────────────────────────────────────────── */}
            {tab === "giftcards" && (
              <motion.div key="giftcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full overflow-hidden">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="w-6 h-6 text-[#e5007d]" /> Tarjetas de regalo</h1>
                  <Button className="bg-primary text-white" onClick={() => { setShowNewGiftCard(true); setGeneratedCodes([]); }}>
                    <Plus className="w-4 h-4 mr-2" /> Nueva tarjeta
                  </Button>
                </div>

                {/* Selección múltiple */}
                {(giftCardsList as any[]).length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#e5007d]"
                        checked={selectedGiftCards.length === (giftCardsList as any[]).length}
                        onChange={(e) =>
                          setSelectedGiftCards(e.target.checked ? (giftCardsList as any[]).map(c => c.id) : [])
                        }
                      />
                      Seleccionar todas
                    </label>
                    <span className="text-xs text-[#888]">
                      {selectedGiftCards.length} de {(giftCardsList as any[]).length} seleccionada(s)
                    </span>
                    {selectedGiftCards.length > 0 && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar ${selectedGiftCards.length} tarjeta(s)? Esta acción no se puede deshacer.`)) {
                            deleteGiftCardsMut.mutate({ ids: selectedGiftCards });
                          }
                        }}
                        disabled={deleteGiftCardsMut.isPending}
                        className="ml-auto flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleteGiftCardsMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Eliminar seleccionadas
                      </button>
                    )}
                  </div>
                )}

                {/* Lista de tarjetas */}
                <div className="space-y-3">
                  {(giftCardsList as any[]).length === 0 && (
                    <p className="text-muted-foreground text-sm py-8 text-center">No hay tarjetas de regalo</p>
                  )}
                  {(giftCardsList as any[]).map((card: any) => (
                    <div key={card.id} className="p-4 rounded-2xl bg-card border border-border/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 accent-[#e5007d]"
                          aria-label={`Seleccionar ${card.code}`}
                          checked={selectedGiftCards.includes(card.id)}
                          onChange={(e) =>
                            setSelectedGiftCards(prev =>
                              e.target.checked ? [...prev, card.id] : prev.filter(id => id !== card.id)
                            )
                          }
                        />
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${card.status === 'used' ? 'bg-red-400' : 'bg-green-400'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-mono font-bold tracking-widest text-[#e5007d]">{card.code}</p>
                            <button onClick={() => navigator.clipboard.writeText(card.code)} className="text-muted-foreground hover:text-foreground">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-sm font-semibold">
                              {card.discountType === 'percent'
                                ? `${parseFloat(card.discountPercent ?? '0').toFixed(0)}% dto.`
                                : `$${parseFloat(card.amount).toFixed(2)} USD`}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${card.status === 'used' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                              {card.status === 'used' ? 'Agotada' : 'Activa'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {card.currentUses ?? 0}/{card.maxUses ?? 1} usos
                            </span>
                            {card.expiresAt && (
                              <span className="text-xs text-muted-foreground">
                                Vence {new Date(card.expiresAt).toLocaleDateString('es-VE')}
                              </span>
                            )}
                            {card.notes && <span className="text-xs text-muted-foreground italic">{card.notes}</span>}
                          </div>
                        </div>
                      </div>
                      {card.status !== 'used' && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                          onClick={() => { if (confirm('¿Eliminar esta tarjeta?')) deleteGiftCardMut.mutate({ id: card.id }); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Modal nueva tarjeta */}
                {showNewGiftCard && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-black text-lg">Nueva tarjeta de regalo</h3>
                        <button onClick={() => { setShowNewGiftCard(false); setGeneratedCodes([]); }}>
                          <X size={20} className="text-[#999]" />
                        </button>
                      </div>

                      {generatedCodes.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold mb-3 text-green-600">{generatedCodes.length} código(s) generado(s) — cópialos ahora:</p>
                          <div className="flex flex-col gap-2 mb-4">
                            {generatedCodes.map(code => (
                              <div key={code} className="flex items-center justify-between bg-[#f8f8f8] rounded-xl px-4 py-3">
                                <code className="text-[#e5007d] font-black tracking-widest">{code}</code>
                                <button onClick={() => navigator.clipboard.writeText(code)} className="text-[#999] hover:text-[#111] flex items-center gap-1 text-xs">
                                  <Copy size={14} /> Copiar
                                </button>
                              </div>
                            ))}
                            <button onClick={() => navigator.clipboard.writeText(generatedCodes.join('\n'))}
                              className="w-full border border-[#e5e5e5] text-[#666] py-2 rounded-xl text-sm mt-2">
                              Copiar todos
                            </button>
                          </div>
                          <button onClick={() => { setShowNewGiftCard(false); setGeneratedCodes([]); setGiftCardForm(emptyGiftCardForm); }}
                            className="w-full bg-[#111] text-white py-3 rounded-xl font-bold">Listo</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="text-sm font-medium block mb-2">Tipo de descuento</label>
                            <div className="grid grid-cols-2 gap-2">
                              {(['fixed', 'percent'] as const).map(t => (
                                <button key={t} onClick={() => setGiftCardForm(f => ({ ...f, discountType: t }))}
                                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-colors ${giftCardForm.discountType === t ? 'border-[#111] bg-[#111] text-white' : 'border-[#e5e5e5] text-[#666]'}`}>
                                  {t === 'fixed' ? 'Monto fijo (USD)' : 'Porcentaje (%)'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-1">
                              {giftCardForm.discountType === 'fixed' ? 'Monto (USD)' : 'Porcentaje de descuento'}
                            </label>
                            <input type="number"
                              min={giftCardForm.discountType === 'percent' ? 1 : 0.01}
                              max={giftCardForm.discountType === 'percent' ? 100 : undefined}
                              step={giftCardForm.discountType === 'fixed' ? '0.01' : '1'}
                              value={giftCardForm.discountType === 'fixed' ? giftCardForm.amount : giftCardForm.discountPercent}
                              onChange={e => giftCardForm.discountType === 'fixed'
                                ? setGiftCardForm(f => ({ ...f, amount: e.target.value }))
                                : setGiftCardForm(f => ({ ...f, discountPercent: e.target.value, amount: e.target.value }))}
                              placeholder={giftCardForm.discountType === 'fixed' ? 'Ej: 25.00' : 'Ej: 10'}
                              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium block mb-1">Cantidad de códigos</label>
                              <input type="number" min={1} max={50} value={giftCardForm.quantity}
                                onChange={e => setGiftCardForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                            </div>
                            <div>
                              <label className="text-sm font-medium block mb-1">Usos por código</label>
                              <input type="number" min={1} value={giftCardForm.maxUses}
                                onChange={e => setGiftCardForm(f => ({ ...f, maxUses: parseInt(e.target.value) || 1 }))}
                                className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-1">Monto mínimo de compra (USD)</label>
                            <input type="number" min={0} step="0.01" value={giftCardForm.minOrderAmount}
                              onChange={e => setGiftCardForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                              placeholder="0 = sin mínimo"
                              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-1">Fecha de expiración (opcional)</label>
                            <input type="datetime-local" value={giftCardForm.expiresAt}
                              onChange={e => setGiftCardForm(f => ({ ...f, expiresAt: e.target.value }))}
                              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                          </div>

                          <div className="flex items-center justify-between p-4 bg-[#f8f8f8] rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-[#111]">Solo nuevos clientes</p>
                              <p className="text-xs text-[#999]">El código solo funciona para quien nunca ha comprado</p>
                            </div>
                            <button onClick={() => setGiftCardForm(f => ({ ...f, onlyNewUsers: !f.onlyNewUsers }))}
                              className={`w-12 h-6 rounded-full transition-colors relative ${giftCardForm.onlyNewUsers ? 'bg-[#e5007d]' : 'bg-[#e5e5e5]'}`}>
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${giftCardForm.onlyNewUsers ? 'left-6' : 'left-0.5'}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-4 bg-[#f8f8f8] rounded-xl">
                            <div>
                              <p className="text-sm font-medium text-[#111]">Un uso por usuario</p>
                              <p className="text-xs text-[#999]">Cada usuario solo puede usar este código una vez, sin importar cuántas veces se use en total</p>
                            </div>
                            <button onClick={() => setGiftCardForm(f => ({ ...f, oncePerUser: !f.oncePerUser }))}
                              className={`w-12 h-6 rounded-full transition-colors relative ${giftCardForm.oncePerUser ? 'bg-[#e5007d]' : 'bg-[#e5e5e5]'}`}>
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${giftCardForm.oncePerUser ? 'left-6' : 'left-0.5'}`} />
                            </button>
                          </div>

                          <div>
                            <label className="text-sm font-medium block mb-1">Notas (opcional)</label>
                            <input type="text" value={giftCardForm.notes}
                              onChange={e => setGiftCardForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Ej: Promoción navideña"
                              className="w-full border border-[#e5e5e5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#111]" />
                          </div>

                          <div className="flex gap-3 mt-2">
                            <button onClick={() => setShowNewGiftCard(false)}
                              className="flex-1 border border-[#e5e5e5] text-[#666] py-3 rounded-xl text-sm">Cancelar</button>
                            <button
                              onClick={() => {
                                // Guarda contra el doble clic: si ya está corriendo, no reenvía
                                if (createGiftCardMutation.isPending) return;
                                if (giftCardForm.quantity > 1 &&
                                    !confirm(`Se van a generar ${giftCardForm.quantity} códigos distintos. ¿Continuar?`)) return;
                                createGiftCardMutation.mutate({
                                amount: parseFloat(giftCardForm.amount) || 0,
                                discountType: giftCardForm.discountType,
                                discountPercent: parseFloat(giftCardForm.discountPercent) || 0,
                                maxUses: giftCardForm.maxUses,
                                minOrderAmount: parseFloat(giftCardForm.minOrderAmount) || 0,
                                expiresAt: giftCardForm.expiresAt || undefined,
                                onlyNewUsers: giftCardForm.onlyNewUsers,
                                oncePerUser: giftCardForm.oncePerUser,
                                notes: giftCardForm.notes,
                                quantity: giftCardForm.quantity,
                                });
                              }}
                              disabled={!giftCardForm.amount || createGiftCardMutation.isPending}
                              className="flex-1 bg-[#e5007d] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                              {createGiftCardMutation.isPending
                                ? 'Generando...'
                                : giftCardForm.quantity > 1
                                  ? `Generar ${giftCardForm.quantity} códigos`
                                  : 'Generar 1 código'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
