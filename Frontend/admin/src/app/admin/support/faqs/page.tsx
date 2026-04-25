'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { FAQ_CATEGORY_LABELS, FAQ_CATEGORY_COLORS } from '@/lib/constants';
import type { FAQ, FAQCategory } from '@/types/support';
import {
  useAdminFaqsList,
  useCreateAdminFaq,
  useUpdateAdminFaq,
  useDeleteAdminFaq,
  useReorderAdminFaq,
} from '@/hooks/useAdminFaqs';
import {
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const FAQ_CATEGORIES: FAQCategory[] = ['ACCOUNT', 'MATCHING', 'DIARY', 'PAYMENT', 'ETC'];

interface FAQFormData {
  category: FAQCategory;
  question: string;
  answer: string;
  isActive: boolean;
}

const INITIAL_FORM: FAQFormData = {
  category: 'ACCOUNT',
  question: '',
  answer: '',
  isActive: true,
};

export default function FAQsPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FAQCategory>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FAQFormData>(INITIAL_FORM);

  const { data: pageData, isLoading, isError } = useAdminFaqsList({
    category: selectedCategory === 'ALL' ? undefined : selectedCategory,
  });
  const createMutation = useCreateAdminFaq();
  const updateMutation = useUpdateAdminFaq();
  const deleteMutation = useDeleteAdminFaq();
  const reorderMutation = useReorderAdminFaq();

  // For stats, load all FAQs
  const { data: allPageData } = useAdminFaqsList({});
  const allFaqs: FAQ[] = allPageData?.content ?? [];

  const faqs: FAQ[] = pageData?.content ?? [];

  // Client-side search keyword filter
  const displayFaqs = faqs
    .filter((f) => {
      const kw = searchKeyword.trim();
      if (!kw) return true;
      return f.question.includes(kw) || f.answer.includes(kw);
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setForm({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      isActive: faq.isActive,
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('질문과 답변을 모두 입력해주세요.');
      return;
    }

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      const sameCatFaqs = allFaqs.filter((f) => f.category === form.category);
      createMutation.mutate({
        ...form,
        displayOrder: sameCatFaqs.length + 1,
      });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (faq: FAQ) => {
    updateMutation.mutate({
      id: faq.id,
      body: { isActive: !faq.isActive },
    });
  };

  // 카테고리 내 순서 변경 (위/아래)
  const handleReorder = (id: number, direction: 'up' | 'down') => {
    const faq = displayFaqs.find((f) => f.id === id);
    if (!faq) return;
    const sameCat = displayFaqs
      .filter((f) => f.category === faq.category)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sameCat.findIndex((f) => f.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameCat.length) return;

    // Build new order
    const orderedIds = sameCat.map((f) => f.id);
    [orderedIds[idx], orderedIds[swapIdx]] = [orderedIds[swapIdx], orderedIds[idx]];
    reorderMutation.mutate({ category: faq.category, orderedIds });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-faqs-list'] });
    toast.success('FAQ 목록을 새로고침했습니다.');
  };

  const activeCount = allFaqs.filter((f) => f.isActive).length;
  const totalViewCount = allFaqs.reduce((sum, f) => sum + f.viewCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">FAQ 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">FAQ 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="FAQ 관리"
        description="자주 묻는 질문 등록 및 관리"
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 FAQ</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{allFaqs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">활성 FAQ</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">총 조회수</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalViewCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* 등록 폼 */}
      {showForm && hasPermission('ADMIN') && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId !== null ? 'FAQ 수정' : 'FAQ 등록'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">카테고리</label>
                <select
                  className="w-full rounded-lg border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as FAQCategory })}
                >
                  {FAQ_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {FAQ_CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
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
              <label className="mb-1 block text-sm font-medium">
                질문 <span className="text-muted-foreground">(최대 300자)</span>
              </label>
              <Input
                placeholder="자주 묻는 질문 내용을 입력하세요"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                maxLength={300}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                답변{' '}
                <span className="text-muted-foreground">(마크다운 지원, 최대 2000자)</span>
              </label>
              <textarea
                className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={5}
                placeholder="답변을 입력하세요. **굵게**, *기울임*, 등 마크다운 문법 사용 가능"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                maxLength={2000}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {form.answer.length} / 2000
              </p>
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

      {/* FAQ 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>FAQ 목록</CardTitle>
            {hasPermission('ADMIN') && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                FAQ 등록
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {/* 카테고리 탭 */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                전체 ({allFaqs.length})
              </button>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {FAQ_CATEGORY_LABELS[cat]} ({allFaqs.filter((f) => f.category === cat).length})
                </button>
              ))}
            </div>
            {/* 검색 */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="질문/답변 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-8 max-w-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayFaqs.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                등록된 FAQ가 없습니다.
              </div>
            ) : (
              displayFaqs.map((faq, idx) => (
                <div
                  key={faq.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    faq.isActive ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 순서 변경 버튼 */}
                    {hasPermission('ADMIN') && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleReorder(faq.id, 'up')}
                          disabled={idx === 0}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                          title="위로"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(faq.id, 'down')}
                          disabled={idx === displayFaqs.length - 1}
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                          title="아래로"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={FAQ_CATEGORY_COLORS[faq.category]}>
                          {FAQ_CATEGORY_LABELS[faq.category]}
                        </Badge>
                        {!faq.isActive && (
                          <Badge className="bg-gray-100 text-gray-500">비활성</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          조회 {faq.viewCount.toLocaleString()}회
                        </span>
                      </div>
                      <p className="mt-2 font-medium">Q. {faq.question}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        A. {faq.answer}
                      </p>
                    </div>

                    {/* 액션 버튼 */}
                    {hasPermission('ADMIN') && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(faq)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          title={faq.isActive ? '비활성화' : '활성화'}
                        >
                          {faq.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(faq)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                          title="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(faq.id)}
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
