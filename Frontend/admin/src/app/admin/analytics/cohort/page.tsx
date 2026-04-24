'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import KpiCard from '@/components/common/KpiCard';
import AnalyticsDateRangePicker, { defaultRange } from '@/components/common/AnalyticsDateRangePicker';
import {
  AnalyticsLoading,
  AnalyticsEmpty,
  AnalyticsError,
  AnalyticsMetaBar,
  AnalyticsToolbar,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { useCohortRetention } from '@/hooks/useAnalytics';
import {
  AlertCircle,
  CalendarDays,
  Grid3X3,
  LineChart as LineIcon,
  RefreshCw,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * 코호트 리텐션 매트릭스 (B-5) — §3.17.
 *
 * 주 단위 signup 코호트 × 가입 후 경과 주(week 0..N-1) 매트릭스.
 * 관측 미완료 셀은 null + observable=false → 공정 비교.
 */
export default function CohortRetentionPage() {
  const [range, setRange] = useState(defaultRange(83)); // 최근 12주
  const [maxWeeks, setMaxWeeks] = useState<number>(12);

  const { data, isLoading, isError, error, refetch, isFetching } = useCohortRetention({
    ...range,
    maxWeeks,
  });

  const avgCurve = useMemo(() => {
    if (!data) return [];
    return data.averageByWeek.map((a) => ({
      weekOffset: a.weekOffset,
      rate: a.averageRate != null ? Number((a.averageRate * 100).toFixed(2)) : null,
      observableCohorts: a.observableCohorts,
    }));
  }, [data]);

  // week 0 평균 (KPI)
  const avgWeek0 = avgCurve.find((a) => a.weekOffset === 0)?.rate ?? null;
  const avgWeek4 = avgCurve.find((a) => a.weekOffset === 4)?.rate ?? null;

  return (
    <div>
      <PageHeader
        title="코호트 리텐션 매트릭스"
        description="주 단위 가입 코호트 × 경과 주 retention (Amplitude/Mixpanel 스타일)"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            새로고침
          </Button>
        }
      />

      <AnalyticsToolbar>
        <AnalyticsDateRangePicker value={range} onChange={setRange} />
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="mw" className="text-xs text-muted-foreground">
            maxWeeks
          </Label>
          <Input
            id="mw"
            type="number"
            min={1}
            max={26}
            value={maxWeeks}
            onChange={(e) => setMaxWeeks(Math.min(26, Math.max(1, Number(e.target.value) || 12)))}
            className="h-9 w-[80px]"
          />
        </div>
      </AnalyticsToolbar>

      {/* Meta */}
      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AnalyticsMetaBar
            algorithm={data.meta.algorithm}
            dataSourceVersion={data.meta.dataSourceVersion}
          />
          <DegradedBadge degraded={!!data.meta.degraded} />
          <Badge variant="soft-muted" className="text-[11px]">
            activity = diary OR exchange_diary
          </Badge>
        </div>
      )}

      {/* KPI */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard title="코호트 수" value={data?.cohortCount ?? 0} description="주 단위 signup 코호트" icon={CalendarDays} />
        <KpiCard title="총 가입자" value={data?.totalCohortUsers ?? 0} description="기간 전체" icon={Users} />
        <KpiCard
          title="Week 0 평균 retention"
          value={avgWeek0 != null ? `${avgWeek0.toFixed(1)}%` : '-'}
          description="Aha moment 도달률"
          icon={LineIcon}
          valueClassName="text-primary"
        />
        <KpiCard
          title="Week 4 평균 retention"
          value={avgWeek4 != null ? `${avgWeek4.toFixed(1)}%` : '-'}
          description="중기 유지율"
          icon={TrendingDown}
          valueClassName={avgWeek4 != null && avgWeek4 >= 30 ? 'text-success' : 'text-warning'}
        />
      </div>

      {/* Average Retention Curve */}
      {data && avgCurve.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <LineIcon className="h-4 w-4" /> 평균 리텐션 곡선
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              관측 가능한 코호트만 평균에 포함 (maturity bias 방지). 각 점 호버 시 관측 코호트 수 확인.
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={avgCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="weekOffset"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => `W${v}`}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label) => `Week ${label}`}
                  formatter={(value: unknown, name, item) => {
                    if (name === 'rate') {
                      const oc = (item?.payload as { observableCohorts?: number })?.observableCohorts ?? 0;
                      return [
                        `${value}% (관측 코호트 ${oc}개)`,
                        '평균 retention',
                      ];
                    }
                    return [String(value), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={20} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Matrix Heatmap */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Grid3X3 className="h-4 w-4" /> 리텐션 매트릭스 Heatmap
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            행 = 가입 주 · 열 = 경과 주 · 셀 색 = retention rate · 회색 빗금 = 관측 미완료
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && <AnalyticsLoading height={400} />}
          {isError && <AnalyticsError message={(error as Error)?.message} onRetry={() => refetch()} />}
          {!isLoading && !isError && (!data || data.cohorts.length === 0) && (
            <AnalyticsEmpty description="해당 기간에 가입 코호트가 없습니다." />
          )}
          {data && data.cohorts.length > 0 && <CohortMatrix data={data} />}
        </CardContent>
      </Card>

      {/* 알고리즘 노트 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> 알고리즘 노트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">코호트 리텐션 매트릭스</strong> —
            Amplitude/Mixpanel 의 Retention Curve 와 동일한 정의.
            가입 주(week 0)를 0-index 로 잡고 가입 후 경과 주 N 에 활동한 distinct 유저 비율을 계산.
          </p>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            cohort_week  = DATE_TRUNC(&apos;week&apos;, created_at AT TIME ZONE &apos;Asia/Seoul&apos;)<br />
            week_offset  = FLOOR((activity_at − cohort_week) / 7 days)<br />
            retained(c, t) = |{'{u ∈ c : activity(u) in week_offset=t}'}|<br />
            rate(c, t)   = retained(c, t) / cohort_size(c)
          </div>
          <p>
            <strong className="text-foreground">관측 가능성 (Observable)</strong> —
            <code className="text-xs">cohort_week + (offset+1)*7 ≤ today</code> 일 때만 rate 계산.
            아직 완전히 경과하지 않은 주는 <code className="text-xs">null</code> 처리하여 공정 비교 보장.
            averageByWeek 도 observable 셀만 평균에 포함 (maturity bias 방지).
          </p>
          <p>
            <strong className="text-foreground">활동 정의</strong> —
            <code className="text-xs">diaries.created_at</code> OR <code className="text-xs">exchange_diaries.submitted_at</code>.
            DISTINCT user_id 로 중복 활동은 1회 처리. <code className="text-xs">users.last_login_at</code> 은 컬럼 1개라
            주 단위 retention 계산 불가하여 활동 정의에서 제외.
          </p>
          <p>
            <strong className="text-foreground">구현 방식</strong> —
            SQL-native CTE (<code className="text-xs">cohort + activity UNION ALL + joined</code>) 1-shot.
            외부 분석 도구 없이 <code className="text-xs">AnalyticsCohortRepository</code> + 서비스 레이어만으로 완전 구현.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Heatmap Matrix (CSS Grid)
// =============================================================================

function heatColor(rate: number): string {
  // rate 0 ~ 1 → 알파값. 주색: emerald-500 (#10b981).
  // 가독성 위해 0.15 * rate + 0.85 공식 아닌 순수 알파 매핑.
  const alpha = Math.max(0.05, Math.min(1, rate));
  return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
}

function textColorForRate(rate: number): string {
  return rate >= 0.55 ? 'text-white' : 'text-foreground';
}

function CohortMatrix({
  data,
}: {
  data: import('@/types/analytics').CohortRetentionResponse;
}) {
  const maxW = data.maxWeeks;
  // 최신 코호트가 상단에 오도록 역순
  const cohortsDesc = useMemo(
    () => [...data.cohorts].sort((a, b) => b.cohortWeekStart.localeCompare(a.cohortWeekStart)),
    [data.cohorts],
  );

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-[2px] text-[11px]"
        style={{ gridTemplateColumns: `170px repeat(${maxW}, minmax(56px, 1fr))` }}
      >
        {/* Header row */}
        <div className="sticky left-0 z-10 bg-card p-2 font-medium text-muted-foreground">
          가입 주 (코호트 크기)
        </div>
        {Array.from({ length: maxW }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-center rounded-sm bg-muted/40 p-2 text-center font-mono-data text-[11px] font-medium text-muted-foreground"
          >
            W{i}
          </div>
        ))}

        {/* Cohort rows */}
        {cohortsDesc.map((c) => (
          <RowFragment key={c.cohortWeekStart} row={c} maxW={maxW} />
        ))}
      </div>
    </div>
  );
}

function RowFragment({
  row,
  maxW,
}: {
  row: import('@/types/analytics').CohortRow;
  maxW: number;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 flex flex-col justify-center rounded-sm bg-card p-2 text-[11px]">
        <div className="font-medium">{row.cohortWeekStart}</div>
        <div className="text-[10px] text-muted-foreground">
          n = {row.cohortSize.toLocaleString()}
        </div>
      </div>
      {Array.from({ length: maxW }, (_, i) => {
        const cell = row.cells.find((x) => x.weekOffset === i);
        if (!cell || !cell.observable || cell.rate == null) {
          return (
            <div
              key={i}
              className="flex items-center justify-center rounded-sm bg-muted/30 p-1 text-[10px] text-muted-foreground"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(100,116,139,.12) 4px, rgba(100,116,139,.12) 6px)',
              }}
              title="관측 미완료"
            >
              —
            </div>
          );
        }
        const pct = (cell.rate * 100).toFixed(0);
        return (
          <div
            key={i}
            className={`flex items-center justify-center rounded-sm p-1 font-mono-data text-[11px] font-medium ${textColorForRate(cell.rate)}`}
            style={{ backgroundColor: heatColor(cell.rate) }}
            title={`W${i}: ${cell.retained?.toLocaleString() ?? 0}/${row.cohortSize.toLocaleString()} = ${pct}%`}
          >
            {pct}%
          </div>
        );
      })}
    </>
  );
}
