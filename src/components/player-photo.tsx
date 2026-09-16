"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-10 text-xs",
  lg: "size-24 text-2xl",
} as const;

export function slugify(name: string) {
  return name.toLowerCase().replace(/'/g, "").replace(/\s+/g, "-");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Renders /players/{slugify(name)}.jpg if present, otherwise an initials
 * avatar. The photo fades in on top so a missing file never flashes a
 * broken-image icon — see frontend README for how to add more.
 */
export function PlayerPhoto({
  name,
  size = "lg",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary font-display text-muted-foreground ring-2 ring-border",
        SIZES[size],
        className
      )}
    >
      <span>{initials(name)}</span>
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element -- local drop-in asset, not a remote/optimized image
        <img
          src={`/players/${slugify(name)}.jpg`}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            "absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </span>
  );
}
