"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/components/lib/utils";

export interface BendCarouselItem {
  id?: string | number;
  image: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  tag?: string;
  description?: string;
  link?: string;
  onClick?: () => void;
}

export interface ThreeDBendCarouselProps {
  /** Array of items (objects or image URL strings) */
  items?: (string | BendCarouselItem)[];
  /** Compatibility alias for image URLs */
  images?: string[];
  /** Card width in pixels */
  itemWidth?: number;
  /** Aspect ratio (width / height) */
  aspectRatio?: number;
  /** Gap between items in pixels (can be negative for stacked/shingle effect) */
  gap?: number;
  /** 3D Perspective value in pixels */
  perspective?: number;
  /** Maximum bend rotation angle in degrees */
  bendAngle?: number;
  /** 3D depth displacement along Z-axis in pixels */
  depth?: number;
  /** Curvature direction: 'concave' (curves away into screen) or 'convex' (curves forward) */
  curveDirection?: "concave" | "convex";
  /** Bend orientation: 'vertical' or 'horizontal' */
  orientation?: "vertical" | "horizontal";
  /** Height of the carousel viewport */
  height?: number | string;
  /** Width of the carousel container */
  width?: number | string;
  /** Damping factor for smooth momentum lerp (0.04 to 0.2, lower is floatier, higher is snappier) */
  damping?: number;
  /** Friction applied to drag velocity on release */
  momentumFactor?: number;
  /** Auto-snap to nearest card when user stops dragging or scrolling */
  snap?: boolean;
  /** Seamless infinite looping */
  loop?: boolean;
  /** Whether items away from center fade to monochrome grayscale */
  grayscaleInactive?: boolean;
  /** Scale factor for the active center card */
  activeScale?: number;
  /** Minimum opacity for cards farthest from center */
  minOpacity?: number;
  /** Enable mouse & touch drag navigation */
  enableDrag?: boolean;
  /** Enable mouse wheel navigation */
  enableWheel?: boolean;
  /** Enable keyboard arrow navigation */
  enableKeyboard?: boolean;
  /** Auto play slides */
  autoPlay?: boolean;
  /** Auto play interval in milliseconds */
  autoPlayInterval?: number;
  /** Pause auto play when mouse hovers over carousel */
  pauseOnHover?: boolean;
  /** Show floating navigation controls (prev/next/autoplay) */
  showControls?: boolean;
  /** Show pagination indicators */
  showIndicators?: boolean;
  /** Show simulated dynamic 3D glass sheen reflection */
  showGlare?: boolean;
  /** Custom container className */
  className?: string;
  /** Custom card className */
  cardClassName?: string;
  /** Callback fired when the active center item changes */
  onActiveChange?: (index: number) => void;
  /** Callback fired when an item card is clicked */
  onItemClick?: (item: BendCarouselItem, index: number) => void;
  /** Custom render function for card inner content */
  renderItem?: (
    item: BendCarouselItem,
    index: number,
    isCenter: boolean
  ) => React.ReactNode;
}

export interface ThreeDBendCarouselRef {
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  togglePlay: () => void;
  getActiveIndex: () => number;
}

const DEFAULT_ITEMS: BendCarouselItem[] = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop",
    title: "Cosmic Solitude",
    subtitle: "Abstract Surrealism",
    tag: "Exhibition",
    badge: "01",
    description: "Deep celestial hues bending across spatial dimensions.",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop",
    title: "Monochrome Architecture",
    subtitle: "Brutalist Forms",
    tag: "Design",
    badge: "02",
    description: "Sleek geometric curves and high-contrast light gradients.",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
    title: "Fluid Dynamics",
    subtitle: "Generative Art",
    tag: "3D Motion",
    badge: "03",
    description: "Iridescent liquid waveforms suspended in kinetic stasis.",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1200&auto=format&fit=crop",
    title: "Neon Horizon",
    subtitle: "Cybernetic Chroma",
    tag: "Visuals",
    badge: "04",
    description: "Luminescent ultraviolet streams cascading through mist.",
  },
  {
    id: 5,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    title: "Quantum Circuitry",
    subtitle: "Silicon Symphony",
    tag: "Hardware",
    badge: "05",
    description: "Microscopic pathways powering modern artificial intelligence.",
  },
  {
    id: 6,
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop",
    title: "Prismatic Dispersion",
    subtitle: "Refractive Glass",
    tag: "Optical",
    badge: "06",
    description: "Polished crystal facets bending incoming white light beams.",
  },
];

export const ThreeDBendCarousel = forwardRef<
  ThreeDBendCarouselRef,
  ThreeDBendCarouselProps
>(
  (
    {
      items: rawItems,
      images,
      itemWidth = 320,
      aspectRatio = 0.8,
      gap = -40,
      perspective = 1000,
      bendAngle = 45,
      depth = 400,
      curveDirection = "concave",
      orientation = "vertical",
      height = 620,
      width = "100%",
      damping = 0.085,
      momentumFactor = 120,
      snap = true,
      loop = true,
      grayscaleInactive = true,
      activeScale = 1.04,
      minOpacity = 0.22,
      enableDrag = true,
      enableWheel = true,
      enableKeyboard = true,
      autoPlay = false,
      autoPlayInterval = 4000,
      pauseOnHover = true,
      showControls = true,
      showIndicators = true,
      showGlare = true,
      className,
      cardClassName,
      onActiveChange,
      onItemClick,
      renderItem,
    },
    ref
  ) => {
    // Normalize items: support raw image strings or BendCarouselItem objects
    const formattedItems: BendCarouselItem[] = useMemo(() => {
      if (rawItems && rawItems.length > 0) {
        return rawItems.map((item, idx) => {
          if (typeof item === "string") {
            return {
              id: idx,
              image: item,
              title: `Item ${idx + 1}`,
              badge: `${idx + 1 < 10 ? "0" : ""}${idx + 1}`,
            };
          }
          return item;
        });
      }
      if (images && images.length > 0) {
        return images.map((src, idx) => ({
          id: idx,
          image: src,
          title: `Slide ${idx + 1}`,
          badge: `${idx + 1 < 10 ? "0" : ""}${idx + 1}`,
        }));
      }
      return DEFAULT_ITEMS;
    }, [rawItems, images]);

    const count = formattedItems.length;
    const itemHeight = itemWidth / aspectRatio;
    const isVertical = orientation === "vertical";
    const itemDimension = isVertical ? itemHeight : itemWidth;
    const step = itemDimension + gap;

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const glareRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Continuous physics state stored in refs to prevent React re-renders on every frame (ensures silky 60-120fps)
    const currentOffsetRef = useRef<number>(0);
    const targetOffsetRef = useRef<number>(0);
    const isDraggingRef = useRef<boolean>(false);
    const isHoveringRef = useRef<boolean>(false);
    const dragStartCoordRef = useRef<number>(0);
    const dragStartOffsetRef = useRef<number>(0);
    const lastCoordRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const velocityRef = useRef<number>(0);
    const rafIdRef = useRef<number | null>(null);
    const wheelDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
    const activeIndexRef = useRef<number>(0);

    // Keep activeIndexRef synced
    useEffect(() => {
      activeIndexRef.current = activeIndex;
    }, [activeIndex]);

    // Apply 3D matrix / translate3d transforms directly to DOM elements
    const updateTransforms = useCallback(() => {
      if (!containerRef.current || count === 0) return;

      const containerDim = isVertical
        ? containerRef.current.clientHeight || 600
        : containerRef.current.clientWidth || 900;

      const centerOffset = containerDim / 2;
      const currentOffset = currentOffsetRef.current;
      const totalSpan = count * step;

      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        let deltaPixels = i * step - currentOffset;

        if (loop && totalSpan > 0) {
          // Circular wrapping calculation
          deltaPixels =
            ((deltaPixels % totalSpan) + totalSpan * 1.5) % totalSpan -
            totalSpan / 2;
        }

        const distFromCenter = Math.abs(deltaPixels);
        if (distFromCenter < minDistance) {
          minDistance = distFromCenter;
          nearestIndex = i;
        }

        // Normalized progress relative to viewport center (-1.5 to 1.5)
        const viewThreshold = Math.max(1, centerOffset * 0.85);
        const normalized = Math.max(
          -1.6,
          Math.min(1.6, deltaPixels / viewThreshold)
        );
        const absNorm = Math.abs(normalized);

        // 3D Curves Calculation
        const curveSign = curveDirection === "concave" ? 1 : -1;
        const rotateAngle = -normalized * bendAngle * curveSign;
        const translateZ = -absNorm * depth;

        // Smooth Opacity & Scale
        const opacity = Math.max(
          minOpacity,
          1 - Math.pow(absNorm * 0.75, 1.25)
        );
        const scale = Math.max(
          0.85,
          activeScale - absNorm * (activeScale - 0.92)
        );

        // Dynamic z-index so centered cards sit above bending ones
        const zIndex = Math.round(100 - absNorm * 50);

        // Dynamic Transform Origin for natural hinge bending
        let transformOrigin = "center center";
        if (isVertical) {
          if (normalized > 0.04) transformOrigin = "top center";
          else if (normalized < -0.04) transformOrigin = "bottom center";
        } else {
          if (normalized > 0.04) transformOrigin = "left center";
          else if (normalized < -0.04) transformOrigin = "right center";
        }

        // Apply 3D Transform
        if (isVertical) {
          el.style.transform = `translate3d(-50%, calc(-50% + ${deltaPixels}px), ${translateZ}px) rotateX(${rotateAngle}deg) scale(${scale})`;
        } else {
          el.style.transform = `translate3d(calc(-50% + ${deltaPixels}px), -50%, ${translateZ}px) rotateY(${rotateAngle}deg) scale(${scale})`;
        }

        el.style.transformOrigin = transformOrigin;
        el.style.opacity = `${opacity}`;
        el.style.zIndex = `${zIndex}`;

        // Grayscale & Brightness Depth Filter
        if (grayscaleInactive) {
          const grayPercent = Math.min(100, Math.pow(absNorm, 1.4) * 100);
          const brightness = Math.max(0.6, 1 - absNorm * 0.35);
          el.style.filter = `grayscale(${grayPercent.toFixed(1)}%) brightness(${brightness.toFixed(2)})`;
        }

        // 3D Glass Sheen Glare Effect
        const glareEl = glareRefs.current[i];
        if (glareEl && showGlare) {
          const glareOpacity = Math.max(0, 0.45 - absNorm * 0.45);
          const glareAngle = isVertical
            ? 180 + rotateAngle * 2
            : 90 + rotateAngle * 2;
          glareEl.style.opacity = `${glareOpacity.toFixed(3)}`;
          glareEl.style.background = `linear-gradient(${glareAngle}deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 45%, transparent 70%)`;
        }
      }

      // Update active index state when the closest item changes
      if (nearestIndex !== activeIndexRef.current) {
        activeIndexRef.current = nearestIndex;
        setActiveIndex(nearestIndex);
        onActiveChange?.(nearestIndex);
      }
    }, [
      count,
      isVertical,
      step,
      loop,
      curveDirection,
      bendAngle,
      depth,
      minOpacity,
      activeScale,
      grayscaleInactive,
      showGlare,
      onActiveChange,
    ]);

    // High performance RAF render loop with lerp damping
    const tick = useCallback(() => {
      const diff = targetOffsetRef.current - currentOffsetRef.current;

      if (Math.abs(diff) > 0.05 || isDraggingRef.current) {
        currentOffsetRef.current += diff * damping;
        updateTransforms();
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        currentOffsetRef.current = targetOffsetRef.current;
        updateTransforms();
        rafIdRef.current = null;
      }
    }, [damping, updateTransforms]);

    const wakeRaf = useCallback(() => {
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
      }
    }, [tick]);

    // Smooth navigation helpers
    const snapToNearest = useCallback(() => {
      if (!snap || count === 0) return;
      const rawTarget = targetOffsetRef.current;
      const targetCard = Math.round(rawTarget / step);
      let newTarget = targetCard * step;

      if (!loop) {
        newTarget = Math.max(0, Math.min((count - 1) * step, newTarget));
      }

      targetOffsetRef.current = newTarget;
      wakeRaf();
    }, [snap, count, step, loop, wakeRaf]);

    const goTo = useCallback(
      (index: number) => {
        if (count === 0) return;
        const normalizedTarget = Math.max(0, Math.min(count - 1, index));

        if (loop) {
          // Find closest direction to target index
          const currentVirtual = Math.round(currentOffsetRef.current / step);
          const currentMod =
            ((currentVirtual % count) + count) % count;
          let diff = normalizedTarget - currentMod;

          if (diff > count / 2) diff -= count;
          if (diff < -count / 2) diff += count;

          targetOffsetRef.current = (currentVirtual + diff) * step;
        } else {
          targetOffsetRef.current = normalizedTarget * step;
        }
        wakeRaf();
      },
      [count, loop, step, wakeRaf]
    );

    const next = useCallback(() => {
      if (loop) {
        targetOffsetRef.current += step;
      } else {
        const nextIdx = Math.min(count - 1, activeIndexRef.current + 1);
        targetOffsetRef.current = nextIdx * step;
      }
      wakeRaf();
    }, [loop, step, count, wakeRaf]);

    const prev = useCallback(() => {
      if (loop) {
        targetOffsetRef.current -= step;
      } else {
        const prevIdx = Math.max(0, activeIndexRef.current - 1);
        targetOffsetRef.current = prevIdx * step;
      }
      wakeRaf();
    }, [loop, step, wakeRaf]);

    // Expose imperative handle methods
    useImperativeHandle(
      ref,
      () => ({
        next,
        prev,
        goTo,
        togglePlay: () => setIsPlaying((p) => !p),
        getActiveIndex: () => activeIndexRef.current,
      }),
      [next, prev, goTo]
    );

    // Mouse & Touch Drag Interaction
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
      if (!enableDrag) return;

      isDraggingRef.current = true;
      const clientCoord = "touches" in e
        ? isVertical
          ? e.touches[0].clientY
          : e.touches[0].clientX
        : isVertical
        ? e.clientY
        : e.clientX;

      dragStartCoordRef.current = clientCoord;
      dragStartOffsetRef.current = targetOffsetRef.current;
      lastCoordRef.current = clientCoord;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;

      wakeRaf();
    };

    useEffect(() => {
      const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingRef.current) return;

        const clientCoord = "touches" in e
          ? isVertical
            ? e.touches[0].clientY
            : e.touches[0].clientX
          : isVertical
          ? e.clientY
          : e.clientX;

        const delta = dragStartCoordRef.current - clientCoord;
        let newTarget = dragStartOffsetRef.current + delta;

        // Bounded dragging with rubber-band resistance if loop is false
        if (!loop) {
          const maxOffset = (count - 1) * step;
          if (newTarget < 0) {
            newTarget = newTarget * 0.35;
          } else if (newTarget > maxOffset) {
            newTarget = maxOffset + (newTarget - maxOffset) * 0.35;
          }
        }

        targetOffsetRef.current = newTarget;

        // Calculate drag velocity for smooth momentum release
        const now = performance.now();
        const dt = now - lastTimeRef.current;
        if (dt > 8) {
          const dCoord = lastCoordRef.current - clientCoord;
          velocityRef.current = dCoord / dt;
          lastCoordRef.current = clientCoord;
          lastTimeRef.current = now;
        }

        wakeRaf();
      };

      const handleDragEnd = () => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;

        // Apply momentum inertia flick
        const momentum = velocityRef.current * momentumFactor;
        targetOffsetRef.current += momentum;

        snapToNearest();
        wakeRaf();
      };

      window.addEventListener("mousemove", handleDragMove, { passive: true });
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: true });
      window.addEventListener("touchend", handleDragEnd);

      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
        window.removeEventListener("touchmove", handleDragMove);
        window.removeEventListener("touchend", handleDragEnd);
      };
    }, [
      isVertical,
      loop,
      count,
      step,
      momentumFactor,
      snapToNearest,
      wakeRaf,
    ]);

    // Wheel Interaction
    const handleWheel = useCallback(
      (e: WheelEvent) => {
        if (!enableWheel) return;
        e.preventDefault();

        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        const normalizedDelta = Math.sign(delta) * Math.min(Math.abs(delta), 120);

        let newTarget = targetOffsetRef.current + normalizedDelta * 1.1;

        if (!loop) {
          const maxOffset = (count - 1) * step;
          newTarget = Math.max(0, Math.min(maxOffset, newTarget));
        }

        targetOffsetRef.current = newTarget;
        wakeRaf();

        if (snap) {
          if (wheelDebounceTimerRef.current) {
            clearTimeout(wheelDebounceTimerRef.current);
          }
          wheelDebounceTimerRef.current = setTimeout(() => {
            snapToNearest();
          }, 180);
        }
      },
      [enableWheel, loop, count, step, wakeRaf, snap, snapToNearest]
    );

    // Keyboard Arrow Controls
    useEffect(() => {
      if (!enableKeyboard) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (!containerRef.current) return;
        // Only react if active element is container or within container
        const isFocused =
          document.activeElement === containerRef.current ||
          containerRef.current.contains(document.activeElement);

        if (!isFocused && !isHoveringRef.current) return;

        if (isVertical) {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            prev();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            next();
          }
        } else {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [enableKeyboard, isVertical, next, prev]);

    // Attach wheel listener non-passively so we can prevent page scroll jitter
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !enableWheel) return;

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }, [handleWheel, enableWheel]);

    // Autoplay Timer
    useEffect(() => {
      if (!isPlaying) return;

      const interval = setInterval(() => {
        if (pauseOnHover && isHoveringRef.current) return;
        if (isDraggingRef.current) return;
        next();
      }, autoPlayInterval);

      return () => clearInterval(interval);
    }, [isPlaying, pauseOnHover, autoPlayInterval, next]);

    // Initial setup & resize observer
    useEffect(() => {
      updateTransforms();

      const container = containerRef.current;
      if (!container) return;

      const observer = new ResizeObserver(() => {
        updateTransforms();
      });
      observer.observe(container);

      return () => {
        observer.disconnect();
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      };
    }, [updateTransforms]);

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseEnter={() => {
          isHoveringRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveringRef.current = false;
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        className={cn(
          "relative overflow-hidden select-none outline-none group",
          "flex items-center justify-center",
          "cursor-grab active:cursor-grabbing",
          className
        )}
        style={{
          width,
          height,
          perspective: `${perspective}px`,
          perspectiveOrigin: "50% 50%",
        }}
        aria-label="3D Bend Carousel"
        role="region"
      >
        {/* 3D Curved Stage */}
        <div
          className="relative w-full h-full flex items-center justify-center pointer-events-none"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {formattedItems.map((item, index) => {
            const isCenter = activeIndex === index;

            return (
              <div
                key={item.id ?? index}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCenter) {
                    item.onClick?.();
                    onItemClick?.(item, index);
                  } else {
                    goTo(index);
                  }
                }}
                className={cn(
                  "absolute top-1/2 left-1/2 rounded-2xl overflow-hidden",
                  "shadow-2xl shadow-black/25 dark:shadow-black/75",
                  "border border-zinc-200/80 dark:border-zinc-800/80",
                  "bg-zinc-100 dark:bg-zinc-900",
                  "pointer-events-auto cursor-pointer",
                  "transition-shadow duration-300",
                  isCenter && "ring-1 ring-white/20 shadow-black/40 dark:shadow-black/90",
                  cardClassName
                )}
                style={{
                  width: `${itemWidth}px`,
                  height: `${itemHeight}px`,
                  willChange: "transform, opacity, filter",
                  backfaceVisibility: "hidden",
                }}
              >
                {renderItem ? (
                  renderItem(item, index, isCenter)
                ) : (
                  <div className="relative w-full h-full flex flex-col justify-end overflow-hidden group/card">
                    {/* Background Image */}
                    <img
                      src={item.image}
                      alt={item.title || `Slide ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                      loading="lazy"
                    />

                    {/* Ambient vignette shadow gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 pointer-events-none" />

                    {/* Top Badge & Tag info */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
                      {item.badge && (
                        <span className="px-2.5 py-1 text-xs font-semibold tracking-wider uppercase rounded-full backdrop-blur-md bg-white/20 dark:bg-black/40 text-white border border-white/25 shadow-sm">
                          {item.badge}
                        </span>
                      )}
                      {item.tag && (
                        <span className="px-2 py-0.5 text-[11px] font-medium tracking-wide rounded-md backdrop-blur-md bg-black/30 text-zinc-200 border border-white/10">
                          {item.tag}
                        </span>
                      )}
                    </div>

                    {/* Card Content Footer */}
                    <div className="relative z-10 p-5 text-white">
                      {item.subtitle && (
                        <p className="text-xs font-medium tracking-wider uppercase text-zinc-300/90 mb-1">
                          {item.subtitle}
                        </p>
                      )}
                      {item.title && (
                        <h3 className="text-lg font-bold tracking-tight text-white leading-snug line-clamp-1">
                          {item.title}
                        </h3>
                      )}
                      {item.description && (
                        <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed opacity-90">
                          {item.description}
                        </p>
                      )}

                      {/* External Link or Action Pill */}
                      {item.link && (
                        <div className="mt-3 flex items-center gap-1 text-xs font-medium text-white/90 group-hover/card:text-white transition-colors">
                          <span>Explore</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5 transition-transform group-hover/card:translate-x-0.5" />
                        </div>
                      )}
                    </div>

                    {/* 3D Glass Specular Sheen Layer */}
                    {showGlare && (
                      <div
                        ref={(el) => {
                          glareRefs.current[index] = el;
                        }}
                        className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                        style={{
                          mixBlendMode: "overlay",
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Navigation Controls */}
        {showControls && (
          <div
            className={cn(
              "absolute z-30 flex items-center gap-2",
              isVertical
                ? "right-4 top-1/2 -translate-y-1/2 flex-col"
                : "bottom-6 left-1/2 -translate-x-1/2 flex-row"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className={cn(
                "p-2.5 rounded-full backdrop-blur-md transition-all duration-200",
                "bg-white/80 dark:bg-zinc-900/80",
                "border border-zinc-200/80 dark:border-zinc-800/80",
                "text-zinc-800 dark:text-zinc-200",
                "shadow-lg hover:scale-105 active:scale-95",
                "hover:bg-white dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
              )}
            >
              {isVertical ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>

            {/* Autoplay Play/Pause Toggle */}
            {autoPlay && (
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
                className={cn(
                  "p-2.5 rounded-full backdrop-blur-md transition-all duration-200",
                  "bg-white/80 dark:bg-zinc-900/80",
                  "border border-zinc-200/80 dark:border-zinc-800/80",
                  "text-zinc-800 dark:text-zinc-200",
                  "shadow-lg hover:scale-105 active:scale-95",
                  isPlaying && "text-emerald-500 dark:text-emerald-400"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>
            )}

            {/* Next Button */}
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className={cn(
                "p-2.5 rounded-full backdrop-blur-md transition-all duration-200",
                "bg-white/80 dark:bg-zinc-900/80",
                "border border-zinc-200/80 dark:border-zinc-800/80",
                "text-zinc-800 dark:text-zinc-200",
                "shadow-lg hover:scale-105 active:scale-95",
                "hover:bg-white dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
              )}
            >
              {isVertical ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Minimalist Indicators (Dots & Counter) */}
        {showIndicators && count > 1 && (
          <div
            className={cn(
              "absolute z-30 pointer-events-auto",
              isVertical
                ? "left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
                : "bottom-6 left-6 flex items-center gap-2"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-black/40 border border-white/10 text-white shadow-md">
              <span className="text-xs font-mono font-medium">
                {(activeIndex + 1).toString().padStart(2, "0")}
              </span>
              <span className="text-[10px] text-zinc-400">/</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {count.toString().padStart(2, "0")}
              </span>
            </div>

            {/* Pagination Dots */}
            <div
              className={cn(
                "flex items-center gap-1.5 p-1 rounded-full backdrop-blur-md bg-black/30 border border-white/10",
                isVertical && "flex-col"
              )}
            >
              {formattedItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    activeIndex === i
                      ? "bg-white w-2 h-4"
                      : "bg-white/40 hover:bg-white/70 w-2 h-2"
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

ThreeDBendCarousel.displayName = "ThreeDBendCarousel";

export default ThreeDBendCarousel;
