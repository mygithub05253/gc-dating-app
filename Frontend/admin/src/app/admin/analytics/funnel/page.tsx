'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, ArrowRight, ArrowDown, Users, BookOpen, Heart, MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useUserFunnel } from '@/hooks/useAnalytics';

const STAGE_ICONS: Record<string, React.ReactNode> = {
  'signup': <Users className="h-5 w-5" />,
  'profile': <Users className="h-5 w-5" />,
  'match': <BookOpen className="h-5 w-5" />,
  'exchange': <Heart className="h-5 w-5" />,
  'couple': <MessageCircle className="h-5 w-5" />,
};

const STAGE_LABELS: Record<string, string> = {
  signup: '가입',
  profile: '프로필 완성',
  match: '매칭 신청',
  exchange: '교환일기 시작',
  couple: '커플 전환',
};

const STAGE_FILLS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

export default function FunnelAnalysisPage() {
  const { data, isLoading, refetch } = useUserFunnel();

  const handleRefresh = () => {
    refetch().then(() => toast.success('데이터를 새로고침했습니다.'));
  };

  const handleExport = () => {
    toast.success('퍼널 분석 리포트를 다운로드합니다.');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 서버 응답에서 퍼널 데이터 추출
  const summary = data?.summary;
  const cohorts = data?.cohorts ?? [];

  // 코호트에서 최신 또는 전체 합산 퍼널 구성
  const latestCohort = cohorts.length > 0 ? cohorts[cohorts.length - 1] : null;
  const stageKeys = ['signup', 'profile', 'match', 'exchange', 'couple'] as const;
  const funnelData = stageKeys.map((key, i) => ({
    name: STAGE_LABELS[key],
    value: latestCohort?.stages?.[key]?.count ?? 0,
    fill: STAGE_FILLS[i],
    rate: latestCohort?.stages?.[key]?.rate,
  }));

  const overallConversion = summary?.overallConversion != null
    ? (summary.overallConversion * 100).toFixed(1)
    : funnelData[0].value > 0
      ? ((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(1)
      : '0.0';

  // 단계 간 전환율 (최신 코호트 dropoff 기반)
  const dropoff = latestCohort?.dropoff;
  const conversionRates = [
    { from: '가입', to: '프로필 완성', rate: dropoff?.signupToProfile != null ? (100 - (dropoff.signupToProfile * 100)) : null },
    { from: '프로필 완성', to: '매칭 신청', rate: dropoff?.profileToMatch != null ? (100 - (dropoff.profileToMatch * 100)) : null },
    { from: '매칭 신청', to: '교환일기 시작', rate: dropoff?.matchToExchange != null ? (100 - (dropoff.matchToExchange * 100)) : null },
    { from: '교환일기 시작', to: '커플 전환', rate: dropoff?.exchangeToCouple != null ? (100 - (dropoff.exchangeToCouple * 100)) : null },
  ];

  // 코호트 차트 데이터
  const cohortChartData = cohorts.map((c) => ({
    cohort: c.weekStart,
    signup: c.stages?.signup?.count ?? 0,
    profile: c.stages?.profile?.count ?? 0,
    match: c.stages?.match?.count ?? 0,
    exchange: c.stages?.exchange?.count ?? 0,
    couple: c.stages?.couple?.count ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="사용자 퍼널 분석"
        description="가입부터 커플 전환까지의 사용자 여정 분석"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              리포트 다운로드
            </Button>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">전체 전환율</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">{overallConversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">가입 → 커플 전환</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">총 가입자</div>
            <div className="mt-1 text-2xl font-bold">{summary?.totalSignups?.toLocaleString() ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">전체 전환율</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{summary?.overallConversion != null ? `${(summary.overallConversion * 100).toFixed(1)}%` : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">기간</div>
            <div className="mt-1 text-lg font-bold">{data?.period?.startDate ?? '—'} ~ {data?.period?.endDate ?? '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>사용자 여정 퍼널</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-4 overflow-x-auto">
            {funnelData.map((stage, index) => (
              <div key={stage.name} className="flex items-center">
                <div
                  className="flex flex-col items-center p-4 rounded-lg min-w-[120px]"
                  style={{ backgroundColor: stage.fill + '40' }}
                >
                  <div className="p-2 rounded-full bg-white shadow-sm">
                    {STAGE_ICONS[stageKeys[index]]}
                  </div>
                  <span className="mt-2 text-sm font-medium">{stage.name}</span>
                  <span className="text-xl font-bold">{stage.value.toLocaleString()}</span>
                  {funnelData[0].value > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {((stage.value / funnelData[0].value) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                {index < funnelData.length - 1 && (
                  <ArrowRight className="h-6 w-6 text-gray-400 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle>단계별 전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionRates.map((item, index) => (
                <div key={index} className="flex items-center gap-4 pb-4 border-b last:border-0">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium">{item.from}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{item.to}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {item.rate != null ? (
                      <>
                        <div className="w-24">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.rate >= 60 ? 'bg-green-500' : item.rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(item.rate, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className={`font-bold w-16 text-right ${item.rate >= 60 ? 'text-green-600' : item.rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {item.rate.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Drop-off Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>주요 이탈 사유</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.worstStage ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  가장 이탈이 많은 단계: <span className="font-bold text-red-600">{summary.worstStage}</span>
                </p>
                {conversionRates
                  .filter(r => r.rate != null && r.rate < 60)
                  .map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 text-sm text-muted-foreground">{item.from} → {item.to}</div>
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${100 - (item.rate ?? 0)}%` }}
                        />
                      </div>
                      <span className="text-sm w-16 text-right text-red-600">
                        이탈 {item.rate != null ? (100 - item.rate).toFixed(1) : '—'}%
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">이탈 사유 데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      {cohortChartData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>코호트별 퍼널 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cohortChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="cohort" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="signup" name="가입" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profile" name="프로필" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="match" name="매칭" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exchange" name="교환" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="couple" name="커플" fill="#dbeafe" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
