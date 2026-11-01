import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import mapaSvg from "./mapa-fest.svg?raw";
import { FEST_ZONES, FEST_CONTACTO } from "./festZones";
import "./FestMap.css";

/**
 * Mapa interactivo del Isekai World Fest.
 * - Toca una zona del mapa (o un chip) y se abre una ficha con animación tipo portal:
 *   render, descripción y por qué le sirve a una marca.
 * - Las zonas clicables del SVG son los <g class="hot" data-zone="..."> (capa "zonas-clicables").
 * - Los renders van en /public/fest/renders/<img>.webp
 */
const IMG_BASE = "/fest/renders/";

type Origin = { x: string; y: string };

export default function FestMap() {
  const [current, setCurrent] = useState<number>(-1);
  const [origin, setOrigin] = useState<Origin>({ x: "50%", y: "50%" });
  const [animKey, setAnimKey] = useState(0);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const byId = useMemo(() => Object.fromEntries(FEST_ZONES.map((z, i) => [z.id, i])), []);
  const zone = current >= 0 ? FEST_ZONES[current] : null;

  const originFrom = (clientX?: number, clientY?: number): Origin => {
    if (clientX === undefined || clientY === undefined || (clientX === 0 && clientY === 0)) return { x: "50%", y: "50%" };
    const vw = window.innerWidth, vh = window.innerHeight;
    const pw = Math.min(1080, vw - 32), ph = Math.min(620, vh - 32);
    return { x: `${clientX - (vw - pw) / 2}px`, y: `${clientY - (vh - ph) / 2}px` };
  };

  const openZone = useCallback((id: string, clientX?: number, clientY?: number) => {
    const idx = byId[id];
    if (idx === undefined) return;
    setTip(null);
    const hot = mapRef.current?.querySelector<SVGGElement>(`.hot[data-zone="${id}"]`);
    if (hot) { hot.classList.remove("is-pulse"); void hot.getBoundingClientRect(); hot.classList.add("is-pulse"); }
    if (current < 0) lastFocus.current = document.activeElement as HTMLElement;
    const delay = current < 0 && hot ? 180 : 0;
    window.setTimeout(() => {
      setOrigin(originFrom(clientX, clientY));
      setCurrent(idx);
      setAnimKey(k => k + 1);
    }, delay);
  }, [byId, current]);

  const closeZone = useCallback(() => {
    setCurrent(-1);
    mapRef.current?.querySelectorAll(".hot.is-pulse").forEach(h => h.classList.remove("is-pulse"));
    lastFocus.current?.focus?.({ preventScroll: true });
  }, []);

  const step = useCallback((d: number) => {
    setOrigin({ x: "50%", y: "50%" });
    setCurrent(c => (c + d + FEST_ZONES.length) % FEST_ZONES.length);
    setAnimKey(k => k + 1);
  }, []);

  // etiquetas accesibles en las zonas del SVG
  useEffect(() => {
    mapRef.current?.querySelectorAll<SVGGElement>(".hot").forEach(h => {
      const i = byId[h.dataset.zone ?? ""];
      if (i !== undefined) h.setAttribute("aria-label", FEST_ZONES[i].nombre);
    });
  }, [byId]);

  // teclado con la ficha abierta
  useEffect(() => {
    if (current < 0) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZone();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, closeZone, step]);

  const hotFrom = (target: EventTarget | null) => (target as Element | null)?.closest?.(".hot") as SVGGElement | null;

  const onMapClick = (e: ReactMouseEvent) => {
    const h = hotFrom(e.target);
    if (h?.dataset.zone) openZone(h.dataset.zone, e.clientX, e.clientY);
  };
  const onMapKey = (e: React.KeyboardEvent) => {
    const h = hotFrom(e.target);
    if (h?.dataset.zone && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openZone(h.dataset.zone); }
  };
  const onMapMove = (e: ReactMouseEvent) => {
    if (current >= 0) return;
    const h = hotFrom(e.target);
    const i = h ? byId[h.dataset.zone ?? ""] : undefined;
    setTip(i !== undefined ? { text: FEST_ZONES[i].nombre, x: e.clientX, y: e.clientY } : null);
  };

  const mailto = zone
    ? `mailto:${FEST_CONTACTO}?subject=${encodeURIComponent(`Patrocinio · ${zone.nombre} · Isekai World Fest`)}`
    : "#";

  return (
    <section className="fest-map" aria-label="Mapa interactivo del Isekai World Fest">
      <div className="wrap">
        <header className="head">
          <div className="eyebrow">Isekai World Fest 2027 · 14 y 15 de agosto · Maracaibo</div>
          <h1>Explora el <span>mapa</span> del Fest</h1>
          <p className="lead">
            Cada zona es una experiencia y una oportunidad para tu marca. Toca una zona del mapa para ver su render,
            lo que vivirá el público y cómo puede sumar tu marca.
          </p>
        </header>

        <div className="map-card">
          <div className="hint">Toca una zona</div>
          <div
            className="map-scroll"
            ref={mapRef}
            onClick={onMapClick}
            onKeyDown={onMapKey}
            onMouseMove={onMapMove}
            onMouseLeave={() => setTip(null)}
            dangerouslySetInnerHTML={{ __html: mapaSvg }}
          />
        </div>

        <nav className="chips" aria-label="Zonas del recorrido">
          {FEST_ZONES.map(z => (
            <button key={z.id} type="button" className="chip" onClick={e => openZone(z.id, e.clientX, e.clientY)}>
              <b>{z.paso.replace("Paso ", "").replace("Antes de entrar", "0")}</b>{z.nombre}
            </button>
          ))}
        </nav>
      </div>

      {tip && <div className="tip on" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}

      {zone && (
        <div className="overlay open" key={animKey} onClick={e => { if (e.target === e.currentTarget) closeZone(); }}>
          <article
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fest-zone-name"
            style={{ ["--ox" as string]: origin.x, ["--oy" as string]: origin.y }}
          >
            <button ref={closeRef} className="x" aria-label="Cerrar" onClick={closeZone}>×</button>
            <div className="media">
              {zone.img
                ? <img src={`${IMG_BASE}${zone.img}.webp`} alt={`Render de ${zone.nombre}`} />
                : <div className="noimg">Render de {zone.nombre}<br />próximamente</div>}
            </div>
            <div className="info">
              <div className="paso">{zone.paso}</div>
              <h2 id="fest-zone-name">{zone.nombre}</h2>
              <p>{zone.resumen}</p>
              <h3>Por qué le sirve a tu marca</h3>
              <ul>{zone.marca.map(m => <li key={m}><span>{m}</span></li>)}</ul>
              <div>
                <div className="cta">
                  <a className="btn" href={mailto}>Quiero patrocinar esta zona</a>
                  <span className="mail">{FEST_CONTACTO}</span>
                </div>
                <div className="nav">
                  <button type="button" onClick={() => step(-1)}>← Anterior</button>
                  <button type="button" onClick={() => step(1)}>Siguiente →</button>
                </div>
              </div>
            </div>
            <div className="ring" />
          </article>
        </div>
      )}
    </section>
  );
}

