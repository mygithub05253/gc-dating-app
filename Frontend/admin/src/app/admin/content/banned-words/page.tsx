'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { BannedWord, BannedWordCategory } from '@/types/content';

const MOCK_BANNED_WORDS: BannedWord[] = [
  // PROFANITY
  { id: 1, word: '씨발', category: 'PROFANITY', isActive: true, hitCount: 4812, createdBy: 1, createdAt: '2024-01-10T09:00:00' },
  { id: 2, word: '병신', category: 'PROFANITY', isActive: true, hitCount: 3241, createdBy: 1, createdAt: '2024-01-10T09:01:00' },
  { id: 3, word: '좆같', category: 'PROFANITY', isActive: true, hitCount: 2187, createdBy: 1, createdAt: '2024-01-10T09:02:00' },
  { id: 4, word: '개새끼', category: 'PROFANITY', isActive: true, hitCount: 1934, createdBy: 2, createdAt: '2024-01-12T10:00:00' },
  { id: 5, word: '미친놈', category: 'PROFANITY', isActive: false, hitCount: 876, createdBy: 2, createdAt: '2024-01-15T11:00:00' },

  // SEXUAL
  { id: 6, word: '야동', category: 'SEXUAL', isActive: true, hitCount: 2543, createdBy: 1, createdAt: '2024-01-10T09:10:00' },
  { id: 7, word: '섹스', category: 'SEXUAL', isActive: true, hitCount: 1876, createdBy: 1, createdAt: '2024-01-10T09:11:00' },
  { id: 8, word: '자위', category: 'SEXUAL', isActive: true, hitCount: 1102, createdBy: 2, createdAt: '2024-01-13T14:00:00' },
  { id: 9, word: '포르노', category: 'SEXUAL', isActive: true, hitCount: 987, createdBy: 1, createdAt: '2024-01-14T15:00:00' },
  { id: 10, word: '변태', category: 'SEXUAL', isActive: false, hitCount: 234, createdBy: 2, createdAt: '2024-01-20T16:00:00' },

  // DISCRIMINATION
  { id: 11, word: '장애인새끼', category: 'DISCRIMINATION', isActive: true, hitCount: 412, createdBy: 1, createdAt: '2024-01-10T09:20:00' },
  { id: 12, word: '조선족', category: 'DISCRIMINATION', isActive: true, hitCount: 378, createdBy: 1, createdAt: '2024-01-10T09:21:00' },
  { id: 13, word: '흑형', category: 'DISCRIMINATION', isActive: true, hitCount: 156, createdBy: 2, createdAt: '2024-01-18T12:00:00' },
  { id: 14, word: '틀딱', category: 'DISCRIMINATION', isActive: false, hitCount: 289, createdBy: 2, createdAt: '2024-01-22T13:00:00' },

  // ETC
  { id: 15, word: '010-', category: 'ETC', isActive: true, hitCount: 3102, createdBy: 1, createdAt: '2024-01-10T09:30:00' },
  { id: 16, word: '@gmail', category: 'ETC', isActive: true, hitCount: 1456, createdBy: 1, createdAt: '2024-01-10T09:31:00' },
  { id: 17, word: 'kakao.com', category: 'ETC', isActive: true, hitCount: 892, createdBy: 2, createdAt: '2024-01-16T10:00:00' },
  { id: 18, word: '@naver', category: 'ETC', isActive: false, hitCount: 345, createdBy: 2, createdAt: '2024-01-25T09:00:00' },
];

const CATEGORY_LABELS: Record<BannedWordCategory, string> = {
  PROFANITY: '욕설/비하',
  SEXUAL: '성적 표현',
  DISCRIMINATION: '차별/혐오',
  ETC: '기타(외부 연락처)',
};

const CATEGORY_COLORS: Record<BannedWordCategory, string> = {
  PROFANITY: 'bg-red-100 text-red-800',
  SEXUAL: 'bg-pink-100 text-pink-800',
  DISCRIMINATION: 'bg-orange-100 text-orange-800',
  ETC: 'bg-gray-100 text-gray-700',
};

export default function BannedWordsPage() {
  const { hasPermission } = useAuthStore();
  const [words, setWords] = useState<BannedWord[]>(MOCK_BANNED_WORDS);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newCategory, setNewCategory] = useState<BannedWordCategory>('PROFANITY');

  const handleAddWord = () => {
    if (!newWord.trim()) {
      toast.error('금칙어를 입력해주세요.');
      return;
    }
    const duplicate = words.find((w) => w.word === newWord.trim());
    if (duplicate) {
      toast.error('이미 등록된 금칙어입니다.');
      return;
    }
    const newId = Math.max(...words.map((w) => w.id)) + 1;
    setWords([
      {
        id: newId,
        word: newWord.trim(),
        category: newCategory,
        isActive: true,
        hitCount: 0,
        createdBy: 1,
        createdAt: new Date().toISOString(),
      },
      ...words,
    ]);
    setNewWord('');
    setNewCategory('PROFANITY');
    setIsAdding(false);
    toast.success('금칙어가 추가되었습니다.');
  };

  const toggleActive = (id: number) => {
    setWords(words.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)));
    toast.success('활성 상태가 변경되었습니다.');
  };

  const deleteWord = (id: number) => {
    setWords(words.filter((w) => w.id !== id));
    toast.success('금칙어가 삭제되었습니다.');
  };

  const filteredWords = words.filter((w) => {
    const matchesKeyword = !keyword || w.word.includes(keyword);
    const matchesCategory = categoryFilter === 'ALL' || w.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' ? w.isActive : !w.isActive);
    return matchesKeyword && matchesCategory && matchesStatus;
  });

  const totalHitCount = words.reduce((sum, w) => sum + w.hitCount, 0);

  return (
    <div>
      <PageHeader
        title="금칙어 관리"
        description="일기 작성 시 필터링되는 금칙어를 관리합니다"
        actions={
          hasPermission('ADMIN') && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              금칙어 추가
            </Button>
          )
        }
      />

      <MockPageNotice message="금칙어 도메인 백엔드 API 준비 중입니다." />

      {/* 통계 카드 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{words.length}</div>
            <p className="text-sm text-muted-foreground">전체 금칙어</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {words.filter((w) => w.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">활성 금칙어</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {totalHitCount.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">총 감지 횟수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">4</div>
            <p className="text-sm text-muted-foreground">카테고리 수</p>
          </CardContent>
        </Card>
      </div>

      {/* 인라인 추가 폼 */}
      {isAdding && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="금칙어 입력..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as BannedWordCategory)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {(Object.keys(CATEGORY_LABELS) as BannedWordCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
              <Button onClick={handleAddWord}>추가</Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="min-w-[240px] flex-1">
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            placeholder="금칙어 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 카테고리</option>
            {(Object.keys(CATEGORY_LABELS) as BannedWordCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="INACTIVE">비활성</option>
          </select>
        </div>
      </div>

      {/* 금칙어 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>금칙어 목록 ({filteredWords.length}개)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredWords.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30"
              >
                <div className="flex flex-1 items-center gap-4">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold">
                    {w.word}
                  </code>
                  <Badge className={CATEGORY_COLORS[w.category]}>
                    {CATEGORY_LABELS[w.category]}
                  </Badge>
                  {!w.isActive && <Badge variant="secondary">비활성</Badge>}
                  <span className="text-sm text-muted-foreground">
                    감지 {w.hitCount.toLocaleString()}회
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(w.createdAt)}
                  </span>
                </div>
                {hasPermission('ADMIN') && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(w.id)}
                      title={w.isActive ? '비활성화' : '활성화'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteWord(w.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {filteredWords.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
