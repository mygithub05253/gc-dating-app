'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function resolveSlaStatus(progress: number): SlaStatus {
  if (progress >= 1.0) return 'OVERDUE';
  if (progress >= 0.8) return 'WARNING';
  return 'ON_TRACK';
}

// Mock 관리자 목록 (ERD v2.1 admin_accounts)
const MOCK_ADMINS: Array<{ id: number; name: string; role: 'VIEWER' | 'ADMIN' | 'SUPER_ADMIN' }> = [
  { id: 1001, name: '김관리', role: 'ADMIN' },
  { id: 1002, name: '박슈퍼', role: 'SUPER_ADMIN' },
  { id: 1003, name: '이뷰어', role: 'VIEWER' },
];

type MockReport = {
  id: number;
  reporterId: number;
  reporterNickname: string;
  reporterEmail: string;
  targetId: number;
  targetNickname: string;
  targetEmail: string;
  reason: ReportReason;
  detail: string;
  evidenceContent: string;
  status: ReportStatus;
  priorityScore: number;
  slaDeadline: string;
  slaProgress: number;
  assignedTo: number | null;
  assignedAdminName: string | null;
  accumulatedReportCount: number;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolveNote: string | null;
  sanctionType: 'NONE' | SanctionType | null;
  targetPreviousReports: Array<{ reason: ReportReason; createdAt: string; status: ReportStatus }>;
};

const MOCK_REPORTS: Record<string, MockReport> = {
  '1': {
    id: 1,
    reporterId: 5,
    reporterNickname: '맑은하늘',
    reporterEmail: 'sky@example.com',
    targetId: 2,
    targetNickname: '달빛청년',
    targetEmail: 'junho@example.com',
    reason: 'PROFANITY',
    detail: '교환일기에서 욕설을 사용했습니다. "XX" 같은 표현이 포함되어 있었습니다.',
    evidenceContent: '오늘 정말 XX 같은 하루였어. 왜 이렇게 재수가 없는지...',
    status: 'PENDING',
    priorityScore: 6.0,
    slaDeadline: '2024-03-23T10:30:00',
    slaProgress: 0.65,
    assignedTo: null,
    assignedAdminName: null,
    accumulatedReportCount: 2,
    createdAt: '2024-03-20T10:30:00',
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    sanctionType: null,
    targetPreviousReports: [
      { reason: 'SPAM', createdAt: '2024-02-15T08:00:00', status: 'DISMISSED' },
    ],
  },
  '2': {
    id: 2,
    reporterId: 8,
    reporterNickname: '봄날의꿈',
    reporterEmail: 'spring@example.com',
    targetId: 12,
    targetNickname: '행복한사람',
    targetEmail: 'happy@example.com',
    reason: 'SEXUAL',
    detail: '프로필 사진에 부적절한 이미지가 있습니다.',
    evidenceContent: '[프로필 이미지 - 노출이 심한 사진]',
    status: 'IN_REVIEW',
    priorityScore: 10.0,
    slaDeadline: '2024-03-20T15:45:00',
    slaProgress: 0.92,
    assignedTo: 1001,
    assignedAdminName: '김관리',
    accumulatedReportCount: 1,
    createdAt: '2024-03-19T15:45:00',
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    sanctionType: null,
    targetPreviousReports: [],
  },
  '3': {
    id: 3,
    reporterId: 3,
    reporterNickname: '별빛소녀',
    reporterEmail: 'star@example.com',
    targetId: 15,
    targetNickname: '자유로운영혼',
    targetEmail: 'free@example.com',
    reason: 'SPAM',
    detail: '계속 같은 내용의 일기를 반복해서 올리고 있습니다.',
    evidenceContent: '오늘도 좋은 하루! (같은 내용 10회 이상 반복)',
    status: 'RESOLVED',
    priorityScore: 4.0,
    slaDeadline: '2024-03-21T09:00:00',
    slaProgress: 0.3,
    assignedTo: 1001,
    assignedAdminName: '김관리',
    accumulatedReportCount: 1,
    createdAt: '2024-03-18T09:00:00',
    resolvedAt: '2024-03-18T14:30:00',
    resolvedBy: '김관리',
    resolveNote: '경고 처리 완료. 재발 시 정지 예정.',
    sanctionType: 'WARNING',
    targetPreviousReports: [],
  },
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
  const { hasPermission } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMemo, setAdminMemo] = useState('');
  const [sanctionType, setSanctionType] = useState<'NONE' | SanctionType>('NONE');

  const reportId = params.id as string;
  const initialReport = MOCK_REPORTS[reportId] || MOCK_REPORTS['1'];

  // 담당자 변경 로컬 state (Mock — 실제 환경에서는 PATCH /api/admin/reports/{id}/assign 호출)
  const [assignedTo, setAssignedTo] = useState<number | null>(initialReport.assignedTo);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const assignedAdminName =
    assignedTo === null
      ? null
      : MOCK_ADMINS.find((a) => a.id === assignedTo)?.name ?? initialReport.assignedAdminName;

  const slaStatus = resolveSlaStatus(initialReport.slaProgress);
  const slaLabel = SLA_STATUS_LABELS[slaStatus];

  // SUSPEND_PERMANENT / FORCE_WITHDRAW는 SUPER_ADMIN만 가능 (관리자 기능명세서)
  const canSelectSanction = (value: 'NONE' | SanctionType): boolean => {
    if (value === 'SUSPEND_PERMANENT' || value === 'FORCE_WITHDRAW') {
      return hasPermission('SUPER_ADMIN');
    }
    return true;
  };

  const handleAssign = (adminId: number | null) => {
    setAssignedTo(adminId);
    setAssignModalOpen(false);
    const target = adminId === null ? '미배정' : MOCK_ADMINS.find((a) => a.id === adminId)?.name;
    toast.success(`담당자를 '${target}'(으)로 변경했습니다.`);
  };

  const handleProcess = async (result: 'RESOLVED' | 'DISMISSED') => {
    if (adminMemo.trim().length < 10) {
      toast.error('처리 사유를 최소 10자 이상 입력해주세요.');
      return;
    }
    if (result === 'RESOLVED' && !canSelectSanction(sanctionType)) {
      toast.error('이 제재 유형은 SUPER_ADMIN 권한이 필요합니다.');
      return;
    }
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));

    if (result === 'DISMISSED') {
      toast.success('신고가 기각되었습니다.');
    } else {
      const label = SANCTION_LABELS[sanctionType];
      toast.success(sanctionType === 'NONE' ? '처리 완료되었습니다.' : `${label} 처리되었습니다.`);
    }
    setIsProcessing(false);
    router.push('/admin/reports');
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
        <PageHeader
          title={`신고 상세 #${initialReport.id}`}
          description={`${REPORT_REASON_LABELS[initialReport.reason]} | ${formatDateTime(initialReport.createdAt)}`}
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
                <Badge className={REPORT_STATUS_COLORS[initialReport.status]}>
                  {REPORT_STATUS_LABELS[initialReport.status]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SLA 진행바 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">SLA 진행률</span>
                <span className="font-medium">{Math.round(initialReport.slaProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${getSlaColor(slaStatus)}`}
                  style={{ width: `${Math.min(initialReport.slaProgress * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                마감: {formatDateTime(initialReport.slaDeadline)} | 우선순위 점수: {initialReport.priorityScore.toFixed(1)}
              </p>
            </div>

            <Separator />

            {/* 담당자 (v2.1: 드롭다운 선택) */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">담당자</Label>
                <p className="font-medium">
                  {assignedAdminName ? (
                    <>
                      {assignedAdminName}
                      <span className="ml-2 text-xs text-muted-foreground">
                        (admin_id: {assignedTo})
                      </span>
                    </>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-600">미배정</Badge>
                  )}
                </p>
              </div>
              {hasPermission('ADMIN') && (
                <div className="relative">
                  <Button variant="outline" size="sm" onClick={() => setAssignModalOpen((v) => !v)}>
                    <UserCheck className="mr-1 h-4 w-4" />
                    담당자 변경
                  </Button>
                  {assignModalOpen && (
                    <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => handleAssign(null)}
                        className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-left hover:bg-muted"
                      >
                        <Shield className="h-4 w-4 text-gray-400" />
                        미배정
                      </button>
                      <Separator className="my-1" />
                      {MOCK_ADMINS.map((admin) => (
                        <button
                          key={admin.id}
                          type="button"
                          onClick={() => handleAssign(admin.id)}
                          className="flex w-full items-center justify-between rounded px-3 py-2 text-sm text-left hover:bg-muted"
                        >
                          <span className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-primary" />
                            {admin.name}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {admin.role}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground">신고 사유</Label>
              <p className="font-medium">{REPORT_REASON_LABELS[initialReport.reason]}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">상세 내용</Label>
              <p className="mt-1">{initialReport.detail}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">증거 내용</Label>
              <div className="mt-1 rounded-lg bg-muted p-4">
                <p className="text-sm italic">&quot;{initialReport.evidenceContent}&quot;</p>
              </div>
            </div>

            {initialReport.status === 'RESOLVED' && (
              <>
                <Separator />
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">처리 완료</span>
                  </div>
                  <p className="mt-2 text-sm text-green-700">처리자: {initialReport.resolvedBy}</p>
                  <p className="text-sm text-green-700">처리 시간: {initialReport.resolvedAt && formatDateTime(initialReport.resolvedAt)}</p>
                  <p className="mt-2 text-sm text-green-600">처리 내용: {initialReport.resolveNote}</p>
                  {initialReport.sanctionType && initialReport.sanctionType !== 'NONE' && (
                    <p className="text-sm text-green-600">
                      제재: {SANCTION_LABELS[initialReport.sanctionType]}
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
                <span className="font-medium">{initialReport.reporterNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-sm">{initialReport.reporterEmail}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/members/${initialReport.reporterId}`}>프로필 보기</a>
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
                <span className="font-medium">{initialReport.targetNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-sm">{initialReport.targetEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">누적 신고</span>
                <span className="font-medium text-red-600">{initialReport.accumulatedReportCount}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이전 신고</span>
                <span className="font-medium">{initialReport.targetPreviousReports.length}건</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/members/${initialReport.targetId}`}>프로필 보기</a>
              </Button>
            </CardContent>
          </Card>

          {initialReport.targetPreviousReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">이전 신고 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {initialReport.targetPreviousReports.map((prev, idx) => (
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
        {hasPermission('ADMIN') && initialReport.status !== 'RESOLVED' && initialReport.status !== 'DISMISSED' && (
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
