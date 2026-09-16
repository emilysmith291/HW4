import { PlayerPhoto } from "@/components/player-photo";
import { StyleChart } from "@/components/style-chart";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PlayerComp } from "@/lib/api";
import { cn } from "@/lib/utils";

const STAT_LABELS: { key: keyof PlayerComp; label: string }[] = [
  { key: "ppg", label: "PPG" },
  { key: "rpg", label: "RPG" },
  { key: "apg", label: "APG" },
  { key: "spg", label: "SPG" },
  { key: "bpg", label: "BPG" },
];

// Cosmetic transform of the real nearest-neighbor distance into a 0-99
// "match" readout — the distance underneath is real, this is just a more
// readable way to present it than a raw Euclidean number.
function matchPercent(distance: number) {
  return Math.max(1, Math.min(99, Math.round(100 - distance * 35)));
}

export function CompCard({
  comp,
  rank,
  youStyle,
}: {
  comp: PlayerComp;
  rank: number;
  youStyle?: Record<string, number>;
}) {
  const isPrimary = rank === 0;
  const pct = matchPercent(comp.distance);

  if (isPrimary) {
    return (
      <Card className="card-glow relative overflow-hidden border border-accent/40 bg-card p-8 text-center">
        <p className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Your closest comp
        </p>
        <PlayerPhoto name={comp.player} size="lg" className="card-glow mx-auto mt-4" />
        <h2 className="font-display mt-3 text-6xl leading-none sm:text-7xl">{comp.player}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="secondary" className="font-condensed">
            {comp.team}
          </Badge>
          <Badge variant="secondary" className="font-condensed">
            {comp.position}
          </Badge>
          <Badge variant="secondary" className="font-condensed">
            {comp.season} season
          </Badge>
        </div>

        <div className="mx-auto mt-6 grid max-w-md grid-cols-5 gap-2">
          {STAT_LABELS.map(({ key, label }) => (
            <div key={key} className="rounded-lg bg-muted/60 py-2">
              <p className="font-display text-2xl leading-none">{comp[key] as number}</p>
              <p className="font-condensed mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-6 flex max-w-xs items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-display text-lg text-accent">{pct}%</span>
        </div>
        <p className="font-condensed mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          style match
        </p>

        {youStyle && (
          <>
            <Separator className="my-6" />
            <StyleChart you={youStyle} match={comp.style} matchName={comp.player} />
          </>
        )}
      </Card>
    );
  }

  return (
    <Card className="flex items-center gap-4 border border-border/60 bg-card p-4">
      <span className="font-display w-6 text-center text-lg text-muted-foreground">{rank + 1}</span>
      <PlayerPhoto name={comp.player} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">{comp.player}</p>
        <p className="text-xs text-muted-foreground">
          {comp.team} · {comp.position} · {comp.season}
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-3 text-xs text-muted-foreground sm:flex">
        <span>{comp.ppg} PPG</span>
        <span>{comp.rpg} RPG</span>
        <span>{comp.apg} APG</span>
      </div>
      <span className={cn("font-display shrink-0 text-lg", pct >= 70 ? "text-accent" : "text-muted-foreground")}>
        {pct}%
      </span>
    </Card>
  );
}
