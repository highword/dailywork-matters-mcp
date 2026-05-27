import { Treemap, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router';
import { useStats } from '../../hooks/use-stats';
import { PROJECT_PALETTE } from './colors';

interface ProjectData {
  project: string;
  task_count: number;
  total_proportion: number;
}

interface ProjectAllocationProps {
  from: string;
  to: string;
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  index: number;
}

function CustomContent({ x, y, width, height, name, index }: TreemapContentProps) {
  const fill = PROJECT_PALETTE[index % PROJECT_PALETTE.length];
  const showLabel = width > 50 && height > 30;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.8}
        stroke="var(--border)"
        strokeWidth={1}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="#fff"
          fontWeight={500}
        >
          {name.length > width / 7 ? name.slice(0, Math.floor(width / 7)) + '...' : name}
        </text>
      )}
    </g>
  );
}

export function ProjectAllocation({ from, to }: ProjectAllocationProps) {
  const navigate = useNavigate();
  const { data: raw, isLoading } = useStats('projects', from, to);
  const response = raw as { data?: ProjectData[] } | undefined;
  const data = response?.data ?? [];

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No project data
      </div>
    );
  }

  const treemapData = data.map((d, i) => ({
    name: d.project,
    size: d.total_proportion,
    taskCount: d.task_count,
    index: i,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={treemapData}
        dataKey="size"
        nameKey="name"
        content={<CustomContent x={0} y={0} width={0} height={0} name="" index={0} />}
        animationDuration={300}
        onClick={(node) => {
          if (node) {
            navigate('/summaries');
          }
        }}
      >
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const item = payload[0].payload as { name: string; taskCount: number; size: number };
            const pct = (item.size * 100).toFixed(1);
            return (
              <div className="px-3 py-2 bg-card border border-border text-xs shadow-md">
                <div className="font-medium">{item.name}</div>
                <div className="text-muted-foreground">
                  {item.taskCount} task{item.taskCount !== 1 ? 's' : ''} ({pct}%)
                </div>
              </div>
            );
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
