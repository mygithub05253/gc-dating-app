'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { USER_STATUS_LABELS, USER_STATUS_COLORS, GENDER_LABELS } from '@/lib/constants';
import {
  ArrowLeft,
  User,
  Calendar,
  BookOpen,
  Heart,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle,
  Activity,
  Shield,
  Link2,
  Unlock,
} from 'lucide-react';
import toast from 'react-hot-toast';

// v2.1 신규: UNBLOCK 사유 카테고리 (관리자 기능명세서 9.x)
type UnblockReasonCategory =
  | 'FALSE_REPORT'
  | 'APPEAL_ACCEPTED'
  | 'SYSTEM_ERROR'
  | 'POLICY_CHANGE'
  | 'OTHER';

const UNBLOCK_REASON_LABELS: Record<UnblockReasonCategory, string> = {
  FALSE_REPORT: '허위 신고 확인',
  APPEAL_ACCEPTED: '이의 제기 수용',
  SYSTEM_ERROR: '시스템 오류로 인한 오제재',
  POLICY_CHANGE: '정책 변경',
  OTHER: '기타',
};

// ---- 탭 정의 ----
const TABS = [
  { key: 'basic', label: '기본 정보' },
  { key: 'activity', label: '활동 요약' },
  { key: 'matching', label: '매칭 이력' },
  { key: 'sanction', label: '제재/신고 이력' },
  { key: 'social', label: '소셜 로그인' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

// ---- Mock 데이터 ----
const MOCK_USERS: Record<string, any> = {
  '1': {
    id: 1,
    nickname: '별빛소녀',
    gender: 'FEMALE',
    age: 27,
    status: 'ACTIVE',
    createdAt: '2024-01-15T10:30:00',
    lastActivityAt: '2024-03-22T09:15:00',
    diaryCount: 45,
    matchCount: 8,
    exchangeCompletionRate: 87.5,
    matchHistory: [
      { id: 1, partnerNickname: '달빛청년', matchedAt: '2024-03-20T10:00:00', status: 'COMPLETED' },
      { id: 2, partnerNickname: '하늘바람', matchedAt: '2024-03-15T14:00:00', status: 'COMPLETED' },
      { id: 3, partnerNickname: '별하나', matchedAt: '2024-03-10T09:00:00', status: 'EXPIRED' },
      { id: 4, partnerNickname: '구름위로', matchedAt: '2024-03-05T16:00:00', status: 'COMPLETED' },
      { id: 5, partnerNickname: '바다소리', matchedAt: '2024-02-28T11:00:00', status: 'COMPLETED' },
    ],
    sanctions: [],
    reports: [],
    socialLogins: [
      { provider: 'KAKAO', connectedAt: '2024-01-15T10:30:00', email: 'minji@kakao.com' },
    ],
  },
  '3': {
    id: 3,
    nickname: '푸른바다',
    gender: 'MALE',
    age: 31,
    status: 'BANNED',
    createdAt: '2023-11-05T09:00:00',
    lastActivityAt: '2024-03-20T22:30:00',
    diaryCount: 12,
    matchCount: 2,
    exchangeCompletionRate: 20.0,
    matchHistory: [],
    sanctions: [
      {
        id: 2,
        type: 'SUSPEND_PERMANENT',
        reason: '반복 성적 콘텐츠 게재',
        memo: '3회 이상 성적 콘텐츠 신고 누적으로 영구 정지 처분 (SUPER_ADMIN 결재).',
        createdAt: '2024-03-15T10:00:00',
        adminNickname: '박슈퍼',
      },
    ],
    reports: [
      { id: 10, reason: 'SEXUAL', status: 'RESOLVED', createdAt: '2024-03-14T10:00:00', reporterNickname: '익명유저A' },
      { id: 11, reason: 'SEXUAL', status: 'RESOLVED', createdAt: '2024-03-12T08:00:00', reporterNickname: '익명유저B' },
      { id: 12, reason: 'SEXUAL', status: 'RESOLVED', createdAt: '2024-03-10T19:00:00', reporterNickname: '익명유저C' },
    ],
    socialLogins: [
      { provider: 'KAKAO', connectedAt: '2023-11-05T09:00:00', email: 'blue@kakao.com' },
    ],
  },
  '2': {
    id: 2,
    nickname: '달빛청년',
    gender: 'MALE',
    age: 28,
    status: 'DEACTIVATED',
    withdrawnAt: '2024-03-25T00:00:00',
    createdAt: '2024-02-01T14:00:00',
    lastActivityAt: '2024-03-18T22:30:00',
    diaryCount: 23,
    matchCount: 4,
    exchangeCompletionRate: 62.0,
    matchHistory: [
      { id: 6, partnerNickname: '별빛소녀', matchedAt: '2024-03-20T10:00:00', status: 'COMPLETED' },
      { id: 7, partnerNickname: '초록숲', matchedAt: '2024-03-12T08:00:00', status: 'CANCELLED' },
      { id: 8, partnerNickname: '노을빛', matchedAt: '2024-03-01T17:00:00', status: 'COMPLETED' },
      { id: 9, partnerNickname: '은하수', matchedAt: '2024-02-20T13:00:00', status: 'EXPIRED' },
    ],
    sanctions: [
      {
        id: 1,
        type: 'SUSPEND_7D',
        reason: '부적절한 언어 사용',
        memo: '반복적 욕설 사용으로 인한 7일 정지 처분',
        createdAt: '2024-03-10T10:00:00',
        adminNickname: '관리자1',
      },
    ],
    reports: [
      { id: 1, reason: 'PROFANITY', status: 'RESOLVED', createdAt: '2024-03-10T10:00:00', reporterNickname: '익명유저' },
      { id: 2, reason: 'SPAM', status: 'PENDING', createdAt: '2024-03-19T08:00:00', reporterNickname: '익명유저2' },
    ],
    socialLogins: [
      { provider: 'GOOGLE', connectedAt: '2024-02-01T14:00:00', email: 'junho@gmail.com' },
      { provider: 'KAKAO', connectedAt: '2024-02-05T09:00:00', email: 'junho@kakao.com' },
    ],
  },
};

// DEACTIVATED(탈퇴 예정) 상태에서 D-day 계산
function getWithdrawnDDay(withdrawnAt: string): string {
  const target = new Date(withdrawnAt);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '탈퇴 처리 완료';
  return `탈퇴 예정 D-${diffDays}`;
}

// 매칭 상태 라벨
const MATCH_STATUS_LABELS: Record<string, string> = {
  COMPLETED: '완료',
  EXPIRED: '만료',
  CANCELLED: '취소',
  IN_PROGRESS: '진행 중',
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sanctionMemo, setSanctionMemo] = useState('');
  const [sanctionMemoError, setSanctionMemoError] = useState('');
  // v2.1 신규: UNBLOCK (제재 해제) 상태
  const [unblockOpen, setUnblockOpen] = useState(false);
  const [unblockCategory, setUnblockCategory] = useState<UnblockReasonCategory>('APPEAL_ACCEPTED');
  const [unblockReason, setUnblockReason] = useState('');
  const [unblockError, setUnblockError] = useState('');

  const userId = params.id as string;
  const user = MOCK_USERS[userId] || MOCK_USERS['1'];

  // ---- 제재 핸들러 ----
  const validateMemo = (): boolean => {
    if (sanctionMemo.length < 10) {
      setSanctionMemoError('제재 사유는 최소 10자 이상 입력해야 합니다.');
      return false;
    }
    setSanctionMemoError('');
    return true;
  };

  const handleSuspend7Day = async () => {
    if (!validateMemo()) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('7일 정지 처리되었습니다.');
    setSanctionMemo('');
    setIsProcessing(false);
  };

  const handleBanPermanent = async () => {
    if (!validateMemo()) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('영구 정지 처리되었습니다.');
    setSanctionMemo('');
    setIsProcessing(false);
  };

  const handleBanImmediatePermanent = async () => {
    if (!validateMemo()) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('즉시 영구 정지 처리되었습니다.');
    setSanctionMemo('');
    setIsProcessing(false);
  };

  const handleUnsuspend = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('정지가 해제되었습니다.');
    setIsProcessing(false);
  };

  // v2.1: 제재 해제(UNBLOCK) — BANNED 상태, SUPER_ADMIN 전용, 사유 카테고리 + 10자 이상 사유
  const handleUnblock = async () => {
    if (unblockReason.trim().length < 10) {
      setUnblockError('해제 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }
    setUnblockError('');
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success(
      `제재가 해제되었습니다. (${UNBLOCK_REASON_LABELS[unblockCategory]}) — 사용자는 다음 로그인 시 환영 모달을 보게 됩니다.`,
    );
    setUnblockOpen(false);
    setUnblockReason('');
    setIsProcessing(false);
  };

  // ---- 탭 필터 (ADMIN+ 전용 탭) ----
  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === 'sanction' || tab.key === 'social') {
      return hasPermission('ADMIN');
    }
    return true;
  });

  // ---- 렌더링 ----
  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/admin/members')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로
        </Button>
        <PageHeader
          title={`회원 상세: ${user.nickname}`}
          description={`ID: ${user.id}`}
        />
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6 flex gap-1 border-b">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: 기본 정보 */}
      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">닉네임:</span>
                  <span className="font-medium">{user.nickname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">성별:</span>
                  <span>{GENDER_LABELS[user.gender] || user.gender}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">나이:</span>
                  <span>{user.age}세</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">가입일:</span>
                  <span>{formatDateTime(user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">상태:</span>
                  <Badge className={USER_STATUS_COLORS[user.status]}>
                    {USER_STATUS_LABELS[user.status]}
                  </Badge>
                  {user.status === 'DEACTIVATED' && user.withdrawnAt && (
                    <Badge variant="outline" className="ml-1 text-orange-600 border-orange-300">
                      {getWithdrawnDDay(user.withdrawnAt)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: 활동 요약 */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              활동 요약
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span>작성 일기 수</span>
              </div>
              <span className="font-bold">{user.diaryCount}편</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>매칭 횟수</span>
              </div>
              <span className="font-bold">{user.matchCount}회</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>교환 완료율</span>
              </div>
              <span className="font-bold">{user.exchangeCompletionRate}%</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>마지막 활동</span>
              </div>
              <span className="font-bold">{formatDateTime(user.lastActivityAt)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: 매칭 이력 */}
      {activeTab === 'matching' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              매칭 이력 (최근 10건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.matchHistory && user.matchHistory.length > 0 ? (
              <div className="space-y-3">
                {user.matchHistory.slice(0, 10).map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <span className="font-medium">{match.partnerNickname}</span>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(match.matchedAt)}
                      </p>
                    </div>
                    <Badge
                      variant={match.status === 'COMPLETED' ? 'default' : 'secondary'}
                    >
                      {MATCH_STATUS_LABELS[match.status] || match.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">매칭 이력이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: 제재/신고 이력 (ADMIN+ only) */}
      {activeTab === 'sanction' && hasPermission('ADMIN') && (
        <div className="space-y-6">
          {/* 제재 조치 영역 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                제재 조치
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제재 사유 메모</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="제재 사유를 입력하세요 (최소 10자)"
                  value={sanctionMemo}
                  onChange={(e) => {
                    setSanctionMemo(e.target.value);
                    if (e.target.value.length >= 10) {
                      setSanctionMemoError('');
                    }
                  }}
                />
                {sanctionMemoError && (
                  <p className="mt-1 text-sm text-red-500">{sanctionMemoError}</p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {user.status === 'ACTIVE' && (
                  <>
                    <Button variant="outline" onClick={handleSuspend7Day} disabled={isProcessing}>
                      <Clock className="mr-2 h-4 w-4" />
                      7일 정지 (7DAY)
                    </Button>
                    <Button variant="destructive" onClick={handleBanPermanent} disabled={isProcessing}>
                      <Ban className="mr-2 h-4 w-4" />
                      영구 정지 (PERMANENT)
                    </Button>
                    <Button variant="destructive" onClick={handleBanImmediatePermanent} disabled={isProcessing}>
                      <Ban className="mr-2 h-4 w-4" />
                      즉시 영구 정지 (IMMEDIATE_PERMANENT)
                    </Button>
                  </>
                )}
                {user.status === 'SUSPEND_7D' && (
                  <Button variant="outline" onClick={handleUnsuspend} disabled={isProcessing}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    정지 해제
                  </Button>
                )}
                {user.status === 'BANNED' && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">영구 정지 상태입니다.</p>
                    {/* v2.1 신규: 제재 해제(UNBLOCK) — SUPER_ADMIN 전용 */}
                    {hasPermission('SUPER_ADMIN') ? (
                      <Button
                        variant="outline"
                        onClick={() => setUnblockOpen((v) => !v)}
                        disabled={isProcessing}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Unlock className="mr-2 h-4 w-4" />
                        제재 해제 (UNBLOCK)
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        제재 해제는 SUPER_ADMIN 권한이 필요합니다.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* v2.1 신규: UNBLOCK 모달 (BANNED + SUPER_ADMIN 한정) */}
              {user.status === 'BANNED' && hasPermission('SUPER_ADMIN') && unblockOpen && (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3 text-green-800">
                    <Unlock className="h-4 w-4" />
                    <span className="font-medium">제재 해제</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">해제 사유 카테고리</label>
                      <select
                        value={unblockCategory}
                        onChange={(e) =>
                          setUnblockCategory(e.target.value as UnblockReasonCategory)
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {Object.entries(UNBLOCK_REASON_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        해제 사유 상세 (최소 10자)
                      </label>
                      <textarea
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                        placeholder="해제 사유를 상세히 입력하세요 (이력으로 영구 보관됩니다)"
                        value={unblockReason}
                        onChange={(e) => {
                          setUnblockReason(e.target.value);
                          if (e.target.value.length >= 10) {
                            setUnblockError('');
                          }
                        }}
                      />
                      {unblockError && (
                        <p className="mt-1 text-sm text-red-500">{unblockError}</p>
                      )}
                      {!unblockError && unblockReason.length > 0 && unblockReason.length < 10 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {10 - unblockReason.length}자 더 입력해주세요
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={handleUnblock}
                        disabled={isProcessing || unblockReason.length < 10}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        해제 확정
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setUnblockOpen(false);
                          setUnblockReason('');
                          setUnblockError('');
                        }}
                        disabled={isProcessing}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 제재 이력 */}
          <Card>
            <CardHeader>
              <CardTitle>제재 이력</CardTitle>
            </CardHeader>
            <CardContent>
              {user.sanctions && user.sanctions.length > 0 ? (
                <div className="space-y-3">
                  {user.sanctions.map((sanction: any) => (
                    <div key={sanction.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="destructive">{sanction.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(sanction.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{sanction.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">메모: {sanction.memo}</p>
                      <p className="text-xs text-muted-foreground">처리자: {sanction.adminNickname}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">제재 이력이 없습니다.</p>
              )}
            </CardContent>
          </Card>

          {/* 신고 이력 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                신고 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user.reports && user.reports.length > 0 ? (
                <div className="space-y-3">
                  {user.reports.map((report: any) => (
                    <div key={report.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                      <div>
                        <span className="text-sm font-medium">{report.reason}</span>
                        <p className="text-xs text-muted-foreground">
                          신고자: {report.reporterNickname} | {formatDateTime(report.createdAt)}
                        </p>
                      </div>
                      <Badge variant={report.status === 'RESOLVED' ? 'secondary' : 'destructive'}>
                        {report.status === 'RESOLVED' ? '처리됨' : '대기중'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">신고 이력이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: 소셜 로그인 (ADMIN+ only) */}
      {activeTab === 'social' && hasPermission('ADMIN') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              소셜 로그인 연동 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.socialLogins && user.socialLogins.length > 0 ? (
              <div className="space-y-3">
                {user.socialLogins.map((social: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{social.provider}</Badge>
                      <span className="text-sm">{social.email}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      연동일: {formatDateTime(social.connectedAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">연동된 소셜 로그인이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
