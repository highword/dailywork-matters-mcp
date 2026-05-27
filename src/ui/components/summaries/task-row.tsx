import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface TaskRowProps {
  task: {
    name: string;
    category: string;
    outcome: string;
    files: string[];
    time_proportion: number;
  };
}

const categoryVariantMap: Record<string, 'feature' | 'bugfix' | 'refactor' | 'research' | 'config' | 'docs' | 'other'> = {
  feature: 'feature',
  bugfix: 'bugfix',
  refactor: 'refactor',
  research: 'research',
  config: 'config',
  docs: 'docs',
  other: 'other',
};

export function TaskRow({ task }: TaskRowProps) {
  const variant = categoryVariantMap[task.category] ?? 'other';
  const displayFiles = task.files.slice(0, 3);
  const overflowCount = task.files.length - 3;

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-sm font-semibold text-foreground">{task.name}</span>
        <Badge variant={variant}>{task.category}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{task.outcome}</p>
      {task.files.length > 0 && (
        <div className="mb-2">
          <span className="font-mono text-xs text-muted-foreground">
            {displayFiles.join(', ')}
            {overflowCount > 0 && ` +${overflowCount} more`}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-muted overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${task.time_proportion}%` }}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground w-8 text-right">
          {task.time_proportion}%
        </span>
      </div>
    </div>
  );
}
