import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useStats(type: string, from: string, to: string) {
  return useQuery({
    queryKey: ['stats', type, from, to],
    queryFn: () => apiFetch<unknown>(`/api/stats/${type}?from=${from}&to=${to}`),
    staleTime: 300_000,
    enabled: !!type && !!from && !!to,
  });
}
