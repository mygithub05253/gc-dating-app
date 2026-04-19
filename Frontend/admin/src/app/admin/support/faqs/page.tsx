'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { FAQ_CATEGORY_LABELS, FAQ_CATEGORY_COLORS } from '@/lib/constants';
import type { FAQ, FAQCategory } from '@/types/support';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock FAQ 데이터 (관리자_API_통합명세서_v2.0 §22)
const MOCK_FAQS: FAQ[] = [
  {
    id: 1,
    category: 'ACCOUNT',
    question: '비밀번호를 잊어버렸어요. 어떻게 재설정하나요?',
    answer: '로그인 화면에서 **"비밀번호 찾기"** 버튼을 클릭하면 이메일로 재설정 링크가 전송됩니다.',
    displayOrder: 1,
    viewCount: 342,
    isActive: true,
    createdAt: '2026-03-01T00:00:00',
    updatedAt: '2026-04-01T00:00:00',
  },
  {
    id: 2,
    category: 'ACCOUNT',
    question: '회원 탈퇴는 어떻게 하나요?',
    answer: '마이페이지 > 설정 > 회원 탈퇴 메뉴를 통해 탈퇴할 수 있습니다. 탈퇴 후 30일간 데이터가 보관됩니다.',
    displayOrder: 2,
    viewCount: 218,
    isActive: true,
    createdAt: '2026-03-01T00:00:00',
    updatedAt: '2026-04-01T00:00:00',
  },
  {
    id: 3,
    category: 'MATCHING',
    question: '매칭이 잘 안 되는 이유가 뭔가요?',
    answer: '매칭은 AI 알고리즘이 일기 스타일, 관심사, 라이프스타일 등을 종합적으로 분석하여 진행됩니다. 일기를 꾸준히 작성할수록 더 정확한 매칭이 이루어집니다.',
    displayOrder: 1,
    viewCount: 512,
    isActive: true,
    createdAt: '2026-03-05T00:00:00',
    updatedAt: '2026-04-01T00:00:00',
  },
  {
    id: 4,
    category: 'DIARY',
    question: '일기는 최소 몇 글자를 써야 하나요?',
    answer: '일기는 최소 **100자** 이상 작성해야 AI 분석이 진행됩니다. 더 많이 쓸수록 분석 정확도가 높아집니다.',
    displayOrder: 1,
    viewCount: 389,
    isActive: true,
    createdAt: '2026-03-10T00:00:00',
    updatedAt: '2026-04-01T00:00:00',
  },
  {
    id: 5,
    category: 'DIARY',
    question: '교환일기 기간은 얼마나 되나요?',
    answer: '교환일기는 기본 **14일** 과정이며, 서로 번갈아 가며 일기를 작성합니다. 7회씩 작성 완료 후 매칭 결과가 공개됩니다.',
    displayOrder: 2,
    viewCount: 276,
    isActive: true,
    createdAt: '2026-03-10T00:00:00',
    updatedAt: '2026-04-01T00:00:00',
  },
  {
    id: 6,
    category: 'PAYMENT',
    question: '환불 정책이 어떻게 되나요?',
    answer: '구독 서비스는 이용 시작 후 7일 이내 환불이 가능합니다. 이후에는 남은 기간에 비례하여 부분 환불됩니다.',
    displayOrder: 1,
    viewCount: 145,
    isActive: false,
    createdAt: '2026-03-15T00:00:00',
    updatedAt: '2026-04-10T00:00:00',
  },
];

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
  const [faqs, setFaqs] = useState<FAQ[]>(MOCK_FAQS);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FAQCategory>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FAQFormData>(INITIAL_FORM);

  // 표시할 FAQ: 카테고리 + 검색어 필터링
  const displayFaqs = faqs
    .filter((f) => {
      if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
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
    const now = new Date().toISOString();

    if (editingId !== null) {
      // 수정
      setFaqs((prev) =>
        prev.map((f) =>
          f.id === editingId ? { ...f, ...form, updatedAt: now } : f,
        ),
      );
      toast.success('FAQ가 수정되었습니다.');
    } else {
      // 신규 등록
      const sameCatFaqs = faqs.filter((f) => f.category === form.category);
      const newFaq: FAQ = {
        id: Math.max(0, ...faqs.map((f) => f.id)) + 1,
        ...form,
        displayOrder: sameCatFaqs.length + 1,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      setFaqs((prev) => [...prev, newFaq]);
      toast.success('FAQ가 등록되었습니다.');
    }

    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    toast.success('FAQ가 삭제되었습니다.');
  };

  const handleToggleActive = (id: number) => {
    setFaqs((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, isActive: !f.isActive, updatedAt: new Date().toISOString() } : f,
      ),
    );
    const target = faqs.find((f) => f.id === id);
    toast.success(target?.isActive ? 'FAQ가 비활성화되었습니다.' : 'FAQ가 활성화되었습니다.');
  };

  // 카테고리 내 순서 변경 (위/아래)
  const handleReorder = (id: number, direction: 'up' | 'down') => {
    const faq = faqs.find((f) => f.id === id);
    if (!faq) return;
    const sameCat = faqs
      .filter((f) => f.category === faq.category)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sameCat.findIndex((f) => f.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sameCat.length) return;
    const swapTarget = sameCat[swapIdx];
    setFaqs((prev) =>
      prev.map((f) => {
        if (f.id === id) return { ...f, displayOrder: swapTarget.displayOrder };
        if (f.id === swapTarget.id) return { ...f, displayOrder: faq.displayOrder };
        return f;
      }),
    );
  };

  const activeCount = faqs.filter((f) => f.isActive).length;
  const totalViewCount = faqs.reduce((sum, f) => sum + f.viewCount, 0);

  return (
    <div>
      <PageHeader
        title="FAQ 관리"
        description="자주 묻는 질문 등록 및 관리"
      />

      <MockPageNotice message="FAQ 도메인 백엔드 API 준비 중입니다. 현재는 Mock 데이터로 화면 흐름만 검증됩니다." />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 FAQ</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{faqs.length}</div>
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
              <Button onClick={handleSave}>
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
                전체 ({faqs.length})
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
                  {FAQ_CATEGORY_LABELS[cat]} ({faqs.filter((f) => f.category === cat).length})
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
                          onClick={() => handleToggleActive(faq.id)}
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
