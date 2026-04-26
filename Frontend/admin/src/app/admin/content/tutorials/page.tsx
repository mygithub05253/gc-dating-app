'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  useAdminTutorialsList,
  useCreateAdminTutorial,
  useUpdateAdminTutorial,
  useDeleteAdminTutorial,
} from '@/hooks/useAdminTutorials';
import type { Tutorial, TutorialType } from '@/types/content';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  BookOpen,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

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

const TUTORIAL_TYPES: TutorialType[] = ['ONBOARDING', 'EXCHANGE_DIARY', 'MATCHING', 'PROFILE'];

interface TutorialFormData {
  title: string;
  body: string;
  imageUrl: string;
  pageOrder: number;
  isActive: boolean;
}

const INITIAL_FORM: TutorialFormData = {
  title: '',
  body: '',
  imageUrl: '',
  pageOrder: 0,
  isActive: true,
};

export default function TutorialsPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<'ALL' | TutorialType>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TutorialFormData>(INITIAL_FORM);

  const { data: pageData, isLoading, isError } = useAdminTutorialsList({
    type: typeFilter === 'ALL' ? undefined : typeFilter,
  });
  const createMutation = useCreateAdminTutorial();
  const updateMutation = useUpdateAdminTutorial();
  const deleteMutation = useDeleteAdminTutorial();

  const tutorials: Tutorial[] = pageData?.content ?? [];

  // For stats, load all tutorials
  const { data: allPageData } = useAdminTutorialsList({});
  const allTutorials: Tutorial[] = allPageData?.content ?? [];

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (tutorial: Tutorial) => {
    setEditingId(tutorial.id);
    setForm({
      title: tutorial.title,
      body: tutorial.description ?? '',
      imageUrl: '',
      pageOrder: 0,
      isActive: tutorial.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('제목과 본문을 모두 입력해주세요.');
      return;
    }

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      createMutation.mutate(form);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    if (!confirm('이 튜토리얼을 삭제하시겠습니까?')) return;
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (tutorial: Tutorial) => {
    updateMutation.mutate({
      id: tutorial.id,
      body: { isActive: !tutorial.isActive },
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-tutorials-list'] });
    toast.success('튜토리얼 목록을 새로고침했습니다.');
  };

  const activeCount = allTutorials.filter((t) => t.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">튜토리얼 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">튜토리얼 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="튜토리얼 관리"
        description="앱 내 튜토리얼 페이지 등록 및 관리"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
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

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 튜토리얼</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{allTutorials.length}</div>
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
                <label className="mb-1 block text-sm font-medium">페이지 순서</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.pageOrder}
                  onChange={(e) => setForm({ ...form, pageOrder: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">이미지 URL</label>
                <Input
                  placeholder="https://..."
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
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
              <label className="mb-1 block text-sm font-medium">본문</label>
              <textarea
                className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="튜토리얼 본문을 입력하세요"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
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
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
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
              전체 ({allTutorials.length})
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
                {TUTORIAL_TYPE_LABELS[t]} ({allTutorials.filter((tu) => tu.type === t).length})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tutorials.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                등록된 튜토리얼이 없습니다.
              </div>
            ) : (
              tutorials.map((tutorial) => (
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
                        <Badge variant="outline">{(tutorial.steps ?? []).length}단계</Badge>
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
                          onClick={() => handleToggleActive(tutorial)}
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
