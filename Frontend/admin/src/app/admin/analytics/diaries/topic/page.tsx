'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  Lightbulb,
  TrendingUp,
  Crown,
  Grid,
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
} from 'recharts';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface TopicItem {
  rank: number;
  topic: string;
  category: string;
  exposureCount: number;
  responseCount: number;
  responseRate: number; // %
  avgLetterCount: number;
  isActive: boolean;
}

interface CategoryPieItem {
  name: string;
  value: number;
  color: string;
}

interface TrendPoint {
  week: string;
  [key: string]: string | number;
}

interface WeeklyRegistration {
  week: string;
  count: number;
}

// ─────────────────────────────────────────────
// 카테고리 10종 색상
// ─────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  일상:     '#3b82f6', // blue
  관심사:   '#8b5cf6', // violet
  가치관:   '#10b981', // emerald
  감정:     '#ec4899', // pink
  취향:     '#f59e0b', // amber
  경험:     '#06b6d4', // cyan
  계획:     '#6366f1', // indigo
  회고:     '#84cc16', // lime
  관계:     '#f97316', // orange
  자기성찰: '#14b8a6', // teal
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

// ─────────────────────────────────────────────
// Mock 데이터: 주제 Top 20 (응답률 내림차순)
// ─────────────────────────────────────────────
const TOPIC_TABLE: TopicItem[] = [
  { rank:  1, topic: '오늘 있었던 감동적인 순간',    category: '감정',   exposureCount: 4820, responseCount: 4097, responseRate: 85.0, avgLetterCount: 312, isActive: true  },
  { rank:  2, topic: '기억에 남는 여행 이야기',       category: '경험',   exposureCount: 4610, responseCount: 3765, responseRate: 81.7, avgLetterCount: 348, isActive: true  },
  { rank:  3, topic: '좋아하는 음악과 그 추억',       category: '취향',   exposureCount: 4490, responseCount: 3565, responseRate: 79.4, avgLetterCount: 287, isActive: true  },
  { rank:  4, topic: '나만의 스트레스 해소법',        category: '일상',   exposureCount: 4330, responseCount: 3381, responseRate: 78.1, avgLetterCount: 261, isActive: true  },
  { rank:  5, topic: '가장 행복했던 순간',            category: '감정',   exposureCount: 4200, responseCount: 3192, responseRate: 76.0, avgLetterCount: 295, isActive: true  },
  { rank:  6, topic: '인생에서 가장 소중한 것',       category: '가치관', exposureCount: 4150, responseCount: 3054, responseRate: 73.6, avgLetterCount: 331, isActive: true  },
  { rank:  7, topic: '감사한 사람 이야기',            category: '관계',   exposureCount: 4080, responseCount: 2935, responseRate: 71.9, avgLetterCount: 278, isActive: true  },
  { rank:  8, topic: '인생 책 한 권',                 category: '관심사', exposureCount: 3990, responseCount: 2793, responseRate: 70.0, avgLetterCount: 310, isActive: true  },
  { rank:  9, topic: '이번 주말 계획',                category: '계획',   exposureCount: 3870, responseCount: 2631, responseRate: 68.0, avgLetterCount: 219, isActive: true  },
  { rank: 10, topic: '요즘 빠져 있는 취미',           category: '관심사', exposureCount: 3750, responseCount: 2475, responseRate: 66.0, avgLetterCount: 244, isActive: true  },
  { rank: 11, topic: '10년 후 나의 모습',             category: '계획',   exposureCount: 3620, responseCount: 2329, responseRate: 64.3, avgLetterCount: 352, isActive: true  },
  { rank: 12, topic: '나를 설명하는 단어 3가지',      category: '자기성찰', exposureCount: 3510, responseCount: 2195, responseRate: 62.5, avgLetterCount: 198, isActive: true  },
  { rank: 13, topic: '최근 새롭게 도전한 일',         category: '경험',   exposureCount: 3430, responseCount: 2089, responseRate: 60.9, avgLetterCount: 271, isActive: true  },
  { rank: 14, topic: '나에게 위로가 되는 것',         category: '감정',   exposureCount: 3310, responseCount: 1920, responseRate: 58.0, avgLetterCount: 265, isActive: true  },
  { rank: 15, topic: '오늘 식사와 감상',              category: '일상',   exposureCount: 3200, responseCount: 1792, responseRate: 56.0, avgLetterCount: 187, isActive: false },
  { rank: 16, topic: '친구에게 받은 가장 좋은 조언',  category: '관계',   exposureCount: 3100, responseCount: 1674, responseRate: 54.0, avgLetterCount: 243, isActive: true  },
  { rank: 17, topic: '어릴 때 꿈과 현재',             category: '회고',   exposureCount: 3010, responseCount: 1565, responseRate: 52.0, avgLetterCount: 318, isActive: true  },
  { rank: 18, topic: '내가 아끼는 물건 이야기',       category: '취향',   exposureCount: 2890, responseCount: 1417, responseRate: 49.0, avgLetterCount: 231, isActive: true  },
  { rank: 19, topic: '지난 한 달 나에게 준 선물',     category: '자기성찰', exposureCount: 2750, responseCount: 1265, responseRate: 46.0, avgLetterCount: 209, isActive: false },
  { rank: 20, topic: '새벽에 드는 생각',              category: '회고',   exposureCount: 2610, responseCount: 1087, responseRate: 41.7, avgLetterCount: 267, isActive: true  },
];

// ─────────────────────────────────────────────
// Mock 데이터: BarChart용 Top 20 (가로)
// ─────────────────────────────────────────────
const BAR_DATA = [...TOPIC_TABLE]
  .sort((a, b) => a.responseRate - b.responseRate) // 가로 BarChart는 오름차순이 자연스럽게 위에 높은 값
  .map((t) => ({
    topic: t.topic.length > 14 ? t.topic.slice(0, 13) + '…' : t.topic,
    responseRate: t.responseRate,
    category: t.category,
  }));

// ─────────────────────────────────────────────
// Mock 데이터: 카테고리별 PieChart (10개 합=100)
// ─────────────────────────────────────────────
const PIE_DATA: CategoryPieItem[] = [
  { name: '감정',     value: 14.2, color: CATEGORY_COLORS['감정']     },
  { name: '경험',     value: 12.8, color: CATEGORY_COLORS['경험']     },
  { name: '관심사',   value: 12.3, color: CATEGORY_COLORS['관심사']   },
  { name: '일상',     value: 11.7, color: CATEGORY_COLORS['일상']     },
  { name: '가치관',   value: 10.9, color: CATEGORY_COLORS['가치관']   },
  { name: '관계',     value: 10.1, color: CATEGORY_COLORS['관계']     },
  { name: '계획',     value:  9.4, color: CATEGORY_COLORS['계획']     },
  { name: '자기성찰', value:  8.3, color: CATEGORY_COLORS['자기성찰'] },
  { name: '취향',     value:  5.9, color: CATEGORY_COLORS['취향']     },
  { name: '회고',     value:  4.4, color: CATEGORY_COLORS['회고']     },
];

// ─────────────────────────────────────────────
// Mock 데이터: Top 5 주제 4주 트렌드 LineChart
// ─────────────────────────────────────────────
const TOP5_KEYS = [
  '감동적인 순간',
  '여행 이야기',
  '음악과 추억',
  '스트레스 해소',
  '행복한 순간',
];

const TOP5_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const TREND_DATA: TrendPoint[] = [
  { week: '4주 전', '감동적인 순간': 78.2, '여행 이야기': 74.1, '음악과 추억': 72.5, '스트레스 해소': 71.3, '행복한 순간': 70.8 },
  { week: '3주 전', '감동적인 순간': 80.5, '여행 이야기': 77.2, '음악과 추억': 75.8, '스트레스 해소': 74.0, '행복한 순간': 72.1 },
  { week: '2주 전', '감동적인 순간': 82.1, '여행 이야기': 79.8, '음악과 추억': 77.3, '스트레스 해소': 75.9, '행복한 순간': 74.5 },
  { week: '이번 주', '감동적인 순간': 85.0, '여행 이야기': 81.7, '음악과 추억': 79.4, '스트레스 해소': 78.1, '행복한 순간': 76.0 },
];

// ─────────────────────────────────────────────
// Mock 데이터: 8주 신규 주제 등록 수
// ─────────────────────────────────────────────
const WEEKLY_REG: WeeklyRegistration[] = [
  { week: '8주 전', count: 3 },
  { week: '7주 전', count: 5 },
  { week: '6주 전', count: 4 },
  { week: '5주 전', count: 3 },
  { week: '4주 전', count: 6 },
  { week: '3주 전', count: 4 },
  { week: '2주 전', count: 5 },
  { week: '이번 주', count: 3 },
];

// ─────────────────────────────────────────────
// KPI 계산
// ─────────────────────────────────────────────
const ACTIVE_TOPIC_COUNT = TOPIC_TABLE.filter((t) => t.isActive).length;
const AVG_RESPONSE_RATE  = Math.round(
  TOPIC_TABLE.reduce((s, t) => s + t.responseRate, 0) / TOPIC_TABLE.length * 10,
) / 10;
const TOP1_TOPIC = TOPIC_TABLE[0].topic;
const CATEGORY_COUNT = CATEGORIES.length;

// ─────────────────────────────────────────────
// 공통 Tooltip 스타일
// ─────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

// 응답률에 따른 바 색상 분기
function barColor(rate: number): string {
  if (rate >= 60) return '#10b981'; // emerald
  if (rate >= 30) return '#3b82f6'; // blue
  return '#f59e0b';                 // amber
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiaryTopicPage() {
  const [period, setPeriod]       = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /** CSV 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const header = '순위,주제명,카테고리,노출 수,응답 수,응답률(%),평균 글자 수,활성';
    const rows = TOPIC_TABLE.map(
      (t) =>
        `${t.rank},"${t.topic}",${t.category},${t.exposureCount},${t.responseCount},${t.responseRate},${t.avgLetterCount},${t.isActive ? '활성' : '비활성'}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `diary_topic_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="일기 주제 참여율"
        description="랜덤 주제·AI 카테고리별 응답률·인기도 분석"
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
        description="GET /api/v2.2/admin/analytics/diaries/topic 연결 예정 (diary_topic_responses 집계)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="총 주제 수 (활성)"
          value={ACTIVE_TOPIC_COUNT}
          description="현재 노출 중인 랜덤 주제 수"
          icon={Lightbulb}
          trend={{ value: 2, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="평균 응답률"
          value={`${AVG_RESPONSE_RATE}%`}
          description="Top 20 주제 전체 평균 응답률"
          icon={TrendingUp}
          trend={{ value: 1.3, isPositive: true, label: '전주 대비' }}
          valueClassName="text-primary"
        />
        <KpiCard
          title="Top 1 주제"
          value="감동적인 순간"
          description={TOP1_TOPIC}
          icon={Crown}
          valueClassName="text-[#f59e0b] text-2xl"
        />
        <KpiCard
          title="카테고리 수"
          value={`${CATEGORY_COUNT}`}
          description="AI 카테고리 분류 종수"
          icon={Grid}
          trend={{ value: 0, isPositive: true, label: '변동 없음' }}
        />
      </div>

      {/* ── 메인 차트: 주제별 응답률 가로 BarChart Top 20 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">주제별 응답률 Top 20 — 가로 막대</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            diary_topic_responses 집계 / 60%+ emerald, 30%+ blue, 미만 amber
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={520}>
            <BarChart
              data={BAR_DATA}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 16, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="topic"
                width={100}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(v: number) => [`${v}%`, '응답률']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="responseRate" name="응답률" radius={[0, 4, 4, 0]}>
                {BAR_DATA.map((entry, idx) => (
                  <Cell key={`bar-${idx}`} fill={barColor(entry.responseRate)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {[
              { color: '#10b981', label: '60% 이상 (높음)' },
              { color: '#3b82f6', label: '30~60% (보통)' },
              { color: '#f59e0b', label: '30% 미만 (낮음)' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개 ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">

        {/* AI 카테고리별 PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI 카테고리별 응답 분포</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              KcELECTRA category 필드 기준 10종 분류
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name} ${value}%`
                  }
                  labelLine={false}
                  fontSize={10}
                >
                  {PIE_DATA.map((entry, idx) => (
                    <Cell key={`pie-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* 카테고리 색 범례 */}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {PIE_DATA.map(({ name, color }) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 주제 인기도 추이 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 5 주제 인기도 추이 (4주)</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              주차별 응답률 변화 / 상위 5개 주제
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={TREND_DATA}
                margin={{ top: 4, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  domain={[60, 90]}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} iconSize={10} />
                {TOP5_KEYS.map((key, idx) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={TOP5_COLORS[idx]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 주제 상세 테이블 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">주제 상세 현황 (Top 20)</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            응답률 내림차순 / category = KcELECTRA AI 분류 결과
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">주제명</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">카테고리</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">노출 수</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">응답 수</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">응답률</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">평균 글자</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">활성</th>
              </tr>
            </thead>
            <tbody>
              {TOPIC_TABLE.map((row) => (
                <tr
                  key={row.rank}
                  className="border-b border-border transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 text-muted-foreground font-mono-data">
                    {row.rank}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground max-w-[220px]">
                    {row.topic}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        borderColor: CATEGORY_COLORS[row.category],
                        color: CATEGORY_COLORS[row.category],
                      }}
                    >
                      {row.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground font-mono-data">
                    {row.exposureCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground font-mono-data">
                    {row.responseCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-data font-medium"
                    style={{ color: barColor(row.responseRate) }}
                  >
                    {row.responseRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground font-mono-data">
                    {row.avgLetterCount}자
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge
                      variant={row.isActive ? 'default' : 'secondary'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {row.isActive ? '활성' : '비활성'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── 주제 등록 이력 BarChart (최근 8주) ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">주제 등록 이력 (최근 8주)</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            관리자 콘텐츠 관리에서 신규 등록된 주제 수 / 주당 평균 3~5개
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={WEEKLY_REG}
              margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
              />
              <Tooltip
                formatter={(v: number) => [`${v}개`, '신규 등록']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="count"
                name="신규 등록"
                fill="#3b82f6"
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
