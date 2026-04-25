'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

type KeywordCategory = 'PERSONALITY' | 'LIFESTYLE' | 'INTEREST' | 'VALUE';

type MockKeyword = {
  id: number;
  label: string;
  category: KeywordCategory;
  weight: number;
  displayOrder: number;
  userCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

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

const MOCK_KEYWORDS: MockKeyword[] = [
  { id: 1, label: '유머러스', category: 'PERSONALITY', weight: 0.8, displayOrder: 1, userCount: 1234, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 2, label: '다정한', category: 'PERSONALITY', weight: 0.9, displayOrder: 2, userCount: 2345, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 3, label: '차분한', category: 'PERSONALITY', weight: 0.7, displayOrder: 3, userCount: 987, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 4, label: '운동을 좋아하는', category: 'LIFESTYLE', weight: 0.6, displayOrder: 1, userCount: 1567, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 5, label: '여행을 좋아하는', category: 'LIFESTYLE', weight: 0.7, displayOrder: 2, userCount: 2100, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 6, label: '음악 감상', category: 'INTEREST', weight: 0.5, displayOrder: 1, userCount: 890, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 7, label: '독서', category: 'INTEREST', weight: 0.6, displayOrder: 2, userCount: 654, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 8, label: '성장 지향', category: 'VALUE', weight: 0.8, displayOrder: 1, userCount: 1800, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 9, label: '가족 중심', category: 'VALUE', weight: 0.7, displayOrder: 2, userCount: 1200, isActive: true, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-03-01T00:00:00' },
  { id: 10, label: '자유로운', category: 'VALUE', weight: 0.5, displayOrder: 3, userCount: 432, isActive: false, createdAt: '2024-01-01T00:00:00', updatedAt: '2024-02-15T00:00:00' },
];

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
  const [keywords, setKeywords] = useState<MockKeyword[]>(MOCK_KEYWORDS);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | KeywordCategory>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KeywordFormData>(INITIAL_FORM);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkWeights, setBulkWeights] = useState<Record<number, number>>({});

  const displayKeywords = keywords
    .filter((k) => categoryFilter === 'ALL' || k.category === categoryFilter)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (keyword: MockKeyword) => {
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
    const now = new Date().toISOString();

    if (editingId !== null) {
      setKeywords((prev) =>
        prev.map((k) =>
          k.id === editingId ? { ...k, ...form, updatedAt: now } : k,
        ),
      );
      toast.success('키워드가 수정되었습니다.');
    } else {
      const newKeyword: MockKeyword = {
        id: Math.max(0, ...keywords.map((k) => k.id)) + 1,
        ...form,
        userCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      setKeywords((prev) => [...prev, newKeyword]);
      toast.success('키워드가 등록되었습니다.');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    if (!confirm('이 키워드를 삭제하시겠습니까?')) return;
    setKeywords((prev) => prev.filter((k) => k.id !== id));
    toast.success('키워드가 삭제되었습니다.');
  };

  const handleToggleActive = (id: number) => {
    setKeywords((prev) =>
      prev.map((k) => (k.id === id ? { ...k, isActive: !k.isActive, updatedAt: new Date().toISOString() } : k)),
    );
    const target = keywords.find((k) => k.id === id);
    toast.success(target?.isActive ? '키워드가 비활성화되었습니다.' : '키워드가 활성화되었습니다.');
  };

  const openBulkEdit = () => {
    const initial: Record<number, number> = {};
    keywords.forEach((k) => {
      initial[k.id] = k.weight;
    });
    setBulkWeights(initial);
    setShowBulkEdit(true);
  };

  const handleBulkSave = () => {
    const now = new Date().toISOString();
    setKeywords((prev) =>
      prev.map((k) => ({
        ...k,
        weight: bulkWeights[k.id] ?? k.weight,
        updatedAt: now,
      })),
    );
    setShowBulkEdit(false);
    toast.success('키워드 가중치가 일괄 수정되었습니다.');
  };

  const activeCount = keywords.filter((k) => k.isActive).length;
  const totalUserCount = keywords.reduce((sum, k) => sum + k.userCount, 0);

  return (
    <div>
      <PageHeader
        title="이상형 키워드 관리"
        description="매칭에 사용되는 이상형 키워드 등록 및 가중치 관리"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success('키워드 목록을 새로고침했습니다.')}>
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

      <MockPageNotice message="키워드 도메인 백엔드 API 준비 중입니다. 현재는 Mock 데이터로 화면 흐름만 검증됩니다." />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 키워드</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{keywords.length}</div>
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
              <Button onClick={handleSave}>
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
              {keywords.map((k) => (
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
              <Button onClick={handleBulkSave}>
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
              전체 ({keywords.length})
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
                {KEYWORD_CATEGORY_LABELS[cat]} ({keywords.filter((k) => k.category === cat).length})
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
                          onClick={() => handleToggleActive(keyword.id)}
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
