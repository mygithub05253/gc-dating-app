'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Users, Clock, TrendingUp, Target, Percent, Download, RefreshCw } from 'lucide-react';
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

// Mock 매칭 분석 데이터
const MOCK_MATCHING_STATS = {
  totalMatches: 15678,
  todayMatches: 156,
  avgMatchTime: 2.3,
  successRate: 72.5,
  exchangeCompletionRate: 68.3,
  avgExchangeRounds: 4.2,
};

const MOCK_TOP_KEYWORDS = [
  { keyword: '감성적인', matchCount: 1234, successRate: 78 },
  { keyword: '활발한', matchCount: 1156, successRate: 75 },
  { keyword: '배려심 있는', matchCount: 1089, successRate: 82 },
  { keyword: '유머러스한', matchCount: 987, successRate: 71 },
  { keyword: '차분한', matchCount: 876, successRate: 74 },
  { keyword: '긍정적인', matchCount: 845, successRate: 79 },
  { keyword: '독립적인', matchCount: 756, successRate: 68 },
  { keyword: '열정적인', matchCount: 698, successRate: 73 },
];

const MOCK_WEEKLY_TREND = [
  { day: '월', matches: 145, success: 105 },
  { day: '화', matches: 178, success: 128 },
  { day: '수', matches: 156, success: 112 },
  { day: '목', matches: 189, success: 142 },
  { day: '금', matches: 212, success: 156 },
  { day: '토', matches: 234, success: 178 },
  { day: '일', matches: 198, success: 145 },
];

const MOCK_AGE_DISTRIBUTION = [
  { ageGroup: '20대 초반', percentage: 35, color: '#ec4899' },
  { ageGroup: '20대 중반', percentage: 40, color: '#8b5cf6' },
  { ageGroup: '20대 후반', percentage: 20, color: '#3b82f6' },
  { ageGroup: '30대 이상', percentage: 5, color: '#22c55e' },
];

const MOCK_HOURLY_DATA = [
  { hour: '0', activity: 15 },
  { hour: '3', activity: 8 },
  { hour: '6', activity: 12 },
  { hour: '9', activity: 25 },
  { hour: '12', activity: 45 },
  { hour: '15', activity: 55 },
  { hour: '18', activity: 78 },
  { hour: '21', activity: 95 },
];

export default function MatchingAnalyticsPage() {
  const handleRefresh = () => {
    toast.success('데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('매칭 분석 리포트를 다운로드합니다.');
  };

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
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <span className="text-sm text-muted-foreground">총 매칭</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_MATCHING_STATS.totalMatches.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">오늘 매칭</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_MATCHING_STATS.todayMatches}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">평균 매칭 시간</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_MATCHING_STATS.avgMatchTime}일
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">매칭 성공률</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_MATCHING_STATS.successRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">교환 완료율</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_MATCHING_STATS.exchangeCompletionRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              <span className="text-sm text-muted-foreground">평균 교환 횟수</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_MATCHING_STATS.avgExchangeRounds}회
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 주간 매칭 트렌드 - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>주간 매칭 트렌드</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={MOCK_WEEKLY_TREND}>
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
                  name="전체 매칭"
                  dot={{ fill: '#ec4899' }}
                />
                <Line
                  type="monotone"
                  dataKey="success"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="성공 매칭"
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 인기 키워드 - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>매칭 인기 키워드 TOP 8</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_TOP_KEYWORDS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="keyword" type="category" stroke="#6b7280" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'matchCount' ? `${value.toLocaleString()}회` : `${value}%`,
                    name === 'matchCount' ? '매칭 수' : '성공률',
                  ]}
                />
                <Bar dataKey="matchCount" fill="#ec4899" radius={[0, 4, 4, 0]} name="매칭 수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 연령대 분포 - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>매칭 연령대 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={MOCK_AGE_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="percentage"
                    label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage}%`}
                  >
                    {MOCK_AGE_DISTRIBUTION.map((entry, index) => (
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

        {/* 매칭 활성 시간대 - Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>매칭 활성 시간대</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_HOURLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v}시`} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, '활성도']}
                  labelFormatter={(label) => `${label}시`}
                />
                <Bar dataKey="activity" fill="#ec4899" radius={[4, 4, 0, 0]} name="활성도" />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              * 21시에 가장 많은 매칭 활동이 이루어집니다
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
