'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  APPEAL_STATUS_LABELS,
  APPEAL_STATUS_COLORS,
  SANCTION_TYPE_LABELS,
} from '@/lib/constants';
import type { SanctionAppeal, AppealStatus } from '@/types/support';
import { Scale, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 이의신청 데이터 (관리자_API_통합명세서_v2.0 §17.2 AppealItem 구조)
const MOCK_APPEALS: SanctionAppeal[] = [
  {
    id: 1,
    userId: 2,
    userNickname: '달빛청년',
    userEmail: 'moon@example.com',
    originalSanctionType: 'SUSPEND_7D',
    originalReason: '부적절한 언어 사용',
    sanctionDate: '2026-04-13T10:00:00',
    reason: '해당 표현은 친구 사이의 농담이었습니다. 상대방도 기분 나빠하지 않았습니다.',
    evidenceUrls: [],
    status: 'PENDING',
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
    createdAt: '2026-04-14T08:00:00',
  },
  {
    id: 2,
    userId: 15,
    userNickname: '자유로운영혼',
    userEmail: 'free@example.com',
    originalSanctionType: 'BANNED',
    originalReason: '반복적인 스팸 활동',
    sanctionDate: '2026-04-08T14:00:00',
    reason: '해킹당해서 제 계정이 아닌 사람이 글을 올린 것입니다. 본인 인증 자료 첨부합니다.',
    evidenceUrls: ['https://example.com/evidence1.jpg'],
    status: 'IN_PROGRESS',
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
    createdAt: '2026-04-09T09:00:00',
  },
  {
    id: 3,
    userId: 20,
    userNickname: '행복한하루',
    userEmail: 'happy@example.com',
    originalSanctionType: 'SUSPEND_7D',
    originalReason: '음란성 콘텐츠',
    sanctionDate: '2026-04-03T11:00:00',
    reason: '해당 사진은 예술 작품 사진입니다. 음란물이 아닙니다.',
    evidenceUrls: ['https://example.com/art1.jpg', 'https://example.com/art2.jpg'],
    status: 'REJECTED',
    resolvedAt: '2026-04-05T10:00:00',
    resolvedBy: 'admin@ember.com',
    resolution: '검토 결과 커뮤니티 가이드라인 위반으로 판단됩니다. 이의신청이 기각되었습니다.',
    createdAt: '2026-04-04T08:00:00',
  },
  {
    id: 4,
    userId: 25,
    userNickname: '봄날의꿈',
    userEmail: 'spring@example.com',
    originalSanctionType: 'SUSPEND_7D',
    originalReason: '허위 프로필 정보',
    sanctionDate: '2026-04-01T16:00:00',
    reason: '실수로 잘못된 정보를 입력했습니다. 수정하겠습니다.',
    evidenceUrls: [],
    status: 'ACCEPTED',
    resolvedAt: '2026-04-02T15:00:00',
    resolvedBy: 'admin@ember.com',
    resolution: '이의신청이 수락되었습니다. 정지가 해제되며, 프로필 정보를 정확히 수정해주세요.',
    createdAt: '2026-04-02T10:00:00',
  },
];

const STATUS_ICON_MAP: Record<AppealStatus, React.ElementType> = {
  PENDING: Clock,
  IN_PROGRESS: AlertTriangle,
  ACCEPTED: CheckCircle,
  REJECTED: XCircle,
};

const STATUS_FILTERS: { value: 'ALL' | AppealStatus; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING', label: '대기 중' },
  { value: 'IN_PROGRESS', label: '검토 중' },
  { value: 'ACCEPTED', label: '수락' },
  { value: 'REJECTED', label: '기각' },
];

export default function AppealsPage() {
  const { hasPermission, user } = useAuthStore();
  const [appeals, setAppeals] = useState<SanctionAppeal[]>(MOCK_APPEALS);
  const [selectedAppeal, setSelectedAppeal] = useState<SanctionAppeal | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppealStatus>('ALL');

  const handleAccept = (id: number) => {
    if (!resolutionText.trim()) {
      toast.error('결정 사유를 입력해주세요.');
      return;
    }
    const now = new Date().toISOString();
    const adminEmail = user?.email ?? 'admin@ember.com';
    const resolution = resolutionText || '이의신청이 수락되었습니다. 제재가 해제됩니다.';
    setAppeals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: 'ACCEPTED', resolvedAt: now, resolvedBy: adminEmail, resolution } : a,
      ),
    );
    setSelectedAppeal((cur) =>
      cur && cur.id === id ? { ...cur, status: 'ACCEPTED', resolvedAt: now, resolvedBy: adminEmail, resolution } : cur,
    );
    setResolutionText('');
    toast.success('이의신청이 수락되었습니다.');
  };

  const handleReject = (id: number) => {
    if (!resolutionText.trim()) {
      toast.error('결정 사유를 입력해주세요.');
      return;
    }
    const now = new Date().toISOString();
    const adminEmail = user?.email ?? 'admin@ember.com';
    const resolution = resolutionText || '검토 결과 이의신청이 기각되었습니다.';
    setAppeals((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: 'REJECTED', resolvedAt: now, resolvedBy: adminEmail, resolution } : a,
      ),
    );
    setSelectedAppeal((cur) =>
      cur && cur.id === id ? { ...cur, status: 'REJECTED', resolvedAt: now, resolvedBy: adminEmail, resolution } : cur,
    );
    setResolutionText('');
    toast.success('이의신청이 기각되었습니다.');
  };

  const filteredAppeals = appeals.filter(
    (a) => statusFilter === 'ALL' || a.status === statusFilter,
  );

  const pendingCount = appeals.filter((a) => a.status === 'PENDING').length;
  const inProgressCount = appeals.filter((a) => a.status === 'IN_PROGRESS').length;
  const acceptedCount = appeals.filter((a) => a.status === 'ACCEPTED').length;
  const rejectedCount = appeals.filter((a) => a.status === 'REJECTED').length;

  return (
    <div>
      <PageHeader
        title="이의신청 관리"
        description="제재에 대한 사용자 이의신청 처리"
      />

      <MockPageNotice message="이의신청 도메인 백엔드 API 준비 중입니다. 현재는 Mock 데이터로 화면 흐름만 검증됩니다." />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">전체</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{appeals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">대기 중</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {pendingCount + inProgressCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">수락</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{acceptedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-muted-foreground">기각</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 이의신청 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>이의신청 목록</CardTitle>
            <div className="mt-3 flex flex-wrap gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`rounded-full px-3 py-1 text-xs transition-colors ${
                    statusFilter === f.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {filteredAppeals.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  조건에 맞는 이의신청이 없습니다.
                </div>
              ) : (
                filteredAppeals.map((appeal) => {
                  const StatusIcon = STATUS_ICON_MAP[appeal.status];
                  return (
                    <div
                      key={appeal.id}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                        selectedAppeal?.id === appeal.id ? 'border-primary bg-muted/30' : ''
                      }`}
                      onClick={() => {
                        setSelectedAppeal(appeal);
                        setResolutionText('');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="destructive">
                            {SANCTION_TYPE_LABELS[appeal.originalSanctionType]}
                          </Badge>
                          <Badge className={APPEAL_STATUS_COLORS[appeal.status]}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {APPEAL_STATUS_LABELS[appeal.status]}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(appeal.createdAt)}
                        </span>
                      </div>
                      <h4 className="mt-2 font-medium">{appeal.userNickname}</h4>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {appeal.reason}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* 이의신청 상세 */}
        <Card>
          <CardHeader>
            <CardTitle>이의신청 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAppeal ? (
              <div className="space-y-4">
                {/* 사용자 정보 */}
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium">{selectedAppeal.userNickname}</h4>
                  <p className="text-sm text-muted-foreground">{selectedAppeal.userEmail}</p>
                </div>

                {/* 원래 제재 정보 */}
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-800">원래 제재</p>
                  <div className="mt-2 space-y-1 text-sm text-red-700">
                    <p>유형: {SANCTION_TYPE_LABELS[selectedAppeal.originalSanctionType]}</p>
                    <p>사유: {selectedAppeal.originalReason}</p>
                    <p>제재일: {formatDateTime(selectedAppeal.sanctionDate)}</p>
                  </div>
                </div>

                {/* 이의신청 내용 */}
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">이의신청 사유</p>
                  <div className="rounded-lg border p-4">
                    <p className="whitespace-pre-wrap text-sm">{selectedAppeal.reason}</p>
                  </div>
                  {selectedAppeal.evidenceUrls.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">첨부 증거 ({selectedAppeal.evidenceUrls.length}개)</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {selectedAppeal.evidenceUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 underline"
                          >
                            증거 {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    신청일: {formatDateTime(selectedAppeal.createdAt)}
                  </p>
                </div>

                {/* 처리 결과 */}
                {selectedAppeal.resolution && (
                  <div
                    className={`rounded-lg p-4 ${
                      selectedAppeal.status === 'ACCEPTED'
                        ? 'border-l-4 border-green-500 bg-green-50'
                        : 'border-l-4 border-gray-400 bg-gray-50'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        selectedAppeal.status === 'ACCEPTED' ? 'text-green-800' : 'text-gray-700'
                      }`}
                    >
                      처리 결과
                    </p>
                    <p
                      className={`mt-1 whitespace-pre-wrap text-sm ${
                        selectedAppeal.status === 'ACCEPTED' ? 'text-green-700' : 'text-gray-600'
                      }`}
                    >
                      {selectedAppeal.resolution}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      처리자: {selectedAppeal.resolvedBy} |{' '}
                      {selectedAppeal.resolvedAt && formatDateTime(selectedAppeal.resolvedAt)}
                    </p>
                  </div>
                )}

                {/* 액션 */}
                {hasPermission('ADMIN') &&
                  (selectedAppeal.status === 'PENDING' ||
                    selectedAppeal.status === 'IN_PROGRESS') && (
                    <div className="space-y-3">
                      <textarea
                        className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={3}
                        placeholder="결정 사유를 입력하세요 (필수)..."
                        value={resolutionText}
                        onChange={(e) => setResolutionText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          variant="default"
                          onClick={() => handleAccept(selectedAppeal.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          수락 (제재 해제)
                        </Button>
                        <Button
                          className="flex-1"
                          variant="destructive"
                          onClick={() => handleReject(selectedAppeal.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          기각
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                이의신청을 선택해주세요
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
