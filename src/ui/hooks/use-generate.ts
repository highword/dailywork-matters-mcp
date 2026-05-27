import { useState, useCallback, useRef } from 'react';

interface ProgressEvent {
  stage: string;
  message: string;
}

interface GenerateResult {
  date: string;
  summary: unknown;
}

export function useGenerateSummary() {
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (date: string) => {
    setProgress([]);
    setError(null);
    setResult(null);
    setIsGenerating(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({
          error: { message: res.statusText },
        }));
        throw new Error(body.error?.message ?? res.statusText);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.stage === 'complete' || data.summary) {
                setResult({ date, summary: data.summary ?? data });
              } else {
                setProgress((prev) => [...prev, data]);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { generate, abort, progress, isGenerating, error, result };
}
