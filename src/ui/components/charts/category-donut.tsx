import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useStats } from '../../hooks/use-stats';
import { getCategoryColor } from './colors';

interface CategoryData {
  category: string;
  total_proportion: number;
  task_count: number;
}

interface CategoryDonutProps {
  from: string;
  to: string;
}

export function CategoryDonut({ from, to }: CategoryDonutProps) {
  const { data: raw, isLoading } = useStats('categories', from, to);
  const response = raw as { data?: CategoryData[] } | undefined;
  const data = response?.data ?? [];

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No category data
      </div>
    );
  }

  const totalTasks = data.reduce((sum, d) => sum + d.task_count, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total_proportion"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="80%"
          animationDuration={300}
          label={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={getCategoryColor(entry.category)}
            />
          ))}
        </Pie>
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const item = payload[0].payload as CategoryData;
            const pct = (item.total_proportion * 100).toFixed(1);
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md">
                <span className="font-medium">{item.category}</span>
                <span className="ml-2 text-muted-foreground">{pct}%</span>
              </div>
            );
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-lg font-semibold"
        >
          {totalTasks}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
