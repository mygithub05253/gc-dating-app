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
import type {
  NoticeCategory,
  NoticeStatus,
  NoticeTargetAudience,
  Notice,
} from '@/types/content';
import {
  useAdminNoticesList,
  useChangeAdminNoticeStatus,
} from '@/hooks/useAdminNotices';
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
  Users,
  UserPlus,
  Flame,
  Crown,
  Moon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

// v2.1 신규: 타겟 오디언스 라벨 / 색상 / 아이콘 (ERD v2.1 notices.target_audience Enum 5종)
const TARGET_AUDIENCE_LABELS: Record<NoticeTargetAudience, string> = {
  ALL: '전체',
  NEW_USER: '신규 유저',
  ACTIVE_USER: '활성 유저',
  PREMIUM: '프리미엄',
  DORMANT: '휴면 유저',
};

const TARGET_AUDIENCE_COLORS: Record<NoticeTargetAudience, string> = {
  ALL: 'bg-blue-50 text-blue-700 border-blue-200',
  NEW_USER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ACTIVE_USER: 'bg-orange-50 text-orange-700 border-orange-200',
  PREMIUM: 'bg-purple-50 text-purple-700 border-purple-200',
  DORMANT: 'bg-slate-50 text-slate-700 border-slate-200',
};

const TARGET_AUDIENCE_ICONS: Record<NoticeTargetAudience, React.ReactNode> = {
  ALL: <Users className="h-3 w-3" />,
  NEW_USER: <UserPlus className="h-3 w-3" />,
  ACTIVE_USER: <Flame className="h-3 w-3" />,
  PREMIUM: <Crown className="h-3 w-3" />,
  DORMANT: <Moon className="h-3 w-3" />,
};

// URGENT/MAINTENANCE 카테고리는 자동으로 ALL로 보정 (관리자 기능명세서 v2.1)
const FORCE_ALL_CATEGORIES: NoticeCategory[] = ['URGENT', 'MAINTENANCE'];

const CATEGORY_ICONS: Record<NoticeCategory, React.ReactNode> = {
  GENERAL: <Info className="h-4 w-4" />,
  MAINTENANCE: <Bell className="h-4 w-4" />,
  TERMS_CHANGE: <AlertTriangle className="h-4 w-4" />,
  URGENT: <Megaphone className="h-4 w-4" />,
};

export default function NoticesManagementPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL_AUDIENCE');

  const { data: pageData, isLoading, isError } = useAdminNoticesList({
    category: categoryFilter === 'ALL' ? undefined : (categoryFilter as NoticeCategory),
    status: statusFilter === 'ALL' ? undefined : (statusFilter as NoticeStatus),
    keyword: keyword || undefined,
  });
  const changeStatusMutation = useChangeAdminNoticeStatus();

  const notices: Notice[] = pageData?.content ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-notices-list'] });
    toast.success('공지사항 목록을 새로고침했습니다.');
  };

  const handleAddNotice = () => {
    toast.success('새 공지사항 작성 모달이 열립니다. (URGENT/MAINTENANCE 선택 시 타겟이 ALL로 자동 잠김)');
  };

  const handleEdit = (noticeId: number) => {
    toast.success(`공지사항 #${noticeId} 수정 모달이 열립니다.`);
  };

  const handleDelete = (noticeId: number) => {
    changeStatusMutation.mutate({ id: noticeId, status: 'HIDDEN' });
  };

  const handleTogglePin = (noticeId: number) => {
    toast.success(`공지사항 #${noticeId}의 고정 상태를 변경했습니다.`);
  };

  // Filter by audience client-side (API doesn't support audience param)
  const filteredNotices = notices.filter((notice) => {
    const matchesAudience =
      audienceFilter === 'ALL_AUDIENCE' || notice.targetAudience === audienceFilter;
    return matchesAudience;
  });

  // Compute stats from all loaded notices
  const publishedCount = notices.filter((n) => n.status === 'PUBLISHED').length;
  const draftCount = notices.filter((n) => n.status === 'DRAFT').length;
  const hiddenCount = notices.filter((n) => n.status === 'HIDDEN').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">공지사항 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">공지사항 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="공지사항 관리"
        description="서비스 공지사항 등록 및 관리 (v2.1 정합: targetAudience 5종)"
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
            <div className="mt-1 text-2xl font-bold">{notices.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">게시중</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{publishedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">초안</div>
            <div className="mt-1 text-2xl font-bold text-gray-500">{draftCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">숨김</div>
            <div className="mt-1 text-2xl font-bold text-zinc-500">{hiddenCount}</div>
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
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 카테고리</option>
            {Object.entries(NOTICE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 상태</option>
            {Object.entries(NOTICE_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {/* v2.1 신규: 타겟 오디언스 필터 */}
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL_AUDIENCE">전체 타겟</option>
            {Object.entries(TARGET_AUDIENCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notices List */}
      <div className="grid gap-4">
        {filteredNotices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              검색 결과가 없습니다.
            </CardContent>
          </Card>
        ) : (
          filteredNotices.map((notice) => {
            const isForceAll = FORCE_ALL_CATEGORIES.includes(notice.category);
            return (
              <Card key={notice.id} className={notice.status === 'DRAFT' ? 'border-dashed' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {notice.isPinned && <Pin className="h-4 w-4 text-red-500" />}
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
                        {/* v2.1: 타겟 오디언스 뱃지 */}
                        <Badge
                          variant="outline"
                          className={`border ${TARGET_AUDIENCE_COLORS[notice.targetAudience]}`}
                        >
                          <span className="flex items-center gap-1">
                            {TARGET_AUDIENCE_ICONS[notice.targetAudience]}
                            {TARGET_AUDIENCE_LABELS[notice.targetAudience]}
                            {isForceAll && (
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                (자동 ALL)
                              </span>
                            )}
                          </span>
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
                        : `작성일: ${formatDateTime(notice.createdAt)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
