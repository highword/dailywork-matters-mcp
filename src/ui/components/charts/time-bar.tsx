import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useStats } from '../../hooks/use-stats';
import { getCategoryColor } from './colors';

interface CategoryData {
  category: string;
  total_proportion: number;
  task_count: number;
}

interface TimeBarProps {
  from: string;
  to: string;
}

export function TimeBar({ from, to }: TimeBarProps) {
  const { data: raw, isLoading } = useStats('categories', from, to);
  const response = raw as { data?: CategoryData[] } | undefined;
  const data = response?.data ?? [];

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    proportion_pct: Math.round(d.total_proportion * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 60 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="category"
          width={56}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const item = payload[0].payload as CategoryData & { proportion_pct: number };
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md">
                <span className="font-medium">{item.category}</span>
                <span className="ml-2 text-muted-foreground">
                  {item.proportion_pct}%
                </span>
              </div>
            );
          }}
        />
        <Bar
          dataKey="proportion_pct"
          animationDuration={300}
          radius={0}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.category}
              fill={getCategoryColor(entry.category)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
