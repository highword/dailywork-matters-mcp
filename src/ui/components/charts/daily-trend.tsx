import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router';
import { format, parseISO } from 'date-fns';
import { useStats } from '../../hooks/use-stats';

interface TrendData {
  date: string;
  task_count: number;
}

interface DailyTrendProps {
  from: string;
  to: string;
}

export function DailyTrend({ from, to }: DailyTrendProps) {
  const navigate = useNavigate();
  const { data: raw, isLoading } = useStats('trends', from, to);
  const response = raw as { data?: TrendData[] } | undefined;
  const data = response?.data ?? [];

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No trend data
      </div>
    );
  }

  const handleClick = (point: TrendData) => {
    if (point?.date) {
      navigate(`/summaries/${point.date}`);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        onClick={(e: unknown) => {
          const event = e as { activePayload?: Array<{ payload?: TrendData }> } | null;
          if (event?.activePayload?.[0]?.payload) {
            handleClick(event.activePayload[0].payload);
          }
        }}
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
          content={({ payload }) => {
            if (!payload?.length) return null;
            const item = payload[0].payload as TrendData;
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md">
                <div className="font-mono">{item.date}</div>
                <div className="text-muted-foreground">
                  {item.task_count} task{item.task_count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="task_count"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'var(--accent)' }}
          activeDot={{ r: 5, fill: 'var(--accent)', cursor: 'pointer' }}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
