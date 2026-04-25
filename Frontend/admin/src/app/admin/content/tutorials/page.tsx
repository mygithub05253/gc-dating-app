'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  BookOpen,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';

type TutorialType = 'ONBOARDING' | 'EXCHANGE_DIARY' | 'MATCHING' | 'PROFILE';

type MockTutorial = {
  id: number;
  type: TutorialType;
  title: string;
  description: string;
  isActive: boolean;
  stepsCount: number;
  version: string;
  updatedAt: string;
};

const TUTORIAL_TYPE_LABELS: Record<TutorialType, string> = {
  ONBOARDING: '온보딩',
  EXCHANGE_DIARY: '교환일기',
  MATCHING: '매칭',
  PROFILE: '프로필',
};

const TUTORIAL_TYPE_COLORS: Record<TutorialType, string> = {
  ONBOARDING: 'bg-blue-50 text-blue-700 border-blue-200',
  EXCHANGE_DIARY: 'bg-orange-50 text-orange-700 border-orange-200',
  MATCHING: 'bg-purple-50 text-purple-700 border-purple-200',
  PROFILE: 'bg-green-50 text-green-700 border-green-200',
};

const MOCK_TUTORIALS: MockTutorial[] = [
  {
    id: 1,
    type: 'ONBOARDING',
    title: 'Ember 시작하기',
    description: '처음 가입하는 사용자를 위한 튜토리얼입니다.',
    isActive: true,
    stepsCount: 5,
    version: '1.0',
    updatedAt: '2024-03-01T10:00:00',
  },
  {
    id: 2,
    type: 'EXCHANGE_DIARY',
    title: '교환일기 가이드',
    description: '교환일기 작성 방법과 턴 기반 시스템을 안내합니다.',
    isActive: true,
    stepsCount: 4,
    version: '1.0',
    updatedAt: '2024-03-05T14:00:00',
  },
  {
    id: 3,
    type: 'MATCHING',
    title: '매칭 시스템 안내',
    description: 'AI 매칭 알고리즘과 추천 방식을 설명합니다.',
    isActive: true,
    stepsCount: 3,
    version: '1.1',
    updatedAt: '2024-03-10T09:00:00',
  },
  {
    id: 4,
    type: 'PROFILE',
    title: '프로필 설정 가이드',
    description: '프로필을 매력적으로 설정하는 방법을 안내합니다.',
    isActive: false,
    stepsCount: 3,
    version: '1.0',
    updatedAt: '2024-02-20T11:00:00',
  },
];

const TUTORIAL_TYPES: TutorialType[] = ['ONBOARDING', 'EXCHANGE_DIARY', 'MATCHING', 'PROFILE'];

interface TutorialFormData {
  type: TutorialType;
  title: string;
  description: string;
  isActive: boolean;
  version: string;
}

const INITIAL_FORM: TutorialFormData = {
  type: 'ONBOARDING',
  title: '',
  description: '',
  isActive: true,
  version: '1.0',
};

export default function TutorialsPage() {
  const { hasPermission } = useAuthStore();
  const [tutorials, setTutorials] = useState<MockTutorial[]>(MOCK_TUTORIALS);
  const [typeFilter, setTypeFilter] = useState<'ALL' | TutorialType>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TutorialFormData>(INITIAL_FORM);

  const displayTutorials = tutorials.filter(
    (t) => typeFilter === 'ALL' || t.type === typeFilter,
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (tutorial: MockTutorial) => {
    setEditingId(tutorial.id);
    setForm({
      type: tutorial.type,
      title: tutorial.title,
      description: tutorial.description,
      isActive: tutorial.isActive,
      version: tutorial.version,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('제목과 설명을 모두 입력해주세요.');
      return;
    }
    const now = new Date().toISOString();

    if (editingId !== null) {
      setTutorials((prev) =>
        prev.map((t) =>
          t.id === editingId ? { ...t, ...form, updatedAt: now } : t,
        ),
      );
      toast.success('튜토리얼이 수정되었습니다.');
    } else {
      const newTutorial: MockTutorial = {
        id: Math.max(0, ...tutorials.map((t) => t.id)) + 1,
        ...form,
        stepsCount: 0,
        updatedAt: now,
      };
      setTutorials((prev) => [...prev, newTutorial]);
      toast.success('튜토리얼이 등록되었습니다.');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    if (!confirm('이 튜토리얼을 삭제하시겠습니까?')) return;
    setTutorials((prev) => prev.filter((t) => t.id !== id));
    toast.success('튜토리얼이 삭제되었습니다.');
  };

  const handleToggleActive = (id: number) => {
    setTutorials((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
    );
    const target = tutorials.find((t) => t.id === id);
    toast.success(target?.isActive ? '튜토리얼이 비활성화되었습니다.' : '튜토리얼이 활성화되었습니다.');
  };

  const activeCount = tutorials.filter((t) => t.isActive).length;

  return (
    <div>
      <PageHeader
        title="튜토리얼 관리"
        description="앱 내 튜토리얼 페이지 등록 및 관리"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success('튜토리얼 목록을 새로고침했습니다.')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                튜토리얼 등록
              </Button>
            </div>
          )
        }
      />

      <MockPageNotice message="튜토리얼 도메인 백엔드 API 준비 중입니다. 현재는 Mock 데이터로 화면 흐름만 검증됩니다." />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 튜토리얼</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{tutorials.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">활성</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">유형 수</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{TUTORIAL_TYPES.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && hasPermission('ADMIN') && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId !== null ? '튜토리얼 수정' : '튜토리얼 등록'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">유형</label>
                <select
                  className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as TutorialType })}
                >
                  {TUTORIAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TUTORIAL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">버전</label>
                <Input
                  placeholder="1.0"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  활성화
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">제목</label>
              <Input
                placeholder="튜토리얼 제목을 입력하세요"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">설명</label>
              <textarea
                className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="튜토리얼 설명을 입력하세요"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                취소
              </Button>
              <Button onClick={handleSave}>
                {editingId !== null ? '수정 완료' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 튜토리얼 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>튜토리얼 목록</CardTitle>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              전체 ({tutorials.length})
            </button>
            {TUTORIAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {TUTORIAL_TYPE_LABELS[t]} ({tutorials.filter((tu) => tu.type === t).length})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayTutorials.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                등록된 튜토리얼이 없습니다.
              </div>
            ) : (
              displayTutorials.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    tutorial.isActive ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={TUTORIAL_TYPE_COLORS[tutorial.type]}>
                          {TUTORIAL_TYPE_LABELS[tutorial.type]}
                        </Badge>
                        <Badge
                          className={
                            tutorial.isActive
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {tutorial.isActive ? '활성' : '비활성'}
                        </Badge>
                        <Badge variant="outline">v{tutorial.version}</Badge>
                        <Badge variant="outline">{tutorial.stepsCount}단계</Badge>
                      </div>
                      <h4 className="mt-2 font-medium">{tutorial.title}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tutorial.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        최종 수정: {formatDateTime(tutorial.updatedAt)}
                      </p>
                    </div>

                    {/* 액션 */}
                    {hasPermission('ADMIN') && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(tutorial.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          title={tutorial.isActive ? '비활성화' : '활성화'}
                        >
                          {tutorial.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(tutorial)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          title="수정"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tutorial.id)}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
