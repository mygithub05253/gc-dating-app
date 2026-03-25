'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Edit, Clock, TrendingUp, MessageCircle, Heart, Download, RefreshCw } from 'lucide-react';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

// Mock 일기 분석 데이터
const MOCK_DIARY_STATS = {
  totalDiaries: 156789,
  todayDiaries: 892,
  avgDiaryLength: 456,
  avgWritingTime: 12.5,
  exchangeDiaries: 45678,
  personalDiaries: 111111,
};

const MOCK_EMOTION_DISTRIBUTION = [
  { emotion: '행복', count: 23456, percentage: 25, color: '#fbbf24' },
  { emotion: '감사', count: 18234, percentage: 19, color: '#22c55e' },
  { emotion: '설렘', count: 15678, percentage: 16, color: '#ec4899' },
  { emotion: '편안함', count: 12345, percentage: 13, color: '#3b82f6' },
  { emotion: '뿌듯함', count: 10234, percentage: 11, color: '#8b5cf6' },
  { emotion: '그리움', count: 7890, percentage: 8, color: '#06b6d4' },
  { emotion: '슬픔', count: 4567, percentage: 5, color: '#6b7280' },
  { emotion: '기타', count: 2890, percentage: 3, color: '#9ca3af' },
];

const MOCK_WRITING_TIME = [
  { hour: '06-09', count: 2345 },
  { hour: '09-12', count: 4567 },
  { hour: '12-15', count: 5678 },
  { hour: '15-18', count: 6789 },
  { hour: '18-21', count: 12345 },
  { hour: '21-24', count: 15678 },
  { hour: '00-03', count: 8901 },
  { hour: '03-06', count: 1234 },
];

const MOCK_POPULAR_TOPICS = [
  { topic: '오늘 가장 감사했던 순간', usage: 2345 },
  { topic: '요즘 가장 자주 듣는 노래', usage: 2156 },
  { topic: '스트레스 해소법', usage: 1987 },
  { topic: '최근 도전해본 것', usage: 1678 },
  { topic: '나에게 소중한 사람', usage: 1456 },
];

const MOCK_TONE_DISTRIBUTION = [
  { tone: '감성적인', value: 32 },
  { tone: '밝은', value: 28 },
  { tone: '차분한', value: 18 },
  { tone: '진지한', value: 12 },
  { tone: '유머러스한', value: 10 },
];

const MOCK_WEEKLY_DIARY_TREND = [
  { date: '3/17', personal: 650, exchange: 420 },
  { date: '3/18', personal: 720, exchange: 480 },
  { date: '3/19', personal: 680, exchange: 450 },
  { date: '3/20', personal: 750, exchange: 510 },
  { date: '3/21', personal: 810, exchange: 540 },
  { date: '3/22', personal: 780, exchange: 520 },
  { date: '3/23', personal: 820, exchange: 560 },
];

export default function DiariesAnalyticsPage() {
  const handleRefresh = () => {
    toast.success('데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('일기 분석 리포트를 다운로드합니다.');
  };

  return (
    <div>
      <PageHeader
        title="일기 패턴 분석"
        description="일기 작성 패턴 및 감정 분석"
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
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">총 일기</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_DIARY_STATS.totalDiaries.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">오늘 작성</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_DIARY_STATS.todayDiaries}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">평균 글자수</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_DIARY_STATS.avgDiaryLength}자
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">평균 작성 시간</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_DIARY_STATS.avgWritingTime}분
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-pink-500" />
              <span className="text-sm text-muted-foreground">교환일기</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_DIARY_STATS.exchangeDiaries.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">개인일기</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_DIARY_STATS.personalDiaries.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 일기 작성 추이 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>일기 작성 추이 (최근 7일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={MOCK_WEEKLY_DIARY_TREND}>
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
                  dataKey="personal"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  strokeWidth={2}
                  name="개인일기"
                />
                <Area
                  type="monotone"
                  dataKey="exchange"
                  stroke="#ec4899"
                  fill="#f9a8d4"
                  strokeWidth={2}
                  name="교환일기"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 감정 분포 - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>감정 키워드 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={MOCK_EMOTION_DISTRIBUTION}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="percentage"
                    label={({ emotion, percentage }) => `${emotion}: ${percentage}%`}
                  >
                    {MOCK_EMOTION_DISTRIBUTION.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${props.payload.count.toLocaleString()}건)`,
                      props.payload.emotion,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 글쓰기 톤 - Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>글쓰기 톤 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={MOCK_TONE_DISTRIBUTION}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="tone" stroke="#6b7280" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 40]} stroke="#6b7280" fontSize={10} />
                <Radar
                  name="톤 비율"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#c4b5fd"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, '비율']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 작성 시간대 - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>일기 작성 시간대</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_WRITING_TIME}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()}건`, '작성 수']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="작성 수" />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              * 21시-24시에 가장 많은 일기가 작성됩니다
            </p>
          </CardContent>
        </Card>

        {/* 인기 주제 */}
        <Card>
          <CardHeader>
            <CardTitle>인기 랜덤 주제 TOP 5</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_POPULAR_TOPICS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="topic" type="category" stroke="#6b7280" fontSize={10} width={150} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()}회`, '사용 횟수']}
                />
                <Bar dataKey="usage" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="사용 횟수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
