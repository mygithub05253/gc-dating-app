'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { AnalyticsLoading, AnalyticsError } from '@/components/common/AnalyticsStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants';
import type { Report, ReportReason, ReportStatus, SlaStatus } from '@/types/report';
import { RefreshCw, Download, Eye, AlertTriangle, Clock, ShieldAlert, Timer, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReportList } from '@/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';
import type { ReportSummary } from '@/types/report';

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

  // 서버 필터 파라미터 구성
  const searchParams = useMemo(() => ({
    status: statusFilter !== 'ALL' ? (statusFilter as ReportStatus) : undefined,
    reason: reasonFilter !== 'ALL' ? (reasonFilter as ReportReason) : undefined,
    assignedTo: assignmentFilter === 'UNASSIGNED' ? ('unassigned' as const) : assignmentFilter === 'ME' ? ('me' as const) : undefined,
    slaOverdue: slaOverdueOnly || undefined,
    minPriority: minPriority > 0 ? minPriority : undefined,
    page: 0,
    size: 50,
  }), [statusFilter, reasonFilter, assignmentFilter, slaOverdueOnly, minPriority]);

  const { data, isLoading, isError, error, refetch } = useReportList(searchParams);

  // 요약 통계
  const { data: summary } = useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => reportsApi.getSummary().then((res) => res.data.data),
  });

  const handleRefresh = () => {
    refetch();
    toast.success('신고 목록을 새로고침했습니다.');
  };

  const reports = data?.content ?? [];

  // 클라이언트 키워드 필터 (서버에 keyword 파라미터가 없으므로)
  const filteredReports = useMemo(() => {
    if (!keyword) return reports;
    return reports.filter(
      (r: Report) =>
        r.reporterNickname.includes(keyword) || r.targetNickname.includes(keyword),
    );
  }, [reports, keyword]);

  // DataTable 컬럼 정의
  const reportColumns: DataTableColumn<Report>[] = useMemo(
    () => [
      { key: 'id', header: 'ID', cell: (r) => <span className="font-medium">#{r.id}</span> },
      { key: 'reporter', header: '신고자', cell: (r) => r.reporterNickname },
      {
        key: 'target',
        header: '피신고자',
        cell: (r) => <span className="font-medium">{r.targetNickname}</span>,
      },
      {
        key: 'reason',
        header: '사유',
        cell: (r) => <Badge variant="outline">{REPORT_REASON_LABELS[r.reason]}</Badge>,
      },
      {
        key: 'accumulated',
        header: '누적',
        align: 'right',
        cell: (r) => (
          <span className="font-medium text-destructive">{r.accumulatedReportCount}</span>
        ),
      },
      {
        key: 'status',
        header: '상태',
        cell: (r) => (
          <Badge className={REPORT_STATUS_COLORS[r.status]}>
            {REPORT_STATUS_LABELS[r.status]}
          </Badge>
        ),
      },
      {
        key: 'slaProgress',
        header: 'SLA 진행',
        cell: (r) => (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${getSlaBarColor(r.slaStatus)}`}
                style={{ width: `${Math.min(r.slaProgress * 100, 100)}%` }}
              />
            </div>
            <span className="font-mono-data text-xs tabular-nums text-muted-foreground">
              {Math.round(r.slaProgress * 100)}%
            </span>
          </div>
        ),
      },
      {
        key: 'slaStatus',
        header: 'SLA 상태',
        cell: (r) => (
          <Badge className={`text-xs ${SLA_STATUS_COLORS[r.slaStatus]}`}>
            {SLA_STATUS_LABELS[r.slaStatus]}
          </Badge>
        ),
      },
      {
        key: 'priority',
        header: '우선순위',
        align: 'right',
        cell: (r) => <span className="font-bold">{r.priorityScore.toFixed(1)}</span>,
      },
      {
        key: 'assignedTo',
        header: '담당자',
        cell: (r) => {
          return r.assignedAdminName ? (
            <span>{r.assignedAdminName}</span>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              미배정
            </Badge>
          );
        },
      },
      {
        key: 'createdAt',
        header: '접수일',
        cell: (r) => (
          <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '액션',
        cell: (r) => (
          <Link href={`/admin/reports/${r.id}`}>
            <Button variant="ghost" size="xs">
              <Eye className="mr-1 h-4 w-4" />
              상세
            </Button>
          </Link>
        ),
      },
    ],
    [],
  );

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
            <div className="mt-1 text-2xl font-bold">{summary?.totalUnresolved ?? '-'}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">SLA 접근 중 (80%)</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{summary?.slaApproaching ?? '-'}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-red-200" onClick={() => setSlaOverdueOnly(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">SLA 초과</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{summary?.slaExceeded ?? '-'}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-gray-200" onClick={() => setAssignmentFilter('UNASSIGNED')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-muted-foreground">미배정</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-700">
              {summary ? (summary.pendingCount ?? '-') : '-'}
            </div>
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

      {/* 로딩/에러 상태 */}
      {isLoading && <AnalyticsLoading label="신고 목록을 불러오는 중입니다..." />}
      {isError && <AnalyticsError message={error?.message || '신고 목록을 불러오지 못했습니다.'} />}

      {/* 신고 목록 테이블 */}
      {!isLoading && !isError && (
        <DataTable
          columns={reportColumns}
          data={filteredReports}
          rowKey={(r) => r.id}
          rowClassName={(r) => (r.slaStatus === 'OVERDUE' ? 'bg-destructive/5' : undefined)}
          emptyState="검색 결과가 없습니다."
        />
      )}
    </div>
  );
}
