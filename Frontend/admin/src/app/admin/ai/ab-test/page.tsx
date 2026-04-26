'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiApi } from '@/lib/api/ai';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, Play, Pause, Eye, TrendingUp, Users, Target, CheckCircle, Brain, Sparkles, Loader2 } from 'lucide-react';
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
import type { ABTestResult, ABTestStatus, ABTestModel } from '@/types/ai';

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

  const { data: rawData, isLoading, refetch } = useQuery<{ active?: boolean; results?: ABTestResult[] } | ABTestResult[]>({
    queryKey: ['ab-test-results'],
    queryFn: () => aiApi.getABTestResults().then(r => r.data.data),
  });
  const tests: ABTestResult[] = Array.isArray(rawData) ? rawData : (rawData?.results ?? []);

  const handleRefresh = () => {
    refetch().then(() => toast.success('A/B 테스트 목록을 새로고침했습니다.'));
  };

  const handleCreateTest = () => {
    toast.success('새 A/B 테스트 생성 모달이 열립니다.');
  };

  const filteredTests = tests.filter(
    test => statusFilter === 'ALL' || test.status === statusFilter
  );

  const runningCount = tests.filter(t => t.status === 'RUNNING').length;
  const completedCount = tests.filter(t => t.status === 'COMPLETED').length;
  const totalParticipants = tests.reduce(
    (sum, t) => sum + (t.groups ?? []).reduce((s, g) => s + g.userCount, 0), 0
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 첫 번째 RUNNING 테스트 성과 비교 데이터
  const runningTest = tests.find(t => t.status === 'RUNNING');
  const runningGroups = runningTest?.groups ?? [];
  const performanceData = runningTest
    ? [
        {
          metric: '매칭률',
          groupA: (runningGroups[0]?.matchRate ?? 0) * 100,
          groupB: (runningGroups[1]?.matchRate ?? 0) * 100,
        },
        {
          metric: '교환 완료율',
          groupA: (runningGroups[0]?.exchangeCompletionRate ?? 0) * 100,
          groupB: (runningGroups[1]?.exchangeCompletionRate ?? 0) * 100,
        },
        {
          metric: '유사도 점수',
          groupA: (runningGroups[0]?.avgMatchScore ?? 0) * 100,
          groupB: (runningGroups[1]?.avgMatchScore ?? 0) * 100,
        },
      ]
    : [];

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
              <span className="text-sm text-muted-foreground">전체 테스트</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{tests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison Chart */}
      {performanceData.length > 0 && runningTest && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>주요 테스트 성과 비교 ({MODEL_LABELS[runningTest.modelType]})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="groupA" name={`Group A (${runningGroups[0]?.modelVersion ?? 'A'})`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="groupB" name={`Group B (${runningGroups[1]?.modelVersion ?? 'B'})`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
        {filteredTests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              등록된 A/B 테스트가 없습니다.
            </CardContent>
          </Card>
        ) : (
          filteredTests.map(test => (
            <Card key={test.testId} className={test.status === 'COMPLETED' ? 'opacity-80' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={MODEL_COLORS[test.modelType]}>
                        <Brain className="mr-1 h-3 w-3" />
                        {MODEL_LABELS[test.modelType]}
                      </Badge>
                      <Badge className={STATUS_COLORS[test.status]}>
                        {STATUS_LABELS[test.status]}
                      </Badge>
                      {test.isSignificant && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          통계적 유의
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-2 font-semibold">Test #{test.testId} - {MODEL_LABELS[test.modelType]}</h3>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Groups Comparison */}
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  {(test.groups ?? []).map((group, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${test.isSignificant && idx === 1 && (group.matchRate ?? 0) > (test.groups?.[0]?.matchRate ?? 0) ? 'border-green-500 bg-green-50' : 'bg-muted/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Group {group.groupName} ({group.modelVersion})</span>
                        {test.isSignificant && idx === 1 && (group.matchRate ?? 0) > (test.groups?.[0]?.matchRate ?? 0) && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">참여자</span>
                          <p className="font-medium">{(group.userCount ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">매칭률</span>
                          <p className="font-medium">{((group.matchRate ?? 0) * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">교환 완료율</span>
                          <p className={`font-bold ${idx === 1 && (group.exchangeCompletionRate ?? 0) > (test.groups?.[0]?.exchangeCompletionRate ?? 0) ? 'text-green-600' : ''}`}>
                            {((group.exchangeCompletionRate ?? 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">p-value</span>
                    <p className={`font-medium mt-1 ${(test.pValue ?? 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                      {(test.pValue ?? 0).toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">기간</span>
                    <p className="font-medium mt-1">
                      {test.period?.startDate ?? '-'} ~ {test.period?.endDate ?? '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">가중치 설정</span>
                    <p className="font-medium mt-1">
                      키워드: {test.currentWeights?.idealKeywordWeight ?? '-'} / 유사도: {test.currentWeights?.koSimCSEWeight ?? '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
