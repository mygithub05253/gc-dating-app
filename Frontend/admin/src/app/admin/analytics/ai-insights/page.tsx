'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import { Brain, Target, FileText, Zap, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAiPerformance } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToTimestampRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { AiPerformanceResponse, AiModelStat } from '@/types/analytics';

const MODEL_COLORS: Record<string, string> = {
  KcELECTRA: '#8b5cf6',
  KoSimCSE: '#3b82f6',
};

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
  },
};

export default function AiInsightsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');

  // BE는 startTs/endTs (ISO datetime) 사용
  const { startTs, endTs } = periodToTimestampRange(period);
  const query = useAiPerformance({ startTs, endTs });
  const data: AiPerformanceResponse | undefined = query.data;

  const modelData = useMemo(() => {
    if (!data) return [];
    return data.models.map((m: AiModelStat) => ({
      model: m.model,
      total: m.totalProcessed,
      succeeded: m.succeeded,
      failed: m.failed,
      successRate: m.successRate ?? 0,
      color: MODEL_COLORS[m.model] ?? '#6b7280',
    }));
  }, [data]);

  // PieChart 용: 각 모델 처리량 비중
  const pieData = useMemo(() => {
    return modelData.map((m) => ({
      name: m.model,
      value: m.total,
      color: m.color,
    }));
  }, [modelData]);

  const totalProcessed = modelData.reduce((s, m) => s + m.total, 0);
  const totalSucceeded = modelData.reduce((s, m) => s + m.succeeded, 0);
  const overallSuccessRate = totalProcessed > 0 ? (totalSucceeded / totalProcessed) * 100 : 0;

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="AI 인사이트"
        description="KcELECTRA · KoSimCSE 모델 성능 (Prometheus 메트릭 기반)"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d', '30d', '90d'] as AnalyticsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={
                    period === p
                      ? 'px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground'
                      : 'px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent/40 transition-colors duration-short'
                  }
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              새로고침
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </div>
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
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <KpiCard
              title="전체 분석 성공률"
              value={`${overallSuccessRate.toFixed(1)}%`}
              description={`성공 ${totalSucceeded.toLocaleString()} / 총 ${totalProcessed.toLocaleString()}`}
              icon={Brain}
              valueClassName="text-[#8b5cf6]"
            />
            <KpiCard
              title="라이프스타일 분석량"
              value={data.lifestyleThroughput.toLocaleString()}
              description="기간 내 라이프스타일 분석 건수"
              icon={Target}
              valueClassName="text-primary"
            />
            <KpiCard
              title="총 처리 건수"
              value={totalProcessed.toLocaleString()}
              description="모든 모델 합산"
              icon={FileText}
              valueClassName="text-foreground"
            />
            <KpiCard
              title="활성 모델 수"
              value={modelData.length}
              description="KcELECTRA · KoSimCSE 등"
              icon={Zap}
              valueClassName="text-[#a78bfa]"
            />
          </div>

          {modelData.length === 0 ? (
            <AnalyticsEmpty height={300} title="AI 메트릭 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>모델별 처리량 (성공/실패 Stacked)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={modelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="model"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString() + '건',
                          name === 'succeeded' ? '성공' : '실패',
                        ]}
                      />
                      <Legend formatter={(value: string) => (value === 'succeeded' ? '성공' : '실패')} />
                      <Bar dataKey="succeeded" name="succeeded" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="failed" name="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>모델별 처리량 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }: { name: string; value: number }) =>
                            `${name}: ${value.toLocaleString()}`
                          }
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(value: number, name: string) => [value.toLocaleString() + '건', name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>모델별 성공률</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={modelData} layout="vertical" margin={{ left: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          domain={[0, 1]}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                        />
                        <YAxis
                          dataKey="model"
                          type="category"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          width={80}
                        />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, '성공률']}
                        />
                        <Bar dataKey="successRate" radius={[0, 4, 4, 0]}>
                          {modelData.map((entry) => (
                            <Cell key={entry.model} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>모델별 상세 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>모델</TableHead>
                        <TableHead className="text-right">총 처리</TableHead>
                        <TableHead className="text-right">성공</TableHead>
                        <TableHead className="text-right">실패</TableHead>
                        <TableHead className="text-right">성공률</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelData.map((row) => (
                        <TableRow key={row.model}>
                          <TableCell className="font-medium">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full mr-2"
                              style={{ backgroundColor: row.color }}
                            />
                            {row.model}
                          </TableCell>
                          <TableCell className="text-right font-mono-data tabular-nums">
                            {row.total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono-data tabular-nums text-success">
                            {row.succeeded.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono-data tabular-nums text-destructive">
                            {row.failed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono-data tabular-nums font-bold">
                            {(row.successRate * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
