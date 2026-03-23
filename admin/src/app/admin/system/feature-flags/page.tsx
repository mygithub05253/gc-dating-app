'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, ToggleLeft, ToggleRight, Settings, Users, Zap, Shield, Smartphone, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 기능 플래그 데이터
const MOCK_FEATURE_FLAGS = [
  {
    id: 1,
    key: 'MATCHING_V2_ALGORITHM',
    name: '매칭 알고리즘 V2',
    description: 'KoSimCSE 기반 새로운 매칭 알고리즘 활성화',
    category: 'AI',
    enabled: true,
    rolloutPercentage: 100,
    targetUsers: 'ALL',
    createdAt: '2024-03-01T00:00:00',
    updatedAt: '2024-03-20T14:30:00',
    updatedBy: '김관리',
  },
  {
    id: 2,
    key: 'EMOTION_COACHING',
    name: '감정 코칭 기능',
    description: 'AI 기반 감정 코칭 메시지 표시',
    category: 'AI',
    enabled: true,
    rolloutPercentage: 50,
    targetUsers: 'PREMIUM',
    createdAt: '2024-02-15T00:00:00',
    updatedAt: '2024-03-18T10:00:00',
    updatedBy: '이운영',
  },
  {
    id: 3,
    key: 'DARK_MODE',
    name: '다크 모드',
    description: '앱 다크 모드 지원',
    category: 'UI',
    enabled: true,
    rolloutPercentage: 100,
    targetUsers: 'ALL',
    createdAt: '2024-01-10T00:00:00',
    updatedAt: '2024-03-15T09:00:00',
    updatedBy: '김관리',
  },
  {
    id: 4,
    key: 'VOICE_DIARY',
    name: '음성 일기',
    description: '음성 녹음을 통한 일기 작성 기능',
    category: 'FEATURE',
    enabled: false,
    rolloutPercentage: 0,
    targetUsers: 'BETA',
    createdAt: '2024-03-10T00:00:00',
    updatedAt: '2024-03-10T00:00:00',
    updatedBy: '박신입',
  },
  {
    id: 5,
    key: 'PUSH_NOTIFICATION_V2',
    name: '푸시 알림 V2',
    description: '개인화된 푸시 알림 시스템',
    category: 'NOTIFICATION',
    enabled: true,
    rolloutPercentage: 75,
    targetUsers: 'ALL',
    createdAt: '2024-02-20T00:00:00',
    updatedAt: '2024-03-22T16:00:00',
    updatedBy: '이운영',
  },
  {
    id: 6,
    key: 'EXTERNAL_CONTACT_DETECTION',
    name: '외부 연락처 감지',
    description: '일기/채팅에서 외부 연락처 자동 감지',
    category: 'SAFETY',
    enabled: true,
    rolloutPercentage: 100,
    targetUsers: 'ALL',
    createdAt: '2024-01-05T00:00:00',
    updatedAt: '2024-03-01T11:00:00',
    updatedBy: '김관리',
  },
  {
    id: 7,
    key: 'PREMIUM_SUBSCRIPTION',
    name: '프리미엄 구독',
    description: '프리미엄 구독 결제 시스템',
    category: 'PAYMENT',
    enabled: false,
    rolloutPercentage: 0,
    targetUsers: 'NONE',
    createdAt: '2024-03-15T00:00:00',
    updatedAt: '2024-03-15T00:00:00',
    updatedBy: '김관리',
  },
  {
    id: 8,
    key: 'WEEKLY_RANDOM_TOPIC',
    name: '수요일 랜덤 주제',
    description: '매주 수요일 특별 랜덤 주제 제공',
    category: 'FEATURE',
    enabled: true,
    rolloutPercentage: 100,
    targetUsers: 'ALL',
    createdAt: '2024-02-01T00:00:00',
    updatedAt: '2024-03-20T08:00:00',
    updatedBy: '이운영',
  },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  AI: <Brain className="h-4 w-4" />,
  UI: <Smartphone className="h-4 w-4" />,
  FEATURE: <Zap className="h-4 w-4" />,
  NOTIFICATION: <Settings className="h-4 w-4" />,
  SAFETY: <Shield className="h-4 w-4" />,
  PAYMENT: <Users className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  AI: 'bg-purple-100 text-purple-800',
  UI: 'bg-blue-100 text-blue-800',
  FEATURE: 'bg-green-100 text-green-800',
  NOTIFICATION: 'bg-yellow-100 text-yellow-800',
  SAFETY: 'bg-red-100 text-red-800',
  PAYMENT: 'bg-orange-100 text-orange-800',
};

const TARGET_LABELS: Record<string, string> = {
  ALL: '전체 사용자',
  PREMIUM: '프리미엄 사용자',
  BETA: '베타 테스터',
  NONE: '비활성',
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState(MOCK_FEATURE_FLAGS);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('기능 플래그를 새로고침했습니다.');
  };

  const handleToggle = (flagId: number) => {
    setFlags(prev =>
      prev.map(flag =>
        flag.id === flagId
          ? { ...flag, enabled: !flag.enabled, updatedAt: new Date().toISOString() }
          : flag
      )
    );
    toast.success('기능 플래그 상태가 변경되었습니다.');
  };

  const handleAddFlag = () => {
    toast.success('새 기능 플래그 추가 모달이 열립니다.');
  };

  const filteredFlags = flags.filter(
    flag => categoryFilter === 'ALL' || flag.category === categoryFilter
  );

  const enabledCount = flags.filter(f => f.enabled).length;
  const disabledCount = flags.filter(f => !f.enabled).length;

  return (
    <div>
      <PageHeader
        title="기능 플래그 관리"
        description="앱 기능의 점진적 배포 및 A/B 테스트 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleAddFlag}>
              <Plus className="mr-2 h-4 w-4" />
              플래그 추가
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">전체 플래그</div>
            <div className="mt-1 text-2xl font-bold">{flags.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ToggleRight className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">활성화</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{enabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ToggleLeft className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-muted-foreground">비활성화</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-gray-500">{disabledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">부분 배포</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {flags.filter(f => f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <Button
          variant={categoryFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('ALL')}
        >
          전체
        </Button>
        {Object.keys(CATEGORY_COLORS).map(category => (
          <Button
            key={category}
            variant={categoryFilter === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategoryFilter(category)}
            className="flex items-center gap-1"
          >
            {CATEGORY_ICONS[category]}
            {category}
          </Button>
        ))}
      </div>

      {/* Feature Flags Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredFlags.map(flag => (
          <Card key={flag.id} className={`${!flag.enabled ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{flag.name}</CardTitle>
                    <Badge className={CATEGORY_COLORS[flag.category]}>
                      {flag.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">{flag.key}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(flag.id)}
                  className={flag.enabled ? 'text-green-600' : 'text-gray-400'}
                >
                  {flag.enabled ? (
                    <ToggleRight className="h-6 w-6" />
                  ) : (
                    <ToggleLeft className="h-6 w-6" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{flag.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">배포율</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${flag.rolloutPercentage}%` }}
                      />
                    </div>
                    <span className="font-medium">{flag.rolloutPercentage}%</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">대상</span>
                  <p className="font-medium mt-1">{TARGET_LABELS[flag.targetUsers]}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
                <span>수정: {formatDateTime(flag.updatedAt)}</span>
                <span>by {flag.updatedBy}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
