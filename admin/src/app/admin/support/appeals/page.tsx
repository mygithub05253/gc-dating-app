'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { Scale, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 이의신청 데이터
const MOCK_APPEALS = [
  {
    id: 1,
    userId: 2,
    userNickname: '달빛청년',
    userEmail: 'moon@example.com',
    originalSanctionType: 'SUSPEND_7D',
    originalReason: '부적절한 언어 사용',
    sanctionDate: '2024-03-19T10:00:00',
    appealReason: '해당 표현은 친구 사이의 농담이었습니다. 상대방도 기분 나빠하지 않았습니다.',
    status: 'PENDING',
    createdAt: '2024-03-20T08:00:00',
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
  },
  {
    id: 2,
    userId: 15,
    userNickname: '자유로운영혼',
    userEmail: 'free@example.com',
    originalSanctionType: 'BAN',
    originalReason: '반복적인 스팸 활동',
    sanctionDate: '2024-03-15T14:00:00',
    appealReason: '해킹당해서 제 계정이 아닌 사람이 글을 올린 것입니다. 본인 인증 자료 첨부합니다.',
    status: 'IN_PROGRESS',
    createdAt: '2024-03-16T09:00:00',
    resolvedAt: null,
    resolvedBy: null,
    resolution: null,
  },
  {
    id: 3,
    userId: 20,
    userNickname: '행복한하루',
    userEmail: 'happy@example.com',
    originalSanctionType: 'SUSPEND_7D',
    originalReason: '음란성 콘텐츠',
    sanctionDate: '2024-03-10T11:00:00',
    appealReason: '해당 사진은 예술 작품 사진입니다. 음란물이 아닙니다.',
    status: 'REJECTED',
    createdAt: '2024-03-11T08:00:00',
    resolvedAt: '2024-03-12T10:00:00',
    resolvedBy: 'admin@ember.com',
    resolution: '검토 결과 커뮤니티 가이드라인 위반으로 판단됩니다. 이의신청이 기각되었습니다.',
  },
  {
    id: 4,
    userId: 25,
    userNickname: '봄날의꿈',
    userEmail: 'spring@example.com',
    originalSanctionType: 'SUSPEND_7D',
    originalReason: '허위 프로필 정보',
    sanctionDate: '2024-03-08T16:00:00',
    appealReason: '실수로 잘못된 정보를 입력했습니다. 수정하겠습니다.',
    status: 'ACCEPTED',
    createdAt: '2024-03-09T10:00:00',
    resolvedAt: '2024-03-09T15:00:00',
    resolvedBy: 'admin@ember.com',
    resolution: '이의신청이 수락되었습니다. 정지가 해제되었으며, 프로필 정보를 정확히 수정해주세요.',
  },
];

const SANCTION_LABELS: Record<string, string> = {
  SUSPEND_7D: '7일 정지',
  BAN: '영구 정지',
  WARNING: '경고',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: '대기중', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  IN_PROGRESS: { label: '검토중', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle },
  ACCEPTED: { label: '수락', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: '기각', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function AppealsPage() {
  const { hasPermission } = useAuthStore();
  const [appeals, setAppeals] = useState(MOCK_APPEALS);
  const [selectedAppeal, setSelectedAppeal] = useState<typeof MOCK_APPEALS[0] | null>(null);

  const handleAccept = (id: number) => {
    setAppeals(
      appeals.map((appeal) =>
        appeal.id === id
          ? {
              ...appeal,
              status: 'ACCEPTED',
              resolvedAt: new Date().toISOString(),
              resolvedBy: 'admin@ember.com',
              resolution: '이의신청이 수락되었습니다. 제재가 해제됩니다.',
            }
          : appeal
      )
    );
    toast.success('이의신청이 수락되었습니다.');
    setSelectedAppeal(null);
  };

  const handleReject = (id: number) => {
    setAppeals(
      appeals.map((appeal) =>
        appeal.id === id
          ? {
              ...appeal,
              status: 'REJECTED',
              resolvedAt: new Date().toISOString(),
              resolvedBy: 'admin@ember.com',
              resolution: '검토 결과 이의신청이 기각되었습니다.',
            }
          : appeal
      )
    );
    toast.success('이의신청이 기각되었습니다.');
    setSelectedAppeal(null);
  };

  const pendingCount = appeals.filter((a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS').length;

  return (
    <div>
      <PageHeader
        title="이의신청 관리"
        description="제재에 대한 사용자 이의신청 처리"
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">전체 이의신청</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{appeals.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">처리 대기</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">수락됨</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {appeals.filter((a) => a.status === 'ACCEPTED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">기각됨</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {appeals.filter((a) => a.status === 'REJECTED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 이의신청 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>이의신청 목록</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {appeals.map((appeal) => {
                const StatusIcon = STATUS_CONFIG[appeal.status].icon;
                return (
                  <div
                    key={appeal.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      selectedAppeal?.id === appeal.id ? 'border-primary bg-muted/30' : ''
                    }`}
                    onClick={() => setSelectedAppeal(appeal)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">
                          {SANCTION_LABELS[appeal.originalSanctionType]}
                        </Badge>
                        <Badge className={STATUS_CONFIG[appeal.status].color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {STATUS_CONFIG[appeal.status].label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(appeal.createdAt)}
                      </span>
                    </div>
                    <h4 className="mt-2 font-medium">{appeal.userNickname}</h4>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {appeal.appealReason}
                    </p>
                  </div>
                );
              })}
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
                    <p>유형: {SANCTION_LABELS[selectedAppeal.originalSanctionType]}</p>
                    <p>사유: {selectedAppeal.originalReason}</p>
                    <p>제재일: {formatDateTime(selectedAppeal.sanctionDate)}</p>
                  </div>
                </div>

                {/* 이의신청 내용 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">이의신청 사유</p>
                  <div className="mt-2 rounded-lg border p-4">
                    <p className="text-sm">{selectedAppeal.appealReason}</p>
                  </div>
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
                        : 'border-l-4 border-red-500 bg-red-50'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        selectedAppeal.status === 'ACCEPTED' ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      처리 결과
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        selectedAppeal.status === 'ACCEPTED' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {selectedAppeal.resolution}
                    </p>
                    <p
                      className={`mt-2 text-xs ${
                        selectedAppeal.status === 'ACCEPTED' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      처리자: {selectedAppeal.resolvedBy} | {formatDateTime(selectedAppeal.resolvedAt!)}
                    </p>
                  </div>
                )}

                {/* 액션 버튼 */}
                {hasPermission('ADMIN') &&
                  (selectedAppeal.status === 'PENDING' || selectedAppeal.status === 'IN_PROGRESS') && (
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
