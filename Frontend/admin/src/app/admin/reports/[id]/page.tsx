'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnalyticsLoading, AnalyticsError } from '@/components/common/AnalyticsStatus';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants';
import type { ReportReason, ReportStatus, SlaStatus, SanctionType } from '@/types/report';
import {
  ArrowLeft,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReportDetail, useProcessReport } from '@/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';

// 제재 유형 라벨 (v2.1 정합: 5종 + UNBLOCK)
const SANCTION_LABELS: Record<'NONE' | SanctionType, string> = {
  NONE: '없음',
  WARNING: '경고',
  SUSPEND_7D: '7일 정지',
  SUSPEND_30D: '30일 정지',
  SUSPEND_PERMANENT: '영구 정지',
  FORCE_WITHDRAW: '강제 탈퇴',
  UNBLOCK: '제재 해제',
};

// SLA 상태 라벨 (API v2.1 신규)
const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  ON_TRACK: 'SLA 정상',
  WARNING: 'SLA 접근 중',
  OVERDUE: 'SLA 초과',
};

const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  ON_TRACK: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

function getSlaColor(status: SlaStatus) {
  if (status === 'OVERDUE') return 'bg-red-500';
  if (status === 'WARNING') return 'bg-yellow-500';
  return 'bg-green-500';
}

// 신고 처리 시 선택 가능한 제재 유형 (UNBLOCK 제외: 회원 상세 경로에서만 사용)
const SANCTION_OPTIONS: Array<{ value: 'NONE' | SanctionType; icon: React.ReactNode | null }> = [
  { value: 'NONE', icon: null },
  { value: 'WARNING', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
  { value: 'SUSPEND_7D', icon: <Clock className="h-4 w-4 text-orange-500" /> },
  { value: 'SUSPEND_30D', icon: <Clock className="h-4 w-4 text-orange-600" /> },
  { value: 'SUSPEND_PERMANENT', icon: <XCircle className="h-4 w-4 text-red-500" /> },
  { value: 'FORCE_WITHDRAW', icon: <XCircle className="h-4 w-4 text-red-700" /> },
];

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const [adminMemo, setAdminMemo] = useState('');
  const [sanctionType, setSanctionType] = useState<'NONE' | SanctionType>('NONE');
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const reportId = Number(params.id);
  const { data: report, isLoading, isError, error } = useReportDetail(reportId);
  const processReport = useProcessReport();

  // 담당자 배정 mutation
  const assignMutation = useMutation({
    mutationFn: ({ assigneeId }: { assigneeId: number }) =>
      reportsApi.assign(reportId, { assigneeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('담당자가 변경되었습니다.');
      setAssignModalOpen(false);
    },
  });

  const isProcessing = processReport.isPending || assignMutation.isPending;

  // SUSPEND_PERMANENT / FORCE_WITHDRAW는 SUPER_ADMIN만 가능 (관리자 기능명세서)
  const canSelectSanction = (value: 'NONE' | SanctionType): boolean => {
    if (value === 'SUSPEND_PERMANENT' || value === 'FORCE_WITHDRAW') {
      return hasPermission('SUPER_ADMIN');
    }
    return true;
  };

  const handleProcess = (result: 'RESOLVED' | 'DISMISSED') => {
    if (adminMemo.trim().length < 10) {
      toast.error('처리 사유를 최소 10자 이상 입력해주세요.');
      return;
    }
    if (result === 'RESOLVED' && !canSelectSanction(sanctionType)) {
      toast.error('이 제재 유형은 SUPER_ADMIN 권한이 필요합니다.');
      return;
    }
    processReport.mutate(
      {
        id: reportId,
        result,
        adminMemo,
        sanctionType: result === 'RESOLVED' ? (sanctionType as 'NONE' | 'WARNING' | 'SUSPEND_7D' | 'SUSPEND_PERMANENT') : undefined,
      },
      {
        onSuccess: () => {
          router.push('/admin/reports');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
        <AnalyticsLoading label="신고 정보를 불러오는 중입니다..." />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
        <AnalyticsError message={error?.message || '신고 정보를 불러오지 못했습니다.'} />
      </div>
    );
  }

  const slaStatus = report.slaStatus;
  const slaLabel = SLA_STATUS_LABELS[slaStatus];

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
        <PageHeader
          title={`신고 상세 #${report.id}`}
          description={`${REPORT_REASON_LABELS[report.reason]} | ${formatDateTime(report.createdAt)}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 신고 내용 + SLA */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                신고 내용
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={SLA_STATUS_COLORS[slaStatus]}>{slaLabel}</Badge>
                <Badge className={REPORT_STATUS_COLORS[report.status]}>
                  {REPORT_STATUS_LABELS[report.status]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SLA 진행바 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">SLA 진행률</span>
                <span className="font-medium">{Math.round(report.slaProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${getSlaColor(slaStatus)}`}
                  style={{ width: `${Math.min(report.slaProgress * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                마감: {formatDateTime(report.slaDeadline)} | 우선순위 점수: {report.priorityScore.toFixed(1)}
              </p>
            </div>

            <Separator />

            {/* 담당자 (v2.1) */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">담당자</Label>
                <p className="font-medium">
                  {report.assignedAdminName ? (
                    <>
                      {report.assignedAdminName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (admin_id: {report.assignedTo})
                      </span>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-600">미배정</Badge>
                  )}
                </p>
              </div>
              {hasPermission('ADMIN') && (
                <Button variant="outline" size="sm" onClick={() => setAssignModalOpen((v) => !v)}>
                  <UserCheck className="mr-1 h-4 w-4" />
                  담당자 변경
                </Button>
              )}
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground">신고 사유</Label>
              <p className="font-medium">{REPORT_REASON_LABELS[report.reason]}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">상세 내용</Label>
              <p className="mt-1">{report.detail}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">증거 내용</Label>
              <div className="mt-1 rounded-lg bg-muted p-4">
                <p className="text-sm italic">&quot;{report.evidenceContent}&quot;</p>
              </div>
            </div>

            {report.status === 'RESOLVED' && (
              <>
                <Separator />
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">처리 완료</span>
                  </div>
                  <p className="mt-2 text-sm text-green-700">처리자: {report.resolvedBy}</p>
                  <p className="text-sm text-green-700">처리 시간: {report.resolvedAt && formatDateTime(report.resolvedAt)}</p>
                  <p className="mt-2 text-sm text-green-600">처리 내용: {report.resolveNote}</p>
                  {report.sanctionType && report.sanctionType !== 'NONE' && (
                    <p className="text-sm text-green-600">
                      제재: {SANCTION_LABELS[report.sanctionType]}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 관련 사용자 정보 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                신고자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">닉네임</span>
                <span className="font-medium">{report.reporterNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-sm">{report.reporterEmail}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/members/${report.reporterId}`}>프로필 보기</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                피신고자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">닉네임</span>
                <span className="font-medium">{report.targetNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-sm">{report.targetEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">누적 신고</span>
                <span className="font-medium text-red-600">{report.accumulatedReportCount}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이전 신고</span>
                <span className="font-medium">{report.targetPreviousReports.length}건</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/members/${report.targetId}`}>프로필 보기</a>
              </Button>
            </CardContent>
          </Card>

          {report.targetPreviousReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">이전 신고 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {report.targetPreviousReports.map((prev, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{REPORT_REASON_LABELS[prev.reason]}</span>
                    <Badge variant="secondary">
                      {REPORT_STATUS_LABELS[prev.status] || prev.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 처리 액션 (ADMIN 이상, 기능명세서 9.2 기준) */}
        {hasPermission('ADMIN') && report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                신고 처리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 제재 유형 선택 (v2.1: 5종 + 없음 — SUSPEND_PERMANENT/FORCE_WITHDRAW는 SUPER_ADMIN only) */}
                <div>
                  <Label>제재 유형 (v2.1 정합)</Label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {SANCTION_OPTIONS.map((option) => {
                      const disabled = !canSelectSanction(option.value);
                      return (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                            disabled
                              ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400'
                              : sanctionType === option.value
                                ? 'cursor-pointer border-primary bg-primary/5 font-medium'
                                : 'cursor-pointer border-gray-200 hover:bg-muted'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sanctionType"
                            value={option.value}
                            checked={sanctionType === option.value}
                            onChange={(e) => setSanctionType(e.target.value as 'NONE' | SanctionType)}
                            disabled={disabled}
                            className="sr-only"
                          />
                          {option.icon}
                          {SANCTION_LABELS[option.value]}
                          {disabled && (
                            <span className="ml-1 text-[10px] text-muted-foreground">SUPER_ADMIN 전용</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 처리 사유 (최소 10자) */}
                <div>
                  <Label htmlFor="adminMemo">처리 사유 (최소 10자)</Label>
                  <Input
                    id="adminMemo"
                    placeholder="처리 또는 기각 사유를 상세히 입력하세요..."
                    value={adminMemo}
                    onChange={(e) => setAdminMemo(e.target.value)}
                    className="mt-1"
                  />
                  {adminMemo.length > 0 && adminMemo.length < 10 && (
                    <p className="mt-1 text-xs text-red-500">
                      {10 - adminMemo.length}자 더 입력해주세요
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleProcess('RESOLVED')}
                    disabled={isProcessing || adminMemo.length < 10}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    처리 완료
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleProcess('DISMISSED')}
                    disabled={isProcessing || adminMemo.length < 10}
                  >
                    기각
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
