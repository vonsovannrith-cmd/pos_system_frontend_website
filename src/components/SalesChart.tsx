import { money } from "@/lib/money";
import type { ChartPoint } from "@/types";

export default function SalesChart({ points }: { points: ChartPoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.revenue), 1);

  return (
    <div>
      <div className="flex h-48 items-end gap-1">
        {points.map((p) => (
          <div
            key={p.label}
            className="group flex h-full flex-1 flex-col justify-end"
            title={`${p.label}: ${money(p.revenue)} (${p.orders} orders)`}
          >
            <div
              className="rounded-t bg-blue-500 group-hover:bg-blue-700"
              style={{
                height: `${(p.revenue / max) * 100}%`,
                minHeight: p.revenue > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}