'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, Edit, Eye, Pause, Play, Gift, Calendar, Users, TrendingUp, Sparkles, Heart } from 'lucide-react';
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

// Mock 이벤트/프로모션 데이터
const MOCK_EVENTS = [
  {
    id: 1,
    title: '봄맞이 교환일기 이벤트',
    description: '봄을 맞아 교환일기 5회 이상 작성 시 특별 배지 지급!',
    type: 'EVENT',
    status: 'ACTIVE',
    startDate: '2024-03-15T00:00:00',
    endDate: '2024-04-15T23:59:59',
    targetAudience: 'ALL',
    participants: 2345,
    completions: 1234,
    conversionRate: 52.6,
    reward: '봄꽃 배지',
    createdBy: '이운영',
  },
  {
    id: 2,
    title: '신규 가입자 웰컴 프로모션',
    description: '신규 가입 후 7일 내 일기 3회 작성 시 프리미엄 3일 무료 체험',
    type: 'PROMOTION',
    status: 'ACTIVE',
    startDate: '2024-03-01T00:00:00',
    endDate: '2024-03-31T23:59:59',
    targetAudience: 'NEW_USERS',
    participants: 567,
    completions: 234,
    conversionRate: 41.3,
    reward: '프리미엄 3일',
    createdBy: '김관리',
  },
  {
    id: 3,
    title: '화이트데이 커플 매칭 이벤트',
    description: '화이트데이 기간 동안 매칭 성공 커플에게 특별 이모지 지급',
    type: 'EVENT',
    status: 'ENDED',
    startDate: '2024-03-10T00:00:00',
    endDate: '2024-03-14T23:59:59',
    targetAudience: 'ALL',
    participants: 4567,
    completions: 156,
    conversionRate: 3.4,
    reward: '화이트데이 이모지',
    createdBy: '이운영',
  },
  {
    id: 4,
    title: '수요일 특별 주제 참여 이벤트',
    description: '매주 수요일 랜덤 주제로 일기 작성 시 포인트 2배',
    type: 'EVENT',
    status: 'ACTIVE',
    startDate: '2024-03-01T00:00:00',
    endDate: '2024-06-30T23:59:59',
    targetAudience: 'ALL',
    participants: 8901,
    completions: 6789,
    conversionRate: 76.3,
    reward: '포인트 2배',
    createdBy: '이운영',
  },
  {
    id: 5,
    title: '벚꽃 시즌 특별 프로모션',
    description: '4월 한정! 프리미엄 구독 시 첫 달 50% 할인',
    type: 'PROMOTION',
    status: 'SCHEDULED',
    startDate: '2024-04-01T00:00:00',
    endDate: '2024-04-30T23:59:59',
    targetAudience: 'ALL',
    participants: 0,
    completions: 0,
    conversionRate: 0,
    reward: '50% 할인',
    createdBy: '김관리',
  },
  {
    id: 6,
    title: '친구 초대 이벤트',
    description: '친구 초대 시 양쪽 모두 포인트 1000P 지급',
    type: 'PROMOTION',
    status: 'PAUSED',
    startDate: '2024-02-01T00:00:00',
    endDate: '2024-12-31T23:59:59',
    targetAudience: 'ALL',
    participants: 345,
    completions: 123,
    conversionRate: 35.7,
    reward: '1000P',
    createdBy: '이운영',
  },
];

// Mock 이벤트 성과 데이터
const MOCK_EVENT_PERFORMANCE = [
  { name: '봄맞이', participants: 2345, completions: 1234 },
  { name: '웰컴', participants: 567, completions: 234 },
  { name: '화이트데이', participants: 4567, completions: 156 },
  { name: '수요일 주제', participants: 8901, completions: 6789 },
];

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
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('이벤트 목록을 새로고침했습니다.');
  };

  const handleAddEvent = () => {
    toast.success('새 이벤트 생성 모달이 열립니다.');
  };

  const handleToggleStatus = (eventId: number) => {
    toast.success('이벤트 상태를 변경했습니다.');
  };

  const filteredEvents = MOCK_EVENTS.filter(event => {
    const matchesType = typeFilter === 'ALL' || event.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const activeCount = MOCK_EVENTS.filter(e => e.status === 'ACTIVE').length;
  const totalParticipants = MOCK_EVENTS.reduce((sum, e) => sum + e.participants, 0);
  const totalCompletions = MOCK_EVENTS.reduce((sum, e) => sum + e.completions, 0);

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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>이벤트 성과 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MOCK_EVENT_PERFORMANCE}>
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
        {filteredEvents.map(event => (
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
                      {TARGET_LABELS[event.targetAudience]}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{event.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  {event.status === 'ACTIVE' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(event.id)}>
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : event.status === 'PAUSED' ? (
                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(event.id)}>
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

              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                  <p className="font-medium mt-1">{event.participants.toLocaleString()}명</p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Gift className="h-3 w-3" /> 완료
                  </span>
                  <p className="font-medium mt-1">{event.completions.toLocaleString()}명</p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> 전환율
                  </span>
                  <p className={`font-medium mt-1 ${event.conversionRate >= 50 ? 'text-green-600' : event.conversionRate >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {event.conversionRate}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Heart className="h-3 w-3" /> 보상
                  </span>
                  <p className="font-medium mt-1">{event.reward}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
