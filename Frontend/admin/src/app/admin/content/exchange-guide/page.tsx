'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, ChevronDown, ChevronUp, RefreshCw, ImagePlus, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminTutorialsList, useUpdateAdminTutorial } from '@/hooks/useAdminTutorials';
import type { Tutorial, TutorialType } from '@/types/content';

const TYPE_LABELS: Record<TutorialType, string> = {
  ONBOARDING: '온보딩',
  EXCHANGE_DIARY: '교환일기',
  MATCHING: '매칭',
  PROFILE: '프로필',
};

const TYPE_COLORS: Record<TutorialType, string> = {
  ONBOARDING: 'bg-blue-100 text-blue-800',
  EXCHANGE_DIARY: 'bg-purple-100 text-purple-800',
  MATCHING: 'bg-green-100 text-green-800',
  PROFILE: 'bg-orange-100 text-orange-800',
};

type FilterTab = 'ALL' | TutorialType;

export default function ExchangeGuidePage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: pageData, isLoading, isError } = useAdminTutorialsList({});
  const updateMutation = useUpdateAdminTutorial();

  const tutorials: Tutorial[] = pageData?.content ?? [];

  const toggleActive = (tutorial: Tutorial) => {
    updateMutation.mutate({
      id: tutorial.id,
      body: { isActive: !tutorial.isActive },
    });
  };

  const handleAddTutorial = () => {
    toast.success('새 튜토리얼 추가 모달이 열립니다.');
  };

  const handleChangeImage = (tutorialId: number, stepOrder: number) => {
    toast.success(`튜토리얼 ${tutorialId} - Step ${stepOrder} 이미지 변경 모달이 열립니다.`);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tutorials-list'] });
    toast.success('튜토리얼 목록을 새로고침했습니다.');
  };

  const filteredTutorials = activeTab === 'ALL'
    ? tutorials
    : tutorials.filter((t) => t.type === activeTab);

  const totalSteps = tutorials.reduce((sum, t) => sum + t.steps.length, 0);
  const avgSteps = tutorials.length > 0
    ? (totalSteps / tutorials.length).toFixed(1)
    : '0';

  const tabs: FilterTab[] = ['ALL', 'ONBOARDING', 'EXCHANGE_DIARY', 'MATCHING', 'PROFILE'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">가이드 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">가이드 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="교환일기 가이드 관리"
        description="교환일기 가이드 콘텐츠를 관리합니다"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button onClick={handleAddTutorial}>
                <Plus className="mr-2 h-4 w-4" />
                새 튜토리얼 추가
              </Button>
            </div>
          )
        }
      />

      {/* 통계 카드 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{tutorials.length}</div>
            <p className="text-sm text-muted-foreground">전체 튜토리얼</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {tutorials.filter((t) => t.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">활성 튜토리얼</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalSteps}</div>
            <p className="text-sm text-muted-foreground">총 스텝 수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{avgSteps}</div>
            <p className="text-sm text-muted-foreground">평균 스텝 수</p>
          </CardContent>
        </Card>
      </div>

      {/* 타입 탭 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'ALL' ? '전체' : TYPE_LABELS[tab as TutorialType]}
          </Button>
        ))}
      </div>

      {/* 튜토리얼 카드 그리드 */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredTutorials.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              등록된 가이드가 없습니다.
            </CardContent>
          </Card>
        ) : (
          filteredTutorials.map((tutorial) => (
            <Card key={tutorial.id} className={!tutorial.isActive ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className={TYPE_COLORS[tutorial.type]}>
                        {TYPE_LABELS[tutorial.type]}
                      </Badge>
                      {!tutorial.isActive && (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{tutorial.version}</span>
                    </div>
                    <CardTitle className="text-base">{tutorial.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{tutorial.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>스텝 {tutorial.steps.length}개</span>
                    <span>업데이트: {formatDateTime(tutorial.updatedAt)}</span>
                  </div>
                  <div className="flex gap-2">
                    {hasPermission('ADMIN') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(tutorial)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedId(expandedId === tutorial.id ? null : tutorial.id)
                      }
                    >
                      스텝 보기
                      {expandedId === tutorial.id ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 스텝 리스트 */}
                {expandedId === tutorial.id && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {tutorial.steps.map((step) => (
                      <div key={step.stepOrder} className="flex gap-4">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {step.stepOrder}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                          <div className="mt-2 flex items-center gap-3">
                            <img
                              src={step.imageUrl}
                              alt={`Step ${step.stepOrder}`}
                              className="h-24 w-32 rounded object-cover"
                            />
                            {hasPermission('ADMIN') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleChangeImage(tutorial.id, step.stepOrder)}
                              >
                                <ImagePlus className="mr-1 h-4 w-4" />
                                이미지 변경
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
