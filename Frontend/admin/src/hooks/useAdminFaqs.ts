import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { faqsApi } from '@/lib/api/faqs';
import type { FAQCategory, FAQSearchParams } from '@/types/support';

const KEY_LIST = 'admin-faqs-list';

export function useAdminFaqsList(params: FAQSearchParams) {
  return useQuery({
    queryKey: [KEY_LIST, params],
    queryFn: () => faqsApi.getList(params).then((res) => res.data.data),
    staleTime: 30_000,
  });
}

export function useCreateAdminFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      category: FAQCategory;
      question: string;
      answer: string;
      displayOrder: number;
      isActive: boolean;
    }) => faqsApi.create(body),
    onSuccess: () => {
      toast.success('FAQ가 등록되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useUpdateAdminFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: Partial<{
        category: FAQCategory;
        question: string;
        answer: string;
        displayOrder: number;
        isActive: boolean;
      }>;
    }) => faqsApi.update(id, body),
    onSuccess: () => {
      toast.success('FAQ가 수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useDeleteAdminFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => faqsApi.delete(id),
    onSuccess: () => {
      toast.success('FAQ가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}

export function useReorderAdminFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ category, orderedIds }: { category: FAQCategory; orderedIds: number[] }) =>
      faqsApi.reorder(category, orderedIds),
    onSuccess: () => {
      toast.success('FAQ 순서가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: [KEY_LIST] });
    },
  });
}
