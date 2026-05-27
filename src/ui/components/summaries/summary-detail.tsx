import { format, parseISO } from 'date-fns';
import { useSummaryDetail } from '../../hooks/use-summaries';
import { Skeleton } from '../ui/skeleton';
import { TaskRow } from './task-row';

interface SummaryDetailProps {
  date: string | undefined;
}

interface Task {
  name: string;
  category: string;
  outcome: string;
  files: string[];
  time_proportion: number;
}

export function SummaryDetail({ date }: SummaryDetailProps) {
  const { data, isLoading, error } = useSummaryDetail(date);

  if (!date) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          Select a date from the list to view its summary.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-destructive">
          Failed to load summaries. Check that the server is running and try again.
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const summary = data.summary as {
    date: string;
    summary: string;
    tasks: Task[];
    metadata?: {
      total_sessions?: number;
      total_events?: number;
      projects?: string[];
      mode?: string;
    };
  };

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-xl font-semibold tracking-[-0.01em] mb-2">
        {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
      </h2>
      {summary.summary && (
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {summary.summary}
        </p>
      )}

      <div className="space-y-0">
        {summary.tasks?.map((task, i) => (
          <TaskRow key={i} task={task} />
        ))}
      </div>

      {summary.metadata && (
        <div className="mt-8 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            {summary.metadata.total_sessions != null && (
              <div>
                <span className="font-medium text-foreground">Sessions:</span>{' '}
                <span className="font-mono">{summary.metadata.total_sessions}</span>
              </div>
            )}
            {summary.metadata.total_events != null && (
              <div>
                <span className="font-medium text-foreground">Events:</span>{' '}
                <span className="font-mono">{summary.metadata.total_events}</span>
              </div>
            )}
            {summary.metadata.projects && summary.metadata.projects.length > 0 && (
              <div>
                <span className="font-medium text-foreground">Projects:</span>{' '}
                <span className="font-mono">{summary.metadata.projects.join(', ')}</span>
              </div>
            )}
            {summary.metadata.mode && (
              <div>
                <span className="font-medium text-foreground">Mode:</span>{' '}
                <span className="font-mono">{summary.metadata.mode}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
