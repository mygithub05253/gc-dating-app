'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, AlertTriangle, Users, TrendingUp, Clock, UserX, FileText, Ban } from 'lucide-react';
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

// Mock 신고 패턴 데이터
const MOCK_REPORT_BY_REASON = [
  { reason: '욕설/비방', count: 156, percentage: 32 },
  { reason: '음란성', count: 98, percentage: 20 },
  { reason: '스팸', count: 78, percentage: 16 },
  { reason: '사기 의심', count: 65, percentage: 13 },
  { reason: '부적절한 프로필', count: 54, percentage: 11 },
  { reason: '기타', count: 39, percentage: 8 },
];

const MOCK_REPORT_TREND = [
  { date: '3/17', reports: 42, resolved: 38 },
  { date: '3/18', reports: 56, resolved: 45 },
  { date: '3/19', reports: 38, resolved: 35 },
  { date: '3/20', reports: 67, resolved: 52 },
  { date: '3/21', reports: 89, resolved: 78 },
  { date: '3/22', reports: 54, resolved: 48 },
  { date: '3/23', reports: 23, resolved: 15 },
];

const MOCK_REPORT_BY_HOUR = [
  { hour: '0-4', count: 12 },
  { hour: '4-8', count: 8 },
  { hour: '8-12', count: 34 },
  { hour: '12-16', count: 45 },
  { hour: '16-20', count: 67 },
  { hour: '20-24', count: 89 },
];

const MOCK_REPEAT_REPORTERS = [
  { nickname: '신고왕', reportCount: 23, validCount: 18, validRate: 78.3 },
  { nickname: '감시자', reportCount: 18, validCount: 12, validRate: 66.7 },
  { nickname: '파수꾼', reportCount: 15, validCount: 14, validRate: 93.3 },
  { nickname: '정의', reportCount: 12, validCount: 5, validRate: 41.7 },
  { nickname: '경비원', reportCount: 10, validCount: 8, validRate: 80.0 },
];

const MOCK_REPEAT_OFFENDERS = [
  { nickname: '문제아', receivedReports: 12, suspensions: 2, status: 'WARNING' },
  { nickname: '트러블', receivedReports: 8, suspensions: 1, status: 'SUSPENDED' },
  { nickname: '민폐', receivedReports: 7, suspensions: 0, status: 'WARNING' },
  { nickname: '방해꾼', receivedReports: 6, suspensions: 1, status: 'WARNING' },
  { nickname: '소란', receivedReports: 5, suspensions: 0, status: 'ACTIVE' },
];

const MOCK_RESOLUTION_STATS = [
  { status: '경고', count: 145 },
  { status: '7일 정지', count: 45 },
  { status: '영구 정지', count: 12 },
  { status: '기각', count: 88 },
];

const MOCK_RESPONSE_TIME = [
  { metric: '평균 응답시간', value: 85, fullMark: 100 },
  { metric: '24시간 내 처리율', value: 92, fullMark: 100 },
  { metric: '사용자 만족도', value: 78, fullMark: 100 },
  { metric: '재신고율 감소', value: 65, fullMark: 100 },
  { metric: '정확한 처리율', value: 88, fullMark: 100 },
];

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  WARNING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

export default function ReportPatternsPage() {
  const handleRefresh = () => {
    toast.success('데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('신고 패턴 리포트를 다운로드합니다.');
  };

  const totalReports = MOCK_REPORT_TREND.reduce((sum, d) => sum + d.reports, 0);
  const resolvedReports = MOCK_REPORT_TREND.reduce((sum, d) => sum + d.resolved, 0);
  const resolutionRate = ((resolvedReports / totalReports) * 100).toFixed(1);

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
            <div className="mt-1 text-2xl font-bold text-red-600">57</div>
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
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={MOCK_REPORT_BY_REASON}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  label={({ reason, percentage }) => `${reason}: ${percentage}%`}
                >
                  {MOCK_REPORT_BY_REASON.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신고 및 처리 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={MOCK_REPORT_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="reports" name="신고" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" name="처리" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_REPORT_BY_HOUR}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" name="신고 수" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-sm text-center text-muted-foreground">
              * 20시-24시에 가장 많은 신고가 발생합니다
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>신고 처리 성과</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={MOCK_RESPONSE_TIME}>
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
            <div className="space-y-3">
              {MOCK_REPEAT_REPORTERS.map((reporter, index) => (
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
            <div className="space-y-3">
              {MOCK_REPEAT_OFFENDERS.map((offender, index) => (
                <div key={index} className="flex items-center justify-between pb-3 border-b last:border-0">
                  <div>
                    <span className="font-medium">{offender.nickname}</span>
                    <p className="text-sm text-muted-foreground">
                      피신고 {offender.receivedReports}건 / 정지 {offender.suspensions}회
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[offender.status]}>
                    {offender.status === 'SUSPENDED' ? '정지중' : offender.status === 'WARNING' ? '경고' : '활성'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Stats */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>처리 결과 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_RESOLUTION_STATS} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="status" type="category" stroke="#6b7280" fontSize={12} width={80} />
              <Tooltip />
              <Bar dataKey="count" name="건수" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
