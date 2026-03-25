'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 랜덤 주제 데이터
const MOCK_TOPICS = [
  {
    id: 1,
    content: '오늘 가장 감사했던 순간은 무엇인가요?',
    category: 'GRATITUDE',
    isActive: true,
    usageCount: 1234,
    createdAt: '2024-01-15T10:00:00',
  },
  {
    id: 2,
    content: '최근에 새롭게 도전해본 것이 있나요?',
    category: 'GROWTH',
    isActive: true,
    usageCount: 892,
    createdAt: '2024-01-20T14:30:00',
  },
  {
    id: 3,
    content: '요즘 가장 자주 듣는 노래는 무엇인가요?',
    category: 'DAILY',
    isActive: true,
    usageCount: 2156,
    createdAt: '2024-02-01T09:00:00',
  },
  {
    id: 4,
    content: '스트레스를 풀 때 주로 무엇을 하나요?',
    category: 'EMOTION',
    isActive: true,
    usageCount: 1567,
    createdAt: '2024-02-10T11:00:00',
  },
  {
    id: 5,
    content: '나에게 가장 소중한 사람을 떠올려보세요.',
    category: 'RELATIONSHIP',
    isActive: false,
    usageCount: 456,
    createdAt: '2024-02-15T16:00:00',
  },
  {
    id: 6,
    content: '봄이 오면 가장 하고 싶은 것은?',
    category: 'SEASONAL',
    isActive: true,
    usageCount: 789,
    createdAt: '2024-03-01T10:00:00',
  },
];

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
  const [topics, setTopics] = useState(MOCK_TOPICS);
  const [newTopic, setNewTopic] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTopic = () => {
    if (!newTopic.trim()) {
      toast.error('주제 내용을 입력해주세요.');
      return;
    }
    const newId = Math.max(...topics.map((t) => t.id)) + 1;
    setTopics([
      {
        id: newId,
        content: newTopic,
        category: 'DAILY',
        isActive: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
      },
      ...topics,
    ]);
    setNewTopic('');
    setIsAdding(false);
    toast.success('새 주제가 추가되었습니다.');
  };

  const toggleActive = (id: number) => {
    setTopics(
      topics.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
    toast.success('상태가 변경되었습니다.');
  };

  const deleteTopic = (id: number) => {
    setTopics(topics.filter((t) => t.id !== id));
    toast.success('주제가 삭제되었습니다.');
  };

  return (
    <div>
      <PageHeader
        title="랜덤 주제 관리"
        description="교환일기 시작 시 제공되는 랜덤 주제를 관리합니다"
        actions={
          hasPermission('ADMIN') && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              새 주제 추가
            </Button>
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
              <Input
                placeholder="새로운 주제를 입력하세요..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddTopic}>추가</Button>
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
            {topics.map((topic) => (
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
                      onClick={() => toggleActive(topic.id)}
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
