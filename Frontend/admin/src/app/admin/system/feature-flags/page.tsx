'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, ToggleLeft, ToggleRight, Settings, Users, Zap, Shield, Smartphone, Brain, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { FeatureFlag, FeatureFlagCategory } from '@/types/system';

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
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const { data: flags = [], isLoading, refetch } = useQuery<FeatureFlag[]>({
    queryKey: ['feature-flags'],
    queryFn: () => apiClient.get('/api/admin/feature-flags').then(r => r.data.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (flagId: number) =>
      apiClient.patch(`/api/admin/feature-flags/${flagId}/toggle`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('기능 플래그 상태가 변경되었습니다.');
    },
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  });

  const handleRefresh = () => {
    refetch().then(() => toast.success('기능 플래그를 새로고침했습니다.'));
  };

  const handleToggle = (flagId: number) => {
    toggleMutation.mutate(flagId);
  };

  const handleAddFlag = () => {
    toast.success('새 기능 플래그 추가 모달이 열립니다.');
  };

  const filteredFlags = flags.filter(
    flag => categoryFilter === 'ALL' || flag.category === categoryFilter
  );

  const enabledCount = flags.filter(f => f.isEnabled).length;
  const disabledCount = flags.filter(f => !f.isEnabled).length;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <Card key={flag.id} className={`${!flag.isEnabled ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{flag.name}</CardTitle>
                    <Badge className={CATEGORY_COLORS[flag.category]}>
                      {flag.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground font-mono">{flag.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(flag.id)}
                  className={flag.isEnabled ? 'text-green-600' : 'text-gray-400'}
                >
                  {flag.isEnabled ? (
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
                  <p className="font-medium mt-1">{TARGET_LABELS[flag.targetUsers] ?? flag.targetUsers}</p>
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
