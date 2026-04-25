'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Heart,
  TrendingDown,
  Hash,
  Brain,
  Sparkles,
  Activity,
  Calendar,
  FileText,
  Smile,
  Lightbulb,
  Clock,
  Route,
  BookOpen,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/common/KpiCard';
import { AnalyticsLoading, AnalyticsError } from '@/components/common/AnalyticsStatus';
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
import { useDashboardKPI, useDailyStats, useMatchingStats } from '@/hooks/useDashboard';

// Recharts Tooltip 브랜드 스타일 (다크모드 대응)
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius-md)',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
  fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
};

// ─────────────────────── 분석 허브 링크 타입 ─────────────────────────

interface AnalyticsLink {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const macroAnalytics: AnalyticsLink[] = [
  {
    title: '퍼널 분석',
    description: '가입 → 프로필 → 매칭 전환율 단계별 시각화',
    href: '/admin/analytics/funnel',
    icon: TrendingDown,
  },
  {
    title: '키워드 분석',
    description: '일기·프로필 주요 키워드 빈도 및 클러스터',
    href: '/admin/analytics/keywords',
    icon: Hash,
  },
  {
    title: '세그먼트 분석',
    description: '연령·성별·활동도 기반 사용자 세그먼트',
    href: '/admin/analytics/segments',
    icon: Users,
  },
  {
    title: '사용자 여정',
    description: '이탈 구간 및 핵심 경로 플로우 분석',
    href: '/admin/analytics/journey',
    icon: Route,
  },
  {
    title: 'AI 인사이트',
    description: 'KcELECTRA 태그 분포 및 매칭 정확도 추이',
    href: '/admin/analytics/ai-insights',
    icon: Brain,
  },
  {
    title: '다양성 지표',
    description: '매칭 다양성 및 에코챔버 위험도 측정',
    href: '/admin/analytics/diversity',
    icon: Sparkles,
  },
  {
    title: '퍼널 심화',
    description: '코호트별 전환 심화 분석 및 드롭 원인',
    href: '/admin/analytics/funnel-deep',
    icon: Activity,
  },
];

const diaryAnalytics: AnalyticsLink[] = [
  {
    title: '일기 시간 히트맵',
    description: '요일·시간대별 일기 작성 패턴',
    href: '/admin/analytics/diaries/heatmap',
    icon: Calendar,
  },
  {
    title: '일기 길이·품질',
    description: '글자 수 분포 및 KcELECTRA 품질 점수',
    href: '/admin/analytics/diaries/quality',
    icon: FileText,
  },
  {
    title: '일기 감정 추이',
    description: '감정 태그 시계열 변화 및 분포',
    href: '/admin/analytics/diaries/emotion',
    icon: Smile,
  },
  {
    title: '일기 주제 참여',
    description: '큐레이션 주제별 참여율 및 완성도',
    href: '/admin/analytics/diaries/topic',
    icon: Lightbulb,
  },
  {
    title: '교환 응답률',
    description: '24h·48h 응답 패턴 및 침묵 구간',
    href: '/admin/analytics/diaries/response',
    icon: Clock,
  },
  {
    title: '턴 퍼널',
    description: '1턴 → 7턴 완주 퍼널 및 이탈 분포',
    href: '/admin/analytics/diaries/turn-funnel',
    icon: MessageCircle,
  },
];

// ─────────────────────────── 페이지 컴포넌트 ─────────────────────────

export default function DashboardPage() {
  // 최근 7일 날짜 범위 계산
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, []);

  const { data: kpiData, isLoading: kpiLoading, isError: kpiError } = useDashboardKPI();
  const { data: dailyStats } = useDailyStats(dateRange.startDate, dateRange.endDate);
  const { data: matchingStats } = useMatchingStats();

  // KPI 카드에서 값 추출
  const findKpi = (key: string) => kpiData?.kpiCards?.find((k) => k.key === key);
  const totalSignupsKpi = findKpi('totalSignups');
  const newSignupsKpi = findKpi('newSignupsToday');
  const matchingRateKpi = findKpi('matchingSuccessRate');
  const churnRateKpi = findKpi('churnRate7d');

  // 일별 통계 → 차트 데이터
  const signupChartData = (dailyStats ?? []).map((d) => ({
    date: d.date.substring(5), // MM-DD → M/DD
    users: d.newUsers,
  }));

  // 매칭 현황 차트 데이터
  const matchingChartData = matchingStats
    ? [
        { name: '성공', value: Math.round((matchingStats.totalMatches * matchingStats.successRate) / 100), token: 'hsl(var(--success))' },
        { name: '진행중', value: matchingStats.totalMatches - Math.round((matchingStats.totalMatches * matchingStats.successRate) / 100), token: 'hsl(var(--primary))' },
      ]
    : [
        { name: '성공', value: 0, token: 'hsl(var(--success))' },
        { name: '진행중', value: 0, token: 'hsl(var(--primary))' },
      ];

  // 도메인 요약 카드 (API에서 오면 동적, 없으면 KPI로 구성)
  const domainCards = useMemo(
    () => [
      {
        title: '사용자 도메인',
        kpis: [
          { label: '총 가입자', value: totalSignupsKpi ? totalSignupsKpi.currentValue.toLocaleString() : '-', highlight: true },
          { label: '오늘 가입', value: newSignupsKpi ? newSignupsKpi.currentValue.toLocaleString() : '-' },
          { label: '매칭 성공률', value: matchingRateKpi ? `${matchingRateKpi.currentValue}%` : '-' },
          { label: '7일 이탈률', value: churnRateKpi ? `${churnRateKpi.currentValue}%` : '-' },
        ],
      },
      {
        title: '매칭 도메인',
        kpis: [
          { label: '총 매칭 수', value: matchingStats?.totalMatches?.toLocaleString() ?? '-', highlight: true },
          { label: '성공률', value: matchingStats ? `${matchingStats.successRate}%` : '-' },
          { label: '평균 소요', value: matchingStats ? `${matchingStats.averageMatchTime}일` : '-' },
        ],
      },
    ],
    [totalSignupsKpi, newSignupsKpi, matchingRateKpi, churnRateKpi, matchingStats],
  );

  // 이상 징후 알림
  const anomalyAlerts = kpiData?.anomalyAlerts ?? [];
  const pendingReports = anomalyAlerts.length;

  if (kpiLoading) {
    return (
      <div>
        <PageHeader title="대시보드" description="Ember 서비스 현황 종합" />
        <AnalyticsLoading label="대시보드 데이터를 불러오는 중입니다..." />
      </div>
    );
  }

  if (kpiError) {
    return (
      <div>
        <PageHeader title="대시보드" description="Ember 서비스 현황 종합" />
        <AnalyticsError message="대시보드 데이터를 불러오지 못했습니다." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="Ember 서비스 현황 종합"
      />

      {/* ── 상단 핵심 KPI 4개 ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="누적 가입자"
          value={totalSignupsKpi?.currentValue ?? 0}
          icon={Users}
          trend={totalSignupsKpi ? {
            value: Math.abs(totalSignupsKpi.changeRate),
            isPositive: totalSignupsKpi.changeDirection === 'UP',
          } : undefined}
        />
        <KpiCard
          title="신규 가입자"
          value={newSignupsKpi?.currentValue ?? 0}
          icon={UserPlus}
          trend={newSignupsKpi ? {
            value: Math.abs(newSignupsKpi.changeRate),
            isPositive: newSignupsKpi.changeDirection === 'UP',
          } : undefined}
          description="오늘"
        />
        <KpiCard
          title="매칭 성공률"
          value={matchingRateKpi ? `${matchingRateKpi.currentValue}%` : '-'}
          icon={Heart}
          trend={matchingRateKpi ? {
            value: Math.abs(matchingRateKpi.changeRate),
            isPositive: matchingRateKpi.changeDirection === 'UP',
          } : undefined}
        />
        <KpiCard
          title="7일 이탈률"
          value={churnRateKpi ? `${churnRateKpi.currentValue}%` : '-'}
          icon={TrendingDown}
          trend={churnRateKpi ? {
            value: Math.abs(churnRateKpi.changeRate),
            isPositive: churnRateKpi.changeDirection === 'DOWN',
          } : undefined}
        />
      </div>

      {/* ── 도메인 요약 ── */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          도메인 요약
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {domainCards.map((domain) => (
            <Card key={domain.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  {domain.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {domain.kpis.map((kpiItem) => (
                    <div key={kpiItem.label}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {kpiItem.label}
                      </p>
                      <p
                        className={`font-mono-data tabular-nums text-2xl font-semibold ${
                          kpiItem.highlight
                            ? 'text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        {kpiItem.value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── 추이 차트 2개 ── */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              신규 가입자 추이 (최근 7일)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signupChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={signupChartData}>
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
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
            )}
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
                    data={matchingChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {matchingChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.token} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-6">
              {matchingChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.token }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}
                    <span className="ml-1 font-mono-data tabular-nums text-foreground">
                      {item.value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 이상 징후 알림 ── */}
      {anomalyAlerts.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            이상 징후 알림
          </h2>
          <div className="space-y-2">
            {anomalyAlerts.map((alert, idx) => (
              <Card key={idx} className={alert.severity === 'CRITICAL' ? 'border-red-300' : 'border-yellow-300'}>
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangle className={`h-5 w-5 ${alert.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <span className="text-sm">{alert.message}</span>
                  {alert.link && (
                    <Link href={alert.link} className="ml-auto text-sm text-primary hover:underline">
                      상세보기
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── 분석 허브 ── */}
      <div className="mt-8">
        {/* sub-section 1: 매크로 분석 (B-1.1~B-1.7) */}
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          매크로 분석
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {macroAnalytics.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="cursor-pointer transition-colors duration-short hover:border-primary/40 hover:bg-accent/30">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* sub-section 2: 일기 분석 (B-2.1~B-2.6) */}
        <h2 className="mb-4 mt-6 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          일기 분석
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {diaryAnalytics.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="cursor-pointer transition-colors duration-short hover:border-primary/40 hover:bg-accent/30">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium leading-tight">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 빠른 작업 ── */}
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
                    <span className="font-mono-data tabular-nums text-foreground">
                      {pendingReports}
                    </span>
                    건 알림
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
                    <span className="font-mono-data tabular-nums text-foreground">
                      {newSignupsKpi?.currentValue ?? 0}
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
                  <BookOpen className="h-5 w-5" />
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
