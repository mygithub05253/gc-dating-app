'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  MessageCircle,
  CheckCircle,
  ArrowRight,
  Clock,
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
  LineChart,
  Line,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface TurnStage {
  turn: number;         // 1~7턴
  label: string;        // "1턴"
  survivors: number;    // 생존자 수
  nextRate: number | null; // 다음 턴 전환율 (%), 7턴은 null → 완주율 표시
  bgColor: string;      // 카드 배경색 (그라디언트)
}

interface TurnConversion {
  label: string;   // "1→2"
  rate: number;    // 전환율 (%)
}

interface TurnResponseTime {
  turn: string;    // "1턴"
  hours: number;   // 평균 응답 시간 (h)
}

interface CompletionTrend {
  date: string;
  rate: number;    // 7턴 완주율 (%)
}

interface DropoffReason {
  turn: string;
  dropCount: number;
  mainReason: string;
  reactivationRate: number; // 재활성화 비율 (%)
}

interface SegmentCompletion {
  segment: string;
  rate: number;   // 7턴 완주율 (%)
}

// ─────────────────────────────────────────────
// 7턴 그라디언트 색상
// ─────────────────────────────────────────────
const TURN_COLORS = [
  '#3b82f6', // 1턴 — 가장 진한 파란
  '#4b90f7',
  '#5e9df8',
  '#72aaf9',
  '#88b8fa',
  '#a0c6fb',
  '#eff6ff', // 7턴 — 가장 연한 파란
];

// ─────────────────────────────────────────────
// Mock 데이터: 7턴 생존자 퍼널
// ─────────────────────────────────────────────
const FUNNEL_DATA: TurnStage[] = [
  { turn: 1, label: '1턴', survivors: 2100, nextRate: 80, bgColor: TURN_COLORS[0] },
  { turn: 2, label: '2턴', survivors: 1680, nextRate: 82, bgColor: TURN_COLORS[1] },
  { turn: 3, label: '3턴', survivors: 1378, nextRate: 81, bgColor: TURN_COLORS[2] },
  { turn: 4, label: '4턴', survivors: 1116, nextRate: 82, bgColor: TURN_COLORS[3] },
  { turn: 5, label: '5턴', survivors:  915, nextRate: 83, bgColor: TURN_COLORS[4] },
  { turn: 6, label: '6턴', survivors:  759, nextRate: 88, bgColor: TURN_COLORS[5] },
  { turn: 7, label: '7턴', survivors:  668, nextRate: null, bgColor: TURN_COLORS[6] },
];

// ─────────────────────────────────────────────
// Mock 데이터: 턴별 전환율 BarChart (7개 전환)
// ─────────────────────────────────────────────
const CONVERSION_DATA: TurnConversion[] = [
  { label: '1→2', rate: 80 },
  { label: '2→3', rate: 82 },
  { label: '3→4', rate: 81 },
  { label: '4→5', rate: 82 },
  { label: '5→6', rate: 83 },
  { label: '6→7', rate: 88 },
  { label: '7→완료', rate: 89 },
];

// ─────────────────────────────────────────────
// Mock 데이터: 턴별 평균 응답 시간 (h)
// ─────────────────────────────────────────────
const RESPONSE_TIME_DATA: TurnResponseTime[] = [
  { turn: '1턴',  hours:  3.0 },
  { turn: '2턴',  hours:  5.2 },
  { turn: '3턴',  hours:  6.8 },
  { turn: '4턴',  hours:  7.5 },
  { turn: '5턴',  hours:  9.1 },
  { turn: '6턴',  hours: 10.4 },
  { turn: '7턴',  hours: 12.0 },
];

// ─────────────────────────────────────────────
// Mock 데이터: 30일 7턴 완주율 추이
// ─────────────────────────────────────────────
const COMPLETION_TREND: CompletionTrend[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 3, i + 1); // 2026-04-01 ~ 04-30
  const label = `${d.getMonth() + 1}/${d.getDate()}`;
  const noise = Math.sin(i * 0.45) * 2.5;
  return {
    date: label,
    rate: parseFloat((31.5 + noise + i * 0.08).toFixed(1)),
  };
});

// ─────────────────────────────────────────────
// Mock 데이터: 턴별 이탈 사유 테이블
// ─────────────────────────────────────────────
const DROPOFF_TABLE: DropoffReason[] = [
  { turn: '1턴', dropCount: 420, mainReason: '초반 관심 부족',     reactivationRate:  8.2 },
  { turn: '2턴', dropCount: 302, mainReason: '주제 맞지 않음',     reactivationRate: 11.4 },
  { turn: '3턴', dropCount: 262, mainReason: '응답 지연 후 포기',  reactivationRate: 13.1 },
  { turn: '4턴', dropCount: 201, mainReason: '시간 부족',          reactivationRate: 15.7 },
  { turn: '5턴', dropCount: 156, mainReason: '글쓰기 피로감',      reactivationRate: 18.2 },
  { turn: '6턴', dropCount:  91, mainReason: '마지막 단계 부담',   reactivationRate: 22.5 },
  { turn: '7턴', dropCount:  0,  mainReason: '—',                  reactivationRate:  0.0 },
];

// ─────────────────────────────────────────────
// Mock 데이터: 세그먼트별 7턴 완주율
// ─────────────────────────────────────────────
const SEGMENT_DATA: SegmentCompletion[] = [
  { segment: '전체',   rate: 31.8 },
  { segment: '남성',   rate: 29.4 },
  { segment: '여성',   rate: 34.2 },
  { segment: '20대',   rate: 35.6 },
  { segment: '30대',   rate: 30.7 },
  { segment: '40대+',  rate: 26.1 },
];

// ─────────────────────────────────────────────
// KPI 상수
// ─────────────────────────────────────────────
const KPI_AVG_TURN      = '4.2턴';
const KPI_COMPLETION    = '32%';
const KPI_FIRST_CONVERT = '80%';
const KPI_AVG_DURATION  = '8.3일';

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
export default function TurnFunnelPage() {
  const [period, setPeriod]         = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
    toast.success('데이터를 새로고침했습니다.');
  };

  /** CSV 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const header = '턴,생존자 수,다음 턴 전환율(%)';
    const rows   = FUNNEL_DATA.map(
      (s) => `${s.label},${s.survivors},${s.nextRate ?? '완주'}`,
    );
    const csv  = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `turn_funnel_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('턴 퍼널 리포트를 다운로드합니다.');
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="교환일기 턴 퍼널"
        description="1턴~7턴 교환 완주율·이탈 패턴 분석"
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
        description="GET /api/v2.2/admin/analytics/diaries/turn-funnel 연결 예정 (exchange_diaries 턴별 집계)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="평균 완주 턴 수"
          value={KPI_AVG_TURN}
          description="교환일기 1건당 평균 도달 턴 수"
          icon={MessageCircle}
          trend={{ value: 0.3, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="7턴 완주율"
          value={KPI_COMPLETION}
          description="교환일기 시작 후 7턴까지 완료한 비율"
          icon={CheckCircle}
          trend={{ value: 1.1, isPositive: true, label: '전주 대비' }}
          valueClassName="text-blue-500"
        />
        <KpiCard
          title="1→2턴 전환율"
          value={KPI_FIRST_CONVERT}
          description="첫 턴 이후 두 번째 턴으로 이어지는 가장 중요한 초기 전환율"
          icon={ArrowRight}
          trend={{ value: 0.5, isPositive: false, label: '전주 대비' }}
          valueClassName="text-primary"
        />
        <KpiCard
          title="평균 전체 소요 시간"
          value={KPI_AVG_DURATION}
          description="교환일기 시작 → 7턴 완주까지 평균 소요 일수"
          icon={Clock}
          trend={{ value: 0.2, isPositive: true, label: '전주 대비 단축' }}
        />
      </div>

      {/* ── 메인 시각화: 7턴 퍼널 가로 카드 흐름 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">7턴 교환일기 퍼널</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            1턴 시작 기준 각 턴별 생존자 수 및 다음 턴 전환율
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-4">
            {FUNNEL_DATA.map((stage, index) => (
              <div key={stage.turn} className="flex items-center">
                {/* 턴 카드 */}
                <div
                  className="flex min-w-[110px] flex-col items-center rounded-lg p-4 shadow-sm"
                  style={{ backgroundColor: stage.bgColor + '33', border: `1.5px solid ${stage.bgColor}55` }}
                >
                  {/* 턴 번호 배지 */}
                  <div
                    className="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: stage.bgColor }}
                  >
                    {stage.turn}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                  <span className="mt-1 text-xl font-bold text-foreground">
                    {stage.survivors.toLocaleString()}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {((stage.survivors / FUNNEL_DATA[0].survivors) * 100).toFixed(1)}%
                  </span>
                  {/* 다음 턴 전환율 또는 완주 라벨 */}
                  <div
                    className="mt-2 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: stage.bgColor + '22',
                      color: stage.turn <= 3 ? '#1d4ed8' : '#1e40af',
                    }}
                  >
                    {stage.nextRate !== null ? `→ ${stage.nextRate}%` : '완주'}
                  </div>
                </div>
                {/* 화살표 */}
                {index < FUNNEL_DATA.length - 1 && (
                  <ArrowRight className="mx-1.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          {/* 전체 완주율 요약 */}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">1턴 시작</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-blue-600">
              7턴 완주율 {((FUNNEL_DATA[6].survivors / FUNNEL_DATA[0].survivors) * 100).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              ({FUNNEL_DATA[6].survivors.toLocaleString()} / {FUNNEL_DATA[0].survivors.toLocaleString()})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개 ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">

        {/* 턴별 전환율 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">턴별 전환율</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              각 턴에서 다음 단계로 넘어가는 전환율 (1→2 ~ 7→완료)
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={CONVERSION_DATA}
                margin={{ top: 8, right: 16, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[70, 100]}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, '전환율']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="rate" name="전환율" fill="#3b82f6" fillOpacity={0.85} radius={[4, 4, 0, 0]}>
                  {CONVERSION_DATA.map((entry, idx) => (
                    <rect
                      key={`bar-${idx}`}
                      style={{ fill: TURN_COLORS[Math.min(idx, TURN_COLORS.length - 1)] }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 턴별 평균 응답 시간 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">턴별 평균 응답 시간</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              각 턴에서 상대방이 일기를 작성하기까지 걸리는 평균 시간 (시간 단위)
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={RESPONSE_TIME_DATA}
                margin={{ top: 8, right: 16, left: -8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="turn"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[0, 16]}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v}h`}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}시간`, '평균 응답 시간']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  name="평균 응답 시간"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 30일 7턴 완주율 추이 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">30일 7턴 완주율 추이</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            최근 30일 기준 7턴 완주율 일별 변화 (exchange_diaries 완료 집계)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={COMPLETION_TREND}
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
                domain={[25, 40]}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`, '7턴 완주율']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Line
                type="monotone"
                dataKey="rate"
                name="7턴 완주율"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 턴별 이탈 사유 테이블 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">턴별 이탈 사유 분석</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            각 턴에서 발생한 이탈 건수·주요 사유·재활성화 비율
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-4 text-left font-medium">턴</th>
                  <th className="py-2 pr-4 text-right font-medium">이탈 수</th>
                  <th className="py-2 pr-4 text-left font-medium">주요 이탈 사유</th>
                  <th className="py-2 text-right font-medium">재활성화 비율</th>
                </tr>
              </thead>
              <tbody>
                {DROPOFF_TABLE.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 text-sm last:border-0 hover:bg-accent/30"
                  >
                    {/* 턴 번호 — 색상 배지 */}
                    <td className="py-2.5 pr-4">
                      <span
                        className="inline-flex h-6 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: TURN_COLORS[idx] ?? '#eff6ff', color: idx >= 5 ? '#1d4ed8' : '#fff' }}
                      >
                        {row.turn}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium">
                      {row.dropCount > 0 ? row.dropCount.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{row.mainReason}</td>
                    <td className="py-2.5 text-right">
                      {row.reactivationRate > 0 ? (
                        <span className="font-medium text-blue-600">{row.reactivationRate}%</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 세그먼트별 7턴 완주율 BarChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">세그먼트별 7턴 완주율</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            성별·연령대별 7턴 완주율 비교 (전체 기준)
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
                domain={[0, 45]}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`, '7턴 완주율']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconSize={10}
                formatter={() => '7턴 완주율'}
              />
              <Bar
                dataKey="rate"
                name="7턴 완주율"
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
