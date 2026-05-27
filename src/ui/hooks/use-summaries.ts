import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

interface SummaryListResponse {
  dates: string[];
}

interface SummaryDetailResponse {
  date: string;
  version: number;
  summary: unknown;
  markdown: string;
  metadata: Record<string, unknown>;
}

export function useSummaryDates() {
  return useQuery({
    queryKey: ['summaries'],
    queryFn: () => apiFetch<SummaryListResponse>('/api/summaries'),
    staleTime: 60_000,
  });
}

export function useSummaryDetail(date: string | undefined) {
  return useQuery({
    queryKey: ['summary', date],
    queryFn: () => apiFetch<SummaryDetailResponse>(`/api/summaries/${date}`),
    enabled: !!date,
  });
}
