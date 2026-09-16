"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export function StatSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label className="font-condensed text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <span className="font-display text-2xl leading-none text-primary">
          {value.toFixed(1)}
          <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{suffix}</span>
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
