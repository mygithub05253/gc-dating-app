'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import {
  useAdminKeywordsList,
  useCreateAdminKeyword,
  useUpdateAdminKeyword,
  useDeleteAdminKeyword,
  useBulkUpdateKeywordWeight,
} from '@/hooks/useAdminKeywords';
import type { KeywordCategory, Keyword } from '@/types/keyword';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Tag,
  Eye,
  EyeOff,
  Users,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const KEYWORD_CATEGORY_LABELS: Record<KeywordCategory, string> = {
  PERSONALITY: '성격',
  LIFESTYLE: '라이프스타일',
  INTEREST: '관심사',
  VALUE: '가치관',
};

const KEYWORD_CATEGORY_COLORS: Record<KeywordCategory, string> = {
  PERSONALITY: 'bg-purple-50 text-purple-700 border-purple-200',
  LIFESTYLE: 'bg-green-50 text-green-700 border-green-200',
  INTEREST: 'bg-blue-50 text-blue-700 border-blue-200',
  VALUE: 'bg-orange-50 text-orange-700 border-orange-200',
};

const KEYWORD_CATEGORIES: KeywordCategory[] = ['PERSONALITY', 'LIFESTYLE', 'INTEREST', 'VALUE'];

interface KeywordFormData {
  label: string;
  category: KeywordCategory;
  weight: number;
  displayOrder: number;
  isActive: boolean;
}

const INITIAL_FORM: KeywordFormData = {
  label: '',
  category: 'PERSONALITY',
  weight: 0.5,
  displayOrder: 1,
  isActive: true,
};

export default function KeywordsPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | KeywordCategory>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KeywordFormData>(INITIAL_FORM);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkWeights, setBulkWeights] = useState<Record<number, number>>({});

  const { data: listData, isLoading, isError } = useAdminKeywordsList({
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
  });
  const createMutation = useCreateAdminKeyword();
  const updateMutation = useUpdateAdminKeyword();
  const deleteMutation = useDeleteAdminKeyword();
  const bulkWeightMutation = useBulkUpdateKeywordWeight();

  const keywords: Keyword[] = listData?.items ?? [];

  // For stats, load all keywords (no category filter)
  const { data: allListData } = useAdminKeywordsList({});
  const allKeywords: Keyword[] = allListData?.items ?? [];

  const displayKeywords = [...keywords].sort((a, b) => a.displayOrder - b.displayOrder);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (keyword: Keyword) => {
    setEditingId(keyword.id);
    setForm({
      label: keyword.label,
      category: keyword.category,
      weight: keyword.weight,
      displayOrder: keyword.displayOrder,
      isActive: keyword.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.label.trim()) {
      toast.error('키워드 라벨을 입력해주세요.');
      return;
    }
    if (form.weight < 0 || form.weight > 1) {
      toast.error('가중치는 0~1 범위로 입력해주세요.');
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
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return;
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (keyword: Keyword) => {
    updateMutation.mutate({
      id: keyword.id,
      body: { isActive: !keyword.isActive },
    });
  };

  const openBulkEdit = () => {
    const initial: Record<number, number> = {};
    allKeywords.forEach((k) => {
      initial[k.id] = k.weight;
    });
    setBulkWeights(initial);
    setShowBulkEdit(true);
  };

  const handleBulkSave = () => {
    const updates = Object.entries(bulkWeights).map(([id, weight]) => ({
      id: Number(id),
      weight,
    }));
    bulkWeightMutation.mutate({ updates });
    setShowBulkEdit(false);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-keywords-list'] });
    toast.success('키워드 목록을 새로고침했습니다.');
  };

  const activeCount = allKeywords.filter((k) => k.isActive).length;
  const totalUserCount = allKeywords.reduce((sum, k) => sum + k.userCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">키워드 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">키워드 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="이상형 키워드 관리"
        description="매칭에 사용되는 이상형 키워드 등록 및 가중치 관리"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button variant="outline" onClick={openBulkEdit}>
                <Save className="mr-2 h-4 w-4" />
                가중치 일괄 수정
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                키워드 등록
              </Button>
            </div>
          )
        }
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 키워드</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{allKeywords.length}</div>
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
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">총 사용자 수</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalUserCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">카테고리</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{KEYWORD_CATEGORIES.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && hasPermission('ADMIN') && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId !== null ? '키워드 수정' : '키워드 등록'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">라벨</label>
                <Input
                  placeholder="키워드 라벨 (예: 유머러스)"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">카테고리</label>
                <select
                  className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as KeywordCategory })}
                >
                  {KEYWORD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {KEYWORD_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">가중치 (0~1)</label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">표시 순서</label>
                <Input
                  type="number"
                  min={1}
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
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

      {/* 가중치 일괄 수정 */}
      {showBulkEdit && hasPermission('ADMIN') && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">가중치 일괄 수정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              {allKeywords.map((k) => (
                <div key={k.id} className="flex items-center gap-3 rounded border p-2">
                  <Badge className={KEYWORD_CATEGORY_COLORS[k.category]}>
                    {KEYWORD_CATEGORY_LABELS[k.category]}
                  </Badge>
                  <span className="flex-1 text-sm font-medium">{k.label}</span>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    className="h-8 w-20"
                    value={bulkWeights[k.id] ?? k.weight}
                    onChange={(e) =>
                      setBulkWeights((prev) => ({ ...prev, [k.id]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkEdit(false)}>
                취소
              </Button>
              <Button onClick={handleBulkSave} disabled={bulkWeightMutation.isPending}>
                {bulkWeightMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                일괄 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 키워드 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>키워드 목록</CardTitle>
          <div className="mt-3 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                categoryFilter === 'ALL'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              전체 ({allKeywords.length})
            </button>
            {KEYWORD_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  categoryFilter === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {KEYWORD_CATEGORY_LABELS[cat]} ({allKeywords.filter((k) => k.category === cat).length})
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayKeywords.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                등록된 키워드가 없습니다.
              </div>
            ) : (
              displayKeywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    keyword.isActive ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={KEYWORD_CATEGORY_COLORS[keyword.category]}>
                          {KEYWORD_CATEGORY_LABELS[keyword.category]}
                        </Badge>
                        {!keyword.isActive && (
                          <Badge className="bg-gray-100 text-gray-500">비활성</Badge>
                        )}
                        <span className="font-medium">{keyword.label}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span>가중치: <strong className="text-foreground">{keyword.weight}</strong></span>
                        <span>순서: {keyword.displayOrder}</span>
                        <span>사용자: {keyword.userCount.toLocaleString()}명</span>
                      </div>
                    </div>

                    {/* 가중치 바 */}
                    <div className="hidden w-24 md:block">
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${keyword.weight * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 액션 */}
                    {hasPermission('ADMIN') && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(keyword)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          title={keyword.isActive ? '비활성화' : '활성화'}
                        >
                          {keyword.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(keyword)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          title="수정"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(keyword.id)}
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
