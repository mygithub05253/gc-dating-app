'use client';

// 예제 일기 관리 페이지 — 실 API 연동 (PR-β).
// 백엔드 §6.6 AdminExampleDiaryController: GET/POST/PUT/DELETE /api/admin/example-diaries
// 본문 길이 200~1000자 (BE @Size 검증). Add/Edit 모달은 다음 PR로 이월.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import {
  AnalyticsLoading,
  AnalyticsError,
} from '@/components/common/AnalyticsStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, Trash2, Edit, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  exampleDiariesApi,
  type ExampleDiaryResponse,
  type ExampleDiaryCategoryBe,
  type ExampleDiaryDisplayTarget,
} from '@/lib/api/content';

const CATEGORY_LABELS: Record<ExampleDiaryCategoryBe, string> = {
  GRATITUDE: '감사',
  GROWTH: '성장',
  DAILY: '일상',
  EMOTION: '감정',
  RELATIONSHIP: '관계',
  SEASONAL: '계절',
};

const CATEGORY_COLORS: Record<ExampleDiaryCategoryBe, string> = {
  GRATITUDE: 'bg-pink-100 text-pink-800',
  GROWTH: 'bg-green-100 text-green-800',
  DAILY: 'bg-blue-100 text-blue-800',
  EMOTION: 'bg-purple-100 text-purple-800',
  RELATIONSHIP: 'bg-orange-100 text-orange-800',
  SEASONAL: 'bg-yellow-100 text-yellow-800',
};

const TARGET_LABELS: Record<ExampleDiaryDisplayTarget, string> = {
  ONBOARDING: '온보딩',
  HELP: '도움말',
  FAQ: 'FAQ',
};

const TARGET_COLORS: Record<ExampleDiaryDisplayTarget, string> = {
  ONBOARDING: 'bg-sky-100 text-sky-800',
  HELP: 'bg-yellow-100 text-yellow-800',
  FAQ: 'bg-gray-100 text-gray-700',
};

export default function ExampleDiariesPage() {
  const { hasPermission } = useAuthStore();
  const qc = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [targetFilter, setTargetFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 목록 조회 (전체 → 클라이언트 사이드 필터)
  const listQuery = useQuery({
    queryKey: ['example-diaries'],
    queryFn: () => exampleDiariesApi.getList().then((res) => {
      const d = res.data.data as any;
      return Array.isArray(d) ? d : d.content ?? [];
    }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['example-diaries'] });

  const toggleMutation = useMutation({
    mutationFn: (item: ExampleDiaryResponse) =>
      exampleDiariesApi.update(item.id, { isActive: !item.isActive }),
    onSuccess: () => {
      toast.success('활성 상태가 변경되었습니다.');
      invalidate();
    },
    onError: (e: Error) => toast.error(`변경 실패: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => exampleDiariesApi.delete(id),
    onSuccess: () => {
      toast.success('예제 일기가 삭제되었습니다.');
      invalidate();
    },
    onError: (e: Error) => toast.error(`삭제 실패: ${e.message}`),
  });

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = () => {
    toast('편집 모달은 다음 PR에서 구현됩니다.', { icon: '🚧' });
  };

  const handleAddDiary = () => {
    toast('등록 모달은 다음 PR에서 구현됩니다.', { icon: '🚧' });
  };

  const allDiaries: ExampleDiaryResponse[] = listQuery.data ?? [];
  const filteredDiaries = allDiaries.filter((d: ExampleDiaryResponse) => {
    const matchesKeyword =
      !keyword || d.title.includes(keyword) || d.content.includes(keyword);
    const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
    const matchesTarget = targetFilter === 'ALL' || d.displayTarget === targetFilter;
    return matchesKeyword && matchesCategory && matchesTarget;
  });

  const targetCounts = allDiaries.reduce<Record<string, number>>((acc, d) => {
    acc[d.displayTarget] = (acc[d.displayTarget] ?? 0) + 1;
    return acc;
  }, {});
  const maxTargetEntry = Object.entries(targetCounts).sort((a, b) => b[1] - a[1])[0];
  const topTarget = maxTargetEntry
    ? `${TARGET_LABELS[maxTargetEntry[0] as ExampleDiaryDisplayTarget]} (${maxTargetEntry[1]}개)`
    : '-';

  const avgContentLength = allDiaries.length > 0
    ? Math.round(allDiaries.reduce((sum, d) => sum + d.content.length, 0) / allDiaries.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="예제 일기 관리"
        description="앱 내 예제 일기 콘텐츠를 관리합니다 (본문 200~1000자)"
        actions={
          hasPermission('ADMIN') && (
            <Button onClick={handleAddDiary}>
              <Plus className="mr-2 h-4 w-4" />
              새 예제 일기 추가
            </Button>
          )
        }
      />

      {/* 통계 카드 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{allDiaries.length}</div>
            <p className="text-sm text-muted-foreground">전체 예제</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {allDiaries.filter((d) => d.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">활성 예제</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-base font-bold leading-8 text-blue-600">
              {topTarget}
            </div>
            <p className="text-sm text-muted-foreground">타겟별 최다</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{avgContentLength.toLocaleString()}자</div>
            <p className="text-sm text-muted-foreground">평균 본문 길이</p>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="min-w-[240px] flex-1">
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            placeholder="제목 또는 본문 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 카테고리</option>
            {(Object.keys(CATEGORY_LABELS) as ExampleDiaryCategoryBe[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 타겟</option>
            {(Object.keys(TARGET_LABELS) as ExampleDiaryDisplayTarget[]).map((tgt) => (
              <option key={tgt} value={tgt}>
                {TARGET_LABELS[tgt]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 상태 표시 */}
      {listQuery.isLoading && <AnalyticsLoading height={300} />}
      {listQuery.isError && (
        <AnalyticsError
          height={300}
          message={(listQuery.error as Error)?.message}
          onRetry={() => listQuery.refetch()}
        />
      )}

      {/* 예제 일기 목록 */}
      {listQuery.data && (
        <div className="grid gap-4">
          {filteredDiaries.map((diary) => (
            <Card key={diary.id} className={!diary.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge className={CATEGORY_COLORS[diary.category]}>
                        {CATEGORY_LABELS[diary.category]}
                      </Badge>
                      <Badge className={TARGET_COLORS[diary.displayTarget]}>
                        {TARGET_LABELS[diary.displayTarget]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        순서 #{diary.displayOrder}
                      </span>
                      {!diary.isActive && <Badge variant="secondary">비활성</Badge>}
                    </div>
                    <h3 className="font-semibold">{diary.title}</h3>
                    <p
                      className={`mt-1 text-sm text-muted-foreground ${
                        expandedIds.has(diary.id) ? '' : 'line-clamp-2'
                      }`}
                    >
                      {diary.content}
                    </p>
                    <button
                      onClick={() => toggleExpand(diary.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {expandedIds.has(diary.id) ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          접기
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          더 보기 ({diary.content.length}자)
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(diary.createdAt)}
                      {diary.createdByName && ` · ${diary.createdByName}`}
                    </p>
                  </div>
                  {hasPermission('ADMIN') && (
                    <div className="flex flex-shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate(diary)}
                        title={diary.isActive ? '비활성화' : '활성화'}
                        disabled={toggleMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEdit}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`"${diary.title}" 예제 일기를 삭제하시겠습니까?`)) {
                            deleteMutation.mutate(diary.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredDiaries.length === 0 && (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              {allDiaries.length === 0
                ? '등록된 예제 일기가 없습니다.'
                : '검색 결과가 없습니다.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
