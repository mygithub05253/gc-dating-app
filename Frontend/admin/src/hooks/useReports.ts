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

export function useProcessReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      result,
      adminMemo,
      sanctionType,
    }: {
      id: number;
      result: 'RESOLVED' | 'DISMISSED';
      adminMemo: string;
      sanctionType?: 'NONE' | 'WARNING' | 'SUSPEND_7D' | 'BANNED';
    }) => reportsApi.process(id, { result, adminMemo, sanctionType }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(
        variables.result === 'RESOLVED'
          ? '신고가 처리되었습니다.'
          : '신고가 기각되었습니다.'
      );
    },
  });
}
