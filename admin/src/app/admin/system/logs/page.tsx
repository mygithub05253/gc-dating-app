'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Download, Filter, Activity, LogIn, LogOut, Settings, Users, FileText, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 활동 로그 데이터
const MOCK_ACTIVITY_LOGS = [
  {
    id: 1,
    adminId: 1,
    adminName: '김관리',
    adminRole: 'SUPER_ADMIN',
    action: 'LOGIN',
    target: null,
    targetId: null,
    details: '로그인 성공',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    createdAt: '2024-03-23T10:30:00',
  },
  {
    id: 2,
    adminId: 1,
    adminName: '김관리',
    adminRole: 'SUPER_ADMIN',
    action: 'USER_SUSPEND',
    target: 'USER',
    targetId: 123,
    details: '사용자 정지 처리: 신고 누적',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    createdAt: '2024-03-23T10:25:00',
  },
  {
    id: 3,
    adminId: 2,
    adminName: '이운영',
    adminRole: 'ADMIN',
    action: 'REPORT_RESOLVE',
    target: 'REPORT',
    targetId: 45,
    details: '신고 처리 완료: 경고 조치',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
    createdAt: '2024-03-23T10:20:00',
  },
  {
    id: 4,
    adminId: 2,
    adminName: '이운영',
    adminRole: 'ADMIN',
    action: 'TOPIC_CREATE',
    target: 'TOPIC',
    targetId: 78,
    details: '새 주제 등록: 오늘 가장 감사했던 순간',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
    createdAt: '2024-03-23T10:15:00',
  },
  {
    id: 5,
    adminId: 1,
    adminName: '김관리',
    adminRole: 'SUPER_ADMIN',
    action: 'ADMIN_CREATE',
    target: 'ADMIN',
    targetId: 5,
    details: '새 관리자 계정 생성: 박신입',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    createdAt: '2024-03-23T10:10:00',
  },
  {
    id: 6,
    adminId: 3,
    adminName: '박신입',
    adminRole: 'VIEWER',
    action: 'LOGIN',
    target: null,
    targetId: null,
    details: '로그인 성공',
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
    createdAt: '2024-03-23T10:05:00',
  },
  {
    id: 7,
    adminId: 2,
    adminName: '이운영',
    adminRole: 'ADMIN',
    action: 'SETTINGS_UPDATE',
    target: 'SETTINGS',
    targetId: null,
    details: '매칭 알고리즘 가중치 변경',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
    createdAt: '2024-03-23T09:55:00',
  },
  {
    id: 8,
    adminId: 1,
    adminName: '김관리',
    adminRole: 'SUPER_ADMIN',
    action: 'LOGOUT',
    target: null,
    targetId: null,
    details: '로그아웃',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    createdAt: '2024-03-22T18:30:00',
  },
  {
    id: 9,
    adminId: 2,
    adminName: '이운영',
    adminRole: 'ADMIN',
    action: 'NOTICE_CREATE',
    target: 'NOTICE',
    targetId: 12,
    details: '공지사항 등록: 시스템 점검 안내',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36',
    createdAt: '2024-03-22T17:45:00',
  },
  {
    id: 10,
    adminId: 1,
    adminName: '김관리',
    adminRole: 'SUPER_ADMIN',
    action: 'USER_BAN',
    target: 'USER',
    targetId: 456,
    details: '사용자 영구 정지: 심각한 이용약관 위반',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    createdAt: '2024-03-22T16:20:00',
  },
];

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

export default function AdminActivityLogsPage() {
  const [keyword, setKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [adminFilter, setAdminFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('활동 로그를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('활동 로그를 CSV로 내보냅니다.');
  };

  // Get unique admins for filter
  const uniqueAdmins = Array.from(new Set(MOCK_ACTIVITY_LOGS.map(log => log.adminName)));

  // Filter logs
  const filteredLogs = MOCK_ACTIVITY_LOGS.filter((log) => {
    const matchesKeyword =
      !keyword ||
      log.adminName.includes(keyword) ||
      log.details.includes(keyword) ||
      log.ipAddress.includes(keyword);
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const matchesAdmin = adminFilter === 'ALL' || log.adminName === adminFilter;
    return matchesKeyword && matchesAction && matchesAdmin;
  });

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
            onChange={setKeyword}
            placeholder="관리자명, 상세내용, IP 주소 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
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
          <select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 관리자</option>
            {uniqueAdmins.map((admin) => (
              <option key={admin} value={admin}>{admin}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">오늘 활동</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{MOCK_ACTIVITY_LOGS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">로그인</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_ACTIVITY_LOGS.filter(l => l.action === 'LOGIN').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">사용자 조치</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_ACTIVITY_LOGS.filter(l => l.action.includes('USER')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">설정 변경</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {MOCK_ACTIVITY_LOGS.filter(l => l.action === 'SETTINGS_UPDATE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">시간</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">관리자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상세</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">대상</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">IP 주소</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{log.adminName}</span>
                        <Badge className={`mt-1 w-fit text-xs ${ROLE_COLORS[log.adminRole]}`}>
                          {ROLE_LABELS[log.adminRole]}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.target && log.targetId ? (
                        <span className="text-blue-600 cursor-pointer hover:underline">
                          {log.target} #{log.targetId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
