'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { AnalyticsLoading, AnalyticsError } from '@/components/common/AnalyticsStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Download, Eye, RotateCcw, Ban, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { blocksApi } from '@/lib/api/blocks';
import type { Block } from '@/types/report';

const REASON_LABELS: Record<string, string> = {
  HARASSMENT: '괴롭힘',
  SPAM: '스팸',
  INAPPROPRIATE: '부적절한 내용',
  OFFENSIVE: '모욕적 발언',
  OTHER: '기타',
};

const REASON_COLORS: Record<string, string> = {
  HARASSMENT: 'bg-red-100 text-red-800',
  SPAM: 'bg-yellow-100 text-yellow-800',
  INAPPROPRIATE: 'bg-orange-100 text-orange-800',
  OFFENSIVE: 'bg-purple-100 text-purple-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '차단중',
  UNBLOCKED: '해제됨',
  ADMIN_CANCELLED: '관리자 취소',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-800',
  UNBLOCKED: 'bg-green-100 text-green-800',
  ADMIN_CANCELLED: 'bg-blue-100 text-blue-800',
};

export default function BlockHistoryPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['blocks', { keyword, statusFilter, page }],
    queryFn: () =>
      blocksApi
        .getList({
          keyword: keyword || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          page,
          size: 20,
        })
        .then((res) => res.data.data),
  });

  const handleRefresh = () => {
    refetch();
    toast.success('차단 이력을 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('차단 이력을 CSV로 내보냅니다.');
  };

  const handleCancelBlock = (blockId: number) => {
    void blockId; // 실제 API 연동 시 blockId 기반 취소 처리
    toast.success('차단을 취소했습니다.');
  };

  // DataTable 컬럼
  const columns: DataTableColumn<Block>[] = useMemo(
    () => [
      {
        key: 'blocker',
        header: '차단자',
        cell: (b) => (
          <Link
            href={`/admin/members/${b.blockerId}`}
            className="text-primary hover:underline"
          >
            {b.blockerNickname}
          </Link>
        ),
      },
      {
        key: 'blocked',
        header: '피차단자',
        cell: (b) => (
          <Link
            href={`/admin/members/${b.blockedId}`}
            className="text-primary hover:underline"
          >
            {b.blockedNickname}
          </Link>
        ),
      },
      {
        key: 'reason',
        header: '사유',
        cell: (b) => (
          <Badge className={REASON_COLORS[b.reason] ?? 'bg-gray-100 text-gray-800'}>
            {REASON_LABELS[b.reason] ?? b.reason}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: '상태',
        cell: (b) => (
          <Badge className={STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-800'}>
            {STATUS_LABELS[b.status] ?? b.status}
          </Badge>
        ),
      },
      {
        key: 'createdAt',
        header: '차단일',
        cell: (b) => (
          <span className="text-muted-foreground">{formatDateTime(b.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '액션',
        cell: (b) => (
          <div className="flex gap-1">
            <Link href={`/admin/members/${b.blockerId}`}>
              <Button variant="ghost" size="xs">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {b.status === 'ACTIVE' && (
              <Button variant="ghost" size="xs" onClick={() => handleCancelBlock(b.id)}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const blocks = data?.content ?? [];
  const activeCount = blocks.filter((b: Block) => b.status === 'ACTIVE').length;
  const unblockedCount = blocks.filter((b: Block) => b.status === 'UNBLOCKED').length;
  const totalCount = data?.totalElements ?? blocks.length;

  return (
    <div>
      <PageHeader
        title="차단 이력 관리"
        description="사용자 간 차단 이력 조회 및 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              CSV 내보내기
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 차단</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">활성 차단</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">해제됨</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{unblockedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">현재 페이지</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{blocks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            placeholder="차단자 또는 피차단자 닉네임 검색"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="ALL">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Loading / Error */}
      {isLoading && <AnalyticsLoading label="차단 이력을 불러오는 중입니다..." />}
      {isError && <AnalyticsError message={error?.message || '차단 이력을 불러오지 못했습니다.'} />}

      {/* Block History List */}
      {!isLoading && !isError && (
        <DataTable
          columns={columns}
          data={blocks}
          rowKey={(b) => b.id}
          emptyState="검색 결과가 없습니다."
        />
      )}
    </div>
  );
}
