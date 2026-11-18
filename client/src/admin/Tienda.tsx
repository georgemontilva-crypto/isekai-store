import { useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { comprimirImagen } from "@/lib/comprimirImagen";
import { APP } from "@/lib/appActual";
import { Panel, Badge, Confirmar, num, dinero } from "./ui";

/**
 * Tienda: productos y colecciones.
 *
 * Un producto se crea con lo mínimo (nombre y precio) como borrador, y en su
 * ficha se completan fotos, variantes y descripción antes de publicarlo.
 * «Colecciones» es lo que antes aparecía dos veces, como Categorías y como
 * Colecciones: eran los mismos datos.
 */
type Coleccion = { id: number; name: string; slug: string; description: string | null; imageUrl: string | null; featured: boolean; isActive: boolean };
type Producto = { id: number; name: string; slug: string; description: string | null; price: string; compareAtPrice: string | null; categoryId: number | null; stock: number; status: "draft" | "published"; featured: boolean; category: Coleccion | null; imageUrl: string | null };
type Foto = { id: number; url: string; position: number };
type Variante = { id: number; name: string; price: string | null; stock: number };

const aSlug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
function slugLibre(base: string, usados: Set<string>) {
  const b = base || "producto";
  if (!usados.has(b)) return b;
  for (let i = 2; ; i++) if (!usados.has(`${b}-${i}`)) return `${b}-${i}`;
}
/** «12,5» → «12.50»; null si no es un precio */
function aPrecio(texto: string): string | null {
  const t = texto.trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(t) ? parseFloat(t).toFixed(2) : null;
}
const enBase64 = (f: File) => new Promise<string>((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] ?? "");
  r.onerror = () => mal(new Error("No se pudo leer el archivo"));
  r.readAsDataURL(f);
});
const urlTienda = (ruta: string) => (APP === "web" ? ruta : `https://www.isekaiworld.co${ruta}`);

function useSubirImagen() {
  const subir = trpc.products.uploadImage.useMutation();
  return async (archivo: File) => {
    const f = await comprimirImagen(archivo);
    return subir.mutateAsync({ fileName: f.name, contentType: f.type, base64Data: await enBase64(f) });
  };
}

// ── Ficha de un producto ─────────────────────────────────────────────────────
function FichaProducto({ producto, colecciones, alBorrar }: { producto: Producto; colecciones: Coleccion[]; alBorrar: () => void }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.products.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const detalle = trpc.products.byId.useQuery({ id: producto.id });
  const guardar = trpc.products.update.useMutation({ onSuccess: () => { toast.success("Producto guardado"); refrescar(); }, onError: alFallar });
  const borrar = trpc.products.delete.useMutation({ onSuccess: () => { toast.success("Producto eliminado"); refrescar(); alBorrar(); }, onError: e => toast.error(/foreign key|constraint/i.test(e.message) ? "No se puede eliminar: ya tiene pedidos. Pásalo a borrador para ocultarlo." : e.message) });
  const agregarFoto = trpc.products.addImage.useMutation();
  const quitarFoto = trpc.products.deleteImage.useMutation({ onSuccess: refrescar, onError: alFallar });
  const guardarVariante = trpc.products.upsertVariant.useMutation({ onSuccess: refrescar, onError: alFallar });
  const quitarVariante = trpc.products.deleteVariant.useMutation({ onSuccess: refrescar, onError: alFallar });
  const subir = useSubirImagen();

  const [f, setF] = useState({ name: producto.name, price: num(producto.price).toFixed(2), antes: producto.compareAtPrice ? num(producto.compareAtPrice).toFixed(2) : "", stock: String(producto.stock), categoryId: producto.categoryId ? String(producto.categoryId) : "", description: producto.description ?? "", publicado: producto.status === "published", destacado: producto.featured });
  const [subiendo, setSubiendo] = useState(0);
  const [v, setV] = useState({ id: 0, name: "", price: "", stock: "" });
  const archivo = useRef<HTMLInputElement>(null);

  const fotos = ((detalle.data as any)?.images ?? []) as Foto[];
  const variantes = ((detalle.data as any)?.variants ?? []) as Variante[];
  const precio = aPrecio(f.price), antes = f.antes.trim() ? aPrecio(f.antes) : "";
  const existencias = /^\d+$/.test(f.stock.trim()) ? parseInt(f.stock, 10) : null;
  const aviso = !f.name.trim() ? "Escribe el nombre." : precio === null ? "Escribe el precio así: 12 o 12,50." : antes === null ? "El precio anterior no es válido." : existencias === null ? "Las existencias deben ser un número entero." : "";

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (aviso || precio === null || existencias === null) { toast.error(aviso); return; }
    if (f.publicado && fotos.length === 0) toast.message("Publicado sin fotos: en la tienda saldrá sin imagen.");
    guardar.mutate({ id: producto.id, name: f.name.trim(), price: precio, ...(antes ? { compareAtPrice: antes } : {}), stock: existencias, ...(f.categoryId ? { categoryId: Number(f.categoryId) } : {}), description: f.description, status: f.publicado ? "published" : "draft", featured: f.destacado });
  };
  const alElegirFotos = async (lista: FileList | null) => {
    const archivos = Array.from(lista ?? []);
    if (!archivos.length) return;
    setSubiendo(archivos.length);
    const ocupadas = new Set(fotos.map(x => x.position));
    try {
      for (const a of archivos) {
        // La portada es la foto de la posición 0: la primera libre la toma la foto nueva
        let pos = 0; while (ocupadas.has(pos)) pos++; ocupadas.add(pos);
        const { url, key } = await subir(a);
        await agregarFoto.mutateAsync({ productId: producto.id, url, fileKey: key, position: pos });
        setSubiendo(n => n - 1);
      }
      toast.success(archivos.length === 1 ? "Foto agregada" : `${archivos.length} fotos agregadas`);
    } catch (e: any) { toast.error(e?.message ?? "No se pudo subir la foto"); }
    finally { setSubiendo(0); if (archivo.current) archivo.current.value = ""; refrescar(); }
  };
  const enviarVariante = (e: FormEvent) => {
    e.preventDefault();
    const p = v.price.trim() ? aPrecio(v.price) : undefined;
    if (!v.name.trim()) { toast.error("Escribe el nombre de la variante"); return; }
    if (p === null) { toast.error("El precio de la variante no es válido"); return; }
    guardarVariante.mutate({ ...(v.id ? { id: v.id } : {}), productId: producto.id, name: v.name.trim(), ...(p ? { price: p } : {}), stock: parseInt(v.stock, 10) || 0 },
      { onSuccess: () => { toast.success(v.id ? "Variante guardada" : "Variante agregada"); setV({ id: 0, name: "", price: "", stock: "" }); } });
  };

  return (
    <div className="ped__ficha">
      <form className="form" onSubmit={enviar}>
        <div className="form form--inline">
          <label className="field tie__ancho"><span className="field__label">Nombre</span><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} maxLength={256} required /></label>
          <label className="field"><span className="field__label">Precio (USD)</span><input value={f.price} onChange={e => setF({ ...f, price: e.target.value })} inputMode="decimal" required /></label>
          <label className="field"><span className="field__label">Precio anterior (sale tachado)</span><input value={f.antes} onChange={e => setF({ ...f, antes: e.target.value })} inputMode="decimal" placeholder="Opcional" /></label>
          <label className="field"><span className="field__label">Existencias</span><input value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} inputMode="numeric" required /></label>
          <label className="field tie__ancho"><span className="field__label">Colección</span>
            <select value={f.categoryId} onChange={e => setF({ ...f, categoryId: e.target.value })}>
              {!producto.categoryId && <option value="">Sin colección</option>}
              {colecciones.map(c => <option key={c.id} value={c.id}>{c.name}{c.isActive === false ? " (oculta)" : ""}</option>)}
            </select></label>
        </div>
        <label className="field"><span className="field__label">Descripción</span><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={4} maxLength={10000} /></label>
        <div className="tie__checks">
          <label className="check"><input type="checkbox" checked={f.publicado} onChange={e => setF({ ...f, publicado: e.target.checked })} /> Visible en la tienda</label>
          <label className="check"><input type="checkbox" checked={f.destacado} onChange={e => setF({ ...f, destacado: e.target.checked })} /> Destacado en la portada</label>
        </div>
        {aviso && <p className="notice" role="alert">{aviso}</p>}
        <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={guardar.isPending}>{guardar.isPending ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>

      <h3 className="ped__sub">Fotos</h3>
      {detalle.isLoading ? <p className="empty">Cargando…</p> : (
        <ul className="tie__fotos">
          {fotos.map(x => (
            <li key={x.id}>
              <img src={x.url} alt="" loading="lazy" />
              {x.position === 0 && <Badge tone="hot">Portada</Badge>}
              <button type="button" className="pa-accion" disabled={quitarFoto.isPending} onClick={() => quitarFoto.mutate({ imageId: x.id })}>Quitar</button>
            </li>
          ))}
          <li className="tie__subir">
            <input ref={archivo} id={`fotos-${producto.id}`} type="file" accept="image/*" multiple hidden onChange={e => void alElegirFotos(e.target.files)} />
            <label htmlFor={`fotos-${producto.id}`} className={`btn btn--ghost btn--small${subiendo ? " is-off" : ""}`}>{subiendo ? `Subiendo ${subiendo}…` : "Agregar fotos"}</label>
          </li>
        </ul>
      )}
      {!detalle.isLoading && fotos.length === 0 && <p className="empty">Sin fotos todavía. La primera que subas será la portada.</p>}

      <h3 className="ped__sub">Variantes</h3>
      <p className="pa-tenue tie__nota">Úsalas si el producto se vende en versiones: tamaño, pintado o sin pintar. Si una variante no lleva precio, usa el del producto.</p>
      {variantes.length > 0 && (
        <ul className="rows">
          {variantes.map(x => (
            <li key={x.id} className="tie__variante">
              <span className="rows__main"><strong>{x.name}</strong><small>{x.price ? dinero(x.price) : "Precio del producto"} · {x.stock} en existencia</small></span>
              <span className="tie__acciones">
                <button type="button" className="pa-accion" onClick={() => setV({ id: x.id, name: x.name, price: x.price ? num(x.price).toFixed(2) : "", stock: String(x.stock) })}>Editar</button>
                <Confirmar texto="Quitar" pregunta="¿Quitar esta variante?" si="Sí, quitar" disabled={quitarVariante.isPending} onSi={() => quitarVariante.mutate({ id: x.id })} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <form className="form form--inline" onSubmit={enviarVariante}>
        <label className="field"><span className="field__label">{v.id ? "Nombre de la variante" : "Nueva variante"}</span><input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} placeholder="20 cm, pintada" maxLength={128} /></label>
        <label className="field"><span className="field__label">Precio</span><input value={v.price} onChange={e => setV({ ...v, price: e.target.value })} inputMode="decimal" placeholder="Opcional" /></label>
        <label className="field"><span className="field__label">Existencias</span><input value={v.stock} onChange={e => setV({ ...v, stock: e.target.value })} inputMode="numeric" placeholder="0" /></label>
        <span className="tie__acciones">
          <button className="btn btn--ghost btn--small" type="submit" disabled={guardarVariante.isPending}>{v.id ? "Guardar variante" : "Agregar variante"}</button>
          {v.id > 0 && <button type="button" className="pa-accion" onClick={() => setV({ id: 0, name: "", price: "", stock: "" })}>Cancelar</button>}
        </span>
      </form>

      <div className="ped__otras">
        <a className="pa-accion tie__enlace" href={urlTienda(`/product/${producto.slug}`)} target="_blank" rel="noreferrer">Ver en la tienda</a>
        <Confirmar texto="Eliminar producto" pregunta="¿Eliminar este producto con sus fotos y variantes?" si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: producto.id })} />
      </div>
    </div>
  );
}

// ── Productos ────────────────────────────────────────────────────────────────
type Filtro = "todos" | "publicados" | "borradores" | "agotados" | "destacados";
const FILTROS: { id: Filtro; texto: string; si: (p: Producto) => boolean }[] = [
  { id: "todos", texto: "Todos", si: () => true },
  { id: "publicados", texto: "Publicados", si: p => p.status === "published" },
  { id: "borradores", texto: "Borradores", si: p => p.status === "draft" },
  { id: "agotados", texto: "Agotados", si: p => p.stock <= 0 },
  { id: "destacados", texto: "Destacados", si: p => p.featured },
];

function Productos({ colecciones }: { colecciones: Coleccion[] }) {
  const utils = trpc.useUtils();
  const lista = trpc.products.adminList.useQuery({ limit: 500 });
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [buscar, setBuscar] = useState("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [nuevo, setNuevo] = useState({ ver: false, name: "", price: "", stock: "", categoryId: "" });
  const crear = trpc.products.create.useMutation({ onError: e => toast.error(e.message) });

  const todos = (lista.data?.items ?? []) as unknown as Producto[];
  const q = buscar.trim().toLowerCase();
  const visibles = useMemo(() => {
    const si = FILTROS.find(x => x.id === filtro)!.si;
    // El que está abierto no se va de la lista aunque al guardarlo cambie de grupo (publicar un borrador)
    return todos.filter(p => (q ? p.name.toLowerCase().includes(q) : si(p) || p.id === abierto));
  }, [todos, filtro, q, abierto]);

  const precioNuevo = aPrecio(nuevo.price);
  const alCrear = (e: FormEvent) => {
    e.preventDefault();
    if (!nuevo.name.trim() || precioNuevo === null) { toast.error("Escribe el nombre y el precio (12 o 12,50)"); return; }
    const slug = slugLibre(aSlug(nuevo.name), new Set(todos.map(p => p.slug)));
    crear.mutate({ name: nuevo.name.trim(), slug, price: precioNuevo, stock: parseInt(nuevo.stock, 10) || 0, ...(nuevo.categoryId ? { categoryId: Number(nuevo.categoryId) } : {}), status: "draft" }, {
      onSuccess: async creado => {
        toast.success("Producto creado como borrador");
        setNuevo({ ver: false, name: "", price: "", stock: "", categoryId: "" }); setBuscar(""); setFiltro("borradores");
        // Se espera a que la lista traiga el producto nuevo y se abre su ficha
        await utils.products.adminList.invalidate();
        const id = (creado as { id?: number } | undefined)?.id;
        if (id) setAbierto(id);
      },
    });
  };

  return (
    <Panel title="Productos" action={<button className="btn btn--small" type="button" onClick={() => setNuevo(n => ({ ...n, ver: !n.ver }))}>{nuevo.ver ? "Cerrar" : "Nuevo producto"}</button>}>
      {nuevo.ver && (
        <form className="form tie__nuevo" onSubmit={alCrear}>
          <p className="pa-tenue">Se crea como borrador. Después le agregas fotos, variantes y descripción, y lo publicas.</p>
          <div className="form form--inline">
            <label className="field tie__ancho"><span className="field__label">Nombre</span><input value={nuevo.name} onChange={e => setNuevo({ ...nuevo, name: e.target.value })} placeholder="Figura Sung Jin-Woo 20 cm" maxLength={256} required autoFocus /></label>
            <label className="field"><span className="field__label">Precio (USD)</span><input value={nuevo.price} onChange={e => setNuevo({ ...nuevo, price: e.target.value })} inputMode="decimal" placeholder="24,00" required /></label>
            <label className="field"><span className="field__label">Existencias</span><input value={nuevo.stock} onChange={e => setNuevo({ ...nuevo, stock: e.target.value })} inputMode="numeric" placeholder="0" /></label>
            <label className="field"><span className="field__label">Colección</span>
              <select value={nuevo.categoryId} onChange={e => setNuevo({ ...nuevo, categoryId: e.target.value })}><option value="">Sin colección</option>{colecciones.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <div className="eq-acciones"><button className="btn btn--small" type="submit" disabled={crear.isPending}>{crear.isPending ? "Creando…" : "Crear producto"}</button></div>
        </form>
      )}
      <label className="field ped__buscar"><span className="field__label">Buscar</span><input value={buscar} onChange={e => setBuscar(e.target.value)} type="search" placeholder="Nombre del producto" /></label>
      {!q && (
        <div className="tabs" role="tablist" aria-label="Productos por estado">
          {FILTROS.map(x => {
            const n = todos.filter(x.si).length;
            return <button key={x.id} type="button" role="tab" aria-selected={filtro === x.id} className={filtro === x.id ? "is-active" : undefined} onClick={() => { setFiltro(x.id); setAbierto(null); }}>{x.texto}{n ? <span className="tabs__n">{n}</span> : null}</button>;
          })}
        </div>
      )}
      {lista.isLoading ? <p className="empty">Cargando productos…</p>
        : lista.error ? <p className="notice" role="alert">No pudimos cargar los productos. {lista.error.message}</p>
        : visibles.length === 0 ? <p className="empty">{q ? `Ningún producto se llama «${buscar.trim()}».` : todos.length === 0 ? "Todavía no hay productos. Crea el primero con «Nuevo producto»." : "No hay productos en esta lista."}</p>
        : (
          <ul className="ped">
            {visibles.map(p => {
              const esteAbierto = abierto === p.id;
              return (
                <li key={p.id} className={esteAbierto ? "is-open" : undefined}>
                  <button type="button" className="ped__fila tie__fila" aria-expanded={esteAbierto} onClick={() => setAbierto(esteAbierto ? null : p.id)}>
                    <span className="tie__mini">{p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" /> : null}</span>
                    <span className="tie__texto">
                      <span className="ped__quien"><strong>{p.name}</strong><span className="rows__side">{dinero(p.price)}</span></span>
                      <span className="ped__pie-fila"><small>{p.category?.name ?? "Sin colección"} · {p.stock} en existencia</small>
                        <span className="ped__insignias">{p.status === "draft" && <Badge tone="warn">Borrador</Badge>}{p.stock <= 0 && <Badge tone="off">Agotado</Badge>}{p.featured && <Badge>Destacado</Badge>}</span></span>
                    </span>
                  </button>
                  {esteAbierto && <FichaProducto key={p.id} producto={p} colecciones={colecciones} alBorrar={() => setAbierto(null)} />}
                </li>
              );
            })}
          </ul>
        )}
    </Panel>
  );
}

// ── Colecciones ──────────────────────────────────────────────────────────────
function Colecciones({ colecciones, cargando }: { colecciones: Coleccion[]; cargando: boolean }) {
  const utils = trpc.useUtils();
  const refrescar = () => { void utils.categories.invalidate(); void utils.products.invalidate(); };
  const alFallar = (e: { message: string }) => toast.error(e.message);
  const productos = trpc.products.adminList.useQuery({ limit: 500 });
  const crear = trpc.categories.create.useMutation({ onSuccess: () => { toast.success("Colección creada"); setNombre(""); refrescar(); }, onError: e => toast.error(/duplicate/i.test(e.message) ? "Ya existe una colección con ese nombre." : e.message) });
  const cambiar = trpc.categories.update.useMutation({ onSuccess: refrescar, onError: alFallar });
  const mover = trpc.categories.mover.useMutation({ onSuccess: refrescar, onError: alFallar });
  const borrar = trpc.categories.delete.useMutation({ onSuccess: () => { toast.success("Colección eliminada"); refrescar(); }, onError: alFallar });
  const subir = useSubirImagen();
  const [nombre, setNombre] = useState("");
  const [ed, setEd] = useState<{ id: number; name: string; description: string } | null>(null);
  const [subiendo, setSubiendo] = useState<number | null>(null);

  const cuenta = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of (productos.data?.items ?? []) as unknown as Producto[]) if (p.categoryId) m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    return m;
  }, [productos.data]);
  const alCrear = (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    crear.mutate({ name: nombre.trim(), slug: slugLibre(aSlug(nombre), new Set(colecciones.map(c => c.slug))) });
  };
  const alSubir = async (c: Coleccion, archivo: File | undefined) => {
    if (!archivo) return;
    setSubiendo(c.id);
    try { const { url } = await subir(archivo); await cambiar.mutateAsync({ id: c.id, imageUrl: url }); toast.success("Imagen cambiada"); }
    catch (e: any) { toast.error(e?.message ?? "No se pudo subir la imagen"); }
    finally { setSubiendo(null); }
  };

  return (
    <Panel title="Colecciones" lead="Agrupan los productos en la tienda. El orden de esta lista es el orden en que salen en la portada.">
      <form className="form form--inline tie__nuevo" onSubmit={alCrear}>
        <label className="field tie__ancho"><span className="field__label">Nueva colección</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Solo Leveling" maxLength={128} /></label>
        <button className="btn btn--small" type="submit" disabled={crear.isPending || !nombre.trim()}>Crear colección</button>
      </form>
      {cargando ? <p className="empty">Cargando…</p> : colecciones.length === 0 ? <p className="empty">Todavía no hay colecciones.</p> : (
        <ul className="ped">
          {colecciones.map((c, i) => {
            const n = cuenta.get(c.id) ?? 0;
            return (
              <li key={c.id} className="tie__coleccion">
                <span className="tie__mini">{c.imageUrl ? <img src={c.imageUrl} alt="" loading="lazy" /> : null}</span>
                <div className="tie__texto">
                  {ed?.id === c.id ? (
                    <form className="form" onSubmit={e => { e.preventDefault(); if (ed.name.trim()) cambiar.mutate({ id: c.id, name: ed.name.trim(), description: ed.description }, { onSuccess: () => { toast.success("Colección guardada"); setEd(null); } }); }}>
                      <label className="field"><span className="field__label">Nombre</span><input value={ed.name} onChange={e => setEd({ ...ed, name: e.target.value })} maxLength={128} required autoFocus /></label>
                      <label className="field"><span className="field__label">Descripción</span><textarea value={ed.description} onChange={e => setEd({ ...ed, description: e.target.value })} rows={2} maxLength={2000} /></label>
                      <span className="tie__acciones"><button className="btn btn--small" type="submit" disabled={cambiar.isPending}>Guardar</button><button type="button" className="pa-accion" onClick={() => setEd(null)}>Cancelar</button></span>
                    </form>
                  ) : (
                    <>
                      <span className="ped__quien"><strong>{c.name}</strong>
                        <span className="ped__insignias">{c.isActive === false && <Badge tone="off">Oculta</Badge>}{c.featured && <Badge>Destacada</Badge>}</span></span>
                      <small className="pa-tenue">{n === 1 ? "1 producto" : `${n} productos`}{c.description ? ` · ${c.description}` : ""}</small>
                      <span className="tie__acciones">
                        <button type="button" className="pa-accion" disabled={i === 0 || mover.isPending} onClick={() => mover.mutate({ id: c.id, direccion: "arriba" })}>Subir</button>
                        <button type="button" className="pa-accion" disabled={i === colecciones.length - 1 || mover.isPending} onClick={() => mover.mutate({ id: c.id, direccion: "abajo" })}>Bajar</button>
                        <button type="button" className="pa-accion" disabled={cambiar.isPending} onClick={() => cambiar.mutate({ id: c.id, isActive: c.isActive === false })}>{c.isActive === false ? "Mostrar en la tienda" : "Ocultar"}</button>
                        <button type="button" className="pa-accion" disabled={cambiar.isPending} onClick={() => cambiar.mutate({ id: c.id, featured: !c.featured })}>{c.featured ? "Quitar de destacadas" : "Destacar"}</button>
                        <button type="button" className="pa-accion" onClick={() => setEd({ id: c.id, name: c.name, description: c.description ?? "" })}>Editar</button>
                        <input id={`col-${c.id}`} type="file" accept="image/*" hidden onChange={e => void alSubir(c, e.target.files?.[0])} />
                        <label htmlFor={`col-${c.id}`} className="pa-accion tie__enlace">{subiendo === c.id ? "Subiendo…" : c.imageUrl ? "Cambiar imagen" : "Poner imagen"}</label>
                        {n === 0 ? <Confirmar texto="Eliminar" pregunta="¿Eliminar esta colección?" si="Sí, eliminar" disabled={borrar.isPending} onSi={() => borrar.mutate({ id: c.id })} />
                          : <span className="pa-tenue tie__nota">Para eliminarla, primero pasa sus productos a otra colección.</span>}
                      </span>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default function Tienda() {
  const [vista, setVista] = useState<"productos" | "colecciones">("productos");
  const colecciones = trpc.categories.listAdmin.useQuery();
  const lista = (colecciones.data ?? []) as unknown as Coleccion[];
  return (
    <>
      <div className="tabs" role="tablist" aria-label="Partes de la tienda">
        <button type="button" role="tab" aria-selected={vista === "productos"} className={vista === "productos" ? "is-active" : undefined} onClick={() => setVista("productos")}>Productos</button>
        <button type="button" role="tab" aria-selected={vista === "colecciones"} className={vista === "colecciones" ? "is-active" : undefined} onClick={() => setVista("colecciones")}>Colecciones{lista.length ? <span className="tabs__n">{lista.length}</span> : null}</button>
      </div>
      {vista === "productos" ? <Productos colecciones={lista} /> : <Colecciones colecciones={lista} cargando={colecciones.isLoading} />}
    </>
  );
}
