import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

interface Config {
  outputDir: string;
  language: string;
  claudeSessionsDir: string;
  gitRepoScanDirs: string[];
  gitRepoManual: string[];
  gitIdentities: string[];
  ai: {
    apiKey: string | null;
    windowModel: string;
    mergeModel: string;
  };
  outputFormats: ('markdown' | 'html')[];
  httpPort: number;
  scheduleTime: string | null;
  dbPath: string;
  maxTasksPerSummary: number;
  showFileList: boolean;
  showTokenStats: boolean;
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<Config>('/api/config'),
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<Config>) =>
      apiFetch<Config>('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}
