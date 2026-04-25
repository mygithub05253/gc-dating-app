'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { AnalyticsLoading, AnalyticsError } from '@/components/common/AnalyticsStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, AlertTriangle, Eye, Ban, CheckCircle, Shield, Clock, Bot, UserX, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { suspiciousApi } from '@/lib/api/suspicious';
import type { SuspiciousAccount, SuspiciousAccountStatus, SuspicionType } from '@/types/user';

const SUSPICION_TYPE_LABELS: Record<string, string> = {
  BOT: '봇 의심',
  FAKE_PROFILE: '가짜 프로필',
  SPAM: '스팸',
  MULTI_ACCOUNT: '다중 계정',
  SCAM: '사기 의심',
};

const SUSPICION_TYPE_COLORS: Record<string, string> = {
  BOT: 'bg-purple-100 text-purple-800',
  FAKE_PROFILE: 'bg-orange-100 text-orange-800',
  SPAM: 'bg-yellow-100 text-yellow-800',
  MULTI_ACCOUNT: 'bg-blue-100 text-blue-800',
  SCAM: 'bg-red-100 text-red-800',
};

const SUSPICION_TYPE_ICONS: Record<string, React.ReactNode> = {
  BOT: <Bot className="h-4 w-4" />,
  FAKE_PROFILE: <UserX className="h-4 w-4" />,
  SPAM: <MessageSquare className="h-4 w-4" />,
  MULTI_ACCOUNT: <Shield className="h-4 w-4" />,
  SCAM: <AlertTriangle className="h-4 w-4" />,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '검토 대기',
  INVESTIGATING: '조사중',
  CONFIRMED: '확인됨',
  CLEARED: '정상 처리',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  INVESTIGATING: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-red-100 text-red-800',
  CLEARED: 'bg-green-100 text-green-800',
};

function getRiskColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-green-600';
}

export default function SuspiciousAccountsPage() {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['suspicious-accounts', { typeFilter, statusFilter }],
    queryFn: () =>
      suspiciousApi
        .getList({
          suspicionType: typeFilter !== 'ALL' ? (typeFilter as SuspicionType) : undefined,
          status: statusFilter !== 'ALL' ? (statusFilter as SuspiciousAccountStatus) : undefined,
          size: 50,
        })
        .then((res) => res.data.data),
  });

  const handleRefresh = () => {
    refetch();
    toast.success('의심 계정 목록을 새로고침했습니다.');
  };

  const handleInvestigate = (accountId: number) => {
    toast.success('조사를 시작합니다.');
  };

  const handleBan = (accountId: number) => {
    toast.success('계정을 정지했습니다.');
  };

  const handleClear = (accountId: number) => {
    suspiciousApi.markFalsePositive(accountId).then(() => {
      toast.success('정상 처리되었습니다.');
      refetch();
    }).catch(() => {
      toast.error('처리에 실패했습니다.');
    });
  };

  const accounts = data?.content ?? [];

  // 클라이언트 키워드 필터 (서버에서 keyword 검색을 지원하지 않으므로)
  const filteredAccounts = accounts.filter((account: SuspiciousAccount) => {
    if (!keyword) return true;
    return account.nickname.includes(keyword) || account.email.includes(keyword);
  });

  const pendingCount = accounts.filter((a: SuspiciousAccount) => a.status === 'PENDING').length;
  const investigatingCount = accounts.filter((a: SuspiciousAccount) => a.status === 'INVESTIGATING').length;
  const confirmedCount = accounts.filter((a: SuspiciousAccount) => a.status === 'CONFIRMED').length;

  return (
    <div>
      <PageHeader
        title="의심 계정 탐지"
        description="AI 기반 의심 계정 탐지 및 관리"
        actions={
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer" onClick={() => setStatusFilter('PENDING')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">검토 대기</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter('INVESTIGATING')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">조사중</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-600">{investigatingCount}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter('CONFIRMED')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">확인된 위협</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">전체 건수</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{accounts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            placeholder="닉네임 또는 이메일 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 유형</option>
            {Object.entries(SUSPICION_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
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
      </div>

      {/* Loading / Error */}
      {isLoading && <AnalyticsLoading label="의심 계정 목록을 불러오는 중입니다..." />}
      {isError && <AnalyticsError message={error?.message || '의심 계정 목록을 불러오지 못했습니다.'} />}

      {/* Suspicious Accounts List */}
      {!isLoading && !isError && (
        <div className="grid gap-4">
          {filteredAccounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">검색 결과가 없습니다.</p>
          )}
          {filteredAccounts.map((account: SuspiciousAccount) => (
            <Card
              key={account.id}
              className={`${account.riskScore >= 80 ? 'border-red-200' : ''} ${account.status === 'CLEARED' ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={SUSPICION_TYPE_COLORS[account.suspicionType]}>
                        <span className="flex items-center gap-1">
                          {SUSPICION_TYPE_ICONS[account.suspicionType]}
                          {SUSPICION_TYPE_LABELS[account.suspicionType]}
                        </span>
                      </Badge>
                      <Badge className={STATUS_COLORS[account.status]}>
                        {STATUS_LABELS[account.status]}
                      </Badge>
                      <span className={`font-bold ${getRiskColor(account.riskScore)}`}>
                        위험도: {account.riskScore}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <h3 className="font-semibold">{account.nickname}</h3>
                      <span className="text-sm text-muted-foreground">{account.email}</span>
                      <span className="text-sm text-muted-foreground">ID: {account.userId}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {account.indicators.map((indicator, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Link href={`/admin/members/${account.userId}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {account.status === 'PENDING' && (
                      <Button variant="ghost" size="sm" onClick={() => handleInvestigate(account.id)}>
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                    {account.status !== 'CLEARED' && account.status !== 'CONFIRMED' && (
                      <Button variant="ghost" size="sm" onClick={() => handleClear(account.id)}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    {account.status !== 'CLEARED' && (
                      <Button variant="ghost" size="sm" onClick={() => handleBan(account.id)}>
                        <Ban className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">가입일</span>
                    <p className="font-medium mt-1">{formatDateTime(account.signupDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">탐지일</span>
                    <p className="font-medium mt-1">{formatDateTime(account.detectedAt)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">마지막 활동</span>
                    <p className="font-medium mt-1">{formatDateTime(account.lastActivity)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">활동 횟수</span>
                    <p className="font-medium mt-1">{account.activityCount}회</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
