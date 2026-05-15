import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, ChevronDown, Grid3X3, LayoutList, Gamepad2 } from "lucide-react";
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const sortOptions = [
  { value: "newest", label: "Más recientes / Newest" },
  { value: "price_asc", label: "Precio: menor a mayor / Price Low-High" },
  { value: "price_desc", label: "Precio: mayor a menor / Price High-Low" },
  { value: "name", label: "Nombre A-Z / Name A-Z" },
];

export default function Catalog() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialCategory = params.get("category") ? parseInt(params.get("category")!) : undefined;
  const initialSearch = params.get("search") ?? "";

  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: categories } = trpc.categories.list.useQuery();
  const { data: productsData, isLoading } = trpc.products.list.useQuery({
    categoryId: selectedCategory,
    search: debouncedSearch || undefined,
    limit: 48,
  });

  const products = productsData?.items ?? [];

  // Sort products client-side
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === "price_asc") return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === "price_desc") return parseFloat(b.price) - parseFloat(a.price);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return b.id - a.id; // newest
  });

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any)._searchTimer);
    (window as any)._searchTimer = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSearch("");
    setDebouncedSearch("");
  };

  const hasFilters = selectedCategory !== undefined || debouncedSearch;
  const activeSort = sortOptions.find((s) => s.value === sortBy)!;

  return (
    <div className="min-h-screen pb-16">
      {/* ── Page Hero Banner ── */}
      <div className="relative py-10 md:py-16 overflow-hidden border-b border-border/30 bg-card/30">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        </div>
        <div className="container relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">Tienda</span>
            <h1 className="text-3xl lg:text-5xl font-black mt-2 mb-3">
              {selectedCategory
                ? categories?.find((c) => c.id === selectedCategory)?.name ?? "Catálogo"
                : <><span className="gradient-text">Todo</span> el catálogo</>
              }
            </h1>
            <p className="text-muted-foreground">
              {isLoading ? "Cargando... / Loading..." : `${sortedProducts.length} producto${sortedProducts.length !== 1 ? "s" : ""} / product${sortedProducts.length !== 1 ? "s" : ""}`}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container px-4 pt-6 md:pt-8">
        {/* ── Toolbar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-6 items-center"
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar productos..."
              className="pl-10 bg-card border-border/50 focus:border-primary/50 rounded-xl h-11"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            className={`gap-2 h-11 rounded-xl border-border/50 ${showFilters ? "border-primary/50 text-primary bg-primary/5" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {hasFilters && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {(selectedCategory ? 1 : 0) + (debouncedSearch ? 1 : 0)}
              </span>
            )}
          </Button>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 h-11 px-4 rounded-xl bg-card border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <span className="hidden sm:inline">{activeSort.label}</span>
              <span className="sm:hidden">Ordenar</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full mt-1 w-52 rounded-2xl bg-card border border-border/50 shadow-2xl shadow-black/40 overflow-hidden z-20"
                >
                  <div className="p-1.5">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                          sortBy === opt.value ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View mode */}
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-card border border-border/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground gap-1.5 h-11 rounded-xl">
              <X className="w-4 h-4" />
              Limpiar
            </Button>
          )}
        </motion.div>

        {/* ── Category Pills ── */}
        <AnimatePresence>
          {(showFilters || selectedCategory !== undefined) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden mb-6"
            >
              <div className="p-5 rounded-2xl bg-card border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categorías</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(undefined)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      !selectedCategory
                        ? "bg-primary text-primary-foreground neon-glow-purple"
                        : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    }`}
                  >
                    Todos
                  </button>
                  {(categories ?? []).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        selectedCategory === cat.id
                          ? "bg-primary text-primary-foreground neon-glow-purple"
                          : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Category quick-nav (always visible) ── */}
        {!showFilters && categories && categories.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground neon-glow-purple"
                  : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground neon-glow-purple"
                    : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* ── Products ── */}
        {isLoading ? (
          <div className={`grid gap-5 lg:gap-6 ${viewMode === "list" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`bg-card border border-border/50 rounded-2xl overflow-hidden animate-pulse ${viewMode === "list" ? "flex gap-4 p-4" : ""}`}>
                <div className={`bg-muted ${viewMode === "list" ? "w-32 h-32 rounded-xl flex-shrink-0" : "aspect-[3/4]"}`} />
                <div className={`p-4 space-y-2 ${viewMode === "list" ? "flex-1 py-0" : ""}`}>
                  <div className="h-3 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32"
          >
            <div className="flex justify-center mb-4 opacity-30">
              <Search className="w-16 h-16" strokeWidth={1} />
            </div>
            <p className="text-xl font-bold text-foreground">No se encontraron productos</p>
            <p className="text-muted-foreground mt-2">Intenta con otros filtros o términos de búsqueda</p>
            {hasFilters && (
              <Button
                className="mt-6 bg-primary text-primary-foreground rounded-xl"
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            )}
          </motion.div>
        ) : viewMode === "list" ? (
          <motion.div layout className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {sortedProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="flex gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors group cursor-pointer"
                  onClick={() => window.location.href = `/product/${product.slug}`}
                >
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {(product as any).imageUrl ? (
                      <img src={(product as any).imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Gamepad2 className="w-10 h-10" strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      {product.category?.name && (
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{product.category.name}</p>
                      )}
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-foreground">${parseFloat(product.price).toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock > 0 ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 lg:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {sortedProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                >
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    imageUrl={(product as any).imageUrl ?? undefined}
                    category={product.category?.name}
                    stock={product.stock}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
