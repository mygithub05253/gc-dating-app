'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Download, Eye, RotateCcw, Ban, Users, Shield, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 차단 이력 데이터
const MOCK_BLOCK_HISTORY = [
  {
    id: 1,
    blockerId: 123,
    blockerNickname: '별빛소녀',
    blockedId: 456,
    blockedNickname: '달빛청년',
    reason: 'HARASSMENT',
    status: 'ACTIVE',
    createdAt: '2024-03-23T10:00:00',
    expiresAt: null,
    adminAction: null,
  },
  {
    id: 2,
    blockerId: 789,
    blockerNickname: '햇살가득',
    blockedId: 101,
    blockedNickname: '바람처럼',
    reason: 'SPAM',
    status: 'ACTIVE',
    createdAt: '2024-03-22T15:30:00',
    expiresAt: null,
    adminAction: null,
  },
  {
    id: 3,
    blockerId: 202,
    blockerNickname: '꽃구름',
    blockedId: 303,
    blockedNickname: '푸른바다',
    reason: 'INAPPROPRIATE',
    status: 'UNBLOCKED',
    createdAt: '2024-03-20T09:00:00',
    expiresAt: '2024-03-22T09:00:00',
    adminAction: 'USER_UNBLOCKED',
  },
  {
    id: 4,
    blockerId: 404,
    blockerNickname: '밤하늘별',
    blockedId: 505,
    blockedNickname: '달콤한하루',
    reason: 'OFFENSIVE',
    status: 'ACTIVE',
    createdAt: '2024-03-21T14:00:00',
    expiresAt: null,
    adminAction: null,
  },
  {
    id: 5,
    blockerId: 606,
    blockerNickname: '행복한날',
    blockedId: 707,
    blockedNickname: '자유로운영혼',
    reason: 'OTHER',
    status: 'ADMIN_CANCELLED',
    createdAt: '2024-03-19T11:00:00',
    expiresAt: null,
    adminAction: 'CANCELLED_BY_ADMIN',
  },
  {
    id: 6,
    blockerId: 808,
    blockerNickname: '봄날의꿈',
    blockedId: 909,
    blockedNickname: '여름밤',
    reason: 'HARASSMENT',
    status: 'ACTIVE',
    createdAt: '2024-03-18T16:00:00',
    expiresAt: null,
    adminAction: null,
  },
];

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

  const handleRefresh = () => {
    toast.success('차단 이력을 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('차단 이력을 CSV로 내보냅니다.');
  };

  const handleCancelBlock = (blockId: number) => {
    toast.success('차단을 취소했습니다.');
  };

  // Filter blocks
  const filteredBlocks = MOCK_BLOCK_HISTORY.filter(block => {
    const matchesKeyword = !keyword ||
      block.blockerNickname.includes(keyword) ||
      block.blockedNickname.includes(keyword);
    const matchesStatus = statusFilter === 'ALL' || block.status === statusFilter;
    return matchesKeyword && matchesStatus;
  });

  const activeCount = MOCK_BLOCK_HISTORY.filter(b => b.status === 'ACTIVE').length;
  const totalCount = MOCK_BLOCK_HISTORY.length;

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
            <div className="mt-1 text-2xl font-bold text-green-600">
              {MOCK_BLOCK_HISTORY.filter(b => b.status === 'UNBLOCKED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">오늘 발생</span>
            </div>
            <div className="mt-1 text-2xl font-bold">3</div>
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

      {/* Block History List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">차단자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">피차단자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">사유</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">차단일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredBlocks.map(block => (
                  <tr key={block.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/admin/members/${block.blockerId}`} className="text-blue-600 hover:underline">
                        {block.blockerNickname}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/members/${block.blockedId}`} className="text-blue-600 hover:underline">
                        {block.blockedNickname}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={REASON_COLORS[block.reason]}>
                        {REASON_LABELS[block.reason]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_COLORS[block.status]}>
                        {STATUS_LABELS[block.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateTime(block.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/admin/members/${block.blockerId}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {block.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelBlock(block.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
