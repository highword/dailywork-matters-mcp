import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { useGenerateSummary } from '../hooks/use-generate';
import { GenerateForm } from '../components/generate/generate-form';
import { ProgressStream } from '../components/generate/progress-stream';

export function Component() {
  const { generate, progress, isGenerating, error, result } = useGenerateSummary();
  const toastShown = useRef(false);

  // Show toast on successful generation
  useEffect(() => {
    if (result && !toastShown.current) {
      toastShown.current = true;
      toast.success('Summary generated successfully.');
    }
    if (!result) {
      toastShown.current = false;
    }
  }, [result]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Generate</h1>
      <GenerateForm onGenerate={generate} isGenerating={isGenerating} />
      <div className="mt-8">
        <ProgressStream
          progress={progress}
          isGenerating={isGenerating}
          error={error}
          result={result}
        />
      </div>
    </div>
  );
}
