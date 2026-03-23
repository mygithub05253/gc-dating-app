'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants';
import { Eye, RefreshCw, Download, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// Extended mock data
const MOCK_REPORTS = [
  {
    id: 1,
    reporterNickname: '별빛소녀',
    targetNickname: '달빛청년',
    reason: 'PROFANITY' as const,
    status: 'PENDING' as const,
    createdAt: '2024-03-20T10:00:00',
  },
  {
    id: 2,
    reporterNickname: '햇살가득',
    targetNickname: '바람처럼',
    reason: 'OBSCENE' as const,
    status: 'IN_PROGRESS' as const,
    createdAt: '2024-03-19T15:30:00',
  },
  {
    id: 3,
    reporterNickname: '꽃구름',
    targetNickname: '푸른바다',
    reason: 'SPAM' as const,
    status: 'RESOLVED' as const,
    createdAt: '2024-03-18T09:00:00',
  },
  {
    id: 4,
    reporterNickname: '밤하늘별',
    targetNickname: '달콤한하루',
    reason: 'HARASSMENT' as const,
    status: 'PENDING' as const,
    createdAt: '2024-03-20T08:30:00',
  },
  {
    id: 5,
    reporterNickname: '행복한날',
    targetNickname: '자유로운영혼',
    reason: 'FAKE_PROFILE' as const,
    status: 'IN_PROGRESS' as const,
    createdAt: '2024-03-19T12:00:00',
  },
  {
    id: 6,
    reporterNickname: '봄날의꿈',
    targetNickname: '여름밤',
    reason: 'OTHER' as const,
    status: 'RESOLVED' as const,
    createdAt: '2024-03-17T14:00:00',
  },
];

export default function ReportsPage() {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('신고 목록을 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('신고 내역을 다운로드합니다.');
  };

  // Filter reports
  const filteredReports = MOCK_REPORTS.filter((report) => {
    const matchesKeyword =
      !keyword ||
      report.reporterNickname.includes(keyword) ||
      report.targetNickname.includes(keyword);
    const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
    return matchesKeyword && matchesStatus;
  });

  const pendingCount = MOCK_REPORTS.filter((r) => r.status === 'PENDING').length;
  const inProgressCount = MOCK_REPORTS.filter((r) => r.status === 'IN_PROGRESS').length;
  const resolvedCount = MOCK_REPORTS.filter((r) => r.status === 'RESOLVED').length;

  return (
    <div>
      <PageHeader
        title="신고 관리"
        description="사용자 신고 목록 및 처리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              내보내기
            </Button>
          </div>
        }
      />

      {/* Status Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'ALL' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{MOCK_REPORTS.length}</div>
            <p className="text-sm text-muted-foreground">전체 신고</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'PENDING' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('PENDING')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </div>
            <p className="text-sm text-muted-foreground">대기중</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'IN_PROGRESS' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('IN_PROGRESS')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            </div>
            <p className="text-sm text-muted-foreground">처리중</p>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${statusFilter === 'RESOLVED' ? 'border-primary' : ''}`}
          onClick={() => setStatusFilter('RESOLVED')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
            </div>
            <p className="text-sm text-muted-foreground">처리완료</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          placeholder="신고자 또는 피신고자 닉네임 검색"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">신고자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">피신고자</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">사유</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">신고일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">#{report.id}</td>
                    <td className="px-4 py-3 text-sm">{report.reporterNickname}</td>
                    <td className="px-4 py-3 text-sm">{report.targetNickname}</td>
                    <td className="px-4 py-3 text-sm">
                      {REPORT_REASON_LABELS[report.reason]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={REPORT_STATUS_COLORS[report.status]}>
                        {REPORT_STATUS_LABELS[report.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateTime(report.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/reports/${report.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          상세
                        </Button>
                      </Link>
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
