import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

interface ModelItem {
  id: string;
  displayName: string;
}

interface ModelsResponse {
  models: ModelItem[];
  error?: string;
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => apiFetch<ModelsResponse>('/api/models'),
    staleTime: 30_000,
  });
}

export function useRefreshModels() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['models'] });
}
