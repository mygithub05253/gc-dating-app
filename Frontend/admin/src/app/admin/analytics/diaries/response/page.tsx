'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  Clock,
  Timer,
  AlertCircle,
  Zap,
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from 'recharts';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface HistogramBucket {
  range: string;
  count: number;
  rate: number;   // 전체 대비 비율 (%)
  colorKey: 'emerald' | 'blue' | 'amber' | 'red';
}

interface StatusPieItem {
  name: string;
  value: number;
  color: string;
}

interface HourlyPoint {
  hour: string;
  responseProb: number; // 0~100
}

interface TrendPoint {
  date: string;
  rate24h: number;
  rate48h: number;
}

interface SegmentPoint {
  segment: string;
  rate24h: number;
  rate48h: number;
}

// ─────────────────────────────────────────────
// 색상 팔레트
// ─────────────────────────────────────────────
const COLOR_MAP: Record<HistogramBucket['colorKey'], string> = {
  emerald: '#10b981',
  blue:    '#3b82f6',
  amber:   '#f59e0b',
  red:     '#ef4444',
};

// ─────────────────────────────────────────────
// Mock 데이터: 응답 시간 히스토그램 8구간
// ─────────────────────────────────────────────
const HISTOGRAM_DATA: HistogramBucket[] = [
  { range: '0–1h',    count: 1_440, rate: 18, colorKey: 'emerald' },
  { range: '1–3h',    count: 2_000, rate: 25, colorKey: 'emerald' },
  { range: '3–6h',    count: 1_760, rate: 22, colorKey: 'emerald' },
  { range: '6–12h',   count: 1_200, rate: 15, colorKey: 'blue'    },
  { range: '12–24h',  count:   800, rate: 10, colorKey: 'blue'    },
  { range: '24–36h',  count:   400, rate:  5, colorKey: 'amber'   },
  { range: '36–48h',  count:   240, rate:  3, colorKey: 'amber'   },
  { range: '48h+',    count:   160, rate:  2, colorKey: 'red'     },
];

// ─────────────────────────────────────────────
// Mock 데이터: 상태 분포 PieChart (완료/대기/만료)
// ─────────────────────────────────────────────
const STATUS_PIE: StatusPieItem[] = [
  { name: '완료',  value: 82, color: '#10b981' }, // emerald
  { name: '대기',  value: 12, color: '#3b82f6' }, // blue
  { name: '만료',  value:  6, color: '#ef4444' }, // red
];

// ─────────────────────────────────────────────
// Mock 데이터: 24시간 시간대별 응답 확률
// ─────────────────────────────────────────────
const HOURLY_DATA: HourlyPoint[] = [
  { hour: '00시', responseProb: 22 },
  { hour: '01시', responseProb: 15 },
  { hour: '02시', responseProb: 10 },
  { hour: '03시', responseProb:  8 },
  { hour: '04시', responseProb:  7 },
  { hour: '05시', responseProb:  9 },
  { hour: '06시', responseProb: 20 },
  { hour: '07시', responseProb: 38 },
  { hour: '08시', responseProb: 55 },
  { hour: '09시', responseProb: 72 },
  { hour: '10시', responseProb: 78 },
  { hour: '11시', responseProb: 80 },
  { hour: '12시', responseProb: 75 },
  { hour: '13시', responseProb: 70 },
  { hour: '14시', responseProb: 73 },
  { hour: '15시', responseProb: 76 },
  { hour: '16시', responseProb: 79 },
  { hour: '17시', responseProb: 82 },
  { hour: '18시', responseProb: 85 },
  { hour: '19시', responseProb: 88 },
  { hour: '20시', responseProb: 86 },
  { hour: '21시', responseProb: 83 },
  { hour: '22시', responseProb: 65 },
  { hour: '23시', responseProb: 42 },
];

// ─────────────────────────────────────────────
// Mock 데이터: 30일 응답률 추이
// ─────────────────────────────────────────────
const TREND_DATA: TrendPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, i + 1); // 2026-04-01 ~ 04-30
  const label = `${d.getMonth() + 1}/${d.getDate()}`;
  // 약간의 sine 변화로 자연스러운 곡선 생성
  const noise = Math.sin(i * 0.4) * 3;
  return {
    date:    label,
    rate24h: parseFloat((65 + noise + i * 0.3).toFixed(1)),
    rate48h: parseFloat((87 + noise * 0.5 + i * 0.15).toFixed(1)),
  };
});

// ─────────────────────────────────────────────
// Mock 데이터: 세그먼트별 응답률
// ─────────────────────────────────────────────
const SEGMENT_DATA: SegmentPoint[] = [
  { segment: '전체',   rate24h: 70.2, rate48h: 89.1 },
  { segment: '남성',   rate24h: 67.8, rate48h: 87.3 },
  { segment: '여성',   rate24h: 72.9, rate48h: 91.2 },
  { segment: '20대',   rate24h: 74.5, rate48h: 92.0 },
  { segment: '30대',   rate24h: 69.1, rate48h: 88.4 },
  { segment: '40대+',  rate24h: 62.3, rate48h: 83.7 },
];

// ─────────────────────────────────────────────
// KPI 상수
// ─────────────────────────────────────────────
const KPI_AVG_RESPONSE    = '8.3시간';
const KPI_24H_RATE        = '70.2%';
const KPI_EXPIRE_RATE     = '6.0%';
const KPI_MEDIAN_RESPONSE = '4.7시간';

// ─────────────────────────────────────────────
// 공통 Tooltip 스타일
// ─────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiaryResponsePage() {
  const [period, setPeriod]       = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /** CSV 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const header = '구간,응답 수,비율(%)';
    const rows = HISTOGRAM_DATA.map(
      (b) => `${b.range},${b.count},${b.rate}`,
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `diary_response_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="교환일기 응답률"
        description="교환일기 응답 시간·완료율·만료율 분석"
        actions={
          <>
            {/* 기간 토글 */}
            <div className="flex gap-1 rounded-md border border-border p-1">
              {(['7d', '30d', '90d'] as Period[]).map((p) => (
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
            {/* 새로고침 */}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw
                className={refreshing ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'}
              />
              새로고침
            </Button>
            {/* 다운로드 */}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </>
        }
      />

      {/* ── Mock 안내 ── */}
      <MockPageNotice
        description="GET /api/v2.2/admin/analytics/diaries/response 연결 예정 (exchange_diaries.status + created_at 차이)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="평균 응답 시간"
          value={KPI_AVG_RESPONSE}
          description="일기 수신 후 상대방 응답까지 평균 소요 시간"
          icon={Clock}
          trend={{ value: 0.8, isPositive: true, label: '전주 대비 단축' }}
        />
        <KpiCard
          title="24시간 내 응답률"
          value={KPI_24H_RATE}
          description="48시간 만료 기준, 24시간 내 응답 완료 비율"
          icon={Zap}
          trend={{ value: 1.2, isPositive: true, label: '전주 대비' }}
          valueClassName="text-emerald-500"
        />
        <KpiCard
          title="만료율"
          value={KPI_EXPIRE_RATE}
          description="48시간 내 미응답으로 만료된 교환일기 비율"
          icon={AlertCircle}
          trend={{ value: 0.3, isPositive: false, label: '전주 대비' }}
          valueClassName="text-destructive"
        />
        <KpiCard
          title="중앙값 응답 시간"
          value={KPI_MEDIAN_RESPONSE}
          description="응답 시간 중앙값 (평균보다 이상치 영향 적음)"
          icon={Timer}
          trend={{ value: 0.5, isPositive: true, label: '전주 대비 단축' }}
          valueClassName="text-primary"
        />
      </div>

      {/* ── 메인 차트: 응답 시간 히스토그램 BarChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">응답 시간 분포 히스토그램</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            exchange_diaries.created_at 차이 / 빨간 점선 = 목표 응답 24시간 기준선
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={HISTOGRAM_DATA}
              margin={{ top: 16, right: 24, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(v: number, _name: string) => [v.toLocaleString() + '건', '응답 수']}
                contentStyle={TOOLTIP_STYLE}
              />
              {/* 24시간 목표 응답 기준선: 6-12h 구간 바로 이후 */}
              <ReferenceLine
                x="12–24h"
                stroke="#ef4444"
                strokeDasharray="4 3"
                label={{ value: '24h 기준', position: 'top', fontSize: 10, fill: '#ef4444' }}
              />
              <Bar dataKey="count" name="응답 수" radius={[4, 4, 0, 0]}>
                {HISTOGRAM_DATA.map((entry, idx) => (
                  <Cell
                    key={`hist-${idx}`}
                    fill={COLOR_MAP[entry.colorKey]}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {[
              { color: COLOR_MAP.emerald, label: '6시간 미만 (빠름)' },
              { color: COLOR_MAP.blue,    label: '6–24시간 (정상)' },
              { color: COLOR_MAP.amber,   label: '24–48시간 (느림)' },
              { color: COLOR_MAP.red,     label: '48시간+ (만료 위험)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-6 rounded"
                  style={{ backgroundColor: color }}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개 (상태 분포 + 시간대별 응답 확률) ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">

        {/* 상태 분포 PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">교환일기 상태 분포</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              exchange_diary_reports.status 기준 완료·대기·만료 3종
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={STATUS_PIE}
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={40}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name} ${value}%`
                  }
                  labelLine={false}
                  fontSize={11}
                >
                  {STATUS_PIE.map((entry, idx) => (
                    <Cell key={`pie-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* 상태 범례 */}
            <div className="mt-1 flex justify-center gap-6 text-xs text-muted-foreground">
              {STATUS_PIE.map(({ name, color, value }) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span>
                    {name} <span className="font-medium text-foreground">{value}%</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 시간대별 응답 확률 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">시간대별 응답 확률 (24시간)</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              일기 수신 후 각 시간대에 응답할 확률 / KST 기준
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={HOURLY_DATA}
                margin={{ top: 4, right: 12, left: -20, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={3}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, '응답 확률']}
                  contentStyle={TOOLTIP_STYLE}
                />
                {/* 오전 9시 피크 기준선 */}
                <ReferenceLine
                  x="09시"
                  stroke="#10b981"
                  strokeDasharray="4 3"
                  label={{ value: '피크', position: 'top', fontSize: 9, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="responseProb"
                  name="응답 확률"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 30일 응답률 추이 LineChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">30일 응답률 추이</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            최근 30일 / 24시간 내 응답률 (emerald) + 48시간 내 응답률 (blue)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={TREND_DATA}
              margin={{ top: 4, right: 24, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                interval={4}
              />
              <YAxis
                domain={[55, 100]}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v}%`,
                  name === 'rate24h' ? '24h 응답률' : '48h 응답률',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconSize={10}
                formatter={(value: string) =>
                  value === 'rate24h' ? '24h 내 응답률' : '48h 내 응답률'
                }
              />
              <Line
                type="monotone"
                dataKey="rate24h"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="rate48h"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 세그먼트별 응답률 Grouped BarChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">세그먼트별 응답률 비교</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            성별·연령대별 24h / 48h 내 응답률 그룹 비교
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={SEGMENT_DATA}
              margin={{ top: 8, right: 24, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="segment"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v}%`,
                  name === 'rate24h' ? '24h 응답률' : '48h 응답률',
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconSize={10}
                formatter={(value: string) =>
                  value === 'rate24h' ? '24h 내 응답률' : '48h 내 응답률'
                }
              />
              <Bar
                dataKey="rate24h"
                name="rate24h"
                fill="#10b981"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="rate48h"
                name="rate48h"
                fill="#3b82f6"
                fillOpacity={0.85}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
