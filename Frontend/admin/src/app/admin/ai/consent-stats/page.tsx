'use client';

// AI 동의 통계 페이지 — AI 분석·매칭 동의율 및 추세 모니터링 (VIEWER+ 접근 가능)
// 백엔드 §3 (/api/admin/consent/stats, /api/admin/consent/users) 실 API 연동.

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/common/KpiCard';
import DataTable from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
} from '@/components/common/AnalyticsStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { monitoringApi } from '@/lib/api/monitoring';
import { useConsentMissingUsers } from '@/hooks/useMonitoring';
import { formatDateTime } from '@/lib/utils/format';
import { Users, CheckCircle, Heart, UserMinus } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DataTableColumn } from '@/components/common/DataTable';

type Range = '7d' | '30d';
type MissingFilter = 'NO_AI_ANALYSIS' | 'NO_MATCHING';

interface MissingUserRow {
  userId: number;
  nickname: string;
  lastLoginAt: string;
}

const FILTER_LABELS: Record<MissingFilter, string> = {
  NO_AI_ANALYSIS: 'AI 분석 미동의',
  NO_MATCHING: '매칭 미동의',
};

const PAGE_SIZE = 10;

export default function ConsentStatsPage() {
  const [range, setRange] = useState<Range>('7d');
  const [filter, setFilter] = useState<MissingFilter>('NO_AI_ANALYSIS');
  const [page, setPage] = useState(0);

  // §3.1 동의 통계 (range 기준 KPI + 일별 추세)
  const statsQuery = useQuery({
    queryKey: ['consent', 'stats', range],
    queryFn: () => monitoringApi.getConsentStatsGeneral(range).then((res) => res.data.data),
  });

  // §3.2 미동의 사용자 목록 (페이지네이션)
  const missingQuery = useConsentMissingUsers({ page, size: PAGE_SIZE, filter });

  const missingUserColumns: DataTableColumn<MissingUserRow>[] = [
    {
      key: 'userId',
      header: 'ID',
      cell: (row) => <span className="font-mono-data text-sm">#{row.userId}</span>,
    },
    {
      key: 'nickname',
      header: '닉네임',
      cell: (row) => <span className="text-sm font-medium">{row.nickname}</span>,
    },
    {
      key: 'lastLoginAt',
      header: '최근 접속',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(row.lastLoginAt)}</span>
      ),
    },
    {
      key: 'missingConsents',
      header: '미동의 항목',
      cell: () => (
        <Badge variant="soft-destructive">{FILTER_LABELS[filter]}</Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="AI 동의 통계"
        description="AI 분석·매칭 동의율 및 추세"
      />

      {/* 기간 선택 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium">기간:</span>
        {(['7d', '30d'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              range === r
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            최근 {r === '7d' ? '7일' : '30일'}
          </button>
        ))}
      </div>

      {/* KPI 카드 그리드 */}
      {statsQuery.isLoading && <AnalyticsLoading height={120} />}
      {statsQuery.isError && (
        <AnalyticsError
          height={120}
          message={(statsQuery.error as Error)?.message}
          onRetry={() => statsQuery.refetch()}
        />
      )}
      {statsQuery.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="전체 사용자"
              value={statsQuery.data.totalUsers}
              icon={Users}
            />
            <KpiCard
              title="AI 분석 동의율"
              value={`${(statsQuery.data.analysisConsentRate * 100).toFixed(1)}%`}
              icon={CheckCircle}
              valueClassName="text-success"
            />
            <KpiCard
              title="매칭 동의율"
              value={`${(statsQuery.data.matchingConsentRate * 100).toFixed(1)}%`}
              icon={Heart}
              valueClassName="text-info"
            />
            <KpiCard
              title={`${range === '7d' ? '7일' : '30일'} 철회`}
              value={statsQuery.data.revokedCount}
              icon={UserMinus}
              valueClassName="text-destructive"
            />
          </div>

          {/* 일별 추세 차트 */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>일별 추세 (최근 {range === '7d' ? '7일' : '30일'})</CardTitle>
            </CardHeader>
            <CardContent>
              {(statsQuery.data?.dailyTrend ?? []).length === 0 ? (
                <AnalyticsEmpty height={240} title="추세 데이터가 없습니다" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={statsQuery.data?.dailyTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="consent"
                      stroke="hsl(var(--success))"
                      fill="hsl(var(--success))"
                      fillOpacity={0.2}
                      name="동의"
                    />
                    <Area
                      type="monotone"
                      dataKey="revoke"
                      stroke="hsl(var(--destructive))"
                      fill="hsl(var(--destructive))"
                      fillOpacity={0.2}
                      name="철회"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 미동의 사용자 리스트 */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>미동의 사용자 리스트</CardTitle>
            <div className="flex items-center gap-2">
              {(['NO_AI_ANALYSIS', 'NO_MATCHING'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(0);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    filter === f
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {missingQuery.isLoading && <AnalyticsLoading height={200} />}
          {missingQuery.isError && (
            <AnalyticsError
              height={200}
              message={(missingQuery.error as Error)?.message}
              onRetry={() => missingQuery.refetch()}
            />
          )}
          {missingQuery.data && (
            <>
              <DataTable
                columns={missingUserColumns}
                data={missingQuery.data.content}
                rowKey={(row) => row.userId}
                wrapInCard={false}
                emptyState="미동의 사용자가 없습니다."
              />
              {missingQuery.data.total > PAGE_SIZE && (
                <div className="border-t border-border p-3">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(missingQuery.data.total / PAGE_SIZE)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
