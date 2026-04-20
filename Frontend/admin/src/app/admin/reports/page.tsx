'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants';
import type { ReportReason, ReportStatus, SlaStatus } from '@/types/report';
import { RefreshCw, Download, Eye, AlertTriangle, Clock, ShieldAlert, Timer, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

// 기능명세서 9.1 심각도 가중치 (ERD v2.0 ReportReason 기준)
const SEVERITY_WEIGHTS: Record<ReportReason, number> = {
  SEXUAL: 5,
  PERSONAL_INFO: 4,
  HARASSMENT: 3,
  PROFANITY: 2,
  IMPERSONATION: 2,
  SPAM: 2,
  OTHER: 1,
};

// SLA 상태 라벨 (API v2.1 신규)
const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  ON_TRACK: '여유',
  WARNING: '접근 중',
  OVERDUE: '초과',
};

const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  ON_TRACK: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
};

// 서버 계산 라벨 매핑 로직 (API v2.1: 서버에서 내려주는 값, FE는 시각화만)
function resolveSlaStatus(progress: number): SlaStatus {
  if (progress >= 1.0) return 'OVERDUE';
  if (progress >= 0.8) return 'WARNING';
  return 'ON_TRACK';
}

// Mock 신고 데이터 (기능명세서 9.1 + ERD v2.1 정합)
type MockReport = {
  id: number;
  reporterNickname: string;
  targetNickname: string;
  reason: ReportReason;
  status: ReportStatus;
  accumulatedReportCount: number;
  slaDeadline: string;
  slaProgress: number;
  slaStatus: SlaStatus;
  priorityScore: number;
  assignedTo: number | null; // ERD v2.1: admin_accounts.id
  assignedAdminName: string | null; // API v2.1: 표시명
  createdAt: string;
};

const RAW_MOCK_REPORTS: Array<Omit<MockReport, 'priorityScore' | 'slaStatus'>> = [
  {
    id: 1,
    reporterNickname: '별빛소녀',
    targetNickname: '달빛청년',
    reason: 'PROFANITY',
    status: 'PENDING',
    accumulatedReportCount: 3,
    slaDeadline: '2024-03-26T10:00:00',
    slaProgress: 0.45,
    assignedTo: null,
    assignedAdminName: null,
    createdAt: '2024-03-23T10:00:00',
  },
  {
    id: 2,
    reporterNickname: '햇살가득',
    targetNickname: '바람처럼',
    reason: 'SEXUAL',
    status: 'IN_REVIEW',
    accumulatedReportCount: 2,
    slaDeadline: '2024-03-24T15:00:00',
    slaProgress: 0.88,
    assignedTo: 1001,
    assignedAdminName: '김관리',
    createdAt: '2024-03-23T15:00:00',
  },
  {
    id: 3,
    reporterNickname: '꽃구름',
    targetNickname: '푸른바다',
    reason: 'SPAM',
    status: 'RESOLVED',
    accumulatedReportCount: 1,
    slaDeadline: '2024-03-25T09:00:00',
    slaProgress: 0.3,
    assignedTo: 1001,
    assignedAdminName: '김관리',
    createdAt: '2024-03-22T09:00:00',
  },
  {
    id: 4,
    reporterNickname: '밤하늘별',
    targetNickname: '달콤한하루',
    reason: 'HARASSMENT',
    status: 'PENDING',
    accumulatedReportCount: 5,
    slaDeadline: '2024-03-25T14:00:00',
    slaProgress: 0.72,
    assignedTo: null,
    assignedAdminName: null,
    createdAt: '2024-03-22T14:00:00',
  },
  {
    id: 5,
    reporterNickname: '행복한날',
    targetNickname: '자유로운영혼',
    reason: 'PERSONAL_INFO',
    status: 'IN_REVIEW',
    accumulatedReportCount: 1,
    slaDeadline: '2024-03-24T10:00:00',
    slaProgress: 1.15,
    assignedTo: 1002,
    assignedAdminName: '박슈퍼',
    createdAt: '2024-03-23T10:00:00',
  },
  {
    id: 6,
    reporterNickname: '봄날의꿈',
    targetNickname: '여름밤',
    reason: 'OTHER',
    status: 'DISMISSED',
    accumulatedReportCount: 1,
    slaDeadline: '2024-03-26T09:00:00',
    slaProgress: 0.2,
    assignedTo: 1001,
    assignedAdminName: '김관리',
    createdAt: '2024-03-23T09:00:00',
  },
];

const MOCK_REPORTS: MockReport[] = RAW_MOCK_REPORTS.map((r) => ({
  ...r,
  // 기능명세서 9.1: priorityScore = 심각도 × 누적신고수 × (1 + SLA진행률)
  priorityScore: SEVERITY_WEIGHTS[r.reason] * r.accumulatedReportCount * (1 + r.slaProgress),
  slaStatus: resolveSlaStatus(r.slaProgress),
}));

function getSlaBarColor(status: SlaStatus) {
  if (status === 'OVERDUE') return 'bg-red-500';
  if (status === 'WARNING') return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function ReportsPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  // v2.1 신규 필터
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'UNASSIGNED' | 'ME'>('ALL');
  const [slaOverdueOnly, setSlaOverdueOnly] = useState<boolean>(false);
  const [minPriority, setMinPriority] = useState<number>(0);

  // 현재 로그인 관리자 Mock (실제 환경에서는 session에서 조회)
  const currentAdminId = 1001;

  const handleRefresh = () => {
    toast.success('신고 목록을 새로고침했습니다.');
  };

  // 필터링 + 우선순위 정렬
  const filteredReports = useMemo(() => {
    return MOCK_REPORTS
      .filter((r) => {
        const matchesKeyword = !keyword || r.reporterNickname.includes(keyword) || r.targetNickname.includes(keyword);
        const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
        const matchesReason = reasonFilter === 'ALL' || r.reason === reasonFilter;
        const matchesAssignment =
          assignmentFilter === 'ALL' ||
          (assignmentFilter === 'UNASSIGNED' && r.assignedTo === null) ||
          (assignmentFilter === 'ME' && r.assignedTo === currentAdminId);
        const matchesSlaOverdue = !slaOverdueOnly || r.slaStatus === 'OVERDUE';
        const matchesPriority = r.priorityScore >= minPriority;
        return matchesKeyword && matchesStatus && matchesReason && matchesAssignment && matchesSlaOverdue && matchesPriority;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [keyword, statusFilter, reasonFilter, assignmentFilter, slaOverdueOnly, minPriority]);

  // 기능명세서 9.1 요약 카드
  const unresolvedCount = MOCK_REPORTS.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW').length;
  const slaApproachingCount = MOCK_REPORTS.filter((r) => r.slaStatus === 'WARNING' && r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length;
  const slaExceededCount = MOCK_REPORTS.filter((r) => r.slaStatus === 'OVERDUE' && r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length;
  const unassignedCount = MOCK_REPORTS.filter((r) => r.assignedTo === null && (r.status === 'PENDING' || r.status === 'IN_REVIEW')).length;

  return (
    <div>
      <PageHeader
        title="신고 관리"
        description="신고 목록 조회 및 처리 (v2.1 정합: priorityScore / slaStatus / 담당자)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              내보내기
            </Button>
          </div>
        }
      />

      {/* 요약 카드 (기능명세서 9.1) */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer" onClick={() => { setStatusFilter('ALL'); setAssignmentFilter('ALL'); setSlaOverdueOnly(false); }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">미처리 전체</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{unresolvedCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">SLA 접근 중 (80%)</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{slaApproachingCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-red-200" onClick={() => setSlaOverdueOnly(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">SLA 초과</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{slaExceededCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-gray-200" onClick={() => setAssignmentFilter('UNASSIGNED')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-muted-foreground">미배정</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-700">{unassignedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[250px]">
          <SearchBar value={keyword} onChange={setKeyword} placeholder="신고자 또는 피신고자 검색" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="ALL">전체 상태</option>
          {Object.entries(REPORT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="ALL">전체 사유</option>
          {Object.entries(REPORT_REASON_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={assignmentFilter}
          onChange={(e) => setAssignmentFilter(e.target.value as 'ALL' | 'UNASSIGNED' | 'ME')}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="ALL">전체 담당</option>
          <option value="UNASSIGNED">미배정</option>
          <option value="ME">내 담당</option>
        </select>
      </div>

      {/* v2.1 보조 필터 */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-md bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={slaOverdueOnly}
            onChange={(e) => setSlaOverdueOnly(e.target.checked)}
          />
          <ShieldAlert className="h-4 w-4 text-red-500" />
          SLA 초과만 보기
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">최소 우선순위:</span>
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={minPriority}
            onChange={(e) => setMinPriority(Number(e.target.value))}
            className="w-40"
          />
          <span className="w-8 font-mono font-medium">{minPriority}</span>
        </div>
        {(slaOverdueOnly || minPriority > 0 || assignmentFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSlaOverdueOnly(false);
              setMinPriority(0);
              setAssignmentFilter('ALL');
            }}
          >
            <CheckCircle2 className="mr-1 h-4 w-4" />
            필터 초기화
          </Button>
        )}
      </div>

      {/* 신고 목록 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">신고자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">피신고자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">사유</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">누적</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">SLA 진행</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">SLA 상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">우선순위</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">담당자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">접수일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const isMyTask = report.assignedTo === currentAdminId;
                    return (
                      <tr key={report.id} className={`hover:bg-muted/30 ${report.slaStatus === 'OVERDUE' ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium">#{report.id}</td>
                        <td className="px-4 py-3 text-sm">{report.reporterNickname}</td>
                        <td className="px-4 py-3 text-sm font-medium">{report.targetNickname}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{REPORT_REASON_LABELS[report.reason]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">{report.accumulatedReportCount}</td>
                        <td className="px-4 py-3">
                          <Badge className={REPORT_STATUS_COLORS[report.status]}>
                            {REPORT_STATUS_LABELS[report.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-gray-200">
                              <div
                                className={`h-2 rounded-full ${getSlaBarColor(report.slaStatus)}`}
                                style={{ width: `${Math.min(report.slaProgress * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {Math.round(report.slaProgress * 100)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${SLA_STATUS_COLORS[report.slaStatus]}`}>
                            {SLA_STATUS_LABELS[report.slaStatus]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold">{report.priorityScore.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm">
                          {report.assignedAdminName ? (
                            <span className={isMyTask ? 'font-medium text-primary' : ''}>
                              {report.assignedAdminName}
                              {isMyTask && <Badge variant="outline" className="ml-2 text-[10px]">내 담당</Badge>}
                            </span>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600">미배정</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(report.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/reports/${report.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-1 h-4 w-4" />
                              상세
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
