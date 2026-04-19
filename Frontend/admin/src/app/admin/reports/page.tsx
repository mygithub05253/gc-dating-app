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
import { RefreshCw, Download, Eye, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

// 기능명세서 9.1 심각도 가중치 (ERD v2.0 ReportReason 기준)
const SEVERITY_WEIGHTS: Record<string, number> = {
  SEXUAL: 5,
  PERSONAL_INFO: 4,
  HARASSMENT: 3,
  PROFANITY: 2,
  IMPERSONATION: 2,
  SPAM: 2,
  OTHER: 1,
};

// Mock 신고 데이터 (기능명세서 9.1 기준: 우선순위 점수 + SLA)
const MOCK_REPORTS = [
  {
    id: 1,
    reporterNickname: '별빛소녀',
    targetNickname: '달빛청년',
    reason: 'PROFANITY' as const,
    status: 'PENDING' as const,
    accumulatedReportCount: 3,
    slaDeadline: '2024-03-26T10:00:00',
    slaProgress: 0.45,
    priorityScore: 0,
    assignedTo: null,
    createdAt: '2024-03-23T10:00:00',
  },
  {
    id: 2,
    reporterNickname: '햇살가득',
    targetNickname: '바람처럼',
    reason: 'SEXUAL' as const,
    status: 'IN_REVIEW' as const,
    accumulatedReportCount: 2,
    slaDeadline: '2024-03-24T15:00:00',
    slaProgress: 0.88,
    priorityScore: 0,
    assignedTo: 'admin@ember.com',
    createdAt: '2024-03-23T15:00:00',
  },
  {
    id: 3,
    reporterNickname: '꽃구름',
    targetNickname: '푸른바다',
    reason: 'SPAM' as const,
    status: 'RESOLVED' as const,
    accumulatedReportCount: 1,
    slaDeadline: '2024-03-25T09:00:00',
    slaProgress: 0.3,
    priorityScore: 0,
    assignedTo: 'admin@ember.com',
    createdAt: '2024-03-22T09:00:00',
  },
  {
    id: 4,
    reporterNickname: '밤하늘별',
    targetNickname: '달콤한하루',
    reason: 'HARASSMENT' as const,
    status: 'PENDING' as const,
    accumulatedReportCount: 5,
    slaDeadline: '2024-03-25T14:00:00',
    slaProgress: 0.72,
    priorityScore: 0,
    assignedTo: null,
    createdAt: '2024-03-22T14:00:00',
  },
  {
    id: 5,
    reporterNickname: '행복한날',
    targetNickname: '자유로운영혼',
    reason: 'PERSONAL_INFO' as const,
    status: 'IN_REVIEW' as const,
    accumulatedReportCount: 1,
    slaDeadline: '2024-03-24T10:00:00',
    slaProgress: 1.15,
    priorityScore: 0,
    assignedTo: 'super@ember.com',
    createdAt: '2024-03-23T10:00:00',
  },
  {
    id: 6,
    reporterNickname: '봄날의꿈',
    targetNickname: '여름밤',
    reason: 'OTHER' as const,
    status: 'DISMISSED' as const,
    accumulatedReportCount: 1,
    slaDeadline: '2024-03-26T09:00:00',
    slaProgress: 0.2,
    priorityScore: 0,
    assignedTo: 'admin@ember.com',
    createdAt: '2024-03-23T09:00:00',
  },
].map((r) => ({
  ...r,
  // 기능명세서 9.1: priorityScore = 심각도 × 누적신고수 × (1 + SLA진행률)
  priorityScore: SEVERITY_WEIGHTS[r.reason] * r.accumulatedReportCount * (1 + r.slaProgress),
}));

function getSlaColor(progress: number) {
  if (progress >= 1.0) return 'bg-red-500';
  if (progress >= 0.8) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getSlaLabel(progress: number) {
  if (progress >= 1.0) return { text: '초과', className: 'bg-red-100 text-red-800' };
  if (progress >= 0.8) return { text: '접근 중', className: 'bg-yellow-100 text-yellow-800' };
  return null;
}

export default function ReportsPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

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
        return matchesKeyword && matchesStatus && matchesReason;
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [keyword, statusFilter, reasonFilter]);

  // 기능명세서 9.1 요약 카드
  const unresolvedCount = MOCK_REPORTS.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW').length;
  const slaApproachingCount = MOCK_REPORTS.filter((r) => r.slaProgress >= 0.8 && r.slaProgress < 1.0 && r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length;
  const slaExceededCount = MOCK_REPORTS.filter((r) => r.slaProgress >= 1.0 && r.status !== 'RESOLVED' && r.status !== 'DISMISSED').length;

  return (
    <div>
      <PageHeader
        title="신고 관리"
        description="신고 목록 조회 및 처리"
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
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer" onClick={() => setStatusFilter('ALL')}>
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
        <Card className="cursor-pointer border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">SLA 초과</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{slaExceededCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-4">
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
                  <th className="px-4 py-3 text-left text-sm font-medium">우선순위</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">담당자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">접수일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const slaLabel = getSlaLabel(report.slaProgress);
                    return (
                      <tr key={report.id} className="hover:bg-muted/30">
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
                                className={`h-2 rounded-full ${getSlaColor(report.slaProgress)}`}
                                style={{ width: `${Math.min(report.slaProgress * 100, 100)}%` }}
                              />
                            </div>
                            {slaLabel && (
                              <Badge className={`text-xs ${slaLabel.className}`}>{slaLabel.text}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold">{report.priorityScore.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{report.assignedTo || '-'}</td>
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
