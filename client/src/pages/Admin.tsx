import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, TrendingUp, Users,
  Plus, Pencil, Trash2, Check, X, Upload, ChevronDown, Loader2,
  DollarSign, ArrowUpRight, Lock, CheckCircle2, Settings, Instagram, ExternalLink, Save,
  Facebook, Twitter, Youtube, Megaphone
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

type AdminTab = "dashboard" | "products" | "categories" | "orders" | "settings";

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

const ORDER_STEPS = [
  { key: "pending",       label: "Orden creada",    icon: "📋" },
  { key: "preparing",     label: "En preparación",  icon: "⚙️" },
  { key: "printing",      label: "En impresión 3D", icon: "🖨️" },
  { key: "post_printing", label: "Post impresión",  icon: "✨" },
  { key: "packed",        label: "Empacada",        icon: "📦" },
  { key: "shipped",       label: "Enviada",         icon: "🚚" },
  { key: "delivered",     label: "Entregada",       icon: "✅" },
] as const;

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

  const currentIdx = ORDER_STEPS.findIndex(s => s.key === pendingStatus);
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

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estado del pedido</p>
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {ORDER_STEPS.map((step, i) => {
            const isDone = i < currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={step.key} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1 w-14">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isDone ? "bg-[#22c55e] text-white" :
                    isCurrent ? "bg-[#1a1a1a] text-white ring-2 ring-offset-1 ring-[#1a1a1a]" :
                    "bg-[#f0f0f0] text-[#aaa]"
                  }`}>
                    {isDone ? "✓" : step.icon}
                  </div>
                  <span className="text-[9px] text-center leading-tight text-muted-foreground w-full px-0.5">{step.label}</span>
                </div>
                {i < ORDER_STEPS.length - 1 && (
                  <div className={`w-4 h-0.5 mb-4 shrink-0 ${i < currentIdx ? "bg-[#22c55e]" : "bg-[#e0e0e0]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status buttons */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cambiar estado</p>
        <div className="flex flex-wrap gap-2">
          {ORDER_STEPS.map(step => (
            <button
              key={step.key}
              onClick={() => setPendingStatus(step.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                pendingStatus === step.key
                  ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                  : "border-border/50 text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {step.icon} {step.label}
            </button>
          ))}
          <button
            onClick={() => setPendingStatus("cancelled")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              pendingStatus === "cancelled"
                ? "bg-red-500 text-white border-red-500"
                : "border-border/50 text-muted-foreground hover:border-red-400 hover:text-red-500"
            }`}
          >
            ❌ Cancelada
          </button>
        </div>
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
  });
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(product?.images?.[0]?.url ?? "");
  const [previewUrl, setPreviewUrl] = useState<string>(product?.images?.[0]?.url ?? "");

  const uploadImage = trpc.products.uploadImage.useMutation();
  const addImage = trpc.products.addImage.useMutation();

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
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onSave({
            ...form,
            categoryId: form.categoryId ? Number(form.categoryId) : undefined,
            compareAtPrice: form.compareAtPrice || undefined,
            firstImageUrl: imageUrl || undefined,
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

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin() {
  const { user, isAuthenticated, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
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

  // Queries
  const { data: metrics } = trpc.admin.metrics.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: productsData, refetch: refetchProducts } = trpc.products.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: categories, refetch: refetchCategories } = trpc.categories.list.useQuery();
  const { data: ordersData, refetch: refetchOrders } = trpc.orders.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const products = productsData?.items ?? [];
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
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: () => { refetchProducts(); toast.success("Producto eliminado"); } });
  const createCategory = trpc.categories.create.useMutation({ onSuccess: () => { refetchCategories(); setEditingCategory(null); setCategoryForm({ name: "", slug: "", description: "", imageUrl: "", featured: false }); toast.success("Categoría creada"); } });
  const updateCategory = trpc.categories.update.useMutation({ onSuccess: () => { refetchCategories(); setEditingCategory(null); toast.success("Categoría actualizada"); } });
  const deleteCategory = trpc.categories.delete.useMutation({ onSuccess: () => { refetchCategories(); toast.success("Categoría eliminada"); } });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => { refetchOrders(); toast.success("Estado actualizado"); } });
  const { data: siteSettings, refetch: refetchSettings } = trpc.settings.getAdmin.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => { refetchSettings(); toast.success("Configuración guardada"); } });

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
    { id: "settings" as AdminTab, label: "Configuración", icon: Settings },
  ];

  return (
    <div className="min-h-screen pt-16">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border fixed top-16 left-0 bottom-0 overflow-y-auto z-40">
          <div className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">Panel Admin</p>
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tab === t.id
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "text-gray-800 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
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

                <div className="space-y-3">
                  {products.map((product) => (
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
                              onSave={(data) => updateProduct.mutate({ id: product.id, ...data })}
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
                <div className="space-y-3">
                  {orders.map((order) => {
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
                  {orders.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No hay pedidos aún</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* ─── Settings Tab ─────────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {tab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="p-8 max-w-2xl"
              >
                <h2 className="text-2xl font-bold mb-1">Configuración</h2>
                <p className="text-muted-foreground text-sm mb-8">Personaliza la tienda y conecta tus redes sociales.</p>

                {/* Identidad de la tienda */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
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

                  {/* Logo dark (footer) */}
                  <div>
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
                </div>

                {/* Instagram Feed */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
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

                {/* Social Links + Promo Bar */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
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

                {/* Banners del Homepage */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Banners del Homepage</h3>
                      <p className="text-xs text-muted-foreground">Hero slides, banner de venta y banner de video</p>
                    </div>
                  </div>

                  {/* Hero Slides */}
                  {[1, 2, 3].map((n) => {
                    const imgKey = `hero_slide_${n}_image`;
                    const currentImg = bannerDrafts[imgKey] ?? siteSettings?.[imgKey] ?? "";
                    return (
                      <div key={n} className="mb-6">
                        <p className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Slide {n}</p>
                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          {[
                            { k: `hero_slide_${n}_tag`, label: "Tag / etiqueta", ph: "Ej: Temporada 2025" },
                            { k: `hero_slide_${n}_title`, label: "Título", ph: "Ej: Nueva colección" },
                            { k: `hero_slide_${n}_cta`, label: "Texto del botón", ph: "Ej: Ver colección" },
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
                        {/* Slide image upload */}
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

                  {/* Banners de Ofertas */}
                  <div className="border-t border-border/30 pt-5 mb-5">
                    <p className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Banners de Ofertas</p>
                    <p className="text-xs text-muted-foreground mb-4">3 imágenes para el slider de ofertas en la home. Solo imagen, sin texto.</p>
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

                  {/* Banner lateral página de producto */}
                  <div className="border-t border-border/30 pt-5 mb-5">
                    <p className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Banner lateral página de producto</p>
                    <p className="text-xs text-muted-foreground mb-4">Aparece a la izquierda del producto en desktop. Puede ser una promo o imagen de colección.</p>
                    <div className="space-y-3">
                      {/* Image upload */}
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
                      {/* Destination URL */}
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

                  {/* Video Banner */}
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

                {/* Popup de bienvenida */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Popup de bienvenida</h3>
                      <p className="text-xs text-muted-foreground">Popup que aparece al entrar a la tienda</p>
                    </div>
                  </div>

                  {/* Enabled toggle */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <Label className="text-sm font-medium">Mostrar popup</Label>
                      <p className="text-xs text-muted-foreground">Activa o desactiva el popup en la tienda</p>
                    </div>
                    <button
                      onClick={() => {
                        const current = siteSettings?.["popup_enabled"] !== "false";
                        upsertSetting.mutate({ key: "popup_enabled", value: current ? "false" : "true" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${siteSettings?.["popup_enabled"] !== "false" ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteSettings?.["popup_enabled"] !== "false" ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Show once toggle */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <Label className="text-sm font-medium">Mostrar una sola vez</Label>
                      <p className="text-xs text-muted-foreground">El popup no vuelve a aparecer si el usuario lo cierra</p>
                    </div>
                    <button
                      onClick={() => {
                        const current = siteSettings?.["popup_show_once"] !== "false";
                        upsertSetting.mutate({ key: "popup_show_once", value: current ? "false" : "true" });
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${siteSettings?.["popup_show_once"] !== "false" ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${siteSettings?.["popup_show_once"] !== "false" ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { k: "popup_title", label: "Título", ph: "Ej: ¡Bienvenido a Isekai!" },
                      { k: "popup_subtitle", label: "Subtítulo", ph: "Ej: Suscríbete y obtén 10% OFF" },
                      { k: "popup_cta_text", label: "Texto del botón", ph: "Ej: Suscribirme" },
                      { k: "popup_cta_url", label: "URL del botón", ph: "Ej: /catalog o https://..." },
                      { k: "popup_delay_seconds", label: "Demora en segundos", ph: "Ej: 3" },
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

                  {/* Popup image upload */}
                  <div className="mt-4">
                    <Label className="text-xs font-medium">Imagen del popup</Label>
                    <div className="flex items-start gap-2 mt-1">
                      <div className="flex-1">
                        <Input
                          placeholder="https://... o sube una imagen"
                          value={bannerDrafts["popup_image"] ?? siteSettings?.["popup_image"] ?? ""}
                          onChange={(e) => setBannerDrafts(d => ({ ...d, popup_image: e.target.value }))}
                          className="bg-muted border-border/50 text-sm"
                        />
                        {(bannerDrafts["popup_image"] || siteSettings?.["popup_image"]) && (
                          <img src={bannerDrafts["popup_image"] ?? siteSettings?.["popup_image"]} className="mt-2 h-20 w-full object-cover rounded-lg border border-border/30" />
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
                              setBannerDrafts(d => ({ ...d, popup_image: url }));
                              upsertSetting.mutate({ key: "popup_image", value: url });
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
                          const val = bannerDrafts["popup_image"] ?? siteSettings?.["popup_image"] ?? "";
                          if (val) upsertSetting.mutate({ key: "popup_image", value: val });
                        }}
                        disabled={!(bannerDrafts["popup_image"] ?? siteSettings?.["popup_image"])}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Brand Story */}
                <div className="p-6 rounded-2xl bg-card border border-border/50 mb-6">
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
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
