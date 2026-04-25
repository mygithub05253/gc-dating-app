'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Play, Pause, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { BatchJob } from '@/types/system';

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
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading, refetch } = useQuery<BatchJob[]>({
    queryKey: ['batch-jobs'],
    queryFn: () => apiClient.get('/api/admin/batch-jobs').then(r => r.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (jobId: number) =>
      apiClient.patch(`/api/admin/batch-jobs/${jobId}/toggle`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch-jobs'] });
      toast.success('배치 작업 상태가 변경되었습니다.');
    },
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  });

  const runNowMutation = useMutation({
    mutationFn: (jobId: number) =>
      apiClient.post(`/api/admin/batch-jobs/${jobId}/run`).then(r => r.data),
    onSuccess: () => {
      toast.success('배치 작업을 수동 실행합니다.');
    },
    onError: () => toast.error('수동 실행에 실패했습니다.'),
  });

  const handleRefresh = () => {
    refetch().then(() => toast.success('배치 스케줄을 새로고침했습니다.'));
  };

  const handleToggleJob = (jobId: number) => {
    toggleMutation.mutate(jobId);
  };

  const handleRunNow = (jobId: number) => {
    runNowMutation.mutate(jobId);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeCount = jobs.filter(j => j.status === 'ACTIVE').length;
  const pausedCount = jobs.filter(j => j.status === 'PAUSED').length;
  const failedCount = jobs.filter(j => j.lastRunStatus === 'FAILED').length;

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
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              등록된 배치 작업이 없습니다.
            </CardContent>
          </Card>
        ) : (
          jobs.map(job => (
            <Card key={job.id} className={job.lastRunStatus === 'FAILED' ? 'border-red-200' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{job.name}</h3>
                      <Badge className={STATUS_COLORS[job.status]}>
                        {STATUS_LABELS[job.status]}
                      </Badge>
                      {job.lastRunStatus === 'FAILED' && (
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
                      {job.cronExpression}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">마지막 실행</span>
                    <p className={`font-medium mt-1 ${job.lastRunStatus ? RUN_STATUS_COLORS[job.lastRunStatus] : ''}`}>
                      {job.lastRunStatus === 'SUCCESS' ? (
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                      ) : job.lastRunStatus === 'FAILED' ? (
                        <XCircle className="inline h-3 w-3 mr-1" />
                      ) : null}
                      {job.lastRunAt ? formatDateTime(job.lastRunAt) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">다음 실행</span>
                    <p className="font-medium mt-1">
                      {job.nextRunAt ? formatDateTime(job.nextRunAt) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">평균 소요시간</span>
                    <p className="font-medium mt-1">{job.lastRunDuration != null ? formatDuration(job.lastRunDuration) : '-'}</p>
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
          ))
        )}
      </div>
    </div>
  );
}
