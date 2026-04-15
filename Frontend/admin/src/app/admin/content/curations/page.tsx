'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Star, Eye, ThumbsUp, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 우수 일기 큐레이션 데이터
const MOCK_CURATIONS = [
  {
    id: 1,
    diaryId: 1001,
    title: '봄이 오는 소리를 들었다',
    excerpt: '창문을 열자 따뜻한 바람이 불어왔다. 벚꽃이 피기 시작한 나무들 사이로 새소리가 들렸고...',
    authorNickname: '별빛소녀',
    authorId: 1,
    likes: 234,
    views: 1567,
    isFeatured: true,
    featuredAt: '2024-03-20T10:00:00',
    featuredBy: 'admin@ember.com',
    emotion: '행복',
    tone: '감성적인',
  },
  {
    id: 2,
    diaryId: 1002,
    title: '처음으로 요리를 해봤다',
    excerpt: '유튜브를 보면서 처음으로 파스타를 만들어봤다. 면이 좀 퍼졌지만 맛은 괜찮았다...',
    authorNickname: '달빛청년',
    authorId: 2,
    likes: 189,
    views: 1234,
    isFeatured: true,
    featuredAt: '2024-03-19T14:00:00',
    featuredBy: 'admin@ember.com',
    emotion: '뿌듯함',
    tone: '밝은',
  },
  {
    id: 3,
    diaryId: 1003,
    title: '비 오는 날의 카페',
    excerpt: '창밖으로 빗방울이 떨어지는 걸 보며 따뜻한 라떼를 마셨다. 이런 여유가 좋다...',
    authorNickname: '구름위의아이',
    authorId: 5,
    likes: 312,
    views: 2341,
    isFeatured: true,
    featuredAt: '2024-03-18T09:00:00',
    featuredBy: 'admin@ember.com',
    emotion: '편안함',
    tone: '차분한',
  },
  {
    id: 4,
    diaryId: 1004,
    title: '오랜만에 친구를 만났다',
    excerpt: '대학 동기를 5년 만에 만났다. 변한 것도 있고 변하지 않은 것도 있었다...',
    authorNickname: '행복한하루',
    authorId: 8,
    likes: 156,
    views: 987,
    isFeatured: false,
    featuredAt: null,
    featuredBy: null,
    emotion: '그리움',
    tone: '진지한',
  },
];

// 큐레이션 후보 (아직 선정되지 않은 인기 일기들)
const MOCK_CANDIDATES = [
  {
    diaryId: 2001,
    title: '새벽 러닝의 매력',
    authorNickname: '아침형인간',
    likes: 145,
    views: 876,
    emotion: '뿌듯함',
  },
  {
    diaryId: 2002,
    title: '집순이의 주말',
    authorNickname: '집콕마스터',
    likes: 198,
    views: 1123,
    emotion: '편안함',
  },
  {
    diaryId: 2003,
    title: '첫 해외여행 준비',
    authorNickname: '여행꿈나무',
    likes: 167,
    views: 945,
    emotion: '설렘',
  },
];

export default function CurationsPage() {
  const { hasPermission } = useAuthStore();
  const [curations, setCurations] = useState(MOCK_CURATIONS);
  const [candidates] = useState(MOCK_CANDIDATES);

  const handleFeature = (diaryId: number) => {
    toast.success('우수 일기로 선정되었습니다.');
  };

  const handleUnfeature = (id: number) => {
    setCurations(
      curations.map((c) =>
        c.id === id ? { ...c, isFeatured: false } : c
      )
    );
    toast.success('큐레이션에서 제외되었습니다.');
  };

  const featuredCount = curations.filter((c) => c.isFeatured).length;

  return (
    <div>
      <PageHeader
        title="우수 일기 큐레이션"
        description="사용자들에게 추천할 우수 일기를 선정합니다"
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{featuredCount}</div>
            <p className="text-sm text-muted-foreground">현재 추천 일기</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{candidates.length}</div>
            <p className="text-sm text-muted-foreground">선정 대기</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {curations.reduce((sum, c) => sum + c.views, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">총 조회수</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {curations.reduce((sum, c) => sum + c.likes, 0).toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">총 좋아요</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 현재 추천 일기 */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                현재 추천 일기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {curations
                .filter((c) => c.isFeatured)
                .map((curation) => (
                  <div
                    key={curation.id}
                    className="rounded-lg border p-4 hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{curation.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {curation.excerpt}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {curation.authorNickname}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {curation.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {curation.likes.toLocaleString()}
                          </span>
                          <Badge variant="secondary">{curation.emotion}</Badge>
                          <Badge variant="outline">{curation.tone}</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          {formatDateTime(curation.featuredAt!)} 선정
                        </p>
                      </div>
                      {hasPermission('ADMIN') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnfeature(curation.id)}
                        >
                          제외
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* 선정 대기 후보 */}
        <Card>
          <CardHeader>
            <CardTitle>선정 대기 후보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidates.map((candidate) => (
              <div
                key={candidate.diaryId}
                className="rounded-lg border p-3 hover:bg-muted/30"
              >
                <h4 className="font-medium text-sm">{candidate.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {candidate.authorNickname}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {candidate.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {candidate.views}
                    </span>
                  </div>
                  {hasPermission('ADMIN') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeature(candidate.diaryId)}
                    >
                      <Star className="mr-1 h-3 w-3" />
                      선정
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
