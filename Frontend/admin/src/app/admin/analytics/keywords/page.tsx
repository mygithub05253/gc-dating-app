'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import KpiCard from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp, Repeat, Sparkles, RefreshCw, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

// ─── 기간 필터 타입 ───────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

// ─── 카테고리 색상 팔레트 ─────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  감정: '#3b82f6',
  일상: '#60a5fa',
  관심사: '#93c5fd',
  가치관: '#bfdbfe',
  취향: '#dbeafe',
};

// ─── Mock: 키워드 Top 30 ──────────────────────────────────────
const MOCK_KEYWORDS = [
  { rank: 1,  keyword: '운동',   category: '일상',  frequency: 1547, changeRate: +12.3 },
  { rank: 2,  keyword: '독서',   category: '취향',  frequency: 1382, changeRate: +8.1  },
  { rank: 3,  keyword: '여행',   category: '관심사', frequency: 1290, changeRate: +15.7 },
  { rank: 4,  keyword: '카페',   category: '일상',  frequency: 1175, changeRate: -2.4  },
  { rank: 5,  keyword: '영화',   category: '취향',  frequency: 1098, changeRate: +5.0  },
  { rank: 6,  keyword: '음악',   category: '취향',  frequency: 1043, changeRate: +9.2  },
  { rank: 7,  keyword: '요리',   category: '관심사', frequency: 987,  changeRate: +3.8  },
  { rank: 8,  keyword: '산책',   category: '일상',  frequency: 934,  changeRate: -1.1  },
  { rank: 9,  keyword: '친구',   category: '일상',  frequency: 891,  changeRate: +6.5  },
  { rank: 10, keyword: '가족',   category: '가치관', frequency: 856,  changeRate: +4.2  },
  { rank: 11, keyword: '글쓰기', category: '관심사', frequency: 812,  changeRate: +18.4 },
  { rank: 12, keyword: '일',     category: '일상',  frequency: 778,  changeRate: -3.6  },
  { rank: 13, keyword: '공부',   category: '일상',  frequency: 743,  changeRate: +2.1  },
  { rank: 14, keyword: '감사',   category: '감정',  frequency: 712,  changeRate: +11.0 },
  { rank: 15, keyword: '행복',   category: '감정',  frequency: 689,  changeRate: +7.3  },
  { rank: 16, keyword: '건강',   category: '가치관', frequency: 651,  changeRate: +14.6 },
  { rank: 17, keyword: '성장',   category: '가치관', frequency: 623,  changeRate: +20.1 },
  { rank: 18, keyword: '자연',   category: '관심사', frequency: 598,  changeRate: -0.8  },
  { rank: 19, keyword: '예술',   category: '취향',  frequency: 572,  changeRate: +9.9  },
  { rank: 20, keyword: '기술',   category: '관심사', frequency: 548,  changeRate: +16.3 },
  { rank: 21, keyword: '명상',   category: '가치관', frequency: 521,  changeRate: +22.5 },
  { rank: 22, keyword: '게임',   category: '취향',  frequency: 498,  changeRate: -4.2  },
  { rank: 23, keyword: '드라마', category: '취향',  frequency: 476,  changeRate: +1.7  },
  { rank: 24, keyword: '사랑',   category: '감정',  frequency: 453,  changeRate: +8.8  },
  { rank: 25, keyword: '설레임', category: '감정',  frequency: 431,  changeRate: +13.4 },
  { rank: 26, keyword: '봉사',   category: '가치관', frequency: 408,  changeRate: +5.9  },
  { rank: 27, keyword: '카메라', category: '관심사', frequency: 389,  changeRate: +7.1  },
  { rank: 28, keyword: '반려동물', category: '일상', frequency: 372,  changeRate: +19.8 },
  { rank: 29, keyword: '뮤지컬', category: '취향',  frequency: 354,  changeRate: -1.5  },
  { rank: 30, keyword: '등산',   category: '관심사', frequency: 341,  changeRate: +10.2 },
];

// ─── Mock: BarChart Top 20 ────────────────────────────────────
const BAR_DATA = MOCK_KEYWORDS.slice(0, 20).map(k => ({
  keyword: k.keyword,
  빈도: k.frequency,
}));

// ─── Mock: 카테고리 분포 PieChart ─────────────────────────────
const PIE_DATA = Object.entries(
  MOCK_KEYWORDS.reduce<Record<string, number>>((acc, k) => {
    acc[k.category] = (acc[k.category] ?? 0) + k.frequency;
    return acc;
  }, {}),
).map(([name, value]) => ({ name, value }));

// ─── Mock: 트렌드 LineChart (최근 7일 Top 5) ─────────────────
const TREND_DATES = ['04-18', '04-19', '04-20', '04-21', '04-22', '04-23', '04-24'];
const TOP5_KEYWORDS = ['운동', '독서', '여행', '카페', '영화'];

const TREND_LINE_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8'];

const MOCK_TREND_DATA = TREND_DATES.map((date, i) => {
  const base = [1547, 1382, 1290, 1175, 1098];
  const noise = [
    [0, -30, 20, -10, 40, 15, -5],
    [0, 10, -20, 30, -5, 25, -15],
    [0, 20, 10, -30, 50, -10, 35],
    [0, -15, 5, 20, -25, 10, -5],
    [0, 5, -10, 15, 20, -8, 12],
  ];
  return {
    date,
    ...Object.fromEntries(TOP5_KEYWORDS.map((kw, ki) => [kw, base[ki] + noise[ki][i]])),
  };
});

// ─── KPI 상수 ─────────────────────────────────────────────────
const TOTAL_KEYWORDS = MOCK_KEYWORDS.length;
const TOP1_KEYWORD = MOCK_KEYWORDS[0].keyword;
const AVG_FREQUENCY = Math.round(
  MOCK_KEYWORDS.reduce((s, k) => s + k.frequency, 0) / MOCK_KEYWORDS.length,
);
const NEW_KEYWORDS_THIS_WEEK = 7;

// ─── 페이지 컴포넌트 ──────────────────────────────────────────
export default function KeywordsAnalysisPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const handleRefresh = () => {
    toast.success('키워드 데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('키워드 분석 리포트를 다운로드합니다.');
  };

  const periodLabel: Record<Period, string> = { '7d': '7일', '30d': '30일', '90d': '90일' };

  return (
    <div>
      <PageHeader
        title="키워드 분석"
        description="일기/프로필 키워드 트렌드 및 인기도 분석"
        actions={
          <div className="flex flex-wrap gap-2">
            {/* 기간 토글 */}
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {periodLabel[p]}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              새로고침
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </div>
        }
      />

      {/* Mock 안내 배너 */}
      <MockPageNotice description="GET /api/v2.2/admin/analytics/keywords 연결 예정" />

      {/* KPI 카드 4개 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="총 키워드 수"
          value={TOTAL_KEYWORDS}
          description={`${periodLabel[period]} 집계 기준`}
          icon={Hash}
          trend={{ value: 3, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="Top 1 키워드"
          value={TOP1_KEYWORD}
          description={`빈도 ${MOCK_KEYWORDS[0].frequency.toLocaleString()}회`}
          icon={TrendingUp}
          trend={{ value: 12.3, isPositive: true, label: '전주 대비' }}
          valueClassName="text-primary"
        />
        <KpiCard
          title="평균 사용 빈도"
          value={AVG_FREQUENCY}
          description="키워드 1개당 평균 사용 횟수"
          icon={Repeat}
          trend={{ value: 5.8, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="신규 키워드(이번 주)"
          value={NEW_KEYWORDS_THIS_WEEK}
          description="처음 등장한 키워드"
          icon={Sparkles}
          trend={{ value: 2, isPositive: true, label: '전주 대비' }}
          valueClassName="text-success"
        />
      </div>

      {/* 메인 차트: 키워드 빈도 BarChart Top 20 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>키워드 빈도 Top 20 (가로 막대)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={520}>
            <BarChart
              data={BAR_DATA}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 56, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis
                type="number"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <YAxis
                type="category"
                dataKey="keyword"
                stroke="#6b7280"
                fontSize={12}
                width={52}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number) => [value.toLocaleString() + '회', '사용 빈도']}
              />
              <Bar dataKey="빈도" radius={[0, 4, 4, 0]}>
                {BAR_DATA.map((_, index) => {
                  // 순위에 따라 파란 계열 그라데이션 색상 적용
                  const colors = [
                    '#3b82f6', '#4589f7', '#5093f8', '#5a9df9', '#60a5fa',
                    '#6aaefb', '#74b7fc', '#7ec0fd', '#88c9fe', '#93c5fd',
                    '#9dcefe', '#a7d7ff', '#b1e0ff', '#bce9ff', '#bfdbfe',
                    '#c9e4ff', '#d3edff', '#ddf6ff', '#dbeafe', '#e5f3ff',
                  ];
                  return <Cell key={index} fill={colors[index] ?? '#dbeafe'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 보조 차트 2개 */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 카테고리별 분포 PieChart */}
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 키워드 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(1)}%`
                  }
                  labelLine={false}
                >
                  {PIE_DATA.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] ?? '#93c5fd'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [value.toLocaleString() + '회', '총 빈도']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 키워드 트렌드 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle>키워드 트렌드 (최근 7일 Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={MOCK_TREND_DATA}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                {TOP5_KEYWORDS.map((kw, i) => (
                  <Line
                    key={kw}
                    type="monotone"
                    dataKey={kw}
                    stroke={TREND_LINE_COLORS[i]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 키워드 상세 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>키워드 상세 (Top 30)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 헤더 */}
          <div className="mb-2 grid grid-cols-[40px_1fr_100px_100px_120px] gap-2 border-b border-border pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <span className="text-center">순위</span>
            <span>키워드</span>
            <span>카테고리</span>
            <span className="text-right">사용 빈도</span>
            <span className="text-right">전주 대비</span>
          </div>
          {/* 행 */}
          <div className="divide-y divide-border">
            {MOCK_KEYWORDS.map((item) => (
              <div
                key={item.rank}
                className="grid grid-cols-[40px_1fr_100px_100px_120px] items-center gap-2 py-2.5 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="text-center font-mono text-muted-foreground">{item.rank}</span>
                <span className="font-medium text-foreground">{item.keyword}</span>
                <span>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: CATEGORY_COLORS[item.category],
                      color: CATEGORY_COLORS[item.category],
                    }}
                  >
                    {item.category}
                  </Badge>
                </span>
                <span className="text-right tabular-nums">{item.frequency.toLocaleString()}</span>
                <span
                  className={`text-right tabular-nums font-medium ${
                    item.changeRate >= 0 ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {item.changeRate >= 0 ? '+' : ''}
                  {item.changeRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
