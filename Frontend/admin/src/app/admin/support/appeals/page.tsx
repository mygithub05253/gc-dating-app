'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  APPEAL_STATUS_LABELS,
  APPEAL_STATUS_COLORS,
  SANCTION_TYPE_LABELS,
  APPEAL_DECISION_LABELS,
  APPEAL_DECISION_COLORS,
} from '@/lib/constants';
import {
  useAdminAppeals,
  useAdminAppealDetail,
  useResolveAppeal,
} from '@/hooks/useAdminSupport';
import type { AppealStatus, AppealDecision } from '@/types/support';
import { Scale, Clock, CheckCircle, XCircle, Loader2, ShieldCheck, ShieldMinus, ShieldOff } from 'lucide-react';

const STATUS_FILTERS: { value: AppealStatus | undefined; label: string }[] = [
  { value: undefined, label: '전체' },
  { value: 'PENDING', label: '대기 중' },
  { value: 'DECIDED', label: '처리 완료' },
];

const DECISION_OPTIONS: { value: AppealDecision; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'MAINTAIN', label: '유지', icon: ShieldCheck, description: '기존 제재를 유지합니다.' },
  { value: 'REDUCE', label: '감경', icon: ShieldMinus, description: '제재 수준을 낮춥니다.' },
  { value: 'RELEASE', label: '해제', icon: ShieldOff, description: '제재를 해제합니다.' },
];

export default function AppealsPage() {
  const { hasPermission } = useAuthStore();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<AppealDecision | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppealStatus | undefined>(undefined);
  const [page, setPage] = useState(0);

  // API 훅
  const { data: appealPage, isLoading } = useAdminAppeals({
    status: statusFilter,
    page,
    size: 20,
  });
  const { data: selectedAppeal } = useAdminAppealDetail(selectedId);
  const resolveMutation = useResolveAppeal();

  const appeals = appealPage?.content ?? [];
  const totalElements = appealPage?.totalElements ?? 0;
  const totalPages = appealPage?.totalPages ?? 0;

  const handleResolve = () => {
    if (!resolutionText.trim() || !selectedDecision || selectedId === null) return;
    resolveMutation.mutate(
      { id: selectedId, decision: selectedDecision, decisionReason: resolutionText },
      {
        onSuccess: () => {
          setResolutionText('');
          setSelectedDecision(null);
        },
      },
    );
  };

  return (
    <div>
      <PageHeader title="이의신청 관리" description="제재에 대한 사용자 이의신청 처리" />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">전체</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalElements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">현재 페이지</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">{appeals.length}건</div>
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
        {/* 이의신청 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>이의신청 목록</CardTitle>
            <div className="mt-3 flex flex-wrap gap-1">
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
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {appeals.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    조건에 맞는 이의신청이 없습니다.
                  </div>
                ) : (
                  appeals.map((appeal) => (
                    <div
                      key={appeal.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                        selectedId === appeal.id ? 'border-primary bg-muted/30' : ''
                      }`}
                      onClick={() => {
                        setSelectedId(appeal.id);
                        setResolutionText('');
                        setSelectedDecision(null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="destructive">
                            {SANCTION_TYPE_LABELS[appeal.sanctionType ?? appeal.originalSanctionType ?? ''] ?? appeal.sanctionType}
                          </Badge>
                          <Badge className={APPEAL_STATUS_COLORS[appeal.status]}>
                            {APPEAL_STATUS_LABELS[appeal.status] ?? appeal.status}
                          </Badge>
                          {appeal.decision && (
                            <Badge className={APPEAL_DECISION_COLORS[appeal.decision]}>
                              {APPEAL_DECISION_LABELS[appeal.decision]}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(appeal.createdAt)}
                        </span>
                      </div>
                      <h4 className="mt-2 font-medium">{appeal.userNickname}</h4>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {appeal.reason}
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

        {/* 이의신청 상세 */}
        <Card>
          <CardHeader>
            <CardTitle>이의신청 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAppeal ? (
              <div className="space-y-4">
                {/* 사용자 정보 */}
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium">{selectedAppeal.userNickname}</h4>
                  <p className="text-sm text-muted-foreground">userId: {selectedAppeal.userId}</p>
                </div>

                {/* 원래 제재 정보 */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">원래 제재</p>
                  <div className="mt-2 space-y-1 text-sm text-red-700">
                    <p>
                      유형:{' '}
                      {SANCTION_TYPE_LABELS[selectedAppeal.sanctionType ?? selectedAppeal.originalSanctionType ?? ''] ??
                        selectedAppeal.sanctionType}
                    </p>
                    <p>사유: {selectedAppeal.sanctionReason ?? selectedAppeal.originalReason}</p>
                    <p>제재일: {formatDateTime(selectedAppeal.sanctionDate)}</p>
                  </div>
                </div>

                {/* 이의신청 내용 */}
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">이의신청 사유</p>
                  <div className="rounded-lg border p-4">
                    <p className="whitespace-pre-wrap text-sm">{selectedAppeal.reason}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    신청일: {formatDateTime(selectedAppeal.createdAt)}
                  </p>
                </div>

                {/* 처리 결과 */}
                {selectedAppeal.decision && (
                  <div
                    className={`rounded-lg p-4 ${
                      selectedAppeal.decision === 'RELEASE'
                        ? 'border-l-4 border-green-500 bg-green-50'
                        : selectedAppeal.decision === 'REDUCE'
                          ? 'border-l-4 border-yellow-500 bg-yellow-50'
                          : 'border-l-4 border-gray-400 bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium">
                      처리 결과: {APPEAL_DECISION_LABELS[selectedAppeal.decision]}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">
                      {selectedAppeal.decisionReason}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      처리자: {selectedAppeal.decidedByName} |{' '}
                      {selectedAppeal.decidedAt && formatDateTime(selectedAppeal.decidedAt)}
                    </p>
                  </div>
                )}

                {/* 액션 */}
                {hasPermission('ADMIN') && selectedAppeal.status === 'PENDING' && (
                  <div className="space-y-3">
                    {/* 결정 선택 */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">결정 선택</p>
                      <div className="flex gap-2">
                        {DECISION_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSelectedDecision(opt.value)}
                              className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors ${
                                selectedDecision === opt.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="font-medium">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <textarea
                      className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      placeholder="결정 사유를 입력하세요 (필수)..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={handleResolve}
                      disabled={
                        resolveMutation.isPending || !resolutionText.trim() || !selectedDecision
                      }
                    >
                      {resolveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      결정 처리
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                이의신청을 선택해주세요
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
