'use client';

import Link from 'next/link';
import {
  Users,
  UserPlus,
  Heart,
  Percent,
  BookOpen,
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
}

/**
 * KPI Card — Ember Signal v1.0
 * - 큰 숫자는 Instrument Serif (kpi-number, AI slop 제거 RISK)
 * - 레이블/아이콘은 Pretendard + muted
 */
function KPICard({ title, value, description, icon: Icon, trend }: KPICardProps) {
  return (
    <Card className="overflow-hidden transition-colors duration-short hover:bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="kpi-number text-4xl leading-none text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div
            className={`mt-2 flex items-center gap-1 text-xs ${
              trend.isPositive ? 'text-success' : 'text-destructive'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span className="font-mono-data">
              {trend.isPositive ? '+' : '−'}
              {trend.value}% 전일 대비
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const signupData = [
  { date: '3/17', users: 65 },
  { date: '3/18', users: 78 },
  { date: '3/19', users: 82 },
  { date: '3/20', users: 70 },
  { date: '3/21', users: 95 },
  { date: '3/22', users: 89 },
  { date: '3/23', users: 102 },
];

// Ember Signal 기반 차트 팔레트 — 보라 그라데이션 제거
const matchingData = [
  { name: '성공', value: 156, token: 'hsl(var(--success))' },
  { name: '진행중', value: 89, token: 'hsl(var(--primary))' }, // Ember orange
  { name: '만료', value: 34, token: 'hsl(var(--muted-foreground))' },
];

// Recharts Tooltip 에 브랜드 스타일 적용 (다크모드 대응)
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius-md)',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
  fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
};

export default function DashboardPage() {
  const kpi = {
    totalSignups: 15678,
    newSignupsToday: 102,
    activeMatching: 89,
    matchingSuccessRate: 72.4,
    diaryCountToday: 1243,
    exchangeDiaryCountToday: 432,
    churnRate7d: 8.3,
  };

  const pendingReports = 12;

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="Ember 서비스 현황을 한눈에 확인하세요"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="누적 가입자"
          value={kpi.totalSignups}
          icon={Users}
          trend={{ value: 3.2, isPositive: true }}
        />
        <KPICard
          title="신규 가입자"
          value={kpi.newSignupsToday}
          icon={UserPlus}
          trend={{ value: 14.6, isPositive: true }}
          description="오늘"
        />
        <KPICard
          title="활성 매칭"
          value={kpi.activeMatching}
          icon={Heart}
          trend={{ value: 5.1, isPositive: true }}
          description="진행 중인 매칭"
        />
        <KPICard
          title="매칭 성공률"
          value={`${kpi.matchingSuccessRate}%`}
          icon={Percent}
          trend={{ value: 2.8, isPositive: true }}
        />
        <KPICard
          title="일기 작성 수"
          value={kpi.diaryCountToday}
          icon={BookOpen}
          trend={{ value: 8.4, isPositive: true }}
          description="오늘"
        />
        <KPICard
          title="교환일기 수"
          value={kpi.exchangeDiaryCountToday}
          icon={MessageCircle}
          trend={{ value: 11.2, isPositive: true }}
          description="오늘"
        />
        <KPICard
          title="7일 이탈률"
          value={`${kpi.churnRate7d}%`}
          icon={TrendingDown}
          trend={{ value: 1.5, isPositive: false }}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              신규 가입자 추이 (최근 7일)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={signupData}>
                <defs>
                  <linearGradient id="emberFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--primary))"
                  fill="url(#emberFill)"
                  strokeWidth={2}
                  name="신규 가입자"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">매칭 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={matchingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {matchingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.token} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-6">
              {matchingData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.token }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}
                    <span className="ml-1 font-mono-data text-foreground">
                      {item.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          빠른 작업
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/reports">
            <Card className="cursor-pointer transition-colors duration-short hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/15 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">신고 처리</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-mono-data text-foreground">{pendingReports}</span>건 대기
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/members">
            <Card className="cursor-pointer transition-colors duration-short hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-info/15 text-info">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">회원 관리</p>
                  <p className="text-sm text-muted-foreground">
                    신규 가입{' '}
                    <span className="font-mono-data text-foreground">
                      {kpi.newSignupsToday}
                    </span>
                    명
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/content/topics">
            <Card className="cursor-pointer transition-colors duration-short hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-success/15 text-success">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">콘텐츠 관리</p>
                  <p className="text-sm text-muted-foreground">주제 및 큐레이션</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
