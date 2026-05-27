import { useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { TimeRangeControl } from '../components/charts/time-range-control';
import { ChartDashboard } from '../components/charts/chart-dashboard';
import { useStats } from '../hooks/use-stats';

const HINT_KEY = 'dwm-chart-hint-dismissed';
const LAYOUT_KEY = 'dwm-chart-layout';

export function Component() {
  const [from, setFrom] = useState(() =>
    format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  );
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [resetKey, setResetKey] = useState(0);
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(HINT_KEY) === 'true',
  );

  const handleRangeChange = useCallback((newFrom: string, newTo: string) => {
    setFrom(newFrom);
    setTo(newTo);
  }, []);

  const handleResetLayout = useCallback(() => {
    localStorage.removeItem(LAYOUT_KEY);
    setResetKey((k) => k + 1);
  }, []);

  const handleDismissHint = useCallback(() => {
    localStorage.setItem(HINT_KEY, 'true');
    setHintDismissed(true);
  }, []);

  // Check if enough data to show charts (at least 3 days)
  const heatmapQuery = useStats('heatmap', from, to);
  const heatmapData = (heatmapQuery.data as { data?: unknown[] } | undefined)?.data;
  const hasEnoughData = !heatmapQuery.isLoading && (heatmapData?.length ?? 0) >= 3;
  const showEmptyState = !heatmapQuery.isLoading && !hasEnoughData;

  return (
    <div className="p-8 max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-xl font-semibold leading-[1.2] tracking-[-0.01em]">
          Charts
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          <TimeRangeControl from={from} to={to} onChange={handleRangeChange} />
          <button
            type="button"
            onClick={handleResetLayout}
            className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors duration-150 ease-out"
          >
            Reset Layout
          </button>
        </div>
      </div>

      {!hintDismissed && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 border border-border bg-muted/30 text-sm text-muted-foreground">
          <span>
            Drag chart cards to rearrange your dashboard. Your layout is saved
            automatically.
          </span>
          <button
            type="button"
            onClick={handleDismissHint}
            className="ml-4 text-xs font-medium text-foreground hover:text-accent transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h2 className="text-lg font-semibold mb-2">Not enough data</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Generate summaries for at least 3 days to see meaningful charts.
            Current data: {heatmapData?.length ?? 0} day(s).
          </p>
        </div>
      ) : (
        <ChartDashboard from={from} to={to} resetKey={resetKey} />
      )}
    </div>
  );
}
