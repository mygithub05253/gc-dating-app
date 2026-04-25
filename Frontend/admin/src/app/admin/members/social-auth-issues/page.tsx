'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Server,
  UserMinus,
  UserX,
} from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import {
  useSocialLoginHistory,
  useSocialLoginStats,
} from '@/hooks/useAdminSocialLogin';
import type {
  SocialErrorHistoryParams,
  SocialErrorLogItem,
  SocialErrorType,
  SocialResolutionStatus,
} from '@/types/socialAuth';

const ERROR_TYPE_LABEL: Record<SocialErrorType, string> = {
  TOKEN_EXPIRED: '토큰 만료',
  PROVIDER_SERVER_ERROR: 'Provider 서버 오류',
  USER_SOCIAL_ACCOUNT_DELETED: '소셜 계정 탈퇴',
  APP_PERMISSION_REVOKED: '앱 권한 회수',
};

const ERROR_TYPE_ICON: Record<SocialErrorType, typeof KeyRound> = {
  TOKEN_EXPIRED: KeyRound,
  PROVIDER_SERVER_ERROR: Server,
  USER_SOCIAL_ACCOUNT_DELETED: UserX,
  APP_PERMISSION_REVOKED: UserMinus,
};

const RESOLUTION_LABEL: Record<SocialResolutionStatus, string> = {
  AUTO_RECOVERED: '자동 복구',
  USER_RELOGIN_REQUIRED: '재로그인 필요',
  MANUAL_INTERVENTION_REQUIRED: '수동 조치',
};

const RESOLUTION_BADGE_CLASS: Record<SocialResolutionStatus, string> = {
  AUTO_RECOVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  USER_RELOGIN_REQUIRED: 'bg-amber-50 text-amber-800 border-amber-200',
  MANUAL_INTERVENTION_REQUIRED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PERIOD_OPTIONS = [
  { value: '1h', label: '1시간' },
  { value: '24h', label: '24시간' },
  { value: '7d', label: '7일' },
];

const FILTER_TYPES: Array<SocialErrorType | 'ALL'> = [
  'ALL',
  'TOKEN_EXPIRED',
  'PROVIDER_SERVER_ERROR',
  'USER_SOCIAL_ACCOUNT_DELETED',
  'APP_PERMISSION_REVOKED',
];

/**
 * 소셜 로그인 연동 이슈 관리 페이지 (명세 v2.3 §7.6).
 *
 * - 상단: 기간별 KAKAO 오류 카운트 / 영향 사용자 / 오류 유형 분포 / 해결 상태 분포
 * - 하단: 오류 이력 테이블 (필터: 오류 유형 + 페이지네이션)
 *
 * 분모(전체 로그인 시도 수) 카운터가 도입되기 전이라 errorRate / severity는 표시하지 않는다.
 */
export default function AdminSocialAuthIssuesPage() {
  const [period, setPeriod] = useState('1h');
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<SocialErrorType | 'ALL'>('ALL');

  const historyParams = useMemo<SocialErrorHistoryParams>(() => {
    const p: SocialErrorHistoryParams = { provider: 'KAKAO', page, size: 20 };
    if (typeFilter !== 'ALL') p.errorType = typeFilter;
    return p;
  }, [page, typeFilter]);

  const {
    data: stats,
    refetch: refetchStats,
    isFetching: isStatsFetching,
  } = useSocialLoginStats(period);
  const {
    data: history,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    refetch: refetchHistory,
  } = useSocialLoginHistory(historyParams);

  const items = history?.items ?? [];
  const totalPages = history?.totalPages ?? 0;

  const renderResolutionBadge = (status: SocialResolutionStatus) => (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${RESOLUTION_BADGE_CLASS[status]}`}
    >
      {RESOLUTION_LABEL[status]}
    </span>
  );

  const renderErrorTypeBadge = (type: SocialErrorType) => {
    const Icon = ERROR_TYPE_ICON[type];
    return (
      <span className="inline-flex items-center gap-1 text-xs text-foreground">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {ERROR_TYPE_LABEL[type]}
      </span>
    );
  };

  const columns: DataTableColumn<SocialErrorLogItem>[] = [
    {
      key: 'occurredAt',
      header: '발생 시각',
      cell: (l) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(l.occurredAt)}</span>
      ),
      cellClassName: 'w-[160px]',
    },
    {
      key: 'provider',
      header: '제공자',
      cell: (l) => <span className="font-medium text-sm">{l.provider}</span>,
      cellClassName: 'w-[80px]',
    },
    {
      key: 'errorType',
      header: '오류 유형',
      cell: (l) => renderErrorTypeBadge(l.errorType),
      cellClassName: 'w-[180px]',
    },
    {
      key: 'errorCode',
      header: '코드',
      cell: (l) => (
        <span className="font-mono text-xs text-muted-foreground">{l.errorCode || '-'}</span>
      ),
      cellClassName: 'w-[100px]',
    },
    {
      key: 'resolution',
      header: '해결 상태',
      cell: (l) => renderResolutionBadge(l.resolutionStatus),
      cellClassName: 'w-[120px]',
    },
    {
      key: 'user',
      header: '사용자',
      cell: (l) => (
        <span className="text-xs text-muted-foreground">
          {l.userId ? `user#${l.userId}` : '게스트'}
        </span>
      ),
      cellClassName: 'w-[100px]',
    },
    {
      key: 'message',
      header: '메시지',
      cell: (l) => (
        <span className="line-clamp-1 text-xs text-muted-foreground">
          {l.errorMessage || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="소셜 로그인 연동 이슈"
        description="KAKAO 단독 OAuth 토큰/연동 오류를 모니터링합니다 (명세 v2.3 §7.6)."
        actions={
          <div className="flex items-center gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p.value}
                size="xs"
                variant={period === p.value ? 'default' : 'outline'}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStats();
                refetchHistory();
              }}
              disabled={isStatsFetching || isHistoryFetching}
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${
                  isStatsFetching || isHistoryFetching ? 'animate-spin' : ''
                }`}
              />
              새로고침
            </Button>
          </div>
        }
      />

      {/* KPI 카드 */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <div>
              <div className="text-xs text-muted-foreground">오류 건수 ({period})</div>
              <div className="text-xl font-semibold">
                {(stats?.totalCount ?? 0).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <UserX className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">영향 받은 사용자</div>
              <div className="text-xl font-semibold">
                {(stats?.affectedUserCount ?? 0).toLocaleString()}명
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <div className="text-xs text-muted-foreground">자동 복구</div>
              <div className="text-xl font-semibold">
                {(stats?.resolutionCounts?.AUTO_RECOVERED ?? 0).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <div>
              <div className="text-xs text-muted-foreground">수동 조치 필요</div>
              <div className="text-xl font-semibold">
                {(
                  stats?.resolutionCounts?.MANUAL_INTERVENTION_REQUIRED ?? 0
                ).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 오류 유형 분포 */}
      <Card>
        <CardHeader>
          <CardTitle>오류 유형 분포 ({period})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {(Object.keys(ERROR_TYPE_LABEL) as SocialErrorType[]).map((t) => {
              const Icon = ERROR_TYPE_ICON[t];
              const count = stats?.errorTypeCounts?.[t] ?? 0;
              return (
                <div
                  key={t}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
                >
                  <Icon className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {ERROR_TYPE_LABEL[t]}
                    </div>
                    <div className="text-lg font-semibold">{count.toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {stats?.errorRate === null && (
            <p className="mt-3 text-xs text-muted-foreground">
              ※ 분모(전체 로그인 시도 수) 카운터 미연동 상태 — 임계값(WARN 5% / CRITICAL
              15%)은 후속 PR에서 표시됩니다.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 이력 필터 */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {FILTER_TYPES.map((t) => (
            <Button
              key={t}
              size="xs"
              variant={typeFilter === t ? 'default' : 'outline'}
              onClick={() => {
                setTypeFilter(t);
                setPage(0);
              }}
            >
              {t === 'ALL' ? '전체' : ERROR_TYPE_LABEL[t]}
            </Button>
          ))}
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        emptyState={
          <span className="text-muted-foreground">
            {isHistoryLoading ? '불러오는 중...' : '오류 이력이 없습니다.'}
          </span>
        }
        wrapInCard
      />

      {totalPages > 1 && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
