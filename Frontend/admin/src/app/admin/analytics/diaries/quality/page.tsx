'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import {
  FileText,
  Star,
  CheckCircle,
  Award,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import toast from 'react-hot-toast';
import { useDiaryLengthQuality } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { DiaryLengthQualityResponse, LengthBucket } from '@/types/analytics';

// ─────────────────────────────────────────────
// adapter: BE buckets → 차트 데이터
// 100자 미만 구간 식별 (range 시작값 < 100)
// ─────────────────────────────────────────────
function isBelowMin(range: string): boolean {
  const m = range.match(/^(\d+)/);
  if (!m) return false;
  const start = parseInt(m[1], 10);
  return start < 100;
}

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { range: string };
}

function CustomLengthBar(props: CustomBarProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const fill = payload && isBelowMin(payload.range) ? '#f59e0b' : '#3b82f6';
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} ry={3} />;
}

export default function DiaryQualityPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useDiaryLengthQuality({ startDate, endDate });
  const data: DiaryLengthQualityResponse | undefined = query.data;

  // adapter: 100자 미만 비율 계산
  const aboveMinRatio = useMemo(() => {
    if (!data) return 0;
    const totalCount = (data.buckets ?? []).reduce((s, b) => s + b.count, 0);
    if (totalCount === 0) return 0;
    const belowCount = (data.buckets ?? []).filter((b) => isBelowMin(b.range)).reduce((s, b) => s + b.count, 0);
    return Math.round(((totalCount - belowCount) / totalCount) * 100);
  }, [data]);

  // 첫 100자 이상 구간을 ReferenceLine 위치로 사용
  const firstAboveMinRange = useMemo(() => {
    if (!data) return null;
    return (data.buckets ?? []).find((b) => !isBelowMin(b.range))?.range ?? null;
  }, [data]);

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  const avgLength = data?.stats.mean !== null && data?.stats.mean !== undefined
    ? Math.round(data.stats.mean)
    : 0;
  const avgQuality = data?.quality.avgCharactersPerDiary !== null && data?.quality.avgCharactersPerDiary !== undefined
    ? data.quality.avgCharactersPerDiary
    : 0;
  const successRate = data?.quality.successRate !== null && data?.quality.successRate !== undefined
    ? Math.round(data.quality.successRate * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="일기 길이·품질 분석"
        description="글자 수 분포·AI 품질 점수·100자 기준 통과율"
        actions={
          <>
            <div className="flex gap-1 rounded-md border border-border p-1">
              {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={query.isFetching ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'} />
              새로고침
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </>
        }
      />

      {data?.meta?.degraded && (
        <div className="mb-4">
          <DegradedBadge degraded={data.meta.degraded} reason={data.meta.algorithm} />
        </div>
      )}

      {query.isLoading && <AnalyticsLoading height={400} />}
      {query.isError && (
        <AnalyticsError
          height={400}
          message={(query.error as Error)?.message}
          onRetry={() => query.refetch()}
        />
      )}

      {data && (
        <>
          {/* KPI 4개 */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <KpiCard
              title="평균 글자 수"
              value={`${avgLength}자`}
              description="전체 일기 평균"
              icon={FileText}
              valueClassName="text-primary"
            />
            <KpiCard
              title="P90 글자 수"
              value={`${data.stats.p90 ?? 0}자`}
              description="상위 10% 일기 길이"
              icon={Star}
              valueClassName="text-[#10b981]"
            />
            <KpiCard
              title="100자 이상 비율"
              value={`${aboveMinRatio}%`}
              description="최소 글자 수(100자) 충족률"
              icon={CheckCircle}
            />
            <KpiCard
              title="AI 분석 성공률"
              value={`${successRate}%`}
              description={`완료 ${data.quality.completed.toLocaleString()} / 실패 ${data.quality.failed.toLocaleString()}`}
              icon={Award}
              valueClassName="text-[#f59e0b]"
            />
          </div>

          {(data.buckets ?? []).length === 0 ? (
            <AnalyticsEmpty height={300} title="해당 기간 일기 데이터가 없습니다" />
          ) : (
            <>
              {/* 글자 수 히스토그램 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">글자 수 구간별 분포 히스토그램</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    노란 막대: 100자 미만(기준 미달) / 파란 막대: 100자 이상(기준 충족) / 빨간 점선: 최소 기준(100자)
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.buckets ?? []} margin={{ top: 12, right: 12, left: -8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        formatter={(v: number) => [`${v.toLocaleString()}건`, '일기 수']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                      {firstAboveMinRange && (
                        <ReferenceLine
                          x={firstAboveMinRange}
                          stroke="#ef4444"
                          strokeDasharray="4 3"
                          label={{ value: '100자 기준', position: 'top', fontSize: 9, fill: '#ef4444' }}
                        />
                      )}
                      <Bar
                        dataKey="count"
                        name="일기 수"
                        shape={(props: unknown) => <CustomLengthBar {...(props as CustomBarProps)} />}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#f59e0b' }} />
                      <span>100자 미만 (기준 미달)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#3b82f6' }} />
                      <span>100자 이상 (기준 충족)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-red-500" />
                      <span>최소 기준선</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 백엔드 응답에는 길이 percentile만 제공. quality 통계 카드 */}
              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">길이 통계 요약</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      P50 / P90 / P99 percentile + min / max / mean
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">P50 (중앙값)</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{data.stats.p50 ?? '—'}자</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">P90</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{data.stats.p90 ?? '—'}자</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">P99</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{data.stats.p99 ?? '—'}자</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">평균</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{avgLength}자</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">최소</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{data.stats.min ?? '—'}자</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs text-muted-foreground">최대</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">{data.stats.max ?? '—'}자</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">AI 분석 처리 품질</CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground">분석 성공/실패 통계</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4">지표</TableHead>
                          <TableHead className="text-right pr-4">값</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="pl-4">총 분석 시도</TableCell>
                          <TableCell className="text-right pr-4 tabular-nums">
                            {data.quality.total.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-4">성공</TableCell>
                          <TableCell className="text-right pr-4 tabular-nums text-success">
                            {data.quality.completed.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-4">실패</TableCell>
                          <TableCell className="text-right pr-4 tabular-nums text-destructive">
                            {data.quality.failed.toLocaleString()}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-4">성공률</TableCell>
                          <TableCell className="text-right pr-4 tabular-nums font-bold">
                            {successRate}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-4">평균 글자 수</TableCell>
                          <TableCell className="text-right pr-4 tabular-nums">
                            {Math.round(avgQuality)}자
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* 구간별 점유율 테이블 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">길이 구간별 점유율</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="pl-4 w-32">구간</TableHead>
                          <TableHead className="text-right">일기 수</TableHead>
                          <TableHead className="text-right pr-4">점유율</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.buckets ?? []).map((b: LengthBucket) => (
                          <TableRow key={b.range}>
                            <TableCell className="pl-4 font-medium">
                              <span
                                className="inline-flex h-6 w-3 rounded-full"
                                style={{ backgroundColor: isBelowMin(b.range) ? '#f59e0b' : '#3b82f6' }}
                              />
                              <span className="ml-2">{b.range}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums text-sm">
                              {b.count.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right pr-4 tabular-nums text-xs">
                              {((b.share ?? 0) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
