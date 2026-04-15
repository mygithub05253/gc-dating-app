'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, Play, Pause, Eye, TrendingUp, Users, Target, CheckCircle, Brain, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Mock A/B 테스트 데이터
const MOCK_AB_TESTS = [
  {
    id: 1,
    name: '매칭 알고리즘 V2 vs V1',
    description: 'KoSimCSE 기반 새로운 매칭 알고리즘 성능 비교',
    model: 'MATCHING',
    status: 'RUNNING',
    startDate: '2024-03-15T00:00:00',
    endDate: '2024-03-29T23:59:59',
    variants: [
      { name: 'Control (V1)', participants: 5234, conversions: 1234, rate: 23.6 },
      { name: 'Treatment (V2)', participants: 5189, conversions: 1456, rate: 28.1 },
    ],
    primaryMetric: '매칭 성공률',
    statisticalSignificance: 95.2,
    winner: 'Treatment',
    createdBy: '김관리',
  },
  {
    id: 2,
    name: '감정 코칭 메시지 테스트',
    description: 'AI 감정 코칭 메시지 스타일 A vs B',
    model: 'COACHING',
    status: 'RUNNING',
    startDate: '2024-03-18T00:00:00',
    endDate: '2024-04-01T23:59:59',
    variants: [
      { name: 'Style A (공감형)', participants: 3456, conversions: 2345, rate: 67.8 },
      { name: 'Style B (조언형)', participants: 3421, conversions: 2123, rate: 62.1 },
    ],
    primaryMetric: '긍정 반응률',
    statisticalSignificance: 89.5,
    winner: null,
    createdBy: '이운영',
  },
  {
    id: 3,
    name: '키워드 추출 모델 비교',
    description: 'KcELECTRA 파인튜닝 버전 성능 테스트',
    model: 'KEYWORD',
    status: 'COMPLETED',
    startDate: '2024-03-01T00:00:00',
    endDate: '2024-03-14T23:59:59',
    variants: [
      { name: '기존 모델', participants: 8901, conversions: 7654, rate: 86.0 },
      { name: '파인튜닝 v3', participants: 8876, conversions: 7923, rate: 89.3 },
    ],
    primaryMetric: '키워드 정확도',
    statisticalSignificance: 99.1,
    winner: 'Treatment',
    createdBy: '김관리',
  },
  {
    id: 4,
    name: '푸시 알림 개인화 테스트',
    description: 'AI 기반 개인화된 푸시 알림 효과 측정',
    model: 'NOTIFICATION',
    status: 'PAUSED',
    startDate: '2024-03-10T00:00:00',
    endDate: '2024-03-24T23:59:59',
    variants: [
      { name: '일반 알림', participants: 2345, conversions: 456, rate: 19.4 },
      { name: 'AI 개인화', participants: 2312, conversions: 567, rate: 24.5 },
    ],
    primaryMetric: '클릭률',
    statisticalSignificance: 78.3,
    winner: null,
    createdBy: '이운영',
  },
  {
    id: 5,
    name: '외부 연락처 감지 민감도',
    description: '외부 연락처 감지 알고리즘 민감도 조정 테스트',
    model: 'SAFETY',
    status: 'SCHEDULED',
    startDate: '2024-03-25T00:00:00',
    endDate: '2024-04-08T23:59:59',
    variants: [
      { name: '현재 설정', participants: 0, conversions: 0, rate: 0 },
      { name: '민감도 상향', participants: 0, conversions: 0, rate: 0 },
    ],
    primaryMetric: '감지 정확도',
    statisticalSignificance: 0,
    winner: null,
    createdBy: '김관리',
  },
];

// Mock 성과 비교 데이터
const MOCK_PERFORMANCE_COMPARISON = [
  { metric: '매칭 성공률', control: 23.6, treatment: 28.1 },
  { metric: '응답 시간(ms)', control: 450, treatment: 380 },
  { metric: '사용자 만족도', control: 72, treatment: 81 },
  { metric: '재사용률', control: 65, treatment: 78 },
];

const MODEL_LABELS: Record<string, string> = {
  MATCHING: '매칭 알고리즘',
  COACHING: '감정 코칭',
  KEYWORD: '키워드 추출',
  NOTIFICATION: '알림 시스템',
  SAFETY: '안전 감지',
};

const MODEL_COLORS: Record<string, string> = {
  MATCHING: 'bg-blue-100 text-blue-800',
  COACHING: 'bg-purple-100 text-purple-800',
  KEYWORD: 'bg-green-100 text-green-800',
  NOTIFICATION: 'bg-yellow-100 text-yellow-800',
  SAFETY: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  RUNNING: '진행중',
  COMPLETED: '완료',
  PAUSED: '일시중지',
  SCHEDULED: '예정',
};

const STATUS_COLORS: Record<string, string> = {
  RUNNING: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
};

export default function AIABTestPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('A/B 테스트 목록을 새로고침했습니다.');
  };

  const handleCreateTest = () => {
    toast.success('새 A/B 테스트 생성 모달이 열립니다.');
  };

  const handleToggleTest = (testId: number) => {
    toast.success('테스트 상태를 변경했습니다.');
  };

  const filteredTests = MOCK_AB_TESTS.filter(
    test => statusFilter === 'ALL' || test.status === statusFilter
  );

  const runningCount = MOCK_AB_TESTS.filter(t => t.status === 'RUNNING').length;
  const completedCount = MOCK_AB_TESTS.filter(t => t.status === 'COMPLETED').length;
  const totalParticipants = MOCK_AB_TESTS.reduce(
    (sum, t) => sum + t.variants.reduce((s, v) => s + v.participants, 0), 0
  );

  return (
    <div>
      <PageHeader
        title="AI A/B 테스트 관리"
        description="AI 모델 및 알고리즘 A/B 테스트 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleCreateTest}>
              <Plus className="mr-2 h-4 w-4" />
              테스트 생성
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">진행중</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{runningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-muted-foreground">완료</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">총 참여자</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{totalParticipants.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">평균 개선율</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-purple-600">+15.2%</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>주요 테스트 성과 비교 (매칭 알고리즘 V2)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MOCK_PERFORMANCE_COMPARISON}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="control" name="Control (V1)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="treatment" name="Treatment (V2)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
        >
          전체
        </Button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Button
            key={key}
            variant={statusFilter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* A/B Tests List */}
      <div className="grid gap-4">
        {filteredTests.map(test => (
          <Card key={test.id} className={test.status === 'COMPLETED' ? 'opacity-80' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={MODEL_COLORS[test.model]}>
                      <Brain className="mr-1 h-3 w-3" />
                      {MODEL_LABELS[test.model]}
                    </Badge>
                    <Badge className={STATUS_COLORS[test.status]}>
                      {STATUS_LABELS[test.status]}
                    </Badge>
                    {test.winner && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        승자: {test.winner}
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-2 font-semibold">{test.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{test.description}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  {test.status === 'RUNNING' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleToggleTest(test.id)}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : test.status === 'PAUSED' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleToggleTest(test.id)}>
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Variants Comparison */}
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {test.variants.map((variant, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${test.winner === (idx === 0 ? 'Control' : 'Treatment') ? 'border-green-500 bg-green-50' : 'bg-muted/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{variant.name}</span>
                      {test.winner === (idx === 0 ? 'Control' : 'Treatment') && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">참여자</span>
                        <p className="font-medium">{variant.participants.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">전환</span>
                        <p className="font-medium">{variant.conversions.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">전환율</span>
                        <p className={`font-bold ${idx === 1 && variant.rate > test.variants[0].rate ? 'text-green-600' : ''}`}>
                          {variant.rate}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" /> 주요 지표
                  </span>
                  <p className="font-medium mt-1">{test.primaryMetric}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">통계적 유의성</span>
                  <p className={`font-medium mt-1 ${test.statisticalSignificance >= 95 ? 'text-green-600' : test.statisticalSignificance >= 80 ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {test.statisticalSignificance > 0 ? `${test.statisticalSignificance}%` : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">기간</span>
                  <p className="font-medium mt-1">
                    {formatDateTime(test.startDate).split(' ')[0]} ~ {formatDateTime(test.endDate).split(' ')[0]}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">생성자</span>
                  <p className="font-medium mt-1">{test.createdBy}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
