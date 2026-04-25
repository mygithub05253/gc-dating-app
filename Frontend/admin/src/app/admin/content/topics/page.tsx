'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, Trash2, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsApi } from '@/lib/api/topics';
import type { Topic, TopicCategory } from '@/types/content';

const CATEGORY_LABELS: Record<string, string> = {
  GRATITUDE: '감사',
  GROWTH: '성장',
  DAILY: '일상',
  EMOTION: '감정',
  RELATIONSHIP: '관계',
  SEASONAL: '계절',
};

const CATEGORY_COLORS: Record<string, string> = {
  GRATITUDE: 'bg-pink-100 text-pink-800',
  GROWTH: 'bg-green-100 text-green-800',
  DAILY: 'bg-blue-100 text-blue-800',
  EMOTION: 'bg-purple-100 text-purple-800',
  RELATIONSHIP: 'bg-orange-100 text-orange-800',
  SEASONAL: 'bg-yellow-100 text-yellow-800',
};

export default function TopicsPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState('');
  const [newCategory, setNewCategory] = useState<TopicCategory>('DAILY');
  const [isAdding, setIsAdding] = useState(false);

  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['admin-topics-list'],
    queryFn: () => topicsApi.getList().then((res) => res.data.data),
    staleTime: 30_000,
  });

  const topics: Topic[] = pageData?.content ?? [];

  const createMutation = useMutation({
    mutationFn: (data: { topic: string; category: TopicCategory; weekStartDate: string; isActive?: boolean }) =>
      topicsApi.create(data),
    onSuccess: () => {
      toast.success('새 주제가 추가되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-topics-list'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { isActive?: boolean } }) =>
      topicsApi.update(id, data),
    onSuccess: () => {
      toast.success('상태가 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-topics-list'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      toast.success('주제가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-topics-list'] });
    },
  });

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      toast.error('주제 내용을 입력해주세요.');
      return;
    }
    // weekStartDate: current Monday
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    const weekStartDate = monday.toISOString().slice(0, 10);

    createMutation.mutate({
      topic: newTopic,
      category: newCategory,
      weekStartDate,
      isActive: true,
    });
    setNewTopic('');
    setIsAdding(false);
  };

  const toggleActive = (topic: Topic) => {
    updateMutation.mutate({ id: topic.id, data: { isActive: !topic.isActive } });
  };

  const deleteTopic = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-topics-list'] });
    toast.success('주제 목록을 새로고침했습니다.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">주제 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">주제 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="랜덤 주제 관리"
        description="교환일기 시작 시 제공되는 랜덤 주제를 관리합니다"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                새 주제 추가
              </Button>
            </div>
          )
        }
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{topics.length}</div>
            <p className="text-sm text-muted-foreground">전체 주제</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {topics.filter((t) => t.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">활성 주제</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {topics.reduce((sum, t) => sum + t.usageCount, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">총 사용 횟수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Object.keys(CATEGORY_LABELS).length}
            </div>
            <p className="text-sm text-muted-foreground">카테고리 수</p>
          </CardContent>
        </Card>
      </div>

      {/* 새 주제 추가 */}
      {isAdding && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <select
                className="rounded-md border px-3 py-2 text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as TopicCategory)}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="새로운 주제를 입력하세요..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddTopic} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '추가'}
              </Button>
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 주제 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>주제 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {topics.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                등록된 주제가 없습니다.
              </div>
            ) : (
              topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={CATEGORY_COLORS[topic.category]}>
                        {CATEGORY_LABELS[topic.category]}
                      </Badge>
                      {!topic.isActive && (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </div>
                    <p className="mt-1 font-medium">{topic.content}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      사용 {topic.usageCount.toLocaleString()}회 | {formatDateTime(topic.createdAt)}
                    </p>
                  </div>
                  {hasPermission('ADMIN') && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(topic)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTopic(topic.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
