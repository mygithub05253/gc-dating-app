'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, ChevronDown, ChevronUp, RefreshCw, ImagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Tutorial, TutorialType } from '@/types/content';

const MOCK_TUTORIALS: Tutorial[] = [
  {
    id: 1,
    type: 'ONBOARDING',
    title: '앱 시작하기',
    description: 'Ember 앱을 처음 사용하는 분들을 위한 전체 온보딩 가이드입니다.',
    isActive: true,
    version: 'v1.2',
    updatedAt: '2024-03-10T09:00:00',
    steps: [
      {
        stepOrder: 1,
        title: '회원 가입',
        description: '이메일 또는 소셜 로그인으로 간편하게 가입하세요. 가입 후 이메일 인증을 완료하면 서비스를 이용할 수 있습니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+1',
      },
      {
        stepOrder: 2,
        title: '프로필 작성',
        description: '닉네임, 나이, 사진을 등록해주세요. 프로필이 충실할수록 좋은 매칭 확률이 높아집니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+2',
      },
      {
        stepOrder: 3,
        title: '취향 선택',
        description: '관심사, 라이프스타일, 선호하는 상대 조건을 선택하세요. AI가 이 정보를 바탕으로 최적의 상대를 추천합니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+3',
      },
      {
        stepOrder: 4,
        title: '첫 매칭',
        description: '매칭 버튼을 눌러 AI가 추천한 상대방과 연결되세요. 매칭은 하루 1회 진행됩니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+4',
      },
      {
        stepOrder: 5,
        title: '교환일기 시작',
        description: '매칭된 상대방과 주제를 기반으로 서로의 일기를 교환하며 자연스럽게 알아가세요.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+5',
      },
    ],
  },
  {
    id: 2,
    type: 'EXCHANGE_DIARY',
    title: '교환일기 사용법',
    description: '교환일기를 처음 작성하는 분들을 위한 상세 가이드입니다.',
    isActive: true,
    version: 'v1.0',
    updatedAt: '2024-02-20T14:00:00',
    steps: [
      {
        stepOrder: 1,
        title: '주제 선택',
        description: 'AI가 추천하는 랜덤 주제 중 하나를 선택하거나, 자유 주제로 일기를 시작할 수 있습니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+1',
      },
      {
        stepOrder: 2,
        title: '일기 작성',
        description: '선택한 주제를 바탕으로 솔직한 일기를 작성하세요. 최소 100자 이상 작성해야 AI 분석이 가능합니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+2',
      },
      {
        stepOrder: 3,
        title: '상대방 일기 읽기',
        description: '상대방이 일기를 제출하면 알림이 옵니다. 상대방의 일기를 읽고 공감 이모지나 짧은 응원 메시지를 남길 수 있습니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+3',
      },
      {
        stepOrder: 4,
        title: '리포트 확인',
        description: '교환일기가 완주되면 AI가 두 사람의 감정 패턴, 공통 키워드, 글쓰기 온도 유사도를 분석한 리포트를 제공합니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+4',
      },
    ],
  },
  {
    id: 3,
    type: 'MATCHING',
    title: '매칭 시스템 안내',
    description: 'Ember의 AI 매칭 원리와 선호 설정 방법을 안내합니다.',
    isActive: true,
    version: 'v1.1',
    updatedAt: '2024-03-01T11:00:00',
    steps: [
      {
        stepOrder: 1,
        title: '매칭 원리',
        description: 'KcELECTRA 모델이 작성한 일기를 분석해 성격 태그, 감정 태그, 라이프스타일 태그를 추출합니다. 유사도 점수가 높은 상대와 매칭됩니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+1',
      },
      {
        stepOrder: 2,
        title: '선호 설정',
        description: '나이대, 직업군, 라이프스타일 등 원하는 상대 조건을 세밀하게 설정할 수 있습니다. 설정이 없으면 AI가 자동으로 최적 후보를 선택합니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+2',
      },
      {
        stepOrder: 3,
        title: '매칭 결과 확인',
        description: '매칭 완료 알림을 받으면 상대방의 일기 미리보기와 AI 분석 매칭 점수를 확인할 수 있습니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+3',
      },
    ],
  },
  {
    id: 4,
    type: 'PROFILE',
    title: '프로필 설정 가이드',
    description: '매력적인 프로필을 만들기 위한 단계별 안내입니다.',
    isActive: false,
    version: 'v1.0',
    updatedAt: '2024-01-15T10:00:00',
    steps: [
      {
        stepOrder: 1,
        title: '기본 정보 입력',
        description: '닉네임, 생년월일, 성별, 직업을 정확하게 입력하세요. 허위 정보 입력 시 계정 제재를 받을 수 있습니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+1',
      },
      {
        stepOrder: 2,
        title: '사진 등록',
        description: '본인 사진 1장 이상을 등록해주세요. AI가 사진을 검토하며, 불적절한 사진은 자동으로 차단됩니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+2',
      },
      {
        stepOrder: 3,
        title: '관심사 선택',
        description: '취미, 음식, 여가 활동 등 관심사 태그를 최소 3개 이상 선택하세요. 공통 관심사가 많을수록 매칭 점수가 높아집니다.',
        imageUrl: 'https://via.placeholder.com/400x300?text=Step+3',
      },
    ],
  },
];

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

export default function TutorialsPage() {
  const { hasPermission } = useAuthStore();
  const [tutorials, setTutorials] = useState<Tutorial[]>(MOCK_TUTORIALS);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleActive = (id: number) => {
    setTutorials(tutorials.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)));
    toast.success('활성 상태가 변경되었습니다.');
  };

  const handleAddTutorial = () => {
    toast.success('새 튜토리얼 추가 모달이 열립니다.');
  };

  const handleChangeImage = (tutorialId: number, stepOrder: number) => {
    toast.success(`튜토리얼 ${tutorialId} - Step ${stepOrder} 이미지 변경 모달이 열립니다.`);
  };

  const filteredTutorials = activeTab === 'ALL'
    ? tutorials
    : tutorials.filter((t) => t.type === activeTab);

  const totalSteps = tutorials.reduce((sum, t) => sum + t.steps.length, 0);
  const avgSteps = tutorials.length > 0
    ? (totalSteps / tutorials.length).toFixed(1)
    : '0';

  const tabs: FilterTab[] = ['ALL', 'ONBOARDING', 'EXCHANGE_DIARY', 'MATCHING', 'PROFILE'];

  return (
    <div>
      <PageHeader
        title="튜토리얼 관리"
        description="앱 내 튜토리얼 콘텐츠를 관리합니다"
        actions={
          hasPermission('ADMIN') && (
            <Button onClick={handleAddTutorial}>
              <Plus className="mr-2 h-4 w-4" />
              새 튜토리얼 추가
            </Button>
          )
        }
      />

      <MockPageNotice message="튜토리얼 도메인 백엔드 API 준비 중입니다." />

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
        {filteredTutorials.map((tutorial) => (
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
                      onClick={() => toggleActive(tutorial.id)}
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
        ))}
      </div>
    </div>
  );
}
