"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "scoring_lean", label: "Scoring" },
  { key: "rebounding_lean", label: "Rebounding" },
  { key: "playmaking_lean", label: "Playmaking" },
  { key: "defense_lean", label: "Defense" },
];

// Diverging axis, not a radar: each category is a signed share-of-production
// delta from the league average (~-0.4 to +0.4), so position on a centered
// axis is the honest encoding — a radar's overlapping-area shape would
// distort exactly this kind of "above/below baseline" comparison.
const SCALE_MAX = 0.4;

function toPercent(value: number) {
  const clamped = Math.max(-SCALE_MAX, Math.min(SCALE_MAX, value));
  return ((clamped + SCALE_MAX) / (2 * SCALE_MAX)) * 100;
}

function formatDelta(value: number) {
  const pts = Math.round(value * 100);
  return `${pts >= 0 ? "+" : ""}${pts} pts vs. league avg`;
}

function Dot({
  value,
  color,
  name,
  category,
}: {
  value: number;
  color: string;
  name: string;
  category: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
          style={{ left: `${toPercent(value)}%`, backgroundColor: color }}
        />
      </TooltipTrigger>
      <TooltipContent>
        {name} · {category}: {formatDelta(value)}
      </TooltipContent>
    </Tooltip>
  );
}

export function StyleChart({
  you,
  match,
  matchName,
}: {
  you: Record<string, number>;
  match: Record<string, number>;
  matchName: string;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-5 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-you)" }} />
          You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--chart-match)" }} />
          {matchName}
        </span>
      </div>

      <div className="space-y-5">
        {CATEGORIES.map(({ key, label }) => {
          const youVal = you[key] ?? 0;
          const matchVal = match[key] ?? 0;
          const left = Math.min(toPercent(youVal), toPercent(matchVal));
          const width = Math.abs(toPercent(matchVal) - toPercent(youVal));
          return (
            <div key={key}>
              <p className="font-condensed mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <div className="relative h-4">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-muted-foreground/25"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                <Dot value={youVal} color="var(--chart-you)" name="You" category={label} />
                <Dot value={matchVal} color="var(--chart-match)" name={matchName} category={label} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Position shows how far each category&apos;s share of production sits from the league
        average — dead center is average, right is above, left is below.
      </p>
    </div>
  );
}
