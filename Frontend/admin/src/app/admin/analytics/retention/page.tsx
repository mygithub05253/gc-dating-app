'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Users, UserMinus, UserPlus, Calendar, Download, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useRetentionSurvival, useCohortRetention } from '@/hooks/useAnalytics';

export default function RetentionAnalyticsPage() {
  const { data: survivalData, isLoading: survivalLoading, refetch: refetchSurvival } = useRetentionSurvival();
  const { data: cohortData, isLoading: cohortLoading, refetch: refetchCohort } = useCohortRetention();

  const isLoading = survivalLoading || cohortLoading;

  const handleRefresh = () => {
    Promise.all([refetchSurvival(), refetchCohort()]).then(() =>
      toast.success('데이터를 새로고침했습니다.')
    );
  };

  const handleExport = () => {
    toast.success('리텐션 분석 리포트를 다운로드합니다.');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Kaplan-Meier 생존 곡선 데이터
  const survivalCurve = survivalData?.curve ?? [];

  // 코호트 리텐션 매트릭스
  const cohortMatrix = cohortData?.cohorts ?? [];

  // 주요 지표 추출 (생존 곡선에서 D1/D7/D30 추출)
  const medianSurvival = survivalData?.medianSurvivalDay;
  const findDayRate = (day: number) => {
    const point = survivalCurve.find(p => p.day === day);
    return point?.survivalProbability;
  };
  const d1Rate = findDayRate(1);
  const d7Rate = findDayRate(7);
  const d30Rate = findDayRate(30);

  // 생존 곡선 차트 데이터
  const curveChartData = survivalCurve.map((p) => ({
    day: p.day,
    rate: p.survivalProbability != null ? Number((p.survivalProbability * 100).toFixed(1)) : null,
  }));

  return (
    <div>
      <PageHeader
        title="이탈/리텐션 분석"
        description="사용자 리텐션 및 이탈 패턴 분석 (Kaplan-Meier 생존 분석)"
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

      {/* 리텐션 개요 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">
              {d1Rate != null ? `${(Number(d1Rate) * (Number(d1Rate) <= 1 ? 100 : 1)).toFixed(1)}%` : '—'}
            </div>
            <p className="mt-2 text-sm text-blue-800">D1 리텐션</p>
            <p className="text-xs text-blue-600">가입 다음날 재방문</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600">
              {d7Rate != null ? `${(Number(d7Rate) * (Number(d7Rate) <= 1 ? 100 : 1)).toFixed(1)}%` : '—'}
            </div>
            <p className="mt-2 text-sm text-purple-800">D7 리텐션</p>
            <p className="text-xs text-purple-600">7일 후 재방문</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-pink-600">
              {d30Rate != null ? `${(Number(d30Rate) * (Number(d30Rate) <= 1 ? 100 : 1)).toFixed(1)}%` : '—'}
            </div>
            <p className="mt-2 text-sm text-pink-800">D30 리텐션</p>
            <p className="text-xs text-pink-600">30일 후 재방문</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold">
              {medianSurvival != null ? `${medianSurvival}일` : '—'}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">중앙 생존 일수</p>
            <p className="text-xs text-muted-foreground">50% 유저 이탈 시점</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 생존 곡선 */}
        {curveChartData.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Kaplan-Meier 생존 곡선</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={curveChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} label={{ value: '일수', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} label={{ value: '생존율(%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, '생존율']}
                    labelFormatter={(label) => `${label}일`}
                  />
                  <Area
                    type="stepAfter"
                    dataKey="rate"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    strokeWidth={2}
                    name="생존율"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 코호트 리텐션 */}
        {cohortMatrix.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>코호트 리텐션 매트릭스</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">코호트</th>
                        {cohortMatrix[0]?.cells?.map((_, i: number) => (
                        <th key={i} className="p-2 text-center">W{i}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohortMatrix.map((row, ri: number) => (
                      <tr key={ri} className="border-b">
                        <td className="p-2 font-medium">{row.cohortWeekStart}</td>
                        {row.cells.map((cell, ci: number) => {
                          const pct = cell.rate != null ? (cell.rate <= 1 ? cell.rate * 100 : cell.rate) : null;
                          return (
                            <td
                              key={ci}
                              className="p-2 text-center"
                              style={{
                                backgroundColor: pct != null ? `rgba(34, 197, 94, ${pct / 100})` : undefined,
                              }}
                            >
                              {pct != null ? `${pct.toFixed(0)}%` : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 빈 상태 */}
        {curveChartData.length === 0 && cohortMatrix.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-muted-foreground">
              리텐션 분석 데이터가 아직 충분하지 않습니다.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
