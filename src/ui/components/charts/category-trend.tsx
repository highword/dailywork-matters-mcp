import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useStats } from '../../hooks/use-stats';
import { CATEGORY_COLORS } from './colors';

interface TrendData {
  date: string;
  task_count: number;
}

interface CategoryData {
  category: string;
  total_proportion: number;
  task_count: number;
}

interface CategoryTrendProps {
  from: string;
  to: string;
}

/**
 * Category Trend uses the trends data (daily task counts) distributed by
 * category proportions to approximate a stacked area chart.
 * If the API provided per-date-per-category breakdowns, this would be simpler.
 * For now, we multiply daily task counts by category proportions.
 */
export function CategoryTrend({ from, to }: CategoryTrendProps) {
  const { data: trendsRaw, isLoading: trendsLoading } = useStats('trends', from, to);
  const { data: catRaw, isLoading: catLoading } = useStats('categories', from, to);

  const trendsResponse = trendsRaw as { data?: TrendData[] } | undefined;
  const catResponse = catRaw as { data?: CategoryData[] } | undefined;

  const trends = trendsResponse?.data ?? [];
  const categories = catResponse?.data ?? [];

  const isLoading = trendsLoading || catLoading;

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (trends.length === 0 || categories.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No category trend data
      </div>
    );
  }

  // Create stacked data: for each day, distribute task_count by category proportions
  const categoryNames = categories.map((c) => c.category);
  const stackedData = trends.map((day) => {
    const entry: Record<string, number | string> = { date: day.date };
    for (const cat of categories) {
      entry[cat.category] = Math.round(day.task_count * cat.total_proportion * 10) / 10;
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={stackedData}
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => {
            try {
              return format(parseISO(d), 'MMM d');
            } catch {
              return d;
            }
          }}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload?.length) return null;
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md">
                <div className="font-mono mb-1">{label}</div>
                {payload.map((p) => (
                  <div key={p.dataKey as string} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 inline-block"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.dataKey as string}</span>
                    <span className="text-muted-foreground ml-auto">
                      {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        {categoryNames.map((cat) => (
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            stackId="1"
            fill={CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other}
            stroke={CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other}
            fillOpacity={0.6}
            animationDuration={300}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
