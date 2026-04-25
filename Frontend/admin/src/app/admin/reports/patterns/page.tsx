'use client';

import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { AnalyticsLoading, AnalyticsError } from '@/components/common/AnalyticsStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, AlertTriangle, Users, TrendingUp, Clock, UserX, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsApi } from '@/lib/api/reports';
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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

export default function ReportPatternsPage() {
  const { data: patternData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'pattern-analysis'],
    queryFn: () => reportsApi.patternAnalysis({ periodDays: 7, topN: 5 }).then((res) => res.data.data),
  });

  const handleRefresh = () => {
    refetch();
    toast.success('데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('신고 패턴 리포트를 다운로드합니다.');
  };

  // 서버 데이터가 있으면 사용, 없으면 기본값
  const pattern = patternData as Record<string, unknown> | undefined;

  const reportByReason = (pattern?.reportByReason as Array<{ reason: string; count: number; percentage: number }>) ?? [
    { reason: '욕설/비방', count: 0, percentage: 0 },
  ];

  const reportTrend = (pattern?.reportTrend as Array<{ date: string; reports: number; resolved: number }>) ?? [];

  const reportByHour = (pattern?.reportByHour as Array<{ hour: string; count: number }>) ?? [];

  const repeatReporters = (pattern?.repeatReporters as Array<{
    nickname: string;
    reportCount: number;
    validCount: number;
    validRate: number;
  }>) ?? [];

  const repeatOffenders = (pattern?.repeatOffenders as Array<{
    nickname: string;
    receivedReports: number;
    suspensions: number;
    status: string;
  }>) ?? [];

  const resolutionStats = (pattern?.resolutionStats as Array<{ status: string; count: number }>) ?? [];

  const responseTime = (pattern?.responseTime as Array<{ metric: string; value: number; fullMark: number }>) ?? [];

  const totalReports = reportTrend.reduce((sum, d) => sum + d.reports, 0);
  const resolvedReports = reportTrend.reduce((sum, d) => sum + d.resolved, 0);
  const resolutionRate = totalReports > 0 ? ((resolvedReports / totalReports) * 100).toFixed(1) : '0.0';

  if (isLoading) {
    return (
      <div>
        <PageHeader title="신고 패턴 분석" description="신고 트렌드 및 패턴 분석 대시보드" />
        <AnalyticsLoading label="패턴 분석 데이터를 불러오는 중입니다..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="신고 패턴 분석" description="신고 트렌드 및 패턴 분석 대시보드" />
        <AnalyticsError message={error?.message || '패턴 분석 데이터를 불러오지 못했습니다.'} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="신고 패턴 분석"
        description="신고 트렌드 및 패턴 분석 대시보드"
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

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">이번 주 신고</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{totalReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">처리 완료</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{resolvedReports}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">처리율</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-600">{resolutionRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">이번 주 제재</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {resolutionStats.reduce((sum, s) => sum + s.count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>신고 사유별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {reportByReason.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={reportByReason}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    label={({ reason, percentage }: { reason: string; percentage: number }) => `${reason}: ${percentage}%`}
                  >
                    {reportByReason.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신고 및 처리 추이</CardTitle>
          </CardHeader>
          <CardContent>
            {reportTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={reportTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="reports" name="신고" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="resolved" name="처리" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>시간대별 신고 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {reportByHour.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={reportByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" name="신고 수" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="mt-2 text-sm text-center text-muted-foreground">
                  * 시간대별 신고 패턴
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신고 처리 성과</CardTitle>
          </CardHeader>
          <CardContent>
            {responseTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={responseTime}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" stroke="#6b7280" fontSize={10} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#6b7280" fontSize={10} />
                  <Radar
                    name="성과"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              다빈도 신고자 TOP 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repeatReporters.length > 0 ? (
              <div className="space-y-3">
                {repeatReporters.map((reporter, index) => (
                  <div key={index} className="flex items-center justify-between pb-3 border-b last:border-0">
                    <div>
                      <span className="font-medium">{reporter.nickname}</span>
                      <p className="text-sm text-muted-foreground">
                        신고 {reporter.reportCount}건 / 유효 {reporter.validCount}건
                      </p>
                    </div>
                    <Badge className={reporter.validRate >= 70 ? 'bg-green-100 text-green-800' : reporter.validRate >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                      정확도 {reporter.validRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              다빈도 피신고자 TOP 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repeatOffenders.length > 0 ? (
              <div className="space-y-3">
                {repeatOffenders.map((offender, index) => (
                  <div key={index} className="flex items-center justify-between pb-3 border-b last:border-0">
                    <div>
                      <span className="font-medium">{offender.nickname}</span>
                      <p className="text-sm text-muted-foreground">
                        피신고 {offender.receivedReports}건 / 정지 {offender.suspensions}회
                      </p>
                    </div>
                    <Badge className={STATUS_COLORS[offender.status] ?? 'bg-gray-100 text-gray-800'}>
                      {offender.status === 'SUSPENDED' ? '정지중' : offender.status === 'WARNING' ? '경고' : '활성'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolution Stats */}
      {resolutionStats.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>처리 결과 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resolutionStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="status" type="category" stroke="#6b7280" fontSize={12} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="건수" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
