'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityLogsApi } from '@/lib/api/admins';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Download, Filter, Activity, LogIn, LogOut, Settings, Users, FileText, Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AuditLog } from '@/types/admin';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  USER_SUSPEND: '사용자 정지',
  USER_BAN: '사용자 영구정지',
  USER_RESTORE: '사용자 복구',
  REPORT_RESOLVE: '신고 처리',
  TOPIC_CREATE: '주제 등록',
  TOPIC_UPDATE: '주제 수정',
  TOPIC_DELETE: '주제 삭제',
  ADMIN_CREATE: '관리자 생성',
  ADMIN_UPDATE: '관리자 수정',
  ADMIN_DELETE: '관리자 삭제',
  SETTINGS_UPDATE: '설정 변경',
  NOTICE_CREATE: '공지사항 등록',
  NOTICE_UPDATE: '공지사항 수정',
  NOTICE_DELETE: '공지사항 삭제',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  USER_SUSPEND: 'bg-yellow-100 text-yellow-800',
  USER_BAN: 'bg-red-100 text-red-800',
  USER_RESTORE: 'bg-blue-100 text-blue-800',
  REPORT_RESOLVE: 'bg-purple-100 text-purple-800',
  TOPIC_CREATE: 'bg-cyan-100 text-cyan-800',
  TOPIC_UPDATE: 'bg-cyan-100 text-cyan-800',
  TOPIC_DELETE: 'bg-orange-100 text-orange-800',
  ADMIN_CREATE: 'bg-indigo-100 text-indigo-800',
  ADMIN_UPDATE: 'bg-indigo-100 text-indigo-800',
  ADMIN_DELETE: 'bg-red-100 text-red-800',
  SETTINGS_UPDATE: 'bg-amber-100 text-amber-800',
  NOTICE_CREATE: 'bg-teal-100 text-teal-800',
  NOTICE_UPDATE: 'bg-teal-100 text-teal-800',
  NOTICE_DELETE: 'bg-orange-100 text-orange-800',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: '슈퍼관리자',
  ADMIN: '관리자',
  VIEWER: '뷰어',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

function getActionIcon(action: string) {
  if (action === 'LOGIN') return <LogIn className="h-4 w-4" />;
  if (action === 'LOGOUT') return <LogOut className="h-4 w-4" />;
  if (action.includes('USER')) return <Users className="h-4 w-4" />;
  if (action.includes('ADMIN')) return <Shield className="h-4 w-4" />;
  if (action.includes('SETTINGS')) return <Settings className="h-4 w-4" />;
  if (action.includes('REPORT') || action.includes('TOPIC') || action.includes('NOTICE')) return <FileText className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

const PAGE_SIZE = 20;

export default function AdminActivityLogsPage() {
  const [keyword, setKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(0);

  const { data: pageData, isLoading, refetch } = useQuery({
    queryKey: ['activity-logs', { search: keyword, action: actionFilter === 'ALL' ? undefined : actionFilter, page, size: PAGE_SIZE }],
    queryFn: () =>
      activityLogsApi.getList({
        search: keyword || undefined,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        page,
        size: PAGE_SIZE,
      }).then(r => r.data.data),
  });

  const logs = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;

  const handleRefresh = () => {
    refetch().then(() => toast.success('활동 로그를 새로고침했습니다.'));
  };

  const handleExport = () => {
    activityLogsApi.export({
      search: keyword || undefined,
      action: actionFilter === 'ALL' ? undefined : actionFilter,
    }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'activity-logs.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV 파일을 다운로드했습니다.');
    }).catch(() => toast.error('CSV 내보내기에 실패했습니다.'));
  };

  const logColumns: DataTableColumn<AuditLog>[] = [
    {
      key: 'createdAt',
      header: '시간',
      cell: (log) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(log.createdAt)}
        </span>
      ),
    },
    {
      key: 'admin',
      header: '관리자',
      cell: (log) => (
        <div className="flex flex-col">
          <span className="font-medium">{log.adminEmail}</span>
          <Badge className={`mt-1 w-fit text-xs ${ROLE_COLORS[log.adminRole]}`}>
            {ROLE_LABELS[log.adminRole] ?? log.adminRole}
          </Badge>
        </div>
      ),
    },
    {
      key: 'action',
      header: '액션',
      cell: (log) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.action)}
          <Badge className={ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}>
            {ACTION_LABELS[log.action] || log.action}
          </Badge>
        </div>
      ),
    },
    {
      key: 'description',
      header: '상세',
      cellClassName: 'max-w-xs truncate',
      cell: (log) => <span title={log.description}>{log.description}</span>,
    },
    {
      key: 'ip',
      header: 'IP 주소',
      cellClassName: 'font-mono-data tabular-nums text-muted-foreground',
      cell: (log) => log.ipAddress,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="관리자 활동 로그"
        description="관리자 계정의 모든 활동 이력 조회"
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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <SearchBar
            value={keyword}
            onChange={(v) => { setKeyword(v); setPage(0); }}
            placeholder="관리자명, 상세내용, IP 주소 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 액션</option>
            <option value="LOGIN">로그인</option>
            <option value="LOGOUT">로그아웃</option>
            <option value="USER_SUSPEND">사용자 정지</option>
            <option value="USER_BAN">사용자 영구정지</option>
            <option value="REPORT_RESOLVE">신고 처리</option>
            <option value="TOPIC_CREATE">주제 등록</option>
            <option value="ADMIN_CREATE">관리자 생성</option>
            <option value="SETTINGS_UPDATE">설정 변경</option>
            <option value="NOTICE_CREATE">공지사항 등록</option>
          </select>
        </div>
      </div>

      {/* Activity Log List */}
      <DataTable
        columns={logColumns}
        data={logs}
        rowKey={(log) => log.id}
        emptyState="조건에 맞는 로그가 없습니다."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
