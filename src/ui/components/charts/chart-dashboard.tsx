import { useMemo, useCallback } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { ChartCard } from './chart-card';
import { CategoryDonut } from './category-donut';
import { TimeBar } from './time-bar';
import { DailyTrend } from './daily-trend';
import { CategoryTrend } from './category-trend';
import { HeatmapCalendar } from './heatmap-calendar';
import { FileActivity } from './file-activity';
import { HoursRadial } from './hours-radial';
import { ProjectAllocation } from './project-allocation';

const STORAGE_KEY = 'dwm-chart-layout';

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'categories', x: 0, y: 0, w: 1, h: 2 },
  { i: 'time-bar', x: 1, y: 0, w: 1, h: 2 },
  { i: 'trends', x: 0, y: 2, w: 1, h: 2 },
  { i: 'category-trend', x: 1, y: 2, w: 1, h: 2 },
  { i: 'heatmap', x: 0, y: 4, w: 2, h: 2 },
  { i: 'files', x: 0, y: 6, w: 1, h: 2 },
  { i: 'hours', x: 1, y: 6, w: 1, h: 2 },
  { i: 'projects', x: 0, y: 8, w: 2, h: 2 },
];

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: DEFAULT_LAYOUT,
  md: DEFAULT_LAYOUT.map((item) => ({ ...item, w: item.w > 1 ? 2 : 1 })),
  sm: DEFAULT_LAYOUT.map((item) => ({ ...item, x: 0, w: 1 })),
};

function loadLayout(): ResponsiveLayouts | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid stored layout, fall back to default
  }
  return null;
}

function saveLayout(layouts: ResponsiveLayouts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // localStorage full or unavailable
  }
}

interface ChartDashboardProps {
  from: string;
  to: string;
  resetKey: number;
}

const CHART_ITEMS = [
  { key: 'categories', title: 'Category Distribution' },
  { key: 'time-bar', title: 'Time Proportion' },
  { key: 'trends', title: 'Daily Trend' },
  { key: 'category-trend', title: 'Category Trend' },
  { key: 'heatmap', title: 'Output Heatmap' },
  { key: 'files', title: 'File Activity' },
  { key: 'hours', title: 'Work Hours' },
  { key: 'projects', title: 'Project Allocation' },
] as const;

function getChartComponent(key: string, from: string, to: string) {
  switch (key) {
    case 'categories':
      return <CategoryDonut from={from} to={to} />;
    case 'time-bar':
      return <TimeBar from={from} to={to} />;
    case 'trends':
      return <DailyTrend from={from} to={to} />;
    case 'category-trend':
      return <CategoryTrend from={from} to={to} />;
    case 'heatmap':
      return <HeatmapCalendar from={from} to={to} />;
    case 'files':
      return <FileActivity from={from} to={to} />;
    case 'hours':
      return <HoursRadial from={from} to={to} />;
    case 'projects':
      return <ProjectAllocation from={from} to={to} />;
    default:
      return null;
  }
}

export function ChartDashboard({ from, to, resetKey }: ChartDashboardProps) {
  const layouts = useMemo(() => {
    if (resetKey > 0) return DEFAULT_LAYOUTS;
    return loadLayout() ?? DEFAULT_LAYOUTS;
  }, [resetKey]);

  const handleLayoutChange = useCallback((_layout: LayoutItem[], allLayouts: ResponsiveLayouts) => {
    saveLayout(allLayouts);
  }, []);

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1024, md: 768, sm: 0 }}
      cols={{ lg: 2, md: 2, sm: 1 }}
      rowHeight={140}
      draggableHandle=".chart-drag-handle"
      onLayoutChange={handleLayoutChange}
      isResizable={true}
      isDraggable={true}
      margin={[16, 16]}
    >
      {CHART_ITEMS.map(({ key, title }) => (
        <div key={key}>
          <ChartCard title={title}>
            {getChartComponent(key, from, to)}
          </ChartCard>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}
