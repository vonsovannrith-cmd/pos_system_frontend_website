import { money } from "@/lib/money";
import type { ChartPoint } from "@/types";

type Props = {
  points: ChartPoint[];
};

export default function SalesChart({ points }: Props) {
  if (points.length === 0) {
    return null;
  }

  // Find maximum revenue for chart scaling.
  const max = Math.max(...points.map((point) => point.revenue), 1);

  return (
    <div>
      {/* Chart Bars */}

      <div
        className="flex h-48 items-end gap-1"
        role="img"
        aria-label="Sales revenue chart"
      >
        {points.map((point, index) => {
          const height = (point.revenue / max) * 100;

          return (
            <div
              key={`${point.label}-${index}`}
              className="group flex h-full flex-1 flex-col justify-end"
              title={`${point.label}: ${money(
                point.revenue,
              )} (${point.orders} orders)`}
            >
              {/* Revenue Bar */}

              <div
                className="rounded-t bg-blue-500 transition-colors group-hover:bg-blue-700"
                style={{
                  height: `${height}%`,
                  minHeight: point.revenue > 0 ? 2 : 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Chart Labels */}

      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>{points[0].label}</span>

        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
