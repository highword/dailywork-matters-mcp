import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStats } from '../../hooks/use-stats';

interface FileData {
  file: string;
  count: number;
}

interface FileActivityProps {
  from: string;
  to: string;
}

function truncatePath(filePath: string, maxSegments = 2): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  if (parts.length <= maxSegments) return filePath;
  return '...' + '/' + parts.slice(-maxSegments).join('/');
}

export function FileActivity({ from, to }: FileActivityProps) {
  const { data: raw, isLoading } = useStats('files', from, to);
  const response = raw as { data?: FileData[] } | undefined;
  const allData = response?.data ?? [];

  // Show top 10
  const data = allData.slice(0, 10);

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No file activity data
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    shortName: truncatePath(d.file),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 100 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="shortName"
          width={96}
          tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const item = payload[0].payload as FileData & { shortName: string };
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md max-w-xs">
                <div className="font-mono break-all">{item.file}</div>
                <div className="text-muted-foreground mt-1">
                  {item.count} change{item.count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          }}
        />
        <Bar
          dataKey="count"
          fill="var(--accent)"
          animationDuration={300}
          radius={0}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
