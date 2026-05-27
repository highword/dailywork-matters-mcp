import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

interface DateListProps {
  dates: string[];
  selectedDate: string | undefined;
  onSelect: (date: string) => void;
  isLoading: boolean;
}

export function DateList({ dates, selectedDate, onSelect, isLoading }: DateListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 p-2 space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-sm font-medium text-foreground">No summaries yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Generate your first daily summary to see your work here. Head to the Generate page to get started.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        {dates.map((date) => {
          const isActive = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors duration-100 ease-out border-l-2',
                isActive
                  ? 'bg-accent/10 border-l-2 border-accent text-foreground font-medium'
                  : 'border-transparent hover:bg-muted text-muted-foreground',
              )}
            >
              <span className="font-mono text-sm">
                {format(parseISO(date), 'MMM d, yyyy')}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
