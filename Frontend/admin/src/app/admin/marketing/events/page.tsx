'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api/events';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, Edit, Eye, Pause, Play, Gift, Calendar, Users, TrendingUp, Sparkles, Heart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Event, EventStatus } from '@/types/event';

const TYPE_LABELS: Record<string, string> = {
  EVENT: '이벤트',
  PROMOTION: '프로모션',
  CAMPAIGN: '캠페인',
};

const TYPE_COLORS: Record<string, string> = {
  EVENT: 'bg-pink-100 text-pink-800',
  PROMOTION: 'bg-purple-100 text-purple-800',
  CAMPAIGN: 'bg-blue-100 text-blue-800',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '진행중',
  SCHEDULED: '예정',
  PAUSED: '일시중지',
  ENDED: '종료',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ENDED: 'bg-gray-100 text-gray-800',
};

const TARGET_LABELS: Record<string, string> = {
  ALL: '전체 사용자',
  NEW_USERS: '신규 사용자',
  PREMIUM: '프리미엄 사용자',
  INACTIVE: '휴면 사용자',
};

export default function EventsManagementPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: pageData, isLoading, refetch } = useQuery({
    queryKey: ['events', { status: statusFilter === 'ALL' ? undefined : statusFilter }],
    queryFn: () =>
      eventsApi.getList({
        status: statusFilter === 'ALL' ? undefined : statusFilter as EventStatus,
        size: 100,
      }).then(r => r.data.data),
  });

  const events = pageData?.content ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: EventStatus }) =>
      eventsApi.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('이벤트 상태를 변경했습니다.');
    },
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  });

  const handleRefresh = () => {
    refetch().then(() => toast.success('이벤트 목록을 새로고침했습니다.'));
  };

  const handleAddEvent = () => {
    toast.success('새 이벤트 생성 모달이 열립니다.');
  };

  const handleToggleStatus = (event: Event) => {
    const newStatus: EventStatus = event.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    statusMutation.mutate({ id: event.id, status: newStatus });
  };

  const filteredEvents = events.filter((event: Event) => {
    const matchesType = typeFilter === 'ALL' || event.type === typeFilter;
    return matchesType;
  });

  const activeCount = events.filter((e: Event) => e.status === 'ACTIVE').length;
  const totalParticipants = events.reduce((sum: number, e: Event) => sum + (e.participantCount ?? 0), 0);
  const totalCompletions = events.reduce((sum: number, e: Event) => sum + (e.completionCount ?? 0), 0);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 성과 비교 차트 데이터
  const performanceData = filteredEvents
    .filter((e: Event) => e.participantCount > 0)
    .slice(0, 6)
    .map((e: Event) => ({
      name: e.title.length > 8 ? e.title.substring(0, 8) + '...' : e.title,
      participants: e.participantCount,
      completions: e.completionCount,
    }));

  return (
    <div>
      <PageHeader
        title="이벤트/프로모션 관리"
        description="마케팅 이벤트 및 프로모션 캠페인 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleAddEvent}>
              <Plus className="mr-2 h-4 w-4" />
              이벤트 생성
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              <span className="text-sm text-muted-foreground">진행중</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{activeCount}</div>
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
              <Gift className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">보상 지급</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{totalCompletions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">평균 전환율</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {totalParticipants > 0
                ? ((totalCompletions / totalParticipants) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      {performanceData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>이벤트 성과 비교</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="participants" name="참여자" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completions" name="완료" fill="#c084fc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="ALL">전체 유형</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="ALL">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Events List */}
      <div className="grid gap-4">
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              등록된 이벤트가 없습니다.
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event: Event) => (
            <Card key={event.id} className={event.status === 'ENDED' ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={TYPE_COLORS[event.type]}>
                        {TYPE_LABELS[event.type]}
                      </Badge>
                      <Badge className={STATUS_COLORS[event.status]}>
                        {STATUS_LABELS[event.status]}
                      </Badge>
                      <Badge variant="outline">
                        {TARGET_LABELS[event.target] ?? event.target}
                      </Badge>
                    </div>
                    <h3 className="mt-2 font-semibold">{event.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    {event.status === 'ACTIVE' ? (
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(event)}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : event.status === 'PAUSED' ? (
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(event)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> 기간
                    </span>
                    <p className="font-medium mt-1">
                      {formatDateTime(event.startDate).split(' ')[0]} ~ {formatDateTime(event.endDate).split(' ')[0]}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> 참여자
                    </span>
                    <p className="font-medium mt-1">{(event.participantCount ?? 0).toLocaleString()}명</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gift className="h-3 w-3" /> 완료
                    </span>
                    <p className="font-medium mt-1">{(event.completionCount ?? 0).toLocaleString()}명</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> 전환율
                    </span>
                    <p className={`font-medium mt-1 ${(event.conversionRate ?? 0) >= 50 ? 'text-green-600' : (event.conversionRate ?? 0) >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {event.conversionRate ?? 0}%
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
