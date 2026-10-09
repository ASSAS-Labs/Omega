"use client";

import React from "react";
import ThreeDBendCarousel, { BendCarouselItem } from "./3d-bend-carousel";

export const OMEGA_SCREENSHOT_ITEMS: BendCarouselItem[] = [
  {
    id: 1,
    image: "/assets/screenshots/01_dashboard.png",
    title: "Compliance Dashboard",
    subtitle: "Overview & Streak",
    badge: "01",
    tag: "Dashboard",
    description: "Monthly compliance calendar with streak badges and one-tap session launch.",
  },
  {
    id: 2,
    image: "/assets/screenshots/02_workout.png",
    title: "Session Logger",
    subtitle: "Real-time Training",
    badge: "02",
    tag: "Workout",
    description: "Live set logging, historical benchmarks, and drag-and-drop routine execution.",
  },
  {
    id: 3,
    image: "/assets/screenshots/03_exercises.png",
    title: "Exercise Library",
    subtitle: "Movement Catalog",
    badge: "03",
    tag: "Exercises",
    description: "Searchable movement database organized by muscle group with custom additions.",
  },
  {
    id: 4,
    image: "/assets/screenshots/04_analytics.png",
    title: "Progression Analytics",
    subtitle: "Volume & 1RM",
    badge: "04",
    tag: "Analytics",
    description: "Estimated 1RM curves via Epley formula and aggregated volume trend curves.",
  },
  {
    id: 5,
    image: "/assets/screenshots/05_settings.png",
    title: "System & Portability",
    subtitle: "Configuration",
    badge: "05",
    tag: "Settings",
    description: "Full JSON database import/export, timer countdowns, and KG/LBS unit toggle.",
  },
  {
    id: 6,
    image: "/assets/screenshots/06_split.png",
    title: "Routine Split Setup",
    subtitle: "Target Muscles",
    badge: "06",
    tag: "Split",
    description: "Define weekly focus per day (Mon–Sun) with multi-group target assignment.",
  },
  {
    id: 7,
    image: "/assets/screenshots/07_streaks.png",
    title: "Streak History Leaderboard",
    subtitle: "Consistency",
    badge: "07",
    tag: "Streaks",
    description: "All-time Top 5 unbroken training streaks ranking and active streak persistence.",
  },
];

export function OmegaScreenshotsCarousel() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-10">
      <div className="text-center mb-6 max-w-xl px-4">
        <span className="text-xs font-mono font-semibold tracking-widest text-emerald-500 uppercase">
          Interactive 3D Carousel
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mt-1">
          Explore OMEGA's Interface
        </h2>
        <p className="text-sm text-zinc-400 mt-2">
          Drag, scroll with mouse wheel, or use arrow keys to navigate the 3D curved cylinder bend.
        </p>
      </div>

      <ThreeDBendCarousel
        items={OMEGA_SCREENSHOT_ITEMS}
        orientation="horizontal"
        curveDirection="concave"
        itemWidth={280}
        aspectRatio={460 / 1024}
        gap={-20}
        perspective={1100}
        bendAngle={38}
        depth={360}
        snap={true}
        loop={true}
        autoPlay={true}
        autoPlayInterval={4500}
        grayscaleInactive={true}
        activeScale={1.06}
        showControls={true}
        showIndicators={true}
        showGlare={true}
        height={650}
        cardClassName="border-zinc-800/90 bg-zinc-950"
      />
    </div>
  );
}

export default OmegaScreenshotsCarousel;
