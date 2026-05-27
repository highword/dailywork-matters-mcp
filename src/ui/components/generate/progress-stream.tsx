import { useNavigate } from 'react-router';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProgressEvent {
  stage: string;
  message: string;
}

interface ProgressStreamProps {
  progress: ProgressEvent[];
  isGenerating: boolean;
  error: string | null;
  result: { date: string; summary: unknown } | null;
}

export function ProgressStream({ progress, isGenerating, error, result }: ProgressStreamProps) {
  const navigate = useNavigate();

  if (progress.length === 0 && !error && !result) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Progress events list */}
      {progress.map((event, i) => {
        const isLast = i === progress.length - 1;
        return (
          <div
            key={i}
            className="flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            <div className="mt-1 shrink-0">
              {isLast && isGenerating ? (
                <Circle className="h-3 w-3 text-accent fill-accent animate-pulse" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground fill-muted" />
              )}
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {event.message}
            </span>
          </div>
        );
      })}

      {/* Error state */}
      {error && (
        <div className="border border-destructive/50 bg-destructive/5 p-4 mt-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              {error.includes('No work events')
                ? 'No work events found for this date. Make sure you have Claude Code sessions or Git commits for the selected day.'
                : error.includes('API key') || error.includes('api_key')
                  ? 'AI API key not configured. Set your API key in Settings to enable full summarization.'
                  : `Summary generation failed: ${error}. Check server logs for details.`}
            </p>
          </div>
        </div>
      )}

      {/* Success state */}
      {result && (
        <div className="border border-accent/30 bg-accent/5 p-4 mt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Summary generated successfully.
              </p>
              <button
                onClick={() => navigate(`/summaries/${result.date}`)}
                className="text-sm text-accent hover:underline mt-1 inline-block"
              >
                View Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
