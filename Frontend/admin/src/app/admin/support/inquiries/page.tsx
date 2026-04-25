'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_CATEGORY_COLORS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_COLORS,
} from '@/lib/constants';
import {
  useAdminInquiries,
  useAdminInquiryDetail,
  useReplyInquiry,
  useCloseInquiry,
} from '@/hooks/useAdminSupport';
import type { InquiryStatus, InquiryCategory } from '@/types/support';
import { MessageSquare, Clock, CheckCircle, Search, Send, Loader2 } from 'lucide-react';

const STATUS_FILTERS: { value: InquiryStatus | undefined; label: string }[] = [
  { value: undefined, label: '전체' },
  { value: 'OPEN', label: '대기 중' },
  { value: 'IN_PROGRESS', label: '처리 중' },
  { value: 'RESOLVED', label: '답변 완료' },
  { value: 'CLOSED', label: '종료' },
];

export default function InquiriesPage() {
  const { hasPermission } = useAuthStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<InquiryCategory | undefined>(undefined);
  const [page, setPage] = useState(0);

  // API 훅
  const { data: inquiryPage, isLoading } = useAdminInquiries({
    status: statusFilter,
    category: categoryFilter,
    page,
    size: 20,
  });
  const { data: selectedInquiry } = useAdminInquiryDetail(selectedId);
  const replyMutation = useReplyInquiry();
  const closeMutation = useCloseInquiry();

  const inquiries = inquiryPage?.content ?? [];
  const totalElements = inquiryPage?.totalElements ?? 0;
  const totalPages = inquiryPage?.totalPages ?? 0;

  const handleAnswer = () => {
    if (!replyText.trim() || selectedId === null) return;
    replyMutation.mutate(
      { id: selectedId, answer: replyText },
      { onSuccess: () => setReplyText('') },
    );
  };

  const handleClose = () => {
    if (selectedId === null) return;
    closeMutation.mutate(selectedId);
  };

  // 클라이언트 측 검색 필터 (닉네임/제목)
  const filteredInquiries = searchKeyword.trim()
    ? inquiries.filter(
        (inq) =>
          inq.title.includes(searchKeyword) || inq.userNickname.includes(searchKeyword),
      )
    : inquiries;

  return (
    <div>
      <PageHeader title="고객 문의 관리" description="사용자 문의 사항 확인 및 답변" />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 문의</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalElements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">현재 페이지</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{inquiries.length}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">페이지</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {page + 1} / {Math.max(totalPages, 1)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 문의 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>문의 목록</CardTitle>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제목/닉네임 검색"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value ?? 'ALL'}
                    type="button"
                    onClick={() => {
                      setStatusFilter(f.value);
                      setPage(0);
                    }}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      statusFilter === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInquiries.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    조건에 맞는 문의가 없습니다.
                  </div>
                ) : (
                  filteredInquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                        selectedId === inquiry.id ? 'border-primary bg-muted/30' : ''
                      }`}
                      onClick={() => setSelectedId(inquiry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={INQUIRY_CATEGORY_COLORS[inquiry.category]}>
                            {INQUIRY_CATEGORY_LABELS[inquiry.category] ?? inquiry.category}
                          </Badge>
                          <Badge className={INQUIRY_STATUS_COLORS[inquiry.status]}>
                            {INQUIRY_STATUS_LABELS[inquiry.status]}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(inquiry.createdAt)}
                        </span>
                      </div>
                      <h4 className="mt-2 font-medium">{inquiry.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {inquiry.userNickname}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  이전
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 문의 상세 & 답변 */}
        <Card>
          <CardHeader>
            <CardTitle>문의 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedInquiry ? (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={INQUIRY_CATEGORY_COLORS[selectedInquiry.category]}>
                      {INQUIRY_CATEGORY_LABELS[selectedInquiry.category] ?? selectedInquiry.category}
                    </Badge>
                    <Badge className={INQUIRY_STATUS_COLORS[selectedInquiry.status]}>
                      {INQUIRY_STATUS_LABELS[selectedInquiry.status]}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{selectedInquiry.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedInquiry.userNickname} | {formatDateTime(selectedInquiry.createdAt)}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="whitespace-pre-wrap text-sm">{selectedInquiry.content}</p>
                </div>

                {selectedInquiry.answer && (
                  <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">관리자 답변</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-green-700">
                      {selectedInquiry.answer}
                    </p>
                    <p className="mt-2 text-xs text-green-600">
                      {selectedInquiry.answeredByName ?? selectedInquiry.answeredBy} ·{' '}
                      {selectedInquiry.answeredAt && formatDateTime(selectedInquiry.answeredAt)}
                    </p>
                  </div>
                )}

                {hasPermission('ADMIN') && (
                  <div className="space-y-3">
                    {/* 답변 입력 */}
                    {selectedInquiry.status !== 'CLOSED' && (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={4}
                          placeholder="답변을 입력하세요..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          {selectedInquiry.status !== 'RESOLVED' && (
                            <Button
                              className="flex-1"
                              onClick={handleAnswer}
                              disabled={replyMutation.isPending || !replyText.trim()}
                            >
                              {replyMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-4 w-4" />
                              )}
                              답변 전송
                            </Button>
                          )}
                          {selectedInquiry.status === 'RESOLVED' && (
                            <Button
                              variant="outline"
                              onClick={handleClose}
                              disabled={closeMutation.isPending}
                            >
                              {closeMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              종료
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                문의를 선택해주세요
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
