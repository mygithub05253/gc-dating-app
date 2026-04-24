'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import KpiCard from '@/components/common/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, Activity, Crown, RefreshCw, Download } from 'lucide-react';
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
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

// ─── 기간 필터 타입 ───────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

// ─── Mock: RFM 세그먼트 분포 ─────────────────────────────────
const MOCK_RFM_DATA = [
  { segment: 'Champions',          users: 850,  fill: '#10b981' },
  { segment: 'Loyal',              users: 1240, fill: '#3b82f6' },
  { segment: 'Potential Loyalists',users: 1850, fill: '#60a5fa' },
  { segment: 'New Customers',      users: 920,  fill: '#93c5fd' },
  { segment: 'Promising',          users: 760,  fill: '#bfdbfe' },
  { segment: 'Need Attention',     users: 540,  fill: '#dbeafe' },
  { segment: 'At Risk',            users: 320,  fill: '#f59e0b' },
];

const TOTAL_USERS = MOCK_RFM_DATA.reduce((s, d) => s + d.users, 0);
const CHAMPIONS_RATIO = ((850 / TOTAL_USERS) * 100).toFixed(1);

// ─── Mock: 성별 × 연령대 스택 BarChart ───────────────────────
const MOCK_GENDER_AGE_DATA = [
  { age: '20대', 남성: 1120, 여성: 1380 },
  { age: '30대', 남성: 1540, 여성: 1290 },
  { age: '40대', 남성: 680,  여성: 590  },
  { age: '50대+', 남성: 210, 여성: 170  },
];

// ─── Mock: 지역 분포 PieChart ─────────────────────────────────
const MOCK_REGION_DATA = [
  { name: '서울',  value: 35, fill: '#3b82f6' },
  { name: '경기',  value: 22, fill: '#60a5fa' },
  { name: '부산',  value: 12, fill: '#93c5fd' },
  { name: '대구',  value: 8,  fill: '#bfdbfe' },
  { name: '인천',  value: 7,  fill: '#dbeafe' },
  { name: '광주',  value: 5,  fill: '#1d4ed8' },
  { name: '대전',  value: 4,  fill: '#2563eb' },
  { name: '기타',  value: 7,  fill: '#6b7280' },
];

// ─── Mock: 세그먼트 KPI 테이블 ────────────────────────────────
interface SegmentKpiRow {
  segment: string;
  users: number;
  mauRatio: number;
  avgMatching: number;
  avgDiary: number;
  retention30d: number;
}

const MOCK_SEGMENT_KPI: SegmentKpiRow[] = [
  { segment: 'Champions',           users: 850,  mauRatio: 12.6, avgMatching: 8.4, avgDiary: 24.1, retention30d: 91 },
  { segment: 'Loyal',               users: 1240, mauRatio: 18.4, avgMatching: 6.2, avgDiary: 18.7, retention30d: 83 },
  { segment: 'Potential Loyalists', users: 1850, mauRatio: 27.5, avgMatching: 4.1, avgDiary: 12.3, retention30d: 71 },
  { segment: 'New Customers',       users: 920,  mauRatio: 13.7, avgMatching: 1.8, avgDiary: 4.2,  retention30d: 58 },
  { segment: 'Promising',           users: 760,  mauRatio: 11.3, avgMatching: 2.9, avgDiary: 7.8,  retention30d: 62 },
  { segment: 'Need Attention',      users: 540,  mauRatio: 8.0,  avgMatching: 1.2, avgDiary: 3.1,  retention30d: 34 },
  { segment: 'At Risk',             users: 320,  mauRatio: 4.8,  avgMatching: 0.6, avgDiary: 1.4,  retention30d: 18 },
];

// ─── Mock: RadarChart (Champions vs At Risk) ──────────────────
const MOCK_RADAR_DATA = [
  { metric: '사용 빈도', champions: 95, atRisk: 18 },
  { metric: '매칭률',    champions: 88, atRisk: 12 },
  { metric: '일기 수',   champions: 92, atRisk: 15 },
  { metric: '응답률',    champions: 86, atRisk: 22 },
  { metric: '체류시간',  champions: 90, atRisk: 20 },
];

// ─── 세그먼트별 색상 헬퍼 ─────────────────────────────────────
const SEGMENT_COLOR: Record<string, string> = {
  'Champions':           '#10b981',
  'Loyal':               '#3b82f6',
  'Potential Loyalists': '#60a5fa',
  'New Customers':       '#93c5fd',
  'Promising':           '#bfdbfe',
  'Need Attention':      '#dbeafe',
  'At Risk':             '#f59e0b',
};

// ─── 리텐션 색상 헬퍼 ─────────────────────────────────────────
function retentionColor(v: number): string {
  if (v >= 70) return 'text-emerald-600';
  if (v >= 50) return 'text-blue-500';
  if (v >= 30) return 'text-amber-500';
  return 'text-red-500';
}

// ─── 페이지 컴포넌트 ──────────────────────────────────────────
export default function SegmentAnalysisPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const handleRefresh = () => {
    toast.success('세그먼트 데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('세그먼트 분석 리포트를 다운로드합니다.');
  };

  const periodLabel: Record<Period, string> = { '7d': '7일', '30d': '30일', '90d': '90일' };

  return (
    <div>
      <PageHeader
        title="세그먼트 분석"
        description="성별·연령·지역·RFM 다축 사용자 세그먼테이션"
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
      <MockPageNotice
        description="GET /api/v2.2/admin/analytics/segments 연결 예정 (Star CTE 6개 카테고리 + RFM K-Means)"
      />

      {/* KPI 카드 4개 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="총 세그먼트 수"
          value={MOCK_RFM_DATA.length}
          description={`${periodLabel[period]} 집계 기준`}
          icon={Users}
          trend={{ value: 0, isPositive: true, label: '변동 없음' }}
        />
        <KpiCard
          title="최대 세그먼트 (Top 1)"
          value="Potential Loyalists"
          description={`${(1850).toLocaleString()}명 · 27.5% 비중`}
          icon={Target}
          valueClassName="text-primary text-2xl"
        />
        <KpiCard
          title="활성도 1위 세그먼트"
          value="Champions"
          description="30일 리텐션 91% · 평균 일기 24.1개"
          icon={Activity}
          valueClassName="text-emerald-600 text-2xl"
        />
        <KpiCard
          title="RFM Champions 비율"
          value={`${CHAMPIONS_RATIO}%`}
          description={`${(850).toLocaleString()}명 / ${TOTAL_USERS.toLocaleString()}명`}
          icon={Crown}
          trend={{ value: 1.2, isPositive: true, label: '전월 대비' }}
          valueClassName="text-emerald-600"
        />
      </div>

      {/* 메인 차트: RFM 세그먼트 분포 BarChart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>RFM 세그먼트 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={MOCK_RFM_DATA}
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="segment"
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number) => [value.toLocaleString() + '명', '사용자 수']}
              />
              <Bar dataKey="users" name="사용자 수" radius={[4, 4, 0, 0]}>
                {MOCK_RFM_DATA.map((entry) => (
                  <Cell key={entry.segment} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 보조 차트 2개 */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 성별 × 연령대 스택 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle>성별 × 연령대 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={MOCK_GENDER_AGE_DATA}
                margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="age" stroke="#6b7280" fontSize={12} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(v: number) => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [value.toLocaleString() + '명']}
                />
                <Legend />
                <Bar dataKey="남성" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="여성" stackId="a" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 지역 분포 PieChart */}
        <Card>
          <CardHeader>
            <CardTitle>지역 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={MOCK_REGION_DATA}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name} ${value}%`
                  }
                  labelLine={false}
                >
                  {MOCK_REGION_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`${value}%`, '비중']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 세그먼트 KPI 테이블 + RadarChart */}
      <div className="mb-6 grid gap-6 md:grid-cols-[1fr_360px]">
        {/* 세그먼트 KPI 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle>세그먼트별 KPI</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 헤더 */}
            <div className="mb-2 grid grid-cols-[1fr_80px_80px_90px_90px_100px] gap-2 border-b border-border pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <span>세그먼트</span>
              <span className="text-right">사용자 수</span>
              <span className="text-right">MAU %</span>
              <span className="text-right">평균 매칭</span>
              <span className="text-right">평균 일기</span>
              <span className="text-right">30일 리텐션</span>
            </div>
            {/* 행 */}
            <div className="divide-y divide-border">
              {MOCK_SEGMENT_KPI.map((row) => (
                <div
                  key={row.segment}
                  className="grid grid-cols-[1fr_80px_80px_90px_90px_100px] items-center gap-2 py-2.5 text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SEGMENT_COLOR[row.segment] ?? '#6b7280' }}
                    />
                    {row.segment}
                  </span>
                  <span className="text-right tabular-nums">
                    {row.users.toLocaleString()}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {row.mauRatio}%
                  </span>
                  <span className="text-right tabular-nums">
                    {row.avgMatching}
                  </span>
                  <span className="text-right tabular-nums">
                    {row.avgDiary}
                  </span>
                  <span className={`text-right tabular-nums font-medium ${retentionColor(row.retention30d)}`}>
                    {row.retention30d}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RadarChart: Champions vs At Risk */}
        <Card>
          <CardHeader>
            <CardTitle>Champions vs At Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={MOCK_RADAR_DATA} margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickCount={4}
                />
                <Radar
                  name="Champions"
                  dataKey="champions"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.25}
                />
                <Radar
                  name="At Risk"
                  dataKey="atRisk"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.25}
                />
                <Legend />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
