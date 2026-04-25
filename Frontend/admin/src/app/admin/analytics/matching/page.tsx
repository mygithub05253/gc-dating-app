'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Users, Clock, TrendingUp, Target, Percent, Download, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMatchingFunnel, useMatchingDiversity, useKeywordTop } from '@/hooks/useAnalytics';

export default function MatchingAnalyticsPage() {
  const { data: funnelData, isLoading: funnelLoading, refetch: refetchFunnel } = useMatchingFunnel();
  const { data: diversityData, isLoading: diversityLoading, refetch: refetchDiversity } = useMatchingDiversity();
  const { data: keywordData, isLoading: keywordLoading, refetch: refetchKeywords } = useKeywordTop({ limit: 8 });

  const isLoading = funnelLoading || diversityLoading || keywordLoading;

  const handleRefresh = () => {
    Promise.all([refetchFunnel(), refetchDiversity(), refetchKeywords()]).then(() =>
      toast.success('데이터를 새로고침했습니다.')
    );
  };

  const handleExport = () => {
    toast.success('매칭 분석 리포트를 다운로드합니다.');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 퍼널 요약 데이터
  const totals = funnelData?.totals;
  const daily = funnelData?.daily ?? [];

  // 키워드 데이터
  const topKeywords = keywordData?.items ?? [];

  // 주간 트렌드 (daily 데이터 활용)
  const weeklyTrend = daily.slice(-7).map((d: any) => ({
    day: d.date?.substring(5) ?? d.date,
    matches: d.recommendations ?? 0,
    success: d.accepts ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="매칭 분석"
        description="매칭 성과 및 패턴 분석"
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

      {/* 주요 지표 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <span className="text-sm text-muted-foreground">추천 수</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {totals?.recommendations?.toLocaleString() ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">수락</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {totals?.accepts?.toLocaleString() ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">수락률</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {totals?.acceptRate != null ? `${(totals.acceptRate * 100).toFixed(1)}%` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">교환 전환율</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {totals?.exchangeRate != null ? `${(totals.exchangeRate * 100).toFixed(1)}%` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              <span className="text-sm text-muted-foreground">커플 전환율</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {totals?.coupleRate != null ? `${(totals.coupleRate * 100).toFixed(1)}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 주간 매칭 트렌드 - Line Chart */}
        {weeklyTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>일별 매칭 트렌드</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="matches"
                    stroke="#ec4899"
                    strokeWidth={2}
                    name="추천"
                    dot={{ fill: '#ec4899' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="success"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="수락"
                    dot={{ fill: '#22c55e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 인기 키워드 - Bar Chart */}
        {topKeywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>매칭 인기 키워드 TOP 8</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topKeywords.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis dataKey="label" type="category" stroke="#6b7280" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()}회`, '매칭 수']}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} name="매칭 수" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 최저 드롭오프 구간 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>매칭 퍼널 분석 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">최저 전환 구간</p>
                <p className="text-lg font-bold mt-1">
                  {funnelData?.worstDropoffStage
                    ? `${funnelData.worstDropoffStage} 단계`
                    : '데이터 없음'}
                </p>
              </div>
              {diversityData && (
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">다양성 지표</p>
                  <p className="text-lg font-bold mt-1">
                    {typeof diversityData === 'object' ? JSON.stringify(diversityData).substring(0, 50) : '—'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
