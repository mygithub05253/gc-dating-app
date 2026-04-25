'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '@/components/layout/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useAdminInboxList,
  useMarkAdminInboxRead,
  useResolveAdminInbox,
} from '@/hooks/useAdminInbox';
import type {
  AdminNotification,
  AdminNotificationListParams,
  NotificationStatus,
  NotificationType,
} from '@/types/inbox';

const TYPE_LABEL: Record<NotificationType, string> = {
  CRITICAL: '긴급',
  WARN: '경고',
  INFO: '정보',
};

const TYPE_BADGE_CLASS: Record<NotificationType, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  WARN: 'bg-amber-100 text-amber-800 border-amber-200',
  INFO: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_LABEL: Record<NotificationStatus, string> = {
  UNREAD: '미읽음',
  READ: '읽음',
  RESOLVED: '처리 완료',
};

const STATUS_BADGE_CLASS: Record<NotificationStatus, string> = {
  UNREAD: 'bg-rose-50 text-rose-700 border-rose-200',
  READ: 'bg-slate-100 text-slate-700 border-slate-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const FILTER_TYPES: Array<NotificationType | 'ALL'> = ['ALL', 'CRITICAL', 'WARN', 'INFO'];
const FILTER_STATUSES: Array<NotificationStatus | 'ALL'> = ['ALL', 'UNREAD', 'READ', 'RESOLVED'];

/**
 * 관리자 알림 센터 메인 페이지 — 명세 v2.3 §11.2.
 *
 * <p>유형/상태 필터 + 페이지네이션 + 행별 액션(읽음, 처리 완료, 관련 화면 이동).
 * 담당자 할당과 구독 설정은 별도 다이얼로그/페이지에서 처리(이번 PR은 인박스 메인 + 구독 페이지).</p>
 */
export default function AdminNotificationsPage() {
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | 'ALL'>('ALL');

  const params = useMemo<AdminNotificationListParams>(() => {
    const p: AdminNotificationListParams = { page, size: 20 };
    if (typeFilter !== 'ALL') p.notificationType = typeFilter;
    if (statusFilter !== 'ALL') p.status = statusFilter;
    return p;
  }, [page, typeFilter, statusFilter]);

  const { data, isLoading, refetch, isFetching } = useAdminInboxList(params);
  const markAsRead = useMarkAdminInboxRead();
  const resolve = useResolveAdminInbox();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const unreadCount = data?.unreadCount ?? 0;

  const renderTypeBadge = (type: NotificationType) => {
    const Icon = type === 'CRITICAL' ? AlertTriangle : type === 'WARN' ? AlertCircle : Info;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_CLASS[type]}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {TYPE_LABEL[type]}
      </span>
    );
  };

  const columns: DataTableColumn<AdminNotification>[] = [
    {
      key: 'type',
      header: '유형',
      cell: (n) => renderTypeBadge(n.notificationType),
      cellClassName: 'w-[80px]',
    },
    {
      key: 'category',
      header: '카테고리',
      cell: (n) => <span className="text-sm text-muted-foreground">{n.category}</span>,
      cellClassName: 'w-[140px]',
    },
    {
      key: 'title',
      header: '제목',
      cell: (n) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{n.title}</div>
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.message}</div>
          {n.groupedCount > 1 && (
            <div className="mt-1 text-[10px] text-amber-700">
              + {n.groupedCount - 1}건 묶음 처리됨
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: '발생원',
      cell: (n) => (
        <div className="text-xs text-muted-foreground">
          <div>{n.sourceType}</div>
          {n.sourceId && <div className="font-mono">{n.sourceId}</div>}
        </div>
      ),
      cellClassName: 'w-[160px]',
    },
    {
      key: 'status',
      header: '상태',
      cell: (n) => (
        <Badge className={STATUS_BADGE_CLASS[n.status]}>{STATUS_LABEL[n.status]}</Badge>
      ),
      cellClassName: 'w-[100px]',
    },
    {
      key: 'createdAt',
      header: '발생 시각',
      cell: (n) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(n.createdAt).toLocaleString('ko-KR')}
        </span>
      ),
      cellClassName: 'w-[160px]',
    },
    {
      key: 'actions',
      header: '액션',
      align: 'right',
      cell: (n) => (
        <div className="flex justify-end gap-1">
          {n.actionUrl && (
            <Link
              href={n.actionUrl}
              className="inline-flex items-center rounded border px-2 py-1 text-xs text-primary hover:bg-primary/5"
            >
              관련 화면
            </Link>
          )}
          {n.status === 'UNREAD' && (
            <Button
              size="sm"
              variant="outline"
              disabled={markAsRead.isPending}
              onClick={() => markAsRead.mutate(n.id)}
            >
              읽음
            </Button>
          )}
          {n.status !== 'RESOLVED' && (
            <Button
              size="sm"
              variant="outline"
              disabled={resolve.isPending}
              onClick={() => {
                if (confirm('이 알림을 처리 완료 상태로 변경하시겠습니까?')) {
                  resolve.mutate(n.id, {
                    onError: (err: unknown) => {
                      const errorMessage =
                        err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.';
                      toast.error(errorMessage);
                    },
                  });
                }
              }}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              완료
            </Button>
          )}
        </div>
      ),
      cellClassName: 'w-[260px]',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="관리자 알림 센터"
        description="신고 SLA, 배치 실패, AI 모니터링 등 모든 시스템 알림을 한 곳에서 관리합니다 (명세 v2.3 §11.2)"
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        }
      />

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              미읽음 알림
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono-data text-3xl font-semibold tabular-nums text-rose-600">
              {unreadCount.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              현재 페이지 알림
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono-data text-3xl font-semibold tabular-nums text-foreground">
              {items.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              전체 검색 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono-data text-3xl font-semibold tabular-nums text-foreground">
              {(data?.totalElements ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                유형
              </label>
              <div className="flex gap-1">
                {FILTER_TYPES.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={typeFilter === t ? 'default' : 'outline'}
                    onClick={() => {
                      setTypeFilter(t);
                      setPage(0);
                    }}
                  >
                    {t === 'ALL' ? '전체' : TYPE_LABEL[t]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                상태
              </label>
              <div className="flex gap-1">
                {FILTER_STATUSES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={statusFilter === s ? 'default' : 'outline'}
                    onClick={() => {
                      setStatusFilter(s);
                      setPage(0);
                    }}
                  >
                    {s === 'ALL' ? '전체' : STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 목록 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              알림을 불러오는 중...
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={items}
              rowKey={(n) => n.id}
              wrapInCard={false}
              emptyState={
                <div className="py-12 text-center text-sm text-muted-foreground">
                  표시할 알림이 없습니다.
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
