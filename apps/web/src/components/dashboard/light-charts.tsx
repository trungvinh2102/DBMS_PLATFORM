import { cn } from "@/lib/utils";

type TrendPoint = { name: string; executions: number; latency: number };
type BarPoint = { name: string; count: number; fill: string };
type DonutPoint = { name: string; value: number; color: string };

const buildPoints = (values: number[], width: number, height: number) => {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  return values
    .map((value, index) => `${index * step},${height - (value / max) * height}`)
    .join(" ");
};

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const width = 640;
  const height = 220;
  const executionPoints = buildPoints(
    data.map((point) => point.executions),
    width,
    height,
  );
  const latencyPoints = buildPoints(
    data.map((point) => point.latency),
    width,
    height,
  );
  const areaPoints = `0,${height} ${executionPoints} ${width},${height}`;

  return (
    <div className="h-full w-full" data-testid="trend-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full overflow-visible"
        role="img"
        aria-label="Query performance trend"
      >
        <defs>
          <linearGradient id="light-chart-executions" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#light-chart-executions)" />
        <polyline
          points={executionPoints}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={latencyPoints}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeDasharray="8 8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function BarDistributionChart({ data }: { data: BarPoint[] }) {
  const max = Math.max(...data.map((point) => point.count), 1);

  return (
    <div className="flex h-full items-end gap-3" data-testid="bar-distribution-chart">
      {data.map((point) => (
        <div key={point.name} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
          <div className="flex flex-1 items-end rounded-t-lg bg-muted/30">
            <div
              className="w-full rounded-t-lg transition-all"
              style={{
                height: `${Math.max(8, (point.count / max) * 100)}%`,
                backgroundColor: point.fill,
              }}
              aria-label={`${point.name}: ${point.count}`}
            />
          </div>
          <span className="truncate text-center text-[10px] font-medium text-muted-foreground">
            {point.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data }: { data: DonutPoint[] }) {
  const gradient = data
    .reduce(
      (segments, item) => {
        const start = segments.offset;
        const end = start + item.value;
        segments.parts.push(`${item.color} ${start}% ${end}%`);
        segments.offset = end;
        return segments;
      },
      { offset: 0, parts: [] as string[] },
    )
    .parts.join(", ");

  return (
    <div className="flex h-full items-center justify-center" data-testid="donut-chart">
      <div
        className="relative h-40 w-40 rounded-full"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="absolute inset-8 rounded-full bg-card" />
      </div>
    </div>
  );
}

export function RadialScore({ score, className }: { score: number; className?: string }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = clampedScore > 80 ? "var(--color-primary)" : "#f59e0b";

  return (
    <div
      className={cn("flex h-full w-full items-center justify-center", className)}
      data-testid="radial-score"
    >
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${clampedScore}%, var(--color-muted) 0)`,
        }}
      >
        <div className="absolute inset-4 rounded-full bg-background" />
        <span className="relative text-2xl font-bold tabular-nums">{clampedScore}%</span>
      </div>
    </div>
  );
}
