'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import {
  MessageCircle,
  CheckCircle,
  ArrowRight,
  AlertCircle,
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
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useExchangeTurnFunnel } from '@/hooks/useAnalytics';
import {
  AnalyticsLoading,
  AnalyticsError,
  AnalyticsEmpty,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { periodToDateRange, type AnalyticsPeriod } from '@/lib/utils/analyticsRange';
import type { ExchangeTurnFunnelResponse, ExchangeFunnelStageKey } from '@/types/analytics';

const STAGE_COLORS: Record<ExchangeFunnelStageKey, string> = {
  ROOM_CREATED: '#3b82f6',
  TURN_1_COMPLETE: '#4b90f7',
  TURN_2_COMPLETE: '#5e9df8',
  TURN_3_COMPLETE: '#72aaf9',
  TURN_4_COMPLETE: '#a0c6fb',
  CHAT_CONNECTED: '#10b981',
};

const STAGE_LABELS: Record<ExchangeFunnelStageKey, string> = {
  ROOM_CREATED: '방 생성',
  TURN_1_COMPLETE: '1턴 완료',
  TURN_2_COMPLETE: '2턴 완료',
  TURN_3_COMPLETE: '3턴 완료',
  TURN_4_COMPLETE: '4턴 완료',
  CHAT_CONNECTED: '채팅 연결',
};

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

export default function TurnFunnelPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');

  const { startDate, endDate } = periodToDateRange(period);
  const query = useExchangeTurnFunnel({ startDate, endDate });
  const data: ExchangeTurnFunnelResponse | undefined = query.data;

  const stages = data?.stages ?? [];

  const conversionData = useMemo(() => {
    return stages.map((s) => ({
      stage: STAGE_LABELS[s.stage],
      stageKey: s.stage,
      count: s.count,
      rate: ((s.rate ?? 0) * 100),
      dropoff: ((s.dropoffRate ?? 0) * 100),
    }));
  }, [stages]);

  const roomCount = stages[0]?.count ?? 0;
  const chatCount = stages.find((s) => s.stage === 'CHAT_CONNECTED')?.count ?? 0;
  const overallRate = roomCount > 0 ? (chatCount / roomCount) * 100 : 0;
  const turn1Rate = stages.find((s) => s.stage === 'TURN_1_COMPLETE')?.rate ?? 0;

  const handleDownload = () => {
    toast.success('CSV 다운로드는 백엔드 CSV 엔드포인트 준비 후 제공됩니다.');
  };

  return (
    <div>
      <PageHeader
        title="교환일기 턴 퍼널"
        description="방 생성→1~4턴→채팅 연결 퍼널·이탈 분석"
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
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <KpiCard
              title="총 방 생성 수"
              value={roomCount.toLocaleString()}
              description="기간 내 교환일기 시작"
              icon={MessageCircle}
            />
            <KpiCard
              title="채팅 연결 수"
              value={chatCount.toLocaleString()}
              description="최종 채팅 연결까지 도달"
              icon={CheckCircle}
              valueClassName="text-blue-500"
            />
            <KpiCard
              title="전체 전환율"
              value={`${overallRate.toFixed(1)}%`}
              description="방 생성 → 채팅 연결"
              icon={ArrowRight}
              valueClassName="text-primary"
            />
            <KpiCard
              title="최악 이탈 단계"
              value={data.worstStage ? STAGE_LABELS[data.worstStage] : '—'}
              description={`1턴 통과율 ${(turn1Rate * 100).toFixed(1)}%`}
              icon={AlertCircle}
              valueClassName="text-destructive"
            />
          </div>

          {stages.length === 0 ? (
            <AnalyticsEmpty height={300} title="퍼널 데이터가 없습니다" />
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm">교환일기 단계 퍼널</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    방 생성 기준 각 단계 도달자 수 및 전환율
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2 overflow-x-auto py-4">
                    {stages.map((stage, index) => {
                      const color = STAGE_COLORS[stage.stage];
                      const label = STAGE_LABELS[stage.stage];
                      return (
                        <div key={stage.stage} className="flex items-center">
                          <div
                            className="flex min-w-[110px] flex-col items-center rounded-lg p-4 shadow-sm"
                            style={{ backgroundColor: color + '33', border: `1.5px solid ${color}55` }}
                          >
                            <div
                              className="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {index + 1}
                            </div>
                            <span className="text-sm font-semibold text-foreground">{label}</span>
                            <span className="mt-1 text-xl font-bold text-foreground">
                              {stage.count.toLocaleString()}
                            </span>
                            <span className="mt-0.5 text-xs text-muted-foreground">
                              {((stage.rate ?? 0) * 100).toFixed(1)}%
                            </span>
                            <div
                              className="mt-2 rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: color + '22',
                                color: '#1d4ed8',
                              }}
                            >
                              이탈 {((stage.dropoffRate ?? 0) * 100).toFixed(1)}%
                            </div>
                          </div>
                          {index < stages.length - 1 && (
                            <ArrowRight className="mx-1.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    <span className="text-muted-foreground">방 생성</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-blue-600">
                      채팅 전환율 {overallRate.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">
                      ({chatCount.toLocaleString()} / {roomCount.toLocaleString()})
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">단계별 도달율 (vs ROOM_CREATED)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={conversionData} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="stage" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v.toFixed(1)}%`, '도달율']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                          {conversionData.map((entry) => (
                            <Cell key={entry.stageKey} fill={STAGE_COLORS[entry.stageKey]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">단계별 이탈율</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={conversionData} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="stage" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 9 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v.toFixed(1)}%`, '이탈율']}
                          contentStyle={TOOLTIP_STYLE}
                        />
                        <Bar dataKey="dropoff" fill="#ef4444" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
