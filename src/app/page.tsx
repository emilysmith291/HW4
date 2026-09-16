"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { CompCard } from "@/components/comp-card";
import { StatSlider } from "@/components/stat-slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, compare, getHealth, getInfo, type ApiInfo, type CompareResponse } from "@/lib/api";

const DEFAULTS = { ppg: 12, rpg: 4, apg: 3, spg: 1, bpg: 0.3 };
const ANALYZING_MESSAGES = ["Reading your stat line…", "Scanning 2021-2025 seasons…", "Measuring style match…"];

export default function Home() {
  const [stats, setStats] = useState(DEFAULTS);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingMsg, setAnalyzingMsg] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [info, setInfo] = useState<ApiInfo | null>(null);

  useEffect(() => {
    getHealth()
      .then(() => setApiUp(true))
      .catch(() => setApiUp(false));
    getInfo()
      .then(setInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setAnalyzingMsg((m) => (m + 1) % ANALYZING_MESSAGES.length), 500);
    return () => clearInterval(id);
  }, [loading]);

  async function handleSubmit() {
    setLoading(true);
    setAnalyzingMsg(0);
    setError(null);
    setResult(null);
    const started = Date.now();
    try {
      const res = await compare({ ...stats, k: 6 });
      // A little manufactured suspense — real API latency is usually near-
      // instant, and an instant flash undercuts the reveal. Never blocks on
      // a slow response, only pads a fast one up to ~900ms.
      const elapsed = Date.now() - started;
      if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
      setResult(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.detail === "string" ? err.detail : "The API rejected that stat line.");
      } else {
        setError("Couldn't reach the comp-finder API. Is it running?");
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-court min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6 sm:px-6">
        <span className="font-display text-lg tracking-wide">
          WNBA <span className="text-primary">COMP FINDER</span>
        </span>
        <Badge
          variant="secondary"
          className={apiUp === false ? "border-destructive/40 text-destructive" : ""}
        >
          {apiUp === null ? "Checking API…" : apiUp ? "API live" : "API unreachable"}
        </Badge>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <section className="py-10 text-center sm:py-14">
          <h1 className="font-display text-5xl leading-[0.95] sm:text-7xl">
            WHO DO YOU <span className="text-primary">HOOP</span> LIKE?
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Plug in a stat line — yours, a friend&apos;s, a made-up dream season — and we&apos;ll
            find the real WNBA player-season your playing <em>style</em> matches most.
          </p>
        </section>

        <Card className="border border-border/60 bg-card/80 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <StatSlider
              label="Points"
              suffix="ppg"
              value={stats.ppg}
              onChange={(v) => setStats((s) => ({ ...s, ppg: v }))}
              min={0}
              max={40}
            />
            <StatSlider
              label="Rebounds"
              suffix="rpg"
              value={stats.rpg}
              onChange={(v) => setStats((s) => ({ ...s, rpg: v }))}
              min={0}
              max={20}
            />
            <StatSlider
              label="Assists"
              suffix="apg"
              value={stats.apg}
              onChange={(v) => setStats((s) => ({ ...s, apg: v }))}
              min={0}
              max={15}
            />
            <StatSlider
              label="Steals"
              suffix="spg"
              value={stats.spg}
              onChange={(v) => setStats((s) => ({ ...s, spg: v }))}
              min={0}
              max={6}
            />
            <StatSlider
              label="Blocks"
              suffix="bpg"
              value={stats.bpg}
              onChange={(v) => setStats((s) => ({ ...s, bpg: v }))}
              min={0}
              max={6}
            />
          </div>

          <Button
            size="lg"
            className="font-condensed mt-8 w-full text-base font-bold tracking-wide"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Finding your comp…" : "Find My Comp"}
          </Button>

          {error && (
            <p className="mt-3 text-center text-sm text-destructive">{error}</p>
          )}
        </Card>

        <section className="mt-10 space-y-4">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <p className="font-condensed text-center text-sm uppercase tracking-widest text-accent">
                  {ANALYZING_MESSAGES[analyzingMsg]}
                </p>
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </motion.div>
            )}

            {!loading && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="space-y-4"
              >
                <CompCard comp={result.comps[0]} rank={0} youStyle={result.style} />
                <div className="space-y-2">
                  {result.comps.slice(1).map((comp, i) => (
                    <motion.div
                      key={`${comp.player}-${comp.season}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
                    >
                      <CompCard comp={comp} rank={i + 1} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {info && (
          <p className="mt-12 text-center text-xs text-muted-foreground">
            Matched against {info.n_records} real WNBA player-seasons (2021-2025) · pipeline built{" "}
            {new Date(info.built_at).toLocaleDateString()} · scikit-learn {info.sklearn_version}
          </p>
        )}
      </main>
    </div>
  );
}
