'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Brain, Target, FileText, Zap, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

// ─── 기간 필터 타입 ───────────────────────────────────────────
type PeriodFilter = '7d' | '30d' | '90d';

// ─── Mock: AI 분석 정확도 추이 (최근 14일) ───────────────────
const generateAccuracyTrend = () => {
  const today = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (13 - i));
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    return {
      date: label,
      // KcELECTRA 분류 정확도: 96~99%
      kcElectra: parseFloat((96 + Math.random() * 3).toFixed(1)),
      // KoSimCSE 매칭 정확도: 95~98%
      koSimCSE: parseFloat((95 + Math.random() * 3).toFixed(1)),
    };
  });
};
const MOCK_ACCURACY_TREND = generateAccuracyTrend();

// ─── Mock: 5종 태그 분포 PieChart ────────────────────────────
const MOCK_TAG_DISTRIBUTION = [
  { name: 'summary', value: 100, color: '#8b5cf6' },
  { name: 'category', value: 95, color: '#a78bfa' },
  { name: 'personality_tags', value: 82, color: '#3b82f6' },
  { name: 'emotion_tags', value: 91, color: '#ec4899' },
  { name: 'lifestyle_tags', value: 74, color: '#22c55e' },
  { name: 'tone_tags', value: 88, color: '#f59e0b' },
];

// ─── Mock: 매칭 점수 분포 BarChart (코사인 유사도 히스토그램) ─
const MOCK_MATCHING_SCORE_DIST = [
  { range: '0.0~0.1', count: 12 },
  { range: '0.1~0.2', count: 45 },
  { range: '0.2~0.3', count: 134 },
  { range: '0.3~0.4', count: 287 },
  { range: '0.4~0.5', count: 456 },
  { range: '0.5~0.6', count: 712 },
  { range: '0.6~0.7', count: 891 },
  { range: '0.7~0.8', count: 623 },
  { range: '0.8~0.9', count: 234 },
  { range: '0.9~1.0', count: 56 },
];

// ─── Mock: RadarChart (KcELECTRA vs KoBERT) ──────────────────
const MOCK_RADAR_DATA = [
  { axis: '정확도', kcElectra: 97, koBERT: 88 },
  { axis: '처리속도', kcElectra: 85, koBERT: 78 },
  { axis: '안정성', kcElectra: 92, koBERT: 85 },
  { axis: '메모리 효율', kcElectra: 88, koBERT: 82 },
  { axis: 'F1 score', kcElectra: 96, koBERT: 87 },
  { axis: '사용자 만족도', kcElectra: 91, koBERT: 79 },
];

// ─── Mock: 감정 태그 Top 10 ───────────────────────────────────
const MOCK_EMOTION_TOP10 = [
  { emotion: '행복', count: 4821 },
  { emotion: '감사', count: 4312 },
  { emotion: '평온', count: 3987 },
  { emotion: '사랑', count: 3654 },
  { emotion: '기쁨', count: 3201 },
  { emotion: '위로', count: 2876 },
  { emotion: '희망', count: 2543 },
  { emotion: '그리움', count: 2189 },
  { emotion: '안정', count: 1934 },
  { emotion: '감동', count: 1678 },
];

// ─── Mock: AI 처리 단계별 통계 테이블 ────────────────────────
const MOCK_PIPELINE_STATS = [
  { stage: '전처리', avgMs: 12, successRate: 99.8, errorRate: 0.2, dailyCount: 8450 },
  { stage: '모델 추론', avgMs: 187, successRate: 99.2, errorRate: 0.8, dailyCount: 8432 },
  { stage: '후처리', avgMs: 23, successRate: 99.7, errorRate: 0.3, dailyCount: 8365 },
  { stage: '저장', avgMs: 8, successRate: 99.9, errorRate: 0.1, dailyCount: 8358 },
];

// ─── Recharts 공통 Tooltip 스타일 ────────────────────────────
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
  const [period, setPeriod] = useState<PeriodFilter>('7d');

  const handleRefresh = () => {
    toast.success('AI 인사이트 데이터를 새로고침했습니다.');
  };

  const handleDownload = () => {
    toast.success('AI 인사이트 리포트를 다운로드합니다.');
  };

  return (
    <div>
      {/* ── 페이지 헤더 ── */}
      <PageHeader
        title="AI 인사이트"
        description="KcELECTRA 태그·KoSimCSE 매칭 점수·모델 성능 인사이트"
        actions={
          <div className="flex items-center gap-2">
            {/* 기간 토글 */}
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d', '30d', '90d'] as PeriodFilter[]).map((p) => (
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
            <Button variant="outline" size="sm" onClick={handleRefresh}>
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

      {/* ── Mock 안내 배너 ── */}
      <MockPageNotice
        description="GET /api/v2.2/admin/analytics/ai-insights 연결 예정 (KcELECTRA + KoSimCSE 분석 결과)"
      />

      {/* ── KPI 카드 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="AI 분석 정확도"
          value="97.4%"
          description="KcELECTRA 검증 셋 기준"
          icon={Brain}
          valueClassName="text-[#8b5cf6]"
          trend={{ value: 0.3, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="평균 매칭 점수"
          value="0.634"
          description="KoSimCSE 코사인 유사도"
          icon={Target}
          valueClassName="text-primary"
          trend={{ value: 1.2, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="분석 완료 일기"
          value="8,358"
          description="이번 주 처리 완료"
          icon={FileText}
          valueClassName="text-foreground"
          trend={{ value: 4.7, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="평균 처리 시간"
          value="230ms"
          description="전처리 → 저장 전체 파이프라인"
          icon={Zap}
          valueClassName="text-[#a78bfa]"
          trend={{ value: 2.1, isPositive: false, label: '전주 대비 증가' }}
        />
      </div>

      {/* ── 메인 차트: AI 분석 정확도 추이 LineChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>AI 분석 정확도 추이 (최근 14일)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={MOCK_ACCURACY_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                domain={[94, 100]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [
                  `${value}%`,
                  name === 'kcElectra' ? 'KcELECTRA 분류 정확도' : 'KoSimCSE 매칭 정확도',
                ]}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'kcElectra' ? 'KcELECTRA 분류 정확도' : 'KoSimCSE 매칭 정확도'
                }
              />
              <Line
                type="monotone"
                dataKey="kcElectra"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="koSimCSE"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개 ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 5종 태그 분포 PieChart */}
        <Card>
          <CardHeader>
            <CardTitle>5종 태그 추출률 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={MOCK_TAG_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name}: ${value}%`
                  }
                  labelLine={false}
                >
                  {MOCK_TAG_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`tag-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {MOCK_TAG_DISTRIBUTION.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 매칭 점수 분포 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle>KoSimCSE 매칭 점수 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MOCK_MATCHING_SCORE_DIST} margin={{ bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="range"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={9}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  angle={-35}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [`${value.toLocaleString()}건`, '매칭 수']}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  name="매칭 수"
                  fill="#8b5cf6"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 모델 성능 RadarChart + 감정 태그 Top10 BarChart ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* RadarChart: KcELECTRA vs KoBERT */}
        <Card>
          <CardHeader>
            <CardTitle>모델 성능 비교 — KcELECTRA vs KoBERT</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={MOCK_RADAR_DATA}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Radar
                  name="KcELECTRA"
                  dataKey="kcElectra"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                />
                <Radar
                  name="KoBERT (이전)"
                  dataKey="koBERT"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.2}
                />
                <Legend />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [`${value}점`, '']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 감정 태그 Top 10 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle>감정 태그 Top 10 사용 빈도</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={MOCK_EMOTION_TOP10}
                layout="vertical"
                margin={{ left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  dataKey="emotion"
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={48}
                />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value: number) => [`${value.toLocaleString()}회`, '사용 빈도']}
                />
                <Bar
                  dataKey="count"
                  fill="#a78bfa"
                  radius={[0, 4, 4, 0]}
                  name="사용 빈도"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── AI 처리 단계별 통계 테이블 ── */}
      <Card>
        <CardHeader>
          <CardTitle>AI 처리 단계별 파이프라인 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>단계</TableHead>
                <TableHead className="text-right">평균 시간 (ms)</TableHead>
                <TableHead className="text-right">성공률 (%)</TableHead>
                <TableHead className="text-right">에러율 (%)</TableHead>
                <TableHead className="text-right">일일 처리량</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PIPELINE_STATS.map((row) => (
                <TableRow key={row.stage}>
                  <TableCell className="font-medium">{row.stage}</TableCell>
                  <TableCell className="text-right font-mono-data tabular-nums">
                    {row.avgMs}
                  </TableCell>
                  <TableCell className="text-right font-mono-data tabular-nums text-success">
                    {row.successRate}
                  </TableCell>
                  <TableCell className="text-right font-mono-data tabular-nums text-destructive">
                    {row.errorRate}
                  </TableCell>
                  <TableCell className="text-right font-mono-data tabular-nums">
                    {row.dailyCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
