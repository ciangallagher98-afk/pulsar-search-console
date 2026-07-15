import type { PreviewGraphPoint } from "@/lib/pulsar/types";

// Single-series magnitude chart: one hue, thin rounded bars, direct value
// labels (doubling as the accessible "table view" — no legend needed for
// a single series). Uses the app's own primary token, not a separate palette.
export function PreviewBarChart({ points }: { points: PreviewGraphPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.y), 1);

  return (
    <div className="space-y-1.5" role="img" aria-label="Estimated historic volume by period">
      {points.map((point) => (
        <div key={point.id} className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 truncate text-muted-foreground">{point.name}</span>
          <div className="flex-1 rounded-full bg-muted">
            <div
              className="h-2.5 rounded-full bg-primary"
              style={{ width: `${Math.max((point.y / max) * 100, 2)}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">
            {point.y.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
