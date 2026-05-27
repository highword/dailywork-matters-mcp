import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { format, parseISO, startOfWeek, eachDayOfInterval, getDay } from 'date-fns';
import { useStats } from '../../hooks/use-stats';
import { cn } from '../../lib/utils';

interface HeatmapData {
  date: string;
  task_count: number;
}

interface HeatmapCalendarProps {
  from: string;
  to: string;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL_SIZE = 14;
const CELL_GAP = 2;

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-muted';
  if (count <= 2) return 'bg-accent/30';
  if (count <= 4) return 'bg-accent/60';
  return 'bg-accent';
}

export function HeatmapCalendar({ from, to }: HeatmapCalendarProps) {
  const navigate = useNavigate();
  const { data: raw, isLoading } = useStats('heatmap', from, to);
  const response = raw as { data?: HeatmapData[] } | undefined;
  const data = response?.data ?? [];

  const { weeks, months } = useMemo(() => {
    if (!from || !to) return { weeks: [], months: [] };

    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    const allDays = eachDayOfInterval({ start: fromDate, end: toDate });

    // Build lookup map
    const countMap = new Map<string, number>();
    for (const d of data) {
      countMap.set(d.date, d.task_count);
    }

    // Group into weeks (columns)
    const weekGroups: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];

    // Pad the first week to start from Sunday
    const firstDay = allDays[0];
    const weekStart = startOfWeek(firstDay, { weekStartsOn: 0 });
    if (weekStart < firstDay) {
      const paddingDays = eachDayOfInterval({ start: weekStart, end: firstDay }).slice(0, -1);
      for (const d of paddingDays) {
        currentWeek.push({ date: d, count: -1 }); // -1 means outside range
      }
    }

    for (const day of allDays) {
      const dayOfWeek = getDay(day);
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
      const dateStr = format(day, 'yyyy-MM-dd');
      currentWeek.push({ date: day, count: countMap.get(dateStr) ?? 0 });
    }
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    // Month labels
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = '';
    for (let col = 0; col < weekGroups.length; col++) {
      const week = weekGroups[col];
      const firstValid = week.find((d) => d.count >= 0);
      if (firstValid) {
        const month = format(firstValid.date, 'MMM');
        if (month !== lastMonth) {
          monthLabels.push({ label: month, col });
          lastMonth = month;
        }
      }
    }

    return { weeks: weekGroups, months: monthLabels };
  }, [from, to, data]);

  if (isLoading) {
    return <div className="h-full w-full animate-pulse bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
        No heatmap data
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Month labels */}
      <div className="flex ml-8 mb-1">
        {months.map(({ label, col }) => (
          <span
            key={`${label}-${col}`}
            className="text-[10px] text-muted-foreground absolute"
            style={{ left: `${col * (CELL_SIZE + CELL_GAP) + 32}px` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex gap-0.5 mt-4 relative">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 shrink-0">
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="text-[10px] text-muted-foreground flex items-center justify-end"
              style={{ height: CELL_SIZE, width: 24 }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-0.5 overflow-x-auto">
          {weeks.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-0.5">
              {week.map((day, rowIdx) => (
                <div
                  key={rowIdx}
                  className={cn(
                    'transition-colors duration-100',
                    day.count < 0
                      ? 'bg-transparent'
                      : getIntensityClass(day.count),
                    day.count >= 0 && 'cursor-pointer hover:ring-1 hover:ring-accent',
                  )}
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                  title={
                    day.count >= 0
                      ? `${day.count} task${day.count !== 1 ? 's' : ''} on ${format(day.date, 'MMM d, yyyy')}`
                      : undefined
                  }
                  onClick={() => {
                    if (day.count >= 0) {
                      navigate(`/summaries/${format(day.date, 'yyyy-MM-dd')}`);
                    }
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-3 ml-8">
        <span className="text-[10px] text-muted-foreground mr-1">Less</span>
        <div className="w-3 h-3 bg-muted" />
        <div className="w-3 h-3 bg-accent/30" />
        <div className="w-3 h-3 bg-accent/60" />
        <div className="w-3 h-3 bg-accent" />
        <span className="text-[10px] text-muted-foreground ml-1">More</span>
      </div>
    </div>
  );
}
