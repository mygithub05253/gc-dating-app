'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Users, UserMinus, UserPlus, Calendar, Download, RefreshCw } from 'lucide-react';
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

// Mock 리텐션 데이터
const MOCK_RETENTION_STATS = {
  dau: 1234,
  wau: 4567,
  mau: 15678,
  dauChange: 12.5,
  newUsersToday: 89,
  churnRate: 5.2,
  d1Retention: 65.3,
  d7Retention: 42.1,
  d30Retention: 28.5,
};

const MOCK_RETENTION_TREND = [
  { date: '3/17', d1: 62, d7: 40, d30: 26 },
  { date: '3/18', d1: 65, d7: 42, d30: 27 },
  { date: '3/19', d1: 63, d7: 41, d30: 28 },
  { date: '3/20', d1: 68, d7: 44, d30: 29 },
  { date: '3/21', d1: 66, d7: 43, d30: 28 },
  { date: '3/22', d1: 65, d7: 42, d30: 28 },
  { date: '3/23', d1: 67, d7: 45, d30: 29 },
];

const MOCK_CHURN_REASONS = [
  { reason: '관심 부족', percentage: 35, color: '#ef4444' },
  { reason: '매칭 불만족', percentage: 25, color: '#f97316' },
  { reason: '시간 부족', percentage: 20, color: '#eab308' },
  { reason: '다른 앱 이용', percentage: 12, color: '#22c55e' },
  { reason: '기타', percentage: 8, color: '#6b7280' },
];

const MOCK_USER_LIFECYCLE = [
  { stage: '가입', count: 15678, percentage: 100 },
  { stage: '프로필 완성', count: 12543, percentage: 80 },
  { stage: '첫 일기 작성', count: 9876, percentage: 63 },
  { stage: '첫 매칭', count: 7234, percentage: 46 },
  { stage: '교환일기 시작', count: 5678, percentage: 36 },
  { stage: '교환일기 완료', count: 3456, percentage: 22 },
];

const MOCK_DAU_TREND = [
  { date: '3/17', dau: 1156, newUsers: 78 },
  { date: '3/18', dau: 1189, newUsers: 82 },
  { date: '3/19', dau: 1203, newUsers: 75 },
  { date: '3/20', dau: 1178, newUsers: 80 },
  { date: '3/21', dau: 1212, newUsers: 85 },
  { date: '3/22', dau: 1198, newUsers: 83 },
  { date: '3/23', dau: 1234, newUsers: 89 },
];

export default function RetentionAnalyticsPage() {
  const handleRefresh = () => {
    toast.success('데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('리텐션 분석 리포트를 다운로드합니다.');
  };

  return (
    <div>
      <PageHeader
        title="이탈/리텐션 분석"
        description="사용자 리텐션 및 이탈 패턴 분석"
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
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">DAU</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_RETENTION_STATS.dau.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              +{MOCK_RETENTION_STATS.dauChange}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">WAU</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_RETENTION_STATS.wau.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500" />
              <span className="text-sm text-muted-foreground">MAU</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_RETENTION_STATS.mau.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">오늘 가입</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_RETENTION_STATS.newUsersToday}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">이탈률</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {MOCK_RETENTION_STATS.churnRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">D1 리텐션</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_RETENTION_STATS.d1Retention}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 리텐션 개요 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-blue-600">
              {MOCK_RETENTION_STATS.d1Retention}%
            </div>
            <p className="mt-2 text-sm text-blue-800">D1 리텐션</p>
            <p className="text-xs text-blue-600">가입 다음날 재방문</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-purple-600">
              {MOCK_RETENTION_STATS.d7Retention}%
            </div>
            <p className="mt-2 text-sm text-purple-800">D7 리텐션</p>
            <p className="text-xs text-purple-600">7일 후 재방문</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-pink-600">
              {MOCK_RETENTION_STATS.d30Retention}%
            </div>
            <p className="mt-2 text-sm text-pink-800">D30 리텐션</p>
            <p className="text-xs text-pink-600">30일 후 재방문</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DAU 트렌드 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>DAU 추이 (최근 7일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={MOCK_DAU_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="dau"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  strokeWidth={2}
                  name="DAU"
                />
                <Area
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#22c55e"
                  fill="#86efac"
                  strokeWidth={2}
                  name="신규 가입"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 리텐션 트렌드 */}
        <Card>
          <CardHeader>
            <CardTitle>리텐션율 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={MOCK_RETENTION_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, '']}
                />
                <Legend />
                <Line type="monotone" dataKey="d1" stroke="#3b82f6" strokeWidth={2} name="D1" dot={{ fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="d7" stroke="#8b5cf6" strokeWidth={2} name="D7" dot={{ fill: '#8b5cf6' }} />
                <Line type="monotone" dataKey="d30" stroke="#ec4899" strokeWidth={2} name="D30" dot={{ fill: '#ec4899' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 이탈 사유 - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>이탈 사유 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={MOCK_CHURN_REASONS}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="percentage"
                    label={({ reason, percentage }) => `${reason}: ${percentage}%`}
                  >
                    {MOCK_CHURN_REASONS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, '비율']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 사용자 라이프사이클 퍼널 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>사용자 라이프사이클 퍼널</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_USER_LIFECYCLE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                <YAxis dataKey="stage" type="category" stroke="#6b7280" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value}% (${props.payload.count.toLocaleString()}명)`,
                    '전환율',
                  ]}
                />
                <Bar dataKey="percentage" fill="#22c55e" radius={[0, 4, 4, 0]} name="전환율">
                  {MOCK_USER_LIFECYCLE.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`rgba(34, 197, 94, ${1 - index * 0.15})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
