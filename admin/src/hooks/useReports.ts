import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api/reports';
import type { ReportSearchParams } from '@/types/report';
import toast from 'react-hot-toast';

export function useReportList(params: ReportSearchParams) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn: () => reportsApi.getList(params).then((res) => res.data.data),
  });
}

export function useReportDetail(id: number) {
  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => reportsApi.getDetail(id).then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: string; note: string }) =>
      reportsApi.resolve(id, action, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('신고가 처리되었습니다.');
    },
  });
}

export function useDismissReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      reportsApi.dismiss(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('신고가 기각되었습니다.');
    },
  });
}
