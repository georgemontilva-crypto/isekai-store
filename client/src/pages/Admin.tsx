import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, TrendingUp, Users,
  Plus, Pencil, Trash2, Check, X, Upload, ChevronDown, Loader2,
  DollarSign, ArrowUpRight, Lock, CheckCircle2, Settings, Instagram, ExternalLink, Save,
  Facebook, Twitter, Youtube, Megaphone, XCircle, Search, HelpCircle,
  CreditCard, Eye, CheckCheck, Ban, MessageCircle, Link2, ChevronUp, Sparkles,
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
import { getLoginUrl } from "@/const";

type AdminTab = "dashboard" | "products" | "categories" | "orders" | "payments" | "settings" | "faq" | "linkbio" | "users" | "popups" | "cosplay";

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
                  {v.price && <span className="ml-2 text-primary">${parseFloat(v.price).toFixed(2)}</span>}
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

  const isShippedOrLater = ["shipped", "delivered"].includes(pendingStatus);

  return (
    <div className="border-t border-border/30 pt-4 mt-3 space-y-5">
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
                <span className="font-semibold shrink-0">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
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

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [igToken, setIgToken] = useState("");
  const [igUsername, setIgUsername] = useState("");
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
  const [cosplaySubTab, setCosplaySubTab] = useState<'applications'|'cosplayers'|'activities'|'evaluations'>('applications');
  const [cosplayAppFilter, setCosplayAppFilter] = useState('pending');
  const [cosplaySubFilter, setCosplaySubFilter] = useState('pending');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState<any>(null);
  const [approveForm, setApproveForm] = useState({ artisticName: '', tier: 'bronce', totalFollowers: 0 });
  const [rejectReason, setRejectReason] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ title: '', description: '', basePoints: 100, type: 'post' as const, deadline: '' });
  const [showEvalModal, setShowEvalModal] = useState<any>(null);
  const [evalForm, setEvalForm] = useState({ pointsAwarded: 0, status: 'approved' as 'approved' | 'rejected' });
  const [showTierModal, setShowTierModal] = useState<any>(null);
  const [tierForm, setTierForm] = useState({ tier: 'bronce', totalFollowers: 0 });

  // Popups state
  const emptyPopupForm = {
    name: "", active: false, title: "", subtitle: "", bodyText: "", buttonText: "", buttonUrl: "",
    image: "", showEmail: false, couponCode: "", triggerType: "time" as const,
    triggerDelay: 3, triggerPage: "", triggerProductId: "" as string | number,
    showOnce: true, position: "center" as const, startDate: "", endDate: "",
  };
  const [showPopupModal, setShowPopupModal] = useState(false);
  const [editingPopup, setEditingPopup] = useState<any | null>(null);
  const [popupForm, setPopupForm] = useState<typeof emptyPopupForm>(emptyPopupForm);
  const [popupImageUploading, setPopupImageUploading] = useState(false);

  // Queries
  const { data: metrics } = trpc.admin.metrics.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: productsData, refetch: refetchProducts } = trpc.products.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: categories, refetch: refetchCategories } = trpc.categories.list.useQuery();
  const { data: ordersData, refetch: refetchOrders } = trpc.orders.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

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
  const createActivity = trpc.cosplay.createActivity.useMutation({ onSuccess: () => { refetchActivities(); setShowActivityModal(false); toast.success("Actividad creada"); } });
  const toggleActivity = trpc.cosplay.toggleActivity.useMutation({ onSuccess: () => refetchActivities() });
  const evaluateSub = trpc.cosplay.evaluateSubmission.useMutation({ onSuccess: () => { refetchSubs(); setShowEvalModal(null); toast.success("Evaluación guardada"); } });

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
    { id: "settings" as AdminTab, label: "Configuración", icon: Settings },
    { id: "faq" as AdminTab,      label: "FAQ",           icon: HelpCircle },
    { id: "linkbio" as AdminTab,  label: "LinkBio",       icon: Link2 },
    { id: "users" as AdminTab,    label: "Usuarios",      icon: Users },
    { id: "popups" as AdminTab,   label: "Popups",        icon: Megaphone },
    { id: "cosplay" as AdminTab,  label: "Cosplay Guild", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen pt-16">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border fixed top-16 left-0 bottom-0 overflow-y-auto z-40">
          <div className="p-4">
            <p className="text-xs font-medium !text-white uppercase tracking-wider mb-3 px-2">Panel Admin</p>
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tab === t.id
                      ? "bg-white/20 !text-white hover:bg-white/25"
                      : "!text-white hover:bg-white/10"
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{t.label}</span>
                  {t.id === "orders" && pendingCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                  {t.id === "cosplay" && pendingCosplayCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {pendingCosplayCount > 99 ? "99+" : pendingCosplayCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-56 flex-1 p-6 min-h-screen">
          <AnimatePresence mode="wait">
            {/* ─── Dashboard ──────────────────────────────────────────────────── */}
            {tab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

                {/* Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Ingresos totales", value: `$${(metrics?.totalRevenue ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
                    { label: "Total pedidos", value: metrics?.totalOrders ?? 0, icon: ShoppingBag, color: "text-primary" },
                    { label: "Productos", value: products.length, icon: Package, color: "text-accent" },
                    { label: "Categorías", value: categories?.length ?? 0, icon: Tag, color: "text-yellow-400" },
                  ].map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-5 rounded-2xl bg-card border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">{m.label}</span>
                        <m.icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                      <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Recent orders */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-card border border-border/50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Pedidos recientes
                    </h3>
                    <div className="space-y-3">
                      {(metrics?.recentOrders ?? []).map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between text-sm">
                          <div>
                            <p className="font-medium">{order.orderNumber}</p>
                            <p className="text-muted-foreground text-xs">{order.customerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-primary font-semibold">${parseFloat(order.total).toFixed(2)}</p>
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

                  <div className="p-5 rounded-2xl bg-card border border-border/50">
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
                          <p className="text-primary font-semibold">${parseFloat(p.revenue).toFixed(2)}</p>
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
              <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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

                <div className="space-y-3">
                  {filteredProducts.length === 0 && productSearch && (
                    <p className="text-center text-[#999] text-sm py-8">
                      No se encontraron productos para "{productSearch}"
                    </p>
                  )}
                  {filteredProducts.map((product) => (
                    <div key={product.id}>
                      <div className="p-4 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <p className="font-medium truncate">{product.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${product.status === "published" ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                                {product.status === "published" ? "Publicado" : "Borrador"}
                              </span>
                              {product.featured && <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">Destacado</span>}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              ${parseFloat(product.price).toFixed(2)} · Stock: {product.stock} · {product.category?.name ?? "Sin categoría"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => { setEditingProduct(product); setShowProductForm(false); }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
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
                  {products.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay productos aún</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ─── Categories ─────────────────────────────────────────────────── */}
            {tab === "categories" && (
              <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold mb-6">Pedidos</h1>
                <div className="relative mb-4">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo o número de orden..."
                    value={orderSearch}
                    onChange={e => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#e5e5e5] rounded-lg outline-none focus:border-[#111] transition-colors"
                  />
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
                            <div>
                              <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <span className="font-semibold">{order.orderNumber}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0f0f0] text-[#555]">
                                  {statusLabels[order.status] ?? order.status}
                                </span>
                                {order.status === "cancelled" && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Cancelada</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{order.customerName} · {order.customerEmail}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleString("es-CO")}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-base">${parseFloat(order.total).toFixed(2)}</span>
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
              </motion.div>
            )}
          </AnimatePresence>
            {/* ─── Payments Tab ───────────────────────────────────────────────── */}
            {tab === "payments" && (
              <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h1 className="text-2xl font-bold">Pagos</h1>
                  <div className="flex gap-2 flex-wrap">
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
                              <p className="text-xs text-muted-foreground truncate">{order.customerName} · {order.customerEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4 shrink-0">
                            <span className="font-bold text-primary text-sm">${parseFloat(order.total).toFixed(2)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[order.paymentStatus ?? "pending"]}`}>
                              {statusLabels[order.paymentStatus ?? "pending"]}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
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

                            {order.paymentStatus === "verifying" && (
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  disabled={verifyPayment.isPending}
                                  onClick={() => verifyPayment.mutate({ orderId: order.id, approved: true })}
                                >
                                  <CheckCheck className="w-4 h-4 mr-1.5" /> Aprobar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/40 text-red-400 hover:bg-red-500/10"
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

                  {/* Logo light (navbar) */}
                  <div className="mb-5">
                    <Label className="text-sm font-medium">Logo principal (navbar, fondo claro)</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">Versión para fondo blanco — PNG con transparencia recomendado</p>
                    <div className="flex items-start gap-3">
                      {(bannerDrafts["store_logo_url"] || siteSettings?.["store_logo_url"]) && (
                        <div className="w-20 h-20 rounded-xl border border-border/50 bg-[#f5f5f5] flex items-center justify-center overflow-hidden shrink-0">
                          <img src={bannerDrafts["store_logo_url"] ?? siteSettings?.["store_logo_url"]} className="w-full h-full object-contain p-1" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          placeholder="https://... o sube una imagen"
                          value={bannerDrafts["store_logo_url"] ?? siteSettings?.["store_logo_url"] ?? ""}
                          onChange={(e) => setBannerDrafts(d => ({ ...d, store_logo_url: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                          try {
                            const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                            setBannerDrafts(d => ({ ...d, store_logo_url: url }));
                            upsertSetting.mutate({ key: "store_logo_url", value: url });
                            toast.success("Logo subido");
                          } catch { toast.error("Error al subir logo"); }
                        }} />
                      </label>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["store_logo_url"] ?? siteSettings?.["store_logo_url"] ?? "";
                          if (val) upsertSetting.mutate({ key: "store_logo_url", value: val });
                        }}
                        disabled={!(bannerDrafts["store_logo_url"] ?? siteSettings?.["store_logo_url"])}
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

                  {/* Logo dark (footer) */}
                  <div className="mt-5">
                    <Label className="text-sm font-medium">Logo oscuro (footer, fondo negro)</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">Versión blanca o clara del logo para el footer — si no hay, se usa el logo principal</p>
                    <div className="flex items-start gap-3">
                      {(bannerDrafts["store_logo_dark_url"] || siteSettings?.["store_logo_dark_url"]) && (
                        <div className="w-20 h-20 rounded-xl border border-border/50 bg-[#1a1a1a] flex items-center justify-center overflow-hidden shrink-0">
                          <img src={bannerDrafts["store_logo_dark_url"] ?? siteSettings?.["store_logo_dark_url"]} className="w-full h-full object-contain p-1" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          placeholder="https://... o sube una imagen"
                          value={bannerDrafts["store_logo_dark_url"] ?? siteSettings?.["store_logo_dark_url"] ?? ""}
                          onChange={(e) => setBannerDrafts(d => ({ ...d, store_logo_dark_url: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                          try {
                            const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                            setBannerDrafts(d => ({ ...d, store_logo_dark_url: url }));
                            upsertSetting.mutate({ key: "store_logo_dark_url", value: url });
                            toast.success("Logo oscuro subido");
                          } catch { toast.error("Error al subir logo"); }
                        }} />
                      </label>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["store_logo_dark_url"] ?? siteSettings?.["store_logo_dark_url"] ?? "";
                          if (val) upsertSetting.mutate({ key: "store_logo_dark_url", value: val });
                        }}
                        disabled={!(bannerDrafts["store_logo_dark_url"] ?? siteSettings?.["store_logo_dark_url"])}
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

                  {/* Image upload */}
                  <div className="mt-4">
                    <Label className="text-xs font-medium">Imagen</Label>
                    <div className="flex gap-2 mt-1 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="URL de imagen o sube un archivo"
                          value={bannerDrafts["brand_story_image"] ?? siteSettings?.["brand_story_image"] ?? ""}
                          onChange={(e) => setBannerDrafts(d => ({ ...d, brand_story_image: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                        {(bannerDrafts["brand_story_image"] || siteSettings?.["brand_story_image"]) && (
                          <img
                            src={bannerDrafts["brand_story_image"] ?? siteSettings?.["brand_story_image"]}
                            className="mt-2 h-24 w-40 object-cover rounded-lg border border-border/30"
                          />
                        )}
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            try {
                              const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                              setBannerDrafts(d => ({ ...d, brand_story_image: url }));
                              upsertSetting.mutate({ key: "brand_story_image", value: url });
                              toast.success("Imagen subida");
                            } catch {
                              toast.error("Error al subir imagen");
                            }
                          }}
                        />
                      </label>
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["brand_story_image"] ?? siteSettings?.["brand_story_image"] ?? "";
                          if (val) upsertSetting.mutate({ key: "brand_story_image", value: val });
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
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

                {/* WhatsApp de atención al cliente */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-[#25D366]" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Atención al cliente</h3>
                      <p className="text-xs text-muted-foreground">Número de WhatsApp para recibir pedidos</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Número de WhatsApp (con código de país, sin +)</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">Ej: 584141234567</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="584141234567"
                        defaultValue={siteSettings?.["whatsapp_number"] ?? ""}
                        onChange={(e) => setBannerDrafts(d => ({ ...d, whatsapp_number: e.target.value }))}
                        className="bg-muted border-border/50"
                      />
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => {
                          const val = bannerDrafts["whatsapp_number"] !== undefined ? bannerDrafts["whatsapp_number"] : siteSettings?.["whatsapp_number"] ?? "";
                          if (val) upsertSetting.mutate({ key: "whatsapp_number", value: val });
                        }}
                        disabled={!(bannerDrafts["whatsapp_number"] !== undefined ? bannerDrafts["whatsapp_number"] : siteSettings?.["whatsapp_number"])}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
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
                      <Label className="text-xs font-medium">Imagen del banner</Label>
                      <div className="flex items-start gap-2 mt-1">
                        <div className="flex-1">
                          <Input
                            placeholder="https://... o sube una imagen"
                            value={bannerDrafts["product_sidebar_banner_image"] ?? siteSettings?.["product_sidebar_banner_image"] ?? ""}
                            onChange={(e) => setBannerDrafts(d => ({ ...d, product_sidebar_banner_image: e.target.value }))}
                            className="bg-muted border-border/50 text-sm"
                          />
                          {(bannerDrafts["product_sidebar_banner_image"] || siteSettings?.["product_sidebar_banner_image"]) && (
                            <img src={bannerDrafts["product_sidebar_banner_image"] ?? siteSettings?.["product_sidebar_banner_image"]} className="mt-2 h-28 w-full object-cover rounded-lg border border-border/30" />
                          )}
                        </div>
                        <label className="cursor-pointer shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                            <Upload className="w-3.5 h-3.5" /> Subir
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                            });
                            try {
                              const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                              setBannerDrafts(d => ({ ...d, product_sidebar_banner_image: url }));
                              upsertSetting.mutate({ key: "product_sidebar_banner_image", value: url });
                              toast.success("Banner subido");
                            } catch { toast.error("Error al subir imagen"); }
                          }} />
                        </label>
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => {
                            const val = bannerDrafts["product_sidebar_banner_image"] ?? siteSettings?.["product_sidebar_banner_image"] ?? "";
                            if (val) upsertSetting.mutate({ key: "product_sidebar_banner_image", value: val });
                          }}
                          disabled={!(bannerDrafts["product_sidebar_banner_image"] ?? siteSettings?.["product_sidebar_banner_image"])}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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
                    const imgKey = `hero_slide_${n}_image`;
                    const currentImg = bannerDrafts[imgKey] ?? siteSettings?.[imgKey] ?? "";
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
                        <div>
                          <Label className="text-xs font-medium">Imagen del slide</Label>
                          <div className="flex items-start gap-2 mt-1">
                            <div className="flex-1">
                              <Input
                                placeholder="https://... o sube una imagen"
                                value={currentImg}
                                onChange={(e) => setBannerDrafts(d => ({ ...d, [imgKey]: e.target.value }))}
                                className="bg-muted border-border/50 text-sm"
                              />
                              {currentImg && (
                                <img src={currentImg} className="mt-2 h-20 w-full object-cover rounded-lg border border-border/30" />
                              )}
                            </div>
                            <label className="cursor-pointer shrink-0">
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                                <Upload className="w-3.5 h-3.5" /> Subir
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const base64 = await new Promise<string>((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(file);
                                  });
                                  try {
                                    const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                                    setBannerDrafts(d => ({ ...d, [imgKey]: url }));
                                    upsertSetting.mutate({ key: imgKey, value: url });
                                    toast.success("Imagen subida");
                                  } catch {
                                    toast.error("Error al subir imagen");
                                  }
                                }}
                              />
                            </label>
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground shrink-0"
                              onClick={() => { if (currentImg) upsertSetting.mutate({ key: imgKey, value: currentImg }); }}
                              disabled={!currentImg}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
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

                {/* 8. Sale Banners — full width */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 lg:col-span-2">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Banners de Ofertas</h3>
                      <p className="text-xs text-muted-foreground">3 imágenes para el slider de ofertas en la home. Solo imagen, sin texto.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((n) => {
                      const k = `sale_banner_${n}_image`;
                      const current = bannerDrafts[k] ?? siteSettings?.[k] ?? "";
                      return (
                        <div key={k}>
                          <Label className="text-xs font-medium">Banner {n}</Label>
                          <div className="flex items-start gap-2 mt-1">
                            <div className="flex-1">
                              <Input
                                placeholder="https://... o sube una imagen"
                                value={current}
                                onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                                className="bg-muted border-border/50 text-sm"
                              />
                              {current && (
                                <img src={current} className="mt-2 h-20 w-full object-cover rounded-lg border border-border/30" />
                              )}
                            </div>
                            <label className="cursor-pointer shrink-0">
                              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                                <Upload className="w-3.5 h-3.5" /> Subir
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const base64 = await new Promise<string>((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(file);
                                  });
                                  try {
                                    const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                                    setBannerDrafts(d => ({ ...d, [k]: url }));
                                    upsertSetting.mutate({ key: k, value: url });
                                    toast.success("Banner subido");
                                  } catch {
                                    toast.error("Error al subir imagen");
                                  }
                                }}
                              />
                            </label>
                            <Button
                              size="sm"
                              className="bg-primary text-primary-foreground shrink-0"
                              onClick={() => { if (current) upsertSetting.mutate({ key: k, value: current }); }}
                              disabled={!current}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 9. Página Nosotros — full width */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 lg:col-span-2">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Página Nosotros</p>
                      <p className="text-xs text-muted-foreground">Imágenes para la página ¿Quiénes somos?</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {([
                      { k: "nosotros_hero_image",      label: "Hero (imagen principal)",        hint: "Foto a pantalla completa — equipo, tienda o ambiente" },
                      { k: "nosotros_about_image",     label: "Quiénes somos (imagen lateral)", hint: "Foto del estudio o proceso de trabajo" },
                      { k: "nosotros_mision_image",    label: "Imagen Misión/Visión",            hint: "Foto lateral junto a la sección de Misión y Visión" },
                      { k: "nosotros_filosofia_image", label: "Filosofía (fondo oscuro)",       hint: "Imagen de fondo de la sección de cita" },
                      { k: "nosotros_gallery_1",       label: "Galería — foto 1",              hint: "" },
                      { k: "nosotros_gallery_2",       label: "Galería — foto 2",              hint: "" },
                      { k: "nosotros_gallery_3",       label: "Galería — foto 3",              hint: "" },
                      { k: "nosotros_gallery_4",       label: "Galería — foto 4",              hint: "" },
                      { k: "nosotros_gallery_5",       label: "Galería — foto 5",              hint: "" },
                    ] as { k: string; label: string; hint: string }[]).map(({ k, label, hint }) => (
                      <div key={k}>
                        <Label className="text-sm font-medium">{label}</Label>
                        {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
                        <div className="flex items-start gap-3 mt-1.5">
                          {(bannerDrafts[k] || siteSettings?.[k]) && (
                            <div className="w-16 h-16 rounded-xl border border-border/50 bg-[#f5f5f5] overflow-hidden shrink-0">
                              <img src={bannerDrafts[k] ?? siteSettings?.[k]} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              placeholder="https://... o sube una imagen"
                              value={bannerDrafts[k] ?? siteSettings?.[k] ?? ""}
                              onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                              className="bg-muted border-border/50 text-sm"
                            />
                          </div>
                          <label className="cursor-pointer shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                              <Upload className="w-3.5 h-3.5" /> Subir
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });
                              try {
                                const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                                setBannerDrafts(d => ({ ...d, [k]: url }));
                                upsertSetting.mutate({ key: k, value: url });
                                toast.success("Imagen subida");
                              } catch { toast.error("Error al subir imagen"); }
                            }} />
                          </label>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground shrink-0"
                            onClick={() => {
                              const val = bannerDrafts[k] ?? siteSettings?.[k] ?? "";
                              if (val) upsertSetting.mutate({ key: k, value: val });
                            }}
                            disabled={!(bannerDrafts[k] ?? siteSettings?.[k])}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 10. Página FAQ */}
                <div className="p-6 rounded-2xl bg-card border border-border/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <HelpCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Página FAQ</p>
                      <p className="text-xs text-muted-foreground">Imagen lateral de la página de preguntas frecuentes</p>
                    </div>
                  </div>
                  {(() => {
                    const k = "faq_image";
                    return (
                      <div className="flex items-start gap-3">
                        {(bannerDrafts[k] || siteSettings?.[k]) && (
                          <div className="w-16 h-16 rounded-xl border border-border/50 bg-[#f5f5f5] overflow-hidden shrink-0">
                            <img src={bannerDrafts[k] ?? siteSettings?.[k]} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <Input
                            placeholder="https://... o sube una imagen"
                            value={bannerDrafts[k] ?? siteSettings?.[k] ?? ""}
                            onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                            className="bg-muted border-border/50 text-sm"
                          />
                        </div>
                        <label className="cursor-pointer shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                            <Upload className="w-3.5 h-3.5" /> Subir
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const base64 = await new Promise<string>((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                              reader.onerror = reject; reader.readAsDataURL(file);
                            });
                            try {
                              const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                              setBannerDrafts(d => ({ ...d, [k]: url }));
                              upsertSetting.mutate({ key: k, value: url });
                              toast.success("Imagen subida");
                            } catch { toast.error("Error al subir imagen"); }
                          }} />
                        </label>
                        <Button size="sm" className="bg-primary text-primary-foreground shrink-0"
                          onClick={() => { const val = bannerDrafts[k] ?? siteSettings?.[k] ?? ""; if (val) upsertSetting.mutate({ key: k, value: val }); }}
                          disabled={!(bannerDrafts[k] ?? siteSettings?.[k])}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })()}
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {([
                      { k: "cosplay_hero_image",    label: "Hero landing",         hint: "Imagen de fondo del hero principal (página /cosplay)" },
                      { k: "cosplay_cta_image",     label: "CTA final",            hint: "Imagen de fondo de la sección de llamada a la acción" },
                      { k: "cosplay_guild_banner",  label: "Banner directorio",    hint: "Banner superior de la página /cosplay/guild" },
                      { k: "cosplay_apply_banner",  label: "Banner solicitud",     hint: "Imagen de cabecera de la página de solicitud" },
                    ] as { k: string; label: string; hint: string }[]).map(({ k, label, hint }) => (
                      <div key={k}>
                        <Label className="text-sm font-medium">{label}</Label>
                        {hint && <p className="text-xs text-muted-foreground mb-1.5">{hint}</p>}
                        <div className="flex items-start gap-3 mt-1.5">
                          {(bannerDrafts[k] || siteSettings?.[k]) && (
                            <div className="w-16 h-16 rounded-xl border border-border/50 bg-[#f5f5f5] overflow-hidden shrink-0">
                              <img src={bannerDrafts[k] ?? siteSettings?.[k]} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1">
                            <Input
                              placeholder="https://... o sube una imagen"
                              value={bannerDrafts[k] ?? siteSettings?.[k] ?? ""}
                              onChange={(e) => setBannerDrafts(d => ({ ...d, [k]: e.target.value }))}
                              className="bg-muted border-border/50 text-sm"
                            />
                          </div>
                          <label className="cursor-pointer shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                              <Upload className="w-3.5 h-3.5" /> Subir
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const base64 = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => resolve((ev.target?.result as string).split(",")[1]);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              });
                              try {
                                const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 });
                                setBannerDrafts(d => ({ ...d, [k]: url }));
                                upsertSetting.mutate({ key: k, value: url });
                                toast.success("Imagen subida");
                              } catch { toast.error("Error al subir imagen"); }
                            }} />
                          </label>
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground shrink-0"
                            onClick={() => { const val = bannerDrafts[k] ?? siteSettings?.[k] ?? ""; if (val) upsertSetting.mutate({ key: k, value: val }); }}
                            disabled={!(bannerDrafts[k] ?? siteSettings?.[k])}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Producto kit de bienvenida */}
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
              <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
                      <div className="grid grid-cols-2 gap-3">
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
                    <table className="w-full text-sm">
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
                  )}
                </div>
              </motion.div>
            )}
            {/* ─── LINKBIO ───────────────────────────────────────────────────── */}
            {tab === "linkbio" && (
              <motion.div key="linkbio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold mb-6">LinkBio</h1>

                {/* Copy link banner */}
                <div className="flex items-center gap-3 mb-6 p-4 bg-[#f8f8f8] rounded-xl border border-border/50">
                  <p className="text-sm font-mono text-[#555] flex-1">https://isekaiworld.co/links</p>
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
                        placeholder="Figuras anime 3D hechas con amor ✨"
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

                  {/* Banner image */}
                  <div>
                    <Label className="text-xs font-medium">Imagen de banner</Label>
                    <div className="flex gap-2 mt-1 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="URL de imagen"
                          value={bannerDrafts["linkbio_banner_image"] ?? siteSettings?.["linkbio_banner_image"] ?? ""}
                          onChange={e => setBannerDrafts(d => ({ ...d, linkbio_banner_image: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                        {(bannerDrafts["linkbio_banner_image"] || siteSettings?.["linkbio_banner_image"]) && (
                          <img src={bannerDrafts["linkbio_banner_image"] ?? siteSettings?.["linkbio_banner_image"]} className="mt-2 h-20 w-full object-cover rounded-lg border border-border/30" alt="" />
                        )}
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = ev => res((ev.target?.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
                          try { const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 }); setBannerDrafts(d => ({ ...d, linkbio_banner_image: url })); upsertSetting.mutate({ key: "linkbio_banner_image", value: url }); toast.success("Imagen subida"); } catch { toast.error("Error al subir imagen"); }
                        }} />
                      </label>
                      <Button size="sm" className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => { const val = bannerDrafts["linkbio_banner_image"] ?? siteSettings?.["linkbio_banner_image"] ?? ""; if (val) upsertSetting.mutate({ key: "linkbio_banner_image", value: val }); }}
                        disabled={!(bannerDrafts["linkbio_banner_image"] ?? siteSettings?.["linkbio_banner_image"])}
                      ><Save className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {/* Avatar image */}
                  <div>
                    <Label className="text-xs font-medium">Avatar / Logo del LinkBio</Label>
                    <p className="text-xs text-muted-foreground mb-1">Imagen circular que aparece en la página de links (independiente del logo principal)</p>
                    <div className="flex gap-2 mt-1 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="URL de imagen"
                          value={bannerDrafts["linkbio_avatar_image"] ?? siteSettings?.["linkbio_avatar_image"] ?? ""}
                          onChange={e => setBannerDrafts(d => ({ ...d, linkbio_avatar_image: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                        {(bannerDrafts["linkbio_avatar_image"] || siteSettings?.["linkbio_avatar_image"]) && (
                          <img src={bannerDrafts["linkbio_avatar_image"] ?? siteSettings?.["linkbio_avatar_image"]} className="mt-2 h-20 w-20 object-cover rounded-full border border-border/30" alt="" />
                        )}
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = ev => res((ev.target?.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
                          try { const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 }); setBannerDrafts(d => ({ ...d, linkbio_avatar_image: url })); upsertSetting.mutate({ key: "linkbio_avatar_image", value: url }); toast.success("Imagen subida"); } catch { toast.error("Error al subir imagen"); }
                        }} />
                      </label>
                      <Button size="sm" className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => { const val = bannerDrafts["linkbio_avatar_image"] ?? siteSettings?.["linkbio_avatar_image"] ?? ""; if (val) upsertSetting.mutate({ key: "linkbio_avatar_image", value: val }); }}
                        disabled={!(bannerDrafts["linkbio_avatar_image"] ?? siteSettings?.["linkbio_avatar_image"])}
                      ><Save className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  {/* Bottom image */}
                  <div>
                    <Label className="text-xs font-medium">Imagen decorativa inferior (opcional)</Label>
                    <div className="flex gap-2 mt-1 items-start">
                      <div className="flex-1">
                        <Input
                          placeholder="URL de imagen"
                          value={bannerDrafts["linkbio_bottom_image"] ?? siteSettings?.["linkbio_bottom_image"] ?? ""}
                          onChange={e => setBannerDrafts(d => ({ ...d, linkbio_bottom_image: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                        {(bannerDrafts["linkbio_bottom_image"] || siteSettings?.["linkbio_bottom_image"]) && (
                          <img src={bannerDrafts["linkbio_bottom_image"] ?? siteSettings?.["linkbio_bottom_image"]} className="mt-2 h-20 w-full object-cover rounded-lg border border-border/30" alt="" />
                        )}
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border/50 text-xs font-medium hover:bg-muted/80 transition-colors">
                          <Upload className="w-3.5 h-3.5" /> Subir
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = ev => res((ev.target?.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
                          try { const { url } = await uploadProductImage.mutateAsync({ fileName: file.name, contentType: file.type, base64Data: base64 }); setBannerDrafts(d => ({ ...d, linkbio_bottom_image: url })); upsertSetting.mutate({ key: "linkbio_bottom_image", value: url }); toast.success("Imagen subida"); } catch { toast.error("Error al subir imagen"); }
                        }} />
                      </label>
                      <Button size="sm" className="bg-primary text-primary-foreground shrink-0"
                        onClick={() => { const val = bannerDrafts["linkbio_bottom_image"] ?? siteSettings?.["linkbio_bottom_image"] ?? ""; if (val) upsertSetting.mutate({ key: "linkbio_bottom_image", value: val }); }}
                        disabled={!(bannerDrafts["linkbio_bottom_image"] ?? siteSettings?.["linkbio_bottom_image"])}
                      ><Save className="w-4 h-4" /></Button>
                    </div>
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
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
                <div className="border border-[#e5e5e5] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f8f8f8] border-b border-[#e5e5e5]">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-[#555]">Usuario</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#555]">Método</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#555]">Rol</th>
                        <th className="text-left px-4 py-3 font-semibold text-[#555]">Registro</th>
                        <th className="text-right px-4 py-3 font-semibold text-[#555]">Acciones</th>
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
                              {u.loginMethod === 'google' ? '🔵 Google' : '📧 Magic Link'}
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
                            {new Date(u.createdAt).toLocaleDateString('es-CO', {
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
              <motion.div key="popups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
                    <table className="w-full text-sm">
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
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
                  )}
                </div>

                {/* Popup modal */}
                {showPopupModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border border-border/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                      <div className="flex items-center justify-between p-6 border-b border-border/30">
                        <h2 className="text-lg font-bold">{editingPopup ? "Editar popup" : "Nuevo popup"}</h2>
                        <button onClick={() => { setShowPopupModal(false); setEditingPopup(null); }} className="text-muted-foreground hover:text-foreground">
                          <X size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-5">
                        {/* Name + active */}
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
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

                        {/* Fechas */}
                        <div className="grid grid-cols-2 gap-4">
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
              <motion.div key="cosplay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Sparkles className="w-6 h-6 text-[#e5007d]" /> Cosplay Guild</h1>

                {/* Sub-tabs */}
                <div className="flex gap-1 bg-muted/40 rounded-xl p-1 mb-6 w-fit">
                  {([
                    { id: 'applications', label: `Solicitudes (${cosplayApps.length})` },
                    { id: 'cosplayers', label: `Cosplayers (${cosplayersData.length})` },
                    { id: 'activities', label: `Actividades (${cosplayActivities.length})` },
                    { id: 'evaluations', label: `Evaluaciones (${cosplaySubs.filter((s: any) => s.status === 'pending').length})` },
                  ] as const).map(st => (
                    <button
                      key={st.id}
                      onClick={() => setCosplaySubTab(st.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${cosplaySubTab === st.id ? 'bg-white text-[#111] shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

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
                      {cosplayApps.map((app: any) => (
                        <div key={app.id} className="p-5 rounded-2xl bg-card border border-border/50">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-bold">{app.fullName} {app.lastName}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {app.status}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{app.email} · {app.phone} · {app.city}, {app.country}</p>
                              <div className="grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                                <span>Edad: {app.age}</span>
                                <span>Experiencia: {app.experience} años</span>
                              </div>
                              {/* Redes sociales */}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                                {[
                                  { key: 'instagram', label: 'Instagram' },
                                  { key: 'tiktok',    label: 'TikTok'    },
                                  { key: 'youtube',   label: 'YouTube'   },
                                  { key: 'facebook',  label: 'Facebook'  },
                                  { key: 'twitter',   label: 'Twitter/X' },
                                ].filter(r => app[r.key]).map(r => (
                                  <a key={r.key} href={app[r.key]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline hover:opacity-70">
                                    {r.label}: {app[r.key]}
                                  </a>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{app.whyIsekai}</p>
                              <button onClick={() => setSelectedApplication(app)} className="text-xs text-primary underline mt-2 hover:opacity-70">
                                Ver detalle completo
                              </button>
                            </div>
                            {app.status === 'pending' && (
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => { setShowApproveModal(app); setApproveForm({ artisticName: app.fullName, tier: getTierByFollowers(0), totalFollowers: 0 }); }}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprobar
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-400 text-red-500 hover:bg-red-50 text-xs" onClick={() => { setShowRejectModal(app); setRejectReason(''); }}>
                                  <X className="w-3.5 h-3.5 mr-1" /> Rechazar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* COSPLAYERS */}
                {cosplaySubTab === 'cosplayers' && (
                  <div>
                    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
                      <table className="w-full text-sm">
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
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {cosplayersData.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No hay cosplayers aún</p>}
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
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-sm">{act.title}</p>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{act.type}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{act.basePoints} pts base{act.deadline ? ` · Hasta ${new Date(act.deadline).toLocaleDateString('es-CO')}` : ''}</p>
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
                      {cosplaySubs.map((sub: any) => (
                        <div key={sub.id} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sub.status === 'approved' ? 'bg-green-100 text-green-700' : sub.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                {sub.status}
                              </span>
                              {sub.pointsAwarded && <span className="text-xs text-primary font-semibold">{sub.pointsAwarded} tickets</span>}
                            </div>
                            <a href={sub.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate">
                              <ExternalLink size={10} /> {sub.evidenceUrl}
                            </a>
                          </div>
                          {sub.status === 'pending' && (
                            <Button size="sm" className="bg-primary text-white text-xs ml-3 shrink-0" onClick={() => { setShowEvalModal(sub); setEvalForm({ pointsAwarded: 100, status: 'approved' }); }}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> Evaluar
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal detalle solicitud */}
                {selectedApplication && (() => {
                  const TIER_COLORS_MAP: Record<string, string> = { bronce: '#cd7f32', plata: '#c0c0c0', oro: '#ffd700', diamante: '#b9f2ff', platino: '#e8e8e8' };
                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                      <div className="bg-card rounded-2xl border border-border/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
                              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowApproveModal(selectedApplication); setApproveForm({ artisticName: selectedApplication.fullName, tier: getTierByFollowers(0), totalFollowers: 0, kitProductId: 0 }); setSelectedApplication(null); }}>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                      <div className="bg-card rounded-2xl border border-border/50 w-full max-w-md p-6 shadow-2xl">
                        <h3 className="font-bold mb-1">Aprobar cosplayer</h3>
                        <p className="text-sm text-muted-foreground mb-5">{showApproveModal.fullName} {showApproveModal.lastName}</p>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Nombre artístico *</Label>
                            <Input value={approveForm.artisticName} onChange={e => setApproveForm(f => ({ ...f, artisticName: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" />
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
                          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={!approveForm.artisticName || approveApp.isPending} onClick={() => approveApp.mutate({ applicationId: showApproveModal.id, artisticName: approveForm.artisticName, tier: approveForm.tier as any, totalFollowers: approveForm.totalFollowers })}>
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
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border border-border/50 w-full max-w-md p-6 shadow-2xl">
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
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border border-border/50 w-full max-w-sm p-6 shadow-2xl">
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
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border border-border/50 w-full max-w-md p-6 shadow-2xl">
                      <h3 className="font-bold mb-4">Nueva actividad</h3>
                      <div className="space-y-3">
                        <div><Label className="text-xs">Título *</Label><Input value={activityForm.title} onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))} className="mt-1 bg-muted border-border/50 text-sm" /></div>
                        <div><Label className="text-xs">Descripción</Label><textarea rows={2} value={activityForm.description} onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))} className="mt-1 w-full px-3 py-2 rounded-xl bg-muted border border-border/50 text-sm outline-none resize-none" /></div>
                        <div className="grid grid-cols-2 gap-3">
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

                {/* Modal evaluar submission */}
                {showEvalModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card rounded-2xl border border-border/50 w-full max-w-md p-6 shadow-2xl">
                      <h3 className="font-bold mb-2">Evaluar submission</h3>
                      <a href={showEvalModal.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mb-4 hover:underline">
                        <ExternalLink size={12} /> {showEvalModal.evidenceUrl}
                      </a>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Puntos a otorgar (base, antes del multiplicador)</Label>
                          <Input type="number" min={0} value={evalForm.pointsAwarded} onChange={e => setEvalForm(f => ({ ...f, pointsAwarded: parseInt(e.target.value) || 0 }))} className="mt-1 bg-muted border-border/50 text-sm" />
                          <p className="text-xs text-muted-foreground mt-1">El sistema aplicará el multiplicador del tier del cosplayer automáticamente.</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEvalForm(f => ({ ...f, status: 'approved' }))} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${evalForm.status === 'approved' ? 'bg-green-600 text-white border-green-600' : 'border-border/50 text-muted-foreground'}`}>Aprobar</button>
                          <button onClick={() => setEvalForm(f => ({ ...f, status: 'rejected' }))} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${evalForm.status === 'rejected' ? 'bg-red-500 text-white border-red-500' : 'border-border/50 text-muted-foreground'}`}>Rechazar</button>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button className="flex-1 bg-primary text-white" disabled={evaluateSub.isPending} onClick={() => evaluateSub.mutate({ submissionId: showEvalModal.id, pointsAwarded: evalForm.pointsAwarded, status: evalForm.status })}>
                          {evaluateSub.isPending ? "Guardando..." : "Confirmar evaluación"}
                        </Button>
                        <Button variant="outline" onClick={() => setShowEvalModal(null)}>Cancelar</Button>
                      </div>
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
