'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import {
  NOTICE_CATEGORY_LABELS,
  NOTICE_CATEGORY_COLORS,
  NOTICE_STATUS_LABELS,
  NOTICE_STATUS_COLORS,
} from '@/lib/constants';
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  Pin,
  Bell,
  Megaphone,
  AlertTriangle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 공지사항 데이터 (ERD v2.0: GENERAL/MAINTENANCE/TERMS_CHANGE/URGENT, DRAFT/PUBLISHED/HIDDEN)
const MOCK_NOTICES = [
  {
    id: 1,
    title: '서비스 이용약관 변경 안내',
    content: '안녕하세요, Ember입니다.\n\n2024년 3월 1일부터 서비스 이용약관이 변경됩니다. 주요 변경사항은 다음과 같습니다...',
    category: 'TERMS_CHANGE',
    priority: 'HIGH',
    isPinned: true,
    status: 'PUBLISHED',
    publishedAt: '2024-03-20T09:00:00',
    createdAt: '2024-03-19T14:00:00',
    createdBy: '김관리',
    viewCount: 12456,
    targetAudience: 'ALL',
  },
  {
    id: 2,
    title: '수요일 특별 랜덤 주제 이벤트',
    content: '매주 수요일에 특별한 랜덤 주제가 제공됩니다! 이번 주 주제는...',
    category: 'GENERAL',
    priority: 'NORMAL',
    isPinned: true,
    status: 'PUBLISHED',
    publishedAt: '2024-03-20T00:00:00',
    createdAt: '2024-03-19T18:00:00',
    createdBy: '이운영',
    viewCount: 8934,
    targetAudience: 'ALL',
  },
  {
    id: 3,
    title: '시스템 점검 안내 (3/25 02:00~04:00)',
    content: '서비스 안정화를 위한 시스템 점검이 예정되어 있습니다.',
    category: 'MAINTENANCE',
    priority: 'HIGH',
    isPinned: false,
    status: 'PUBLISHED',
    publishedAt: '2024-03-22T10:00:00',
    createdAt: '2024-03-22T09:30:00',
    createdBy: '김관리',
    viewCount: 3456,
    targetAudience: 'ALL',
  },
  {
    id: 4,
    title: '새로운 감정 코칭 기능 출시',
    content: 'AI 기반 감정 코칭 기능이 새롭게 출시되었습니다. 일기를 작성하시면...',
    category: 'GENERAL',
    priority: 'NORMAL',
    isPinned: false,
    status: 'PUBLISHED',
    publishedAt: '2024-03-18T12:00:00',
    createdAt: '2024-03-18T10:00:00',
    createdBy: '이운영',
    viewCount: 6789,
    targetAudience: 'ALL',
  },
  {
    id: 5,
    title: '봄맞이 이벤트 - 커플 탄생 축하',
    content: '봄을 맞아 Ember에서 특별한 이벤트를 준비했습니다!',
    category: 'GENERAL',
    priority: 'NORMAL',
    isPinned: false,
    status: 'DRAFT',
    publishedAt: null,
    createdAt: '2024-03-23T11:00:00',
    createdBy: '박신입',
    viewCount: 0,
    targetAudience: 'ALL',
  },
  {
    id: 6,
    title: '개인정보 처리방침 변경 사전 안내',
    content: '2024년 4월 1일부터 개인정보 처리방침이 변경될 예정입니다.',
    category: 'TERMS_CHANGE',
    priority: 'HIGH',
    isPinned: false,
    status: 'DRAFT',
    publishedAt: '2024-03-25T09:00:00',
    createdAt: '2024-03-23T10:00:00',
    createdBy: '김관리',
    viewCount: 0,
    targetAudience: 'ALL',
  },
  {
    id: 7,
    title: '[긴급] 임시 점검 안내',
    content: 'AI 모델 업데이트로 인해 23:00~23:30 일시 서비스가 중단될 수 있습니다.',
    category: 'URGENT',
    priority: 'HIGH',
    isPinned: true,
    status: 'PUBLISHED',
    publishedAt: '2024-03-23T22:30:00',
    createdAt: '2024-03-23T22:00:00',
    createdBy: '김관리',
    viewCount: 9876,
    targetAudience: 'ALL',
  },
  {
    id: 8,
    title: '공지 (숨김 처리)',
    content: '잘못 게시되어 숨김 처리된 공지입니다.',
    category: 'GENERAL',
    priority: 'NORMAL',
    isPinned: false,
    status: 'HIDDEN',
    publishedAt: '2024-03-15T10:00:00',
    createdAt: '2024-03-15T09:30:00',
    createdBy: '박신입',
    viewCount: 234,
    targetAudience: 'ALL',
  },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  GENERAL: <Info className="h-4 w-4" />,
  MAINTENANCE: <Bell className="h-4 w-4" />,
  TERMS_CHANGE: <AlertTriangle className="h-4 w-4" />,
  URGENT: <Megaphone className="h-4 w-4" />,
};

export default function NoticesManagementPage() {
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('공지사항 목록을 새로고침했습니다.');
  };

  const handleAddNotice = () => {
    toast.success('새 공지사항 작성 모달이 열립니다.');
  };

  const handleEdit = (noticeId: number) => {
    toast.success('공지사항 수정 모달이 열립니다.');
  };

  const handleDelete = (noticeId: number) => {
    toast.success('공지사항을 삭제했습니다.');
  };

  const handleTogglePin = (noticeId: number) => {
    toast.success('고정 상태를 변경했습니다.');
  };

  // Filter notices
  const filteredNotices = MOCK_NOTICES.filter(notice => {
    const matchesKeyword = !keyword ||
      notice.title.includes(keyword) ||
      notice.content.includes(keyword);
    const matchesCategory = categoryFilter === 'ALL' || notice.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || notice.status === statusFilter;
    return matchesKeyword && matchesCategory && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="공지사항 관리"
        description="서비스 공지사항 등록 및 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleAddNotice}>
              <Plus className="mr-2 h-4 w-4" />
              공지 작성
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">전체 공지</div>
            <div className="mt-1 text-2xl font-bold">{MOCK_NOTICES.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">게시중</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {MOCK_NOTICES.filter(n => n.status === 'PUBLISHED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">초안</div>
            <div className="mt-1 text-2xl font-bold text-gray-500">
              {MOCK_NOTICES.filter(n => n.status === 'DRAFT').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">숨김</div>
            <div className="mt-1 text-2xl font-bold text-zinc-500">
              {MOCK_NOTICES.filter(n => n.status === 'HIDDEN').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            placeholder="공지사항 제목 또는 내용 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 카테고리</option>
            {Object.entries(NOTICE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 상태</option>
            {Object.entries(NOTICE_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices List */}
      <div className="grid gap-4">
        {filteredNotices.map(notice => (
          <Card key={notice.id} className={notice.status === 'DRAFT' ? 'border-dashed' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {notice.isPinned && (
                      <Pin className="h-4 w-4 text-red-500" />
                    )}
                    {notice.priority === 'HIGH' && (
                      <Badge className="bg-red-100 text-red-800">중요</Badge>
                    )}
                    <Badge className={NOTICE_CATEGORY_COLORS[notice.category]}>
                      <span className="flex items-center gap-1">
                        {CATEGORY_ICONS[notice.category]}
                        {NOTICE_CATEGORY_LABELS[notice.category]}
                      </span>
                    </Badge>
                    <Badge className={NOTICE_STATUS_COLORS[notice.status]}>
                      {NOTICE_STATUS_LABELS[notice.status]}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{notice.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {notice.content}
                  </p>
                </div>
                <div className="flex gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePin(notice.id)}
                    className={notice.isPinned ? 'text-red-500' : ''}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(notice.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(notice.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <span>작성자: {notice.createdBy}</span>
                  <span>조회: {notice.viewCount.toLocaleString()}</span>
                </div>
                <span>
                  {notice.status === 'PUBLISHED' && notice.publishedAt
                    ? `게시일: ${formatDateTime(notice.publishedAt)}`
                    : `작성일: ${formatDateTime(notice.createdAt)}`
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
