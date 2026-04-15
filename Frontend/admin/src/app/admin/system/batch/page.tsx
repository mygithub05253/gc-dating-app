'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Play, Pause, Clock, CheckCircle, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 배치 스케줄 데이터
const MOCK_BATCH_JOBS = [
  {
    id: 1,
    name: '일일 매칭 알고리즘 실행',
    description: '모든 활성 사용자에 대해 KoSimCSE 기반 매칭 계산',
    cronExpression: '0 0 3 * * ?',
    scheduleText: '매일 03:00',
    status: 'ACTIVE',
    lastRun: '2024-03-23T03:00:00',
    lastStatus: 'SUCCESS',
    lastDuration: 1234,
    nextRun: '2024-03-24T03:00:00',
    avgDuration: 1150,
    successRate: 99.2,
  },
  {
    id: 2,
    name: '키워드 분석 배치',
    description: 'KcELECTRA를 통한 일기 키워드 분석',
    cronExpression: '0 */30 * * * ?',
    scheduleText: '30분마다',
    status: 'ACTIVE',
    lastRun: '2024-03-23T10:30:00',
    lastStatus: 'SUCCESS',
    lastDuration: 456,
    nextRun: '2024-03-23T11:00:00',
    avgDuration: 420,
    successRate: 98.5,
  },
  {
    id: 3,
    name: '비활성 사용자 정리',
    description: '90일 이상 미접속 사용자 휴면 처리',
    cronExpression: '0 0 4 * * ?',
    scheduleText: '매일 04:00',
    status: 'ACTIVE',
    lastRun: '2024-03-23T04:00:00',
    lastStatus: 'SUCCESS',
    lastDuration: 89,
    nextRun: '2024-03-24T04:00:00',
    avgDuration: 95,
    successRate: 100,
  },
  {
    id: 4,
    name: '푸시 알림 발송',
    description: '개인화된 푸시 알림 일괄 발송',
    cronExpression: '0 0 9,18 * * ?',
    scheduleText: '매일 09:00, 18:00',
    status: 'ACTIVE',
    lastRun: '2024-03-23T09:00:00',
    lastStatus: 'SUCCESS',
    lastDuration: 567,
    nextRun: '2024-03-23T18:00:00',
    avgDuration: 540,
    successRate: 97.8,
  },
  {
    id: 5,
    name: '통계 데이터 집계',
    description: '일간/주간/월간 통계 데이터 집계',
    cronExpression: '0 0 1 * * ?',
    scheduleText: '매일 01:00',
    status: 'ACTIVE',
    lastRun: '2024-03-23T01:00:00',
    lastStatus: 'SUCCESS',
    lastDuration: 2345,
    nextRun: '2024-03-24T01:00:00',
    avgDuration: 2100,
    successRate: 99.8,
  },
  {
    id: 6,
    name: '외부 연락처 스캔',
    description: '신규 일기/채팅에서 외부 연락처 패턴 감지',
    cronExpression: '0 */15 * * * ?',
    scheduleText: '15분마다',
    status: 'ACTIVE',
    lastRun: '2024-03-23T10:45:00',
    lastStatus: 'SUCCESS',
    lastDuration: 123,
    nextRun: '2024-03-23T11:00:00',
    avgDuration: 110,
    successRate: 99.9,
  },
  {
    id: 7,
    name: '백업 작업',
    description: '데이터베이스 전체 백업',
    cronExpression: '0 0 2 * * ?',
    scheduleText: '매일 02:00',
    status: 'PAUSED',
    lastRun: '2024-03-22T02:00:00',
    lastStatus: 'FAILED',
    lastDuration: 3456,
    nextRun: null,
    avgDuration: 3200,
    successRate: 95.5,
  },
  {
    id: 8,
    name: '수요일 특별 주제 배포',
    description: '매주 수요일 랜덤 주제 자동 배포',
    cronExpression: '0 0 0 ? * WED',
    scheduleText: '매주 수요일 00:00',
    status: 'ACTIVE',
    lastRun: '2024-03-20T00:00:00',
    lastStatus: 'SUCCESS',
    lastDuration: 45,
    nextRun: '2024-03-27T00:00:00',
    avgDuration: 50,
    successRate: 100,
  },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  DISABLED: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '활성',
  PAUSED: '일시중지',
  DISABLED: '비활성',
};

const RUN_STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-green-600',
  FAILED: 'text-red-600',
  RUNNING: 'text-blue-600',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}초`;
  return `${(ms / 60000).toFixed(1)}분`;
}

export default function BatchSchedulePage() {
  const [jobs, setJobs] = useState(MOCK_BATCH_JOBS);

  const handleRefresh = () => {
    toast.success('배치 스케줄을 새로고침했습니다.');
  };

  const handleToggleJob = (jobId: number) => {
    setJobs(prev =>
      prev.map(job =>
        job.id === jobId
          ? { ...job, status: job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : job
      )
    );
    toast.success('배치 작업 상태가 변경되었습니다.');
  };

  const handleRunNow = (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    toast.success(`"${job?.name}" 작업을 수동 실행합니다.`);
  };

  const activeCount = jobs.filter(j => j.status === 'ACTIVE').length;
  const pausedCount = jobs.filter(j => j.status === 'PAUSED').length;
  const failedCount = jobs.filter(j => j.lastStatus === 'FAILED').length;

  return (
    <div>
      <PageHeader
        title="배치 스케줄 관리"
        description="자동화된 배치 작업 스케줄 모니터링 및 관리"
        actions={
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 작업</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">활성</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">일시중지</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{pausedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">최근 실패</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Jobs List */}
      <div className="grid gap-4">
        {jobs.map(job => (
          <Card key={job.id} className={job.lastStatus === 'FAILED' ? 'border-red-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{job.name}</h3>
                    <Badge className={STATUS_COLORS[job.status]}>
                      {STATUS_LABELS[job.status]}
                    </Badge>
                    {job.lastStatus === 'FAILED' && (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        마지막 실행 실패
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunNow(job.id)}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    지금 실행
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleJob(job.id)}
                  >
                    {job.status === 'ACTIVE' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">스케줄</span>
                  <p className="font-medium flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {job.scheduleText}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{job.cronExpression}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">마지막 실행</span>
                  <p className={`font-medium mt-1 ${RUN_STATUS_COLORS[job.lastStatus]}`}>
                    {job.lastStatus === 'SUCCESS' ? (
                      <CheckCircle className="inline h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="inline h-3 w-3 mr-1" />
                    )}
                    {formatDateTime(job.lastRun)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">다음 실행</span>
                  <p className="font-medium mt-1">
                    {job.nextRun ? formatDateTime(job.nextRun) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">평균 소요시간</span>
                  <p className="font-medium mt-1">{formatDuration(job.avgDuration)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">성공률</span>
                  <p className={`font-medium mt-1 ${job.successRate >= 99 ? 'text-green-600' : job.successRate >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {job.successRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
