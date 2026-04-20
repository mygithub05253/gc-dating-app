'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Plus, Trash2, Edit, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ExampleDiary, ExampleDiaryCategory, ExampleDiaryTarget } from '@/types/content';

const MOCK_EXAMPLE_DIARIES: ExampleDiary[] = [
  {
    id: 1,
    title: '오늘 처음으로 혼자 밥을 먹었어요',
    content: '오늘 점심에 처음으로 혼자 식당에 들어가서 밥을 먹었습니다. 혼밥이 처음이라 처음엔 좀 어색했는데, 막상 해보니 괜찮더라고요. 조용히 창밖을 바라보며 음식에만 집중하는 그 시간이 생각보다 나쁘지 않았어요. 오히려 혼자만의 시간을 갖게 된 것 같아서 뿌듯했습니다. 앞으로도 종종 해봐야겠다는 생각이 들었어요.',
    category: 'DAILY',
    displayTarget: 'ONBOARDING',
    displayOrder: 1,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-01-10T09:00:00',
  },
  {
    id: 2,
    title: '비가 오면 왜 감성적이 되는 걸까요',
    content: '오늘은 하루 종일 비가 내렸어요. 창문에 빗방울이 흘러내리는 걸 멍하니 바라보다 보니 갑자기 옛날 생각이 많이 났습니다. 학창 시절 비 오는 날 우산을 같이 쓰며 걷던 친구들이 생각나고, 혼자 빗속을 걸으며 이어폰으로 음악을 들었던 기억도요. 비는 언제나 감정을 더 예민하게 만드는 것 같아요. 오늘 하루는 그냥 이 감성에 충분히 젖어보기로 했습니다.',
    category: 'EMOTION',
    displayTarget: 'ONBOARDING',
    displayOrder: 2,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-01-12T10:00:00',
  },
  {
    id: 3,
    title: '3개월 운동을 드디어 채웠습니다',
    content: '오늘로 헬스장에 등록한 지 정확히 3개월이 됩니다. 처음 한 달은 진짜 힘들었어요. 매일 아침 6시에 일어나는 것도 고역이었고, 2주 차에는 그냥 그만둘까 하는 생각도 들었거든요. 그런데 어느 순간부터 습관이 되어버렸어요. 지금은 운동을 안 하면 오히려 몸이 찜찜한 느낌이 들 정도입니다. 꾸준히 한다는 게 이렇게 뿌듯한 일인지 처음 알았어요. 앞으로 3개월도 이어나갈 자신이 생겼습니다.',
    category: 'GROWTH',
    displayTarget: 'HELP',
    displayOrder: 1,
    isActive: true,
    createdBy: 2,
    createdAt: '2024-01-15T11:00:00',
  },
  {
    id: 4,
    title: '오랜 친구와의 저녁 식사',
    content: '오늘은 5년 만에 고등학교 친구를 만났어요. 연락이 뜸했던 사이인데 갑자기 연락이 와서 조금 설레기도 하고 어색하기도 했습니다. 막상 만나니까 5년이라는 시간이 무색하게 금방 예전처럼 편해졌어요. 밥을 먹으면서 지난 이야기들을 하다 보니 시간이 훌쩍 지나가 있었습니다. 사람 사이의 진짜 인연은 시간이 흘러도 쉽게 변하지 않는다는 걸 다시 느꼈어요.',
    category: 'RELATIONSHIP',
    displayTarget: 'ONBOARDING',
    displayOrder: 3,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-01-18T14:00:00',
  },
  {
    id: 5,
    title: '카페에서 보낸 일요일 오후',
    content: '오늘은 동네에서 새로 발견한 작은 카페에서 하루를 보냈습니다. 창가 자리에 앉아 따뜻한 라테를 마시면서 읽다 멈춘 책을 펼쳤어요. 사람들이 오고 가는 걸 구경하는 것도 나름 재미있었고, 잔잔한 재즈 음악이 흘러나와 분위기가 참 좋았습니다. 아무것도 하지 않아도 되는 오후가 주는 여유가 이렇게 소중한 줄 오늘에서야 새삼 깨달았어요.',
    category: 'DAILY',
    displayTarget: 'FAQ',
    displayOrder: 1,
    isActive: true,
    createdBy: 2,
    createdAt: '2024-01-20T15:00:00',
  },
  {
    id: 6,
    title: '내가 화가 많다는 걸 인정했습니다',
    content: '오늘 상담 선생님께서 저에게 물었어요. "평소에 감정을 얼마나 표현하시나요?" 저는 잠깐 생각하다가 사실은 화를 많이 참는다는 걸 고백했습니다. 참다 참다 폭발하는 패턴이 반복되고 있다는 걸 알면서도 바꾸기가 쉽지 않았거든요. 오늘 처음으로 그게 문제라는 걸 제대로 인정한 것 같아요. 인정한 것만으로도 뭔가 한 발 나아간 기분이 들었습니다.',
    category: 'EMOTION',
    displayTarget: 'HELP',
    displayOrder: 2,
    isActive: false,
    createdBy: 2,
    createdAt: '2024-01-22T10:00:00',
  },
  {
    id: 7,
    title: '처음으로 요리책을 샀어요',
    content: '평생 라면과 배달 음식으로 살아왔는데, 오늘 서점에서 충동적으로 요리책을 한 권 샀습니다. 별다른 이유는 없었어요. 그냥 표지에 있는 오므라이스 사진이 너무 맛있어 보였거든요. 집에 와서 필요한 재료 목록을 보니 반쯤 포기하고 싶었지만, 일단 마트에 가서 재료를 샀습니다. 처음 만든 오므라이스는 모양이 엉망이었지만 왜인지 모르게 뿌듯하고 맛있었어요.',
    category: 'GROWTH',
    displayTarget: 'FAQ',
    displayOrder: 2,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-01-25T16:00:00',
  },
  {
    id: 8,
    title: '가족과 함께한 주말 나들이',
    content: '오랜만에 부모님, 동생과 함께 근교 공원에 다녀왔습니다. 사실 처음에는 귀찮다는 마음이 있었어요. 주말에 그냥 집에서 쉬고 싶었거든요. 막상 나가보니 오랜만에 가족 넷이 함께 걸으며 이런저런 이야기를 나누는 게 참 좋았습니다. 어머니가 싸오신 김밥을 잔디밭에서 먹으면서, 이런 평범한 순간이 나중에 가장 그리운 기억이 되겠구나 싶었어요.',
    category: 'RELATIONSHIP',
    displayTarget: 'HELP',
    displayOrder: 3,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-02-01T09:00:00',
  },
  {
    id: 9,
    title: '새벽에 혼자 드라이브를 했어요',
    content: '잠이 안 와서 새벽 2시에 혼자 차를 몰았습니다. 한강 변 도로를 천천히 달리면서 볼륨을 크게 올리고 좋아하는 노래를 틀었어요. 가로등 불빛이 창문에 반사되고, 도로가 텅 비어 있는 그 풍경이 이상하게 평화로웠습니다. 아무것도 생각하지 않아도 되는 그 30분이 요즘 하루 중 가장 좋은 시간이었던 것 같아요.',
    category: 'DAILY',
    displayTarget: 'FAQ',
    displayOrder: 3,
    isActive: true,
    createdBy: 2,
    createdAt: '2024-02-05T09:00:00',
  },
  {
    id: 10,
    title: '버킷리스트를 처음 작성했습니다',
    content: '오늘 다이어리를 정리하다가 버킷리스트를 처음으로 적어봤습니다. 제주도에서 한 달 살기, 피아노 배우기, 일출 보며 등산하기 같은 것들이 나왔어요. 쓰다 보니 생각보다 하고 싶은 것들이 많다는 걸 알았습니다. 살면서 너무 해야 하는 것에만 집중했던 것 같아요. 오늘부터는 하고 싶은 것도 하나씩 실현해나가겠다는 결심이 생겼습니다.',
    category: 'GROWTH',
    displayTarget: 'ONBOARDING',
    displayOrder: 4,
    isActive: true,
    createdBy: 2,
    createdAt: '2024-02-10T11:00:00',
  },
  // v2.1: ExampleDiaryCategory 6종 확장 — GRATITUDE 샘플 추가
  {
    id: 11,
    title: '작은 친절에 하루가 따뜻해졌습니다',
    content: '오늘 아침 출근길에 카페에서 커피를 주문했는데, 앞에 있던 모르는 분이 제 커피값을 대신 계산해주셨어요. 놀라서 뒤돌아 봤더니 그분은 이미 웃으면서 나가고 계셨습니다. 그 순간 제 기분이 얼마나 따뜻해졌는지 몰라요. 별것 아닌 친절 한 번이 하루 종일 저를 기분 좋게 만들었고, 저도 오늘만큼은 누군가에게 작은 친절을 베풀어야겠다고 마음먹었습니다. 받은 만큼 돌려주는 게 아니라 또 다른 누군가에게 이어지면 좋겠다는 생각이 들었어요.',
    category: 'GRATITUDE',
    displayTarget: 'ONBOARDING',
    displayOrder: 5,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-02-14T08:30:00',
  },
  {
    id: 12,
    title: '엄마의 반찬 한 통에 담긴 마음',
    content: '주말에 본가에 내려갔다가 돌아오는 길, 엄마가 제 손에 반찬 통을 여러 개 들려 보내셨어요. 무겁다고 손사래를 쳤는데도 \"이거 없으면 네가 또 편의점 음식만 먹을 거잖아\"라며 기어코 담아주셨습니다. 집에 돌아와 냉장고에 반찬 통을 하나씩 넣다가 문득 이 안에 얼마나 많은 마음이 담겨 있는지 새삼 느꼈어요. 멀리서 자식 걱정하는 엄마의 마음이 매일 제 식탁 위에 올라와 있었다는 걸, 오늘에야 제대로 알아챘습니다.',
    category: 'GRATITUDE',
    displayTarget: 'HELP',
    displayOrder: 4,
    isActive: true,
    createdBy: 2,
    createdAt: '2024-02-18T19:00:00',
  },
  // v2.1: SEASONAL 샘플 추가
  {
    id: 13,
    title: '봄의 첫 벚꽃이 피어난 날',
    content: '출근길에 늘 지나다니는 공원 입구 벚나무에서 오늘 처음으로 벚꽃이 핀 걸 봤어요. 아직 완전히 만개한 건 아니지만 연분홍색 꽃잎이 가지 끝에 톡톡 올라온 모습이 너무 예뻤습니다. 겨우내 움츠러들어 있던 마음이 그 꽃 한 송이에 스르르 풀리는 것 같았어요. 아, 이제 정말 봄이구나. 출근하면서 그 풍경을 사진으로 남겼고, 하루 종일 마음이 들떠 있었습니다. 이번 주말에는 꼭 벚꽃 구경 가야겠어요.',
    category: 'SEASONAL',
    displayTarget: 'ONBOARDING',
    displayOrder: 6,
    isActive: true,
    createdBy: 1,
    createdAt: '2024-03-25T09:00:00',
  },
  {
    id: 14,
    title: '첫눈이 내리던 오후의 기억',
    content: '오늘 오후 3시쯤 사무실 창밖으로 하얀 눈발이 날리기 시작했어요. 올해 첫눈이었습니다. 회의 중이었는데도 창밖에 자꾸 눈길이 갔고, 결국 회의가 끝나자마자 창가에 붙어 한참을 쳐다봤어요. 어른이 되고 나서는 눈이 오면 출퇴근 걱정부터 앞서는데, 오늘만큼은 정말 오랜만에 순수하게 눈 오는 풍경이 예뻐 보였습니다. 퇴근길에 첫눈을 맞으며 걸었던 그 시간이 올해의 마지막을 정리해주는 느낌이었어요.',
    category: 'SEASONAL',
    displayTarget: 'FAQ',
    displayOrder: 4,
    isActive: true,
    createdBy: 2,
    createdAt: '2024-03-27T16:00:00',
  },
];

const CATEGORY_LABELS: Record<ExampleDiaryCategory, string> = {
  GRATITUDE: '감사',
  GROWTH: '성장',
  DAILY: '일상',
  EMOTION: '감정',
  RELATIONSHIP: '관계',
  SEASONAL: '계절',
};

const CATEGORY_COLORS: Record<ExampleDiaryCategory, string> = {
  GRATITUDE: 'bg-pink-100 text-pink-800',
  GROWTH: 'bg-green-100 text-green-800',
  DAILY: 'bg-blue-100 text-blue-800',
  EMOTION: 'bg-purple-100 text-purple-800',
  RELATIONSHIP: 'bg-orange-100 text-orange-800',
  SEASONAL: 'bg-yellow-100 text-yellow-800',
};

const TARGET_LABELS: Record<ExampleDiaryTarget, string> = {
  ONBOARDING: '온보딩',
  HELP: '도움말',
  FAQ: 'FAQ',
};

const TARGET_COLORS: Record<ExampleDiaryTarget, string> = {
  ONBOARDING: 'bg-sky-100 text-sky-800',
  HELP: 'bg-yellow-100 text-yellow-800',
  FAQ: 'bg-gray-100 text-gray-700',
};

export default function ExampleDiariesPage() {
  const { hasPermission } = useAuthStore();
  const [diaries, setDiaries] = useState<ExampleDiary[]>(MOCK_EXAMPLE_DIARIES);
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [targetFilter, setTargetFilter] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleActive = (id: number) => {
    setDiaries(diaries.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d)));
    toast.success('활성 상태가 변경되었습니다.');
  };

  const handleEdit = (id: number) => {
    toast.success('예제 일기 수정 모달이 열립니다.');
  };

  const handleDelete = (id: number) => {
    setDiaries(diaries.filter((d) => d.id !== id));
    toast.success('예제 일기가 삭제되었습니다.');
  };

  const handleAddDiary = () => {
    toast.success('새 예제 일기 추가 모달이 열립니다.');
  };

  const filteredDiaries = diaries.filter((d) => {
    const matchesKeyword =
      !keyword || d.title.includes(keyword) || d.content.includes(keyword);
    const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
    const matchesTarget = targetFilter === 'ALL' || d.displayTarget === targetFilter;
    return matchesKeyword && matchesCategory && matchesTarget;
  });

  // displayTarget별 카운트 계산
  const targetCounts = diaries.reduce<Record<string, number>>((acc, d) => {
    acc[d.displayTarget] = (acc[d.displayTarget] ?? 0) + 1;
    return acc;
  }, {});
  const maxTargetEntry = Object.entries(targetCounts).sort((a, b) => b[1] - a[1])[0];
  const topTarget = maxTargetEntry
    ? `${TARGET_LABELS[maxTargetEntry[0] as ExampleDiaryTarget]} (${maxTargetEntry[1]}개)`
    : '-';

  const avgContentLength = diaries.length > 0
    ? Math.round(diaries.reduce((sum, d) => sum + d.content.length, 0) / diaries.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="예제 일기 관리"
        description="앱 내 예제 일기 콘텐츠를 관리합니다"
        actions={
          hasPermission('ADMIN') && (
            <Button onClick={handleAddDiary}>
              <Plus className="mr-2 h-4 w-4" />
              새 예제 일기 추가
            </Button>
          )
        }
      />

      <MockPageNotice message="예제 일기 도메인 백엔드 API 준비 중입니다." />

      {/* 통계 카드 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{diaries.length}</div>
            <p className="text-sm text-muted-foreground">전체 예제</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {diaries.filter((d) => d.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">활성 예제</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600 text-base leading-8">
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
            {(Object.keys(CATEGORY_LABELS) as ExampleDiaryCategory[]).map((cat) => (
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
            {(Object.keys(TARGET_LABELS) as ExampleDiaryTarget[]).map((tgt) => (
              <option key={tgt} value={tgt}>
                {TARGET_LABELS[tgt]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 예제 일기 목록 */}
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
                        더 보기
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(diary.createdAt)}
                  </p>
                </div>
                {hasPermission('ADMIN') && (
                  <div className="flex flex-shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(diary.id)}
                      title={diary.isActive ? '비활성화' : '활성화'}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(diary.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(diary.id)}
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
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
