'use client';

// PII 접근 로그 페이지 — 관리자의 개인정보 접근 이력 감사 (Fail-Closed, SUPER_ADMIN 전용)

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/common/DataTable';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import type { DataTableColumn } from '@/components/common/DataTable';
import { Loader2 } from 'lucide-react';

type AccessType = 'EMAIL_VIEW' | 'REAL_NAME_VIEW' | 'PHONE_VIEW';

interface PiiAccessLog {
  id: number;
  accessedAt: string;
  adminEmail: string;
  accessType: AccessType;
  targetUserId: number;
  targetNickname: string;
  ipAddress: string;
}

interface PiiAccessLogPage {
  content: PiiAccessLog[];
  totalElements: number;
  totalPages: number;
}

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  EMAIL_VIEW: '이메일 조회',
  REAL_NAME_VIEW: '실명 조회',
  PHONE_VIEW: '전화번호 조회',
};

const ACCESS_TYPE_COLORS: Record<AccessType, string> = {
  EMAIL_VIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  REAL_NAME_VIEW: 'bg-orange-50 text-orange-700 border-orange-200',
  PHONE_VIEW: 'bg-red-50 text-red-700 border-red-200',
};

const PAGE_SIZE = 20;

const columns: DataTableColumn<PiiAccessLog>[] = [
  {
    key: 'accessedAt',
    header: '접근 시각',
    cell: (row) => (
      <span className="text-sm">{formatDateTime(row.accessedAt)}</span>
    ),
  },
  {
    key: 'adminEmail',
    header: '관리자',
    cell: (row) => (
      <span className="text-sm font-medium">{row.adminEmail}</span>
    ),
  },
  {
    key: 'accessType',
    header: '접근 유형',
    cell: (row) => (
      <Badge
        variant="outline"
        className={`border text-xs ${ACCESS_TYPE_COLORS[row.accessType]}`}
      >
        {ACCESS_TYPE_LABELS[row.accessType]}
      </Badge>
    ),
  },
  {
    key: 'target',
    header: '대상 사용자',
    cell: (row) => (
      <span className="text-sm">
        <span className="font-medium">#{row.targetUserId}</span>{' '}
        <span className="text-muted-foreground">{row.targetNickname}</span>
      </span>
    ),
  },
  {
    key: 'ipAddress',
    header: 'IP 주소',
    cell: (row) => (
      <span className="font-mono-data text-sm text-muted-foreground">{row.ipAddress}</span>
    ),
  },
];

export default function PiiLogsPage() {
  const { hasPermission } = useAuthStore();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);

  // SUPER_ADMIN 권한 가드
  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">SUPER_ADMIN 권한이 필요합니다</p>
      </div>
    );
  }

  const { data: pageData, isLoading } = useQuery<PiiAccessLogPage>({
    queryKey: ['pii-access-logs', { search: keyword, page, size: PAGE_SIZE }],
    queryFn: () =>
      apiClient.get('/api/admin/pii-access-logs', {
        params: {
          search: keyword || undefined,
          page,
          size: PAGE_SIZE,
        },
      }).then(r => r.data.data),
  });

  const logs = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  return (
    <div>
      <PageHeader
        title="PII 접근 로그"
        description="관리자의 개인정보 접근 이력 (Fail-Closed 감사)"
      />

      {/* 검색 */}
      <div className="mb-4 max-w-sm">
        <SearchBar
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="관리자 이메일 검색"
        />
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 데이터 테이블 */}
          <DataTable
            columns={columns}
            data={logs}
            rowKey={(row) => row.id}
            emptyState="접근 로그가 없습니다."
          />

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
