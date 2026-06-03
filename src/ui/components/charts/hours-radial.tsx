import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useStats } from '../../hooks/use-stats';

interface HoursData {
  date: string;
  created_at: string;
}

interface HoursRadialProps {
  from: string;
  to: string;
}

function parseHour(createdAt: string | undefined | null): number {
  if (!createdAt) return -1;
  const match = createdAt.match(/(\d{2}):\d{2}/);
  if (match) return parseInt(match[1], 10);
  const d = new Date(createdAt);
  if (!isNaN(d.getTime())) return d.getHours();
  return -1;
}

export function HoursRadial({ from, to }: HoursRadialProps) {
  const { data: raw, isLoading } = useStats('hours', from, to);
  const response = raw as { data?: HoursData[] } | undefined;
  const data = response?.data ?? [];

  const hourData = useMemo(() => {
    const counts = new Array(24).fill(0);
    for (const entry of data) {
      const hour = parseHour(entry.created_at);
      if (hour >= 0 && hour < 24) {
        counts[hour]++;
      }
    }
    return counts.map((count, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      count,
      isWorkHour: hour >= 9 && hour <= 18,
    }));
  }, [data]);

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No hours data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={hourData}
        margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="hour"
          tickFormatter={(h: number) => (h % 4 === 0 ? `${h}h` : '')}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const item = payload[0].payload as { hour: number; count: number; label: string };
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md">
                <div className="font-mono">Hour {item.label}</div>
                <div className="text-muted-foreground">
                  {item.count} activit{item.count !== 1 ? 'ies' : 'y'}
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="count" animationDuration={300} radius={0}>
          {hourData.map((entry) => (
            <Cell
              key={entry.hour}
              fill={entry.isWorkHour ? 'var(--accent)' : 'var(--muted-foreground)'}
              fillOpacity={entry.isWorkHour ? 0.8 : 0.3}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
