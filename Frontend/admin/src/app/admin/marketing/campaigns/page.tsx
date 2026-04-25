'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  RefreshCw,
  Send,
  Ban,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '@/components/layout/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import {
  useAdminCampaignsList,
  useApproveAdminCampaign,
  useCancelAdminCampaign,
} from '@/hooks/useAdminCampaigns';
import type {
  CampaignListParams,
  CampaignStatus,
  NotificationCampaign,
} from '@/types/campaign';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: '초안',
  SCHEDULED: '예약됨',
  SENDING: '발송중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
};

const STATUS_BADGE_CLASS: Record<CampaignStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  SENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_ICON: Record<CampaignStatus, typeof Send> = {
  DRAFT: PauseCircle,
  SCHEDULED: PlayCircle,
  SENDING: Send,
  COMPLETED: CheckCircle2,
  CANCELLED: Ban,
};

const FILTER_STATUSES: Array<CampaignStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'SCHEDULED',
  'SENDING',
  'COMPLETED',
  'CANCELLED',
];

/**
 * 일괄 공지/푸시 캠페인 목록 페이지 (명세 v2.3 §11.1.3).
 *
 * Phase 2-A: CRUD + Preview + 승인/취소 + 결과 조회 화면 라우팅까지.
 * 실제 발송 워커는 Phase 2-B에서 구현되며, 이 페이지는 SCHEDULED·SENDING 상태도
 * 그대로 표시한다 (워커가 카운트를 채우면 결과 화면에 반영됨).
 */
export default function AdminCampaignsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'ALL'>('ALL');

  const params = useMemo<CampaignListParams>(() => {
    const p: CampaignListParams = { page, size: 20 };
    if (statusFilter !== 'ALL') p.status = statusFilter;
    return p;
  }, [page, statusFilter]);

  const { data, isLoading, refetch, isFetching } = useAdminCampaignsList(params);
  const approve = useApproveAdminCampaign();
  const cancel = useCancelAdminCampaign();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const renderStatus = (status: CampaignStatus) => {
    const Icon = STATUS_ICON[status];
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {STATUS_LABEL[status]}
      </span>
    );
  };

  const handleApprove = async (id: number) => {
    if (!confirm('이 캠페인 발송을 승인하시겠습니까? 즉시 발송 또는 예약 발송이 시작됩니다.')) return;
    try {
      await approve.mutateAsync(id);
    } catch (err) {
      toast.error('승인 실패: 상태가 올바른지 확인해 주세요.');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('이 예약 발송을 취소하시겠습니까?')) return;
    try {
      await cancel.mutateAsync(id);
    } catch (err) {
      toast.error('취소 실패: SCHEDULED 상태인 캠페인만 취소할 수 있습니다.');
    }
  };

  const columns: DataTableColumn<NotificationCampaign>[] = [
    {
      key: 'status',
      header: '상태',
      cell: (c) => renderStatus(c.status),
      cellClassName: 'w-[110px]',
    },
    {
      key: 'title',
      header: '제목 / 메시지',
      cell: (c) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{c.title}</div>
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {c.messageSubject}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {c.sendTypes.map((t) => (
              <span
                key={t}
                className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'target',
      header: '대상 / 결과',
      cell: (c) => (
        <div className="text-xs">
          <div className="font-medium text-foreground">대상 {c.targetCount.toLocaleString()}명</div>
          {c.status !== 'DRAFT' && c.status !== 'SCHEDULED' && (
            <>
              <div className="text-emerald-700">성공 {c.successCount.toLocaleString()}</div>
              <div className="text-rose-700">실패 {c.failureCount.toLocaleString()}</div>
            </>
          )}
        </div>
      ),
      cellClassName: 'w-[140px]',
    },
    {
      key: 'schedule',
      header: '발송 시각',
      cell: (c) => (
        <div className="text-xs text-muted-foreground">
          {c.scheduledAt ? (
            <div>예약 {formatDateTime(c.scheduledAt)}</div>
          ) : (
            <div className="text-foreground">즉시 발송</div>
          )}
          {c.sentAt && <div>시작 {formatDateTime(c.sentAt)}</div>}
          {c.completedAt && <div>완료 {formatDateTime(c.completedAt)}</div>}
        </div>
      ),
      cellClassName: 'w-[180px]',
    },
    {
      key: 'created',
      header: '생성',
      cell: (c) => (
        <div className="text-xs text-muted-foreground">
          <div>{formatDateTime(c.createdAt)}</div>
          <div className="font-mono">admin#{c.createdBy}</div>
        </div>
      ),
      cellClassName: 'w-[160px]',
    },
    {
      key: 'actions',
      header: '액션',
      cell: (c) => (
        <div className="flex flex-wrap gap-1.5">
          <Button asChild variant="outline" size="xs">
            <Link href={`/admin/marketing/campaigns/${c.id}`}>상세</Link>
          </Button>
          {c.status === 'DRAFT' && (
            <Button
              size="xs"
              onClick={() => handleApprove(c.id)}
              disabled={approve.isPending}
            >
              <Send className="mr-1 h-3 w-3" />
              승인
            </Button>
          )}
          {c.status === 'SCHEDULED' && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleCancel(c.id)}
              disabled={cancel.isPending}
            >
              <Ban className="mr-1 h-3 w-3" />
              취소
            </Button>
          )}
          {(c.status === 'COMPLETED' || c.status === 'SENDING') && (
            <Button asChild variant="outline" size="xs">
              <Link href={`/admin/marketing/campaigns/${c.id}/result`}>결과</Link>
            </Button>
          )}
        </div>
      ),
      cellClassName: 'w-[210px]',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="일괄 공지/푸시 캠페인"
        description="대상 필터를 설정하여 앱 내 공지·푸시·이메일을 일괄 발송합니다 (명세 v2.3 §11.1.3)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/marketing/campaigns/new">
                <Plus className="mr-1.5 h-4 w-4" />
                캠페인 만들기
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PauseCircle className="h-8 w-8 text-slate-500" />
            <div>
              <div className="text-xs text-muted-foreground">현재 페이지 개수</div>
              <div className="text-xl font-semibold">{items.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PlayCircle className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">전체 캠페인</div>
              <div className="text-xl font-semibold">{totalElements.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">필터</div>
              <div className="text-sm font-medium">{STATUS_LABEL[statusFilter as CampaignStatus] || '전체'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {FILTER_STATUSES.map((s) => (
            <Button
              key={s}
              size="xs"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(s);
                setPage(0);
              }}
            >
              {s === 'ALL' ? '전체' : STATUS_LABEL[s]}
            </Button>
          ))}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        emptyState={
          <span className="text-muted-foreground">
            {isLoading ? '불러오는 중...' : '등록된 캠페인이 없습니다.'}
          </span>
        }
        wrapInCard
      />

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
