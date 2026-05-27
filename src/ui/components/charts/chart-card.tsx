import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChartCardProps {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
}

export function ChartCard({ title, children, isLoading }: ChartCardProps) {
  return (
    <div
      className={cn(
        'h-full flex flex-col border border-border overflow-hidden',
        'bg-gradient-to-b from-white/[0.04] to-white/[0.01]',
        'dark:shadow-[0_1px_2px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]',
        'shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.04)]',
        'transition-shadow duration-150 ease-out hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]',
      )}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="chart-drag-handle cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors duration-150">
          <GripVertical className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-medium uppercase tracking-[0.02em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="flex-1 p-4 min-h-0">
        {isLoading ? (
          <div className="h-full w-full animate-pulse bg-muted" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
