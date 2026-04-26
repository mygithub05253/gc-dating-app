'use client';

// 약관 변경 이력 페이지 — USER_TERMS / AI_TERMS 버전별 변경 이력 (SUPER_ADMIN 전용)

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import DataTable from '@/components/common/DataTable';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import type { DataTableColumn } from '@/components/common/DataTable';
import { useAdminTermsHistory } from '@/hooks/useAdminTerms';
import type { TermsVersionHistory } from '@/types/content';
import { Loader2, AlertCircle } from 'lucide-react';

type TermType = 'USER_TERMS' | 'AI_TERMS';

interface TermsHistoryEntry {
  id: number;
  version: string;
  termType: TermType;
  changedBy: string;
  changedAt: string;
  summary: string;
}

const TERM_TYPE_LABELS: Record<TermType, string> = {
  USER_TERMS: '이용약관',
  AI_TERMS: 'AI 이용약관',
};

const TERM_TYPE_COLORS: Record<TermType, string> = {
  USER_TERMS: 'bg-blue-50 text-blue-700 border-blue-200',
  AI_TERMS: 'bg-purple-50 text-purple-700 border-purple-200',
};

const PAGE_SIZE = 5;

const columns: DataTableColumn<TermsHistoryEntry>[] = [
  {
    key: 'version',
    header: '버전',
    cell: (row) => (
      <span className="font-mono-data text-sm font-semibold">{row.version}</span>
    ),
  },
  {
    key: 'termType',
    header: '유형',
    cell: (row) => (
      <Badge
        variant="outline"
        className={`border text-xs ${TERM_TYPE_COLORS[row.termType]}`}
      >
        {TERM_TYPE_LABELS[row.termType]}
      </Badge>
    ),
  },
  {
    key: 'changedBy',
    header: '변경자',
    cell: (row) => <span className="text-sm">{row.changedBy}</span>,
  },
  {
    key: 'changedAt',
    header: '변경일',
    cell: (row) => (
      <span className="text-sm text-muted-foreground">{formatDateTime(row.changedAt)}</span>
    ),
  },
  {
    key: 'summary',
    header: '요약',
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.summary.length > 60 ? `${row.summary.slice(0, 60)}...` : row.summary}
      </span>
    ),
  },
];

export default function TermsHistoryPage() {
  const { hasPermission } = useAuthStore();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0); // 0-based

  const { data: historyPageData, isLoading, isError } = useAdminTermsHistory();
  const historyRaw: TermsVersionHistory[] = historyPageData?.content ?? (Array.isArray(historyPageData) ? historyPageData : []);

  // SUPER_ADMIN 권한 가드
  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">SUPER_ADMIN 권한이 필요합니다</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">약관 변경 이력을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">약관 변경 이력을 불러오는데 실패했습니다.</p>
      </div>
    );
  }

  // Transform TermsVersionHistory[] to TermsHistoryEntry[] for the table
  // The API returns { version, date, change } — adapt as best we can
  const historyEntries: TermsHistoryEntry[] = historyRaw.map((h: TermsVersionHistory, idx: number) => ({
    id: idx + 1,
    version: h.version,
    termType: h.version.includes('AI') ? 'AI_TERMS' as TermType : 'USER_TERMS' as TermType,
    changedBy: '-',
    changedAt: h.date,
    summary: h.change ?? '',
  }));

  // 변경자 또는 요약 기준 검색
  const filtered = historyEntries.filter(
    (entry) =>
      !keyword ||
      entry.changedBy.includes(keyword) ||
      entry.summary.includes(keyword),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  return (
    <div>
      <PageHeader
        title="약관 변경 이력"
        description="USER_TERMS / AI_TERMS 버전별 변경 이력"
      />

      {/* 검색 */}
      <div className="mb-4 max-w-sm">
        <SearchBar
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="변경자 또는 요약 검색"
        />
      </div>

      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={paged}
        rowKey={(row) => row.id}
        emptyState="변경 이력이 없습니다."
      />

      {/* 페이지네이션 */}
      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
