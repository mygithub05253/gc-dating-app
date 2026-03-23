'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Target, TrendingUp, Activity, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';

// Mock data for keyword distribution
const keywordData = [
  { category: '감정', positive: 45, negative: 12, neutral: 23 },
  { category: '라이프스타일', positive: 38, negative: 8, neutral: 34 },
  { category: '관계스타일', positive: 52, negative: 15, neutral: 18 },
  { category: '취미', positive: 67, negative: 5, neutral: 28 },
  { category: '가치관', positive: 41, negative: 19, neutral: 25 },
];

// Mock data for similarity distribution histogram
const similarityData = [
  { range: '0.0-0.2', count: 12 },
  { range: '0.2-0.4', count: 45 },
  { range: '0.4-0.6', count: 89 },
  { range: '0.6-0.8', count: 156 },
  { range: '0.8-1.0', count: 78 },
];

// Mock data for emotion radar
const emotionRadar = [
  { emotion: '기쁨', value: 85 },
  { emotion: '설렘', value: 72 },
  { emotion: '평온', value: 68 },
  { emotion: '그리움', value: 45 },
  { emotion: '외로움', value: 32 },
  { emotion: '불안', value: 18 },
];

// Mock data for AI model performance
const modelPerformanceData = [
  { name: 'KcELECTRA', value: 87.3, color: '#8b5cf6', description: '키워드 추출 정확도' },
  { name: 'KoSimCSE', value: 72.5, color: '#3b82f6', description: '매칭 성공률' },
];

// Gauge Chart Component
function GaugeChart({ value, color, label, description }: { value: number; color: string; label: string; description: string }) {
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // 반원
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={radius * 2} height={radius + 20} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
        {/* Center text */}
        <text
          x={radius}
          y={radius - 10}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={color}
        >
          {value}%
        </text>
        <text
          x={radius}
          y={radius + 12}
          textAnchor="middle"
          className="text-xs"
          fill="#6b7280"
        >
          {label}
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AIMonitoringPage() {
  return (
    <div>
      <PageHeader
        title="AI 모니터링"
        description="KcELECTRA 키워드 분석 및 KoSimCSE 매칭 성능 모니터링"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">키워드 정확도</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">87.3%</div>
            <p className="text-xs text-muted-foreground">KcELECTRA 평균</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">매칭 성공률</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">72.5%</div>
            <p className="text-xs text-muted-foreground">교환일기 진행률</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">일일 분석량</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">오늘 처리된 일기</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 유사도</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">0.68</div>
            <p className="text-xs text-muted-foreground">KoSimCSE 스코어</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">추출 키워드</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4,521</div>
            <p className="text-xs text-muted-foreground">오늘 추출된 키워드</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>키워드 카테고리별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={keywordData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="positive" name="긍정" fill="#22c55e" stackId="a" />
                <Bar dataKey="neutral" name="중립" fill="#6b7280" stackId="a" />
                <Bar dataKey="negative" name="부정" fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>매칭 유사도 분포 (KoSimCSE)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={similarityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}건`, '매칭 수']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="매칭 수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>감정 분석 레이더</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={emotionRadar}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="emotion" stroke="#6b7280" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#6b7280" fontSize={10} />
                <Radar
                  name="감정 점수"
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
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 모델 성능 지표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-around">
              {modelPerformanceData.map((model) => (
                <GaugeChart
                  key={model.name}
                  value={model.value}
                  color={model.color}
                  label={model.name}
                  description={model.description}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
