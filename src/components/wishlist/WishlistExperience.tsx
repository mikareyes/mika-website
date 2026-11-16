"use client";

/**
 * /wishlist/<year>: the gifts rain down onto a giant title and pile up. Drag
 * them around, tap one to open it, buy it from the shop's own page, then mark
 * it as claimed so nobody else buys the same thing.
 *
 * Matter.js does the physics. Gifts are plain <button>s moved with CSS
 * transforms, so they stay focusable and readable by screen readers. Under
 * `prefers-reduced-motion` the pile settles off-screen and appears at rest.
 *
 * Claims live in Neon (see `src/lib/wishlist/claims.ts`), shared by every
 * visitor. The browser that claimed a gift keeps a random id that lets it undo.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { buttonStyle } from "@/components/ui/buttonStyle";
import type { Wishlist, WishlistGift } from "@/lib/wishlist";

import "./wishlist.css";

type MatterModule = typeof import("matter-js");
type Item = { gift: WishlistGift; w: number; h: number; body: import("matter-js").Body | null };

const CLAIMER_KEY = "mr-wishlist-claimer";

function getClaimer() {
  try {
    let id = localStorage.getItem(CLAIMER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLAIMER_KEY, id);
    }
    return id;
  } catch {
    // Private mode: claims still save, but this browser can't undo them later.
    return crypto.randomUUID();
  }
}

/** `[label](https://…)` becomes a link; everything else stays text. */
function Blurb({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    parts.push(text.slice(last, m.index));
    parts.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>,
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export default function WishlistExperience({ list }: { list: Wishlist }) {
  const { gifts, year } = list;

  const heroRef = useRef<HTMLHeadingElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const pileRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const dropRef = useRef<(delay?: number) => void>(() => {});
  const pauseRef = useRef<(paused: boolean) => void>(() => {});

  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [loadFailed, setLoadFailed] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const claimerRef = useRef("");

  const current = gifts.find((gift) => gift.id === currentId) ?? null;

  /* ---------------------------------------------------------------- */
  /* Claims                                                            */
  /* ---------------------------------------------------------------- */

  const applyClaims = useCallback((data: { claimed: string[]; mine: string[] }) => {
    setClaimed(new Set(data.claimed));
    setMine(new Set(data.mine));
    setLoadFailed(false);
  }, []);

  const refreshClaims = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/wishlist?year=${year}&claimer=${encodeURIComponent(claimerRef.current)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(String(res.status));
      applyClaims(await res.json());
    } catch {
      setLoadFailed(true);
    }
  }, [year, applyClaims]);

  useEffect(() => {
    claimerRef.current = getClaimer();
    refreshClaims();
    // Friends leave the tab open: catch up on what's taken when they return.
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshClaims();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshClaims]);

  async function updateClaim(action: "claim" | "unclaim") {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, giftId: current.id, claimer: claimerRef.current, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "Could not save. Try again.", error: true });
        refreshClaims();
        return;
      }
      applyClaims(data);
      setMessage({ text: action === "claim" ? "Marked as claimed. Thank you!" : "Undone. It's open again." });
    } catch {
      setMessage({ text: "Could not save. Check your connection and try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Hash routing: #/gift/<id> opens a gift                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const route = () => {
      const m = location.hash.match(/^#\/gift\/([a-z0-9-]+)$/);
      const id = m && gifts.some((gift) => gift.id === m[1]) ? m[1] : null;
      setCurrentId(id);
      setMessage(null);
    };
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [gifts]);

  const detailRef = useRef<HTMLElement>(null);
  const lastFocus = useRef<Element | null>(null);
  useEffect(() => {
    if (current) {
      lastFocus.current ??= document.activeElement;
      detailRef.current?.scrollTo(0, 0);
      detailRef.current?.focus({ preventScroll: true });
      document.title = `${current.name} · Mika's Wishlist ${year}`;
      pauseRef.current(true);
      refreshClaims();
    } else {
      document.title = `Mika's Wishlist ${year} · Mika Reyes`;
      pauseRef.current(false);
      if (lastFocus.current instanceof HTMLElement && document.contains(lastFocus.current)) {
        lastFocus.current.focus();
      }
      lastFocus.current = null;
    }
  }, [current, year, refreshClaims]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && location.hash.startsWith("#/gift/")) location.hash = "#/";
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Title + physics pile                                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const Matter: MatterModule = await import("matter-js");
      await document.fonts.ready.catch(() => {});
      if (cancelled) return;

      const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Query, Events } = Matter;
      const hero = heroRef.current!;
      const bar = barRef.current!;
      const pile = pileRef.current!;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Each line stretched to the full width, so the shorter word gets bigger.
      const layoutHero = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        hero.style.top = Math.round(bar.getBoundingClientRect().bottom + 4) + "px";
        const gutter = parseFloat(getComputedStyle(hero).paddingLeft) || 16;
        const lines = [...hero.querySelectorAll<HTMLElement>(".wl-hero-line")];
        const sizes = lines.map((line) => {
          line.style.fontSize = "100px";
          const width = line.getBoundingClientRect().width;
          return ((w - gutter * 2) / width) * 100 * 0.94;
        });
        const lineHeight = 0.9;
        const maxH = h * (w / h < 1.15 ? 0.32 : 0.44);
        const total = sizes.reduce((sum, s) => sum + s * lineHeight, 0);
        const k = Math.min(1, maxH / total);
        lines.forEach((line, i) => (line.style.fontSize = sizes[i] * k + "px"));
      };

      // Natural image sizes, so each gift keeps its own proportions.
      const ratios = new Map<string, number>();
      await Promise.all(
        gifts.map(
          (gift) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                ratios.set(gift.id, img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
                resolve();
              };
              img.onerror = () => {
                ratios.set(gift.id, 1);
                resolve();
              };
              img.src = gift.image;
            }),
        ),
      );
      if (cancelled) return;

      layoutHero();
      const engine = Engine.create({ gravity: { x: 0, y: 1.1 } });
      const runner = Runner.create();
      const items: Item[] = gifts.map((gift) => ({ gift, w: 0, h: 0, body: null }));
      const el = (item: Item) => buttonRefs.current.get(item.gift.id);

      // Gifts sized from the free space under the title, so the pile only
      // nibbles the title's bottom edge. Five gifts get big on purpose.
      const giftScale = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const heroBottom = hero.getBoundingClientRect().bottom;
        const free = vw * Math.max(vh * 0.45, vh - heroBottom * 0.6);
        const unitArea = items.reduce((sum, it) => {
          const r = ratios.get(it.gift.id) ?? 1;
          return sum + (r >= 1 ? 1 / r : r);
        }, 0);
        const fill = vw < 600 ? 0.72 : 0.62;
        return Math.max(120, Math.min(Math.sqrt((fill * free) / unitArea), vw < 600 ? vw * 0.62 : 440));
      };

      let walls: import("matter-js").Body[] = [];
      const buildWalls = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const t = 400; // thick, so fast gifts never tunnel through
        if (walls.length) Composite.remove(engine.world, walls);
        walls = [
          Bodies.rectangle(vw / 2, vh + t / 2, vw * 3, t, { isStatic: true }),
          Bodies.rectangle(-t / 2, vh / 2 - vh * 2, t, vh * 6, { isStatic: true }),
          Bodies.rectangle(vw + t / 2, vh / 2 - vh * 2, t, vh * 6, { isStatic: true }),
        ];
        Composite.add(engine.world, walls);
      };

      let dropRun = 0;
      const dropAll = (delay = 450) => {
        const run = ++dropRun;
        const vw = window.innerWidth;
        const L = giftScale();
        const order = [...items].sort(() => Math.random() - 0.5);
        order.forEach((it, i) => {
          if (it.body) Composite.remove(engine.world, it.body);
          const r = ratios.get(it.gift.id) ?? 1;
          it.w = r >= 1 ? L : L * r;
          it.h = r >= 1 ? L / r : L;
          const node = el(it);
          if (node) {
            node.style.width = it.w + "px";
            node.style.height = it.h + "px";
            node.style.visibility = "hidden";
          }
          // Hit box a little inside the picture: painted edges are irregular.
          const body = Bodies.rectangle(0, 0, it.w * 0.86, it.h * 0.86, {
            chamfer: { radius: Math.min(it.w, it.h) * 0.12 },
            restitution: 0.18,
            friction: 0.5,
            frictionAir: 0.012,
            density: 0.0016,
          });
          body.plugin = { item: it };
          Body.setPosition(body, {
            x: it.w / 2 + Math.random() * Math.max(1, vw - it.w),
            y: -it.h - i * (reduceMotion ? 0 : 80) - Math.random() * 120,
          });
          Body.setAngle(body, (Math.random() - 0.5) * 1.2);
          Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.06);
          it.body = body;
        });

        if (reduceMotion) {
          order.forEach((it) => Composite.add(engine.world, it.body!));
          for (let i = 0; i < 900; i++) Engine.update(engine, 1000 / 60);
          order.forEach((it) => el(it)?.style.setProperty("visibility", "visible"));
          render();
          return;
        }
        const start = performance.now();
        const pending = order.map((it, i) => ({ it, at: i * 220 }));
        const release = () => {
          if (run !== dropRun || cancelled) return;
          const now = performance.now() - start;
          while (pending.length && pending[0].at <= now) {
            const { it } = pending.shift()!;
            Composite.add(engine.world, it.body!);
            el(it)?.style.setProperty("visibility", "visible");
          }
          if (pending.length) requestAnimationFrame(release);
        };
        setTimeout(() => requestAnimationFrame(release), delay);
      };

      const render = () => {
        for (const it of items) {
          const node = el(it);
          if (!it.body || !node) continue;
          const { x, y } = it.body.position;
          node.style.transform = `translate(${x - it.w / 2}px, ${y - it.h / 2}px) rotate(${it.body.angle}rad)`;
        }
      };
      let rafId = 0;
      const loop = () => {
        render();
        rafId = requestAnimationFrame(loop);
      };

      // Drag gifts around; a quick tap without dragging opens one.
      const mouse = Mouse.create(pile);
      const wheel = (mouse as unknown as { mousewheel: EventListener }).mousewheel;
      pile.removeEventListener("wheel", wheel);
      pile.removeEventListener("mousewheel", wheel);
      pile.removeEventListener("DOMMouseScroll", wheel);
      const mc = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, damping: 0.1, render: { visible: false } },
      });
      Composite.add(engine.world, mc);

      const visibleBodies = () =>
        items.filter((it) => it.body && el(it)?.style.visibility === "visible").map((it) => it.body!);
      const giftAt = (x: number, y: number): Item | null => {
        const hits = Query.point(visibleBodies(), { x, y });
        if (!hits.length) return null;
        // Later in the DOM is drawn on top.
        return hits.reduce((top, b) =>
          items.indexOf(b.plugin.item) > items.indexOf(top.plugin.item) ? b : top,
        ).plugin.item;
      };

      let down: { x: number; y: number; t: number } | null = null;
      const onDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY, t: performance.now() };
        if (giftAt(e.clientX, e.clientY)) pile.classList.add("is-dragging");
      };
      const onUp = (e: PointerEvent) => {
        pile.classList.remove("is-dragging");
        if (!down) return;
        const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
        const quick = performance.now() - down.t < 450;
        down = null;
        if (moved < 8 && quick) {
          const it = giftAt(e.clientX, e.clientY);
          if (it) location.hash = `#/gift/${it.gift.id}`;
        }
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        pile.classList.toggle("is-hover", !!giftAt(e.clientX, e.clientY));
      };
      pile.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      pile.addEventListener("pointermove", onMove);

      // Anything flung out of the world drops back in from the top.
      Events.on(engine, "afterUpdate", () => {
        for (const it of items) {
          if (it.body && it.body.position.y > window.innerHeight + 300) {
            Body.setPosition(it.body, { x: window.innerWidth / 2, y: -it.h });
            Body.setVelocity(it.body, { x: 0, y: 0 });
          }
        }
      });

      let lastW = window.innerWidth;
      let resizeTimer: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          layoutHero();
          buildWalls();
          // Width change rebuilds the pile; a height-only change (a phone's
          // address bar) just moves the floor.
          if (Math.abs(window.innerWidth - lastW) > 60) {
            lastW = window.innerWidth;
            dropAll(0);
          }
        }, 150);
      };
      window.addEventListener("resize", onResize);

      buildWalls();
      Runner.run(runner, engine);
      loop();
      dropAll();
      pile.classList.add("is-ready");

      dropRef.current = dropAll;
      pauseRef.current = (paused) => {
        if (paused) Runner.stop(runner);
        else Runner.run(runner, engine);
      };
      if (location.hash.startsWith("#/gift/")) Runner.stop(runner);

      cleanup = () => {
        cancelAnimationFrame(rafId);
        Runner.stop(runner);
        Engine.clear(engine);
        pile.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        pile.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", onResize);
        clearTimeout(resizeTimer);
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [gifts]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const openCount = gifts.length - gifts.filter((gift) => claimed.has(gift.id)).length;
  const countText = loadFailed
    ? "Couldn't load what's claimed. Refresh to try again."
    : `${openCount} of ${gifts.length} still open`;
  const isClaimed = current ? claimed.has(current.id) : false;
  const isMine = current ? mine.has(current.id) : false;

  return (
    <div className="wl-root">
      <header className="wl-bar" ref={barRef}>
        <p className="wl-hint">{list.hint}</p>
        <p className="wl-count" aria-live="polite">
          <span className="wl-year">✦ {year}</span> {countText}
        </p>
      </header>

      <h1 className="wl-hero" ref={heroRef} aria-label={`Mika's Wishlist ${year}`}>
        <span className="wl-hero-line">Mika&rsquo;s</span>
        <span className="wl-hero-line">Wishlist</span>
      </h1>

      <main className="wl-pile" ref={pileRef} aria-label="Gifts">
        {gifts.map((gift) => {
          const taken = claimed.has(gift.id);
          return (
            <button
              key={gift.id}
              ref={(node) => {
                if (node) buttonRefs.current.set(gift.id, node);
                else buttonRefs.current.delete(gift.id);
              }}
              type="button"
              className={`wl-gift${taken ? " is-taken" : ""}`}
              aria-label={taken ? `${gift.name}, claimed` : gift.name}
              // Keyboard only: pointer taps are handled by the physics layer.
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  location.hash = `#/gift/${gift.id}`;
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- moved by physics every frame; next/image adds nothing here */}
              <img src={gift.image} alt="" draggable={false} />
              {taken ? <span className="wl-stamp">Claimed</span> : null}
            </button>
          );
        })}
      </main>

      <button
        type="button"
        className="wl-rain mr-pressable"
        style={buttonStyle({ variant: "secondary", size: "sm" })}
        onClick={() => dropRef.current(0)}
      >
        <span aria-hidden="true">✦</span> Rain again
      </button>

      <section
        ref={detailRef}
        className="wl-detail"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wl-detail-name"
        hidden={!current}
      >
        {current ? (
          <>
            <nav className="wl-bar wl-detail-bar">
              <a className="wl-back" href="#/">
                ← All gifts
              </a>
              <p className="wl-count">{countText}</p>
            </nav>

            <div className="wl-detail-grid">
              <div className={`wl-art wl-ground-${current.ground}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static SVG art; next/image adds nothing here */}
                <img src={current.image} alt={current.name} />
                {isClaimed ? <span className="wl-stamp wl-stamp-big">Claimed</span> : null}
              </div>

              <div className="wl-detail-text">
                <h2 className="wl-name" id="wl-detail-name">
                  {current.name}
                </h2>
                <p className="wl-blurb">
                  <Blurb text={current.blurb} />
                </p>
                {current.experience ? (
                  <p className="wl-bonus">
                    <span aria-hidden="true">✦</span> Bonus: come join the experience with me!!
                  </p>
                ) : null}
                <p className="wl-price">{current.price}</p>

                <div className="wl-actions">
                  {/* Every buy link is primary, even when a gift has two (Mika's call,
                      a deliberate exception to DESIGN.md's one-red-button rule). */}
                  {current.links.map((link) => (
                    <a
                      key={link.url}
                      className="mr-pressable"
                      style={buttonStyle({ size: "lg" })}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}

                  {!isClaimed ? (
                    <>
                      <button
                        type="button"
                        className="mr-pressable"
                        style={buttonStyle({ variant: "secondary", size: "lg" })}
                        onClick={() => updateClaim("claim")}
                        disabled={busy}
                      >
                        Mark as claimed
                      </button>
                      <p className="wl-note">
                        Bought it? Mark it as claimed so nobody else buys it too.
                      </p>
                    </>
                  ) : message ? null : (
                    <p className="wl-note">
                      {isMine ? "You claimed this one. Thank you!" : "Someone already got this one."}
                    </p>
                  )}

                  <p className={`wl-msg${message?.error ? " is-error" : ""}`} role="status" aria-live="polite">
                    {message?.text}
                  </p>

                  {isClaimed && isMine ? (
                    <button type="button" className="wl-undo" onClick={() => updateClaim("unclaim")} disabled={busy}>
                      Undo, I didn&rsquo;t buy it
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
