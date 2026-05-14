import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, TrendingUp, Users,
  Plus, Pencil, Trash2, Check, X, Upload, ChevronDown, Loader2,
  DollarSign, ArrowUpRight, Lock, CheckCircle2, Settings, Instagram, ExternalLink, Save
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [vForm, setVForm] = useState({ name: "", price: "", stock: 0, sku: "" });

  const upsertVariant = trpc.products.upsertVariant.useMutation({
    onSuccess: () => { utils.products.byId.invalidate({ id: productId }); setShowForm(false); setEditingVariant(null); toast.success("Variante guardada"); },
  });
  const deleteVariant = trpc.products.deleteVariant.useMutation({
    onSuccess: () => { utils.products.byId.invalidate({ id: productId }); toast.success("Variante eliminada"); },
  });

  const handleSave = () => {
    upsertVariant.mutate({
      id: editingVariant?.id,
      productId,
      name: vForm.name,
      price: vForm.price || undefined,
      stock: vForm.stock,
      sku: vForm.sku || undefined,
    });
  };

  const startEdit = (v: any) => {
    setEditingVariant(v);
    setVForm({ name: v.name, price: v.price ?? "", stock: v.stock, sku: v.sku ?? "" });
    setShowForm(true);
  };

  return (
    <div className="mt-4 border-t border-border/30 pt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">Variantes ({variants.length})</span>
        <Button size="sm" variant="ghost" className="text-xs text-primary" onClick={() => { setEditingVariant(null); setVForm({ name: "", price: "", stock: 0, sku: "" }); setShowForm(!showForm); }}>
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
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="bg-primary text-primary-foreground text-xs h-7" onClick={handleSave} disabled={!vForm.name}>
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
              <div>
                <span className="font-medium">{v.name}</span>
                {v.price && <span className="ml-2 text-primary">${parseFloat(v.price).toFixed(2)}</span>}
                <span className="ml-2 text-muted-foreground">Stock: {v.stock}</span>
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
  pending: "Pendiente",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

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
  const [imageUrl, setImageUrl] = useState<string>("");

  const uploadImage = trpc.products.uploadImage.useMutation();
  const addImage = trpc.products.addImage.useMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product?.id) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const { url, key } = await uploadImage.mutateAsync({
          fileName: file.name,
          contentType: file.type,
          base64Data: base64,
        });
        await addImage.mutateAsync({ productId: product.id, url, fileKey: key });
        setImageUrl(url);
        toast.success("Imagen subida");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Error al subir imagen");
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
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value ? parseInt(e.target.value) : "" })}
            className="mt-1 w-full bg-muted border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
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
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}
            className="mt-1 w-full bg-muted border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground"
          >
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
          </select>
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

      {product?.id && (
        <div>
          <Label>Imagen del producto</Label>
          <div className="mt-1 flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/50 cursor-pointer hover:bg-muted/80 text-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Subiendo..." : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
            {imageUrl && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Imagen subida
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => onSave({ ...form, categoryId: form.categoryId || undefined })}
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
  const [igToken, setIgToken] = useState("");
  const [igUsername, setIgUsername] = useState("");
  const [igCtaText, setIgCtaText] = useState("");
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "" });

  // Queries
  const { data: metrics } = trpc.admin.metrics.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: productsData, refetch: refetchProducts } = trpc.products.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: categories, refetch: refetchCategories } = trpc.categories.list.useQuery();
  const { data: ordersData, refetch: refetchOrders } = trpc.orders.adminList.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const products = productsData?.items ?? [];
  const orders = ordersData?.items ?? [];

  // Mutations
  const createProduct = trpc.products.create.useMutation({ onSuccess: () => { refetchProducts(); setShowProductForm(false); toast.success("Producto creado"); } });
  const updateProduct = trpc.products.update.useMutation({ onSuccess: () => { refetchProducts(); setEditingProduct(null); toast.success("Producto actualizado"); } });
  const deleteProduct = trpc.products.delete.useMutation({ onSuccess: () => { refetchProducts(); toast.success("Producto eliminado"); } });
  const createCategory = trpc.categories.create.useMutation({ onSuccess: () => { refetchCategories(); setEditingCategory(null); toast.success("Categoría creada"); } });
  const updateCategory = trpc.categories.update.useMutation({ onSuccess: () => { refetchCategories(); setEditingCategory(null); toast.success("Categoría actualizada"); } });
  const deleteCategory = trpc.categories.delete.useMutation({ onSuccess: () => { refetchCategories(); toast.success("Categoría eliminada"); } });
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => { refetchOrders(); toast.success("Estado actualizado"); } });
  const { data: siteSettings, refetch: refetchSettings } = trpc.settings.getAdmin.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const upsertSetting = trpc.settings.upsert.useMutation({ onSuccess: () => { refetchSettings(); toast.success("Configuración guardada"); } });

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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
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
                        onSave={(data) => createProduct.mutate(data)}
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
                    onClick={() => { setEditingCategory("new"); setCategoryForm({ name: "", slug: "", description: "" }); }}
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
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => { setEditingCategory(cat.id); setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description ?? "" }); }}>
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
                  {orders.map((order) => (
                    <div key={order.id} className="p-4 rounded-2xl bg-card border border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">{order.orderNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs status-${order.status}`}>
                              {statusLabels[order.status]}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{order.customerName} · {order.customerEmail}</p>
                          <p className="text-sm text-primary font-semibold mt-1">${parseFloat(order.total).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString("es-CO")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus.mutate({ id: order.id, status: e.target.value as any })}
                            className="bg-muted border border-border/50 rounded-lg px-3 py-1.5 text-sm text-foreground"
                          >
                            {Object.entries(statusLabels).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
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
                      <p className="text-xs text-muted-foreground mb-1.5">Aparece debajo del título "Shop the Feed" en la homepage</p>
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
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
