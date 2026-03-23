'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_COLORS } from '@/lib/constants';
import { ArrowLeft, User, FileText, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 신고 데이터
const MOCK_REPORTS: Record<string, any> = {
  '1': {
    id: 1,
    reporterId: 5,
    reporterNickname: '맑은하늘',
    reporterEmail: 'sky@example.com',
    targetId: 2,
    targetNickname: '달빛청년',
    targetEmail: 'junho@example.com',
    reason: 'PROFANITY',
    detail: '교환일기에서 욕설을 사용했습니다. "XX" 같은 표현이 포함되어 있었습니다.',
    evidenceContent: '오늘 정말 XX 같은 하루였어. 왜 이렇게 재수가 없는지...',
    status: 'PENDING',
    createdAt: '2024-03-20T10:30:00',
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    targetPreviousReports: [
      { reason: 'SPAM', createdAt: '2024-02-15T08:00:00', status: 'DISMISSED' },
    ],
  },
  '2': {
    id: 2,
    reporterId: 8,
    reporterNickname: '봄날의꿈',
    reporterEmail: 'spring@example.com',
    targetId: 12,
    targetNickname: '행복한사람',
    targetEmail: 'happy@example.com',
    reason: 'OBSCENE',
    detail: '프로필 사진에 부적절한 이미지가 있습니다.',
    evidenceContent: '[프로필 이미지 - 노출이 심한 사진]',
    status: 'IN_PROGRESS',
    createdAt: '2024-03-19T15:45:00',
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    targetPreviousReports: [],
  },
  '3': {
    id: 3,
    reporterId: 3,
    reporterNickname: '별빛소녀',
    reporterEmail: 'star@example.com',
    targetId: 15,
    targetNickname: '자유로운영혼',
    targetEmail: 'free@example.com',
    reason: 'SPAM',
    detail: '계속 같은 내용의 일기를 반복해서 올리고 있습니다.',
    evidenceContent: '오늘도 좋은 하루! (같은 내용 10회 이상 반복)',
    status: 'RESOLVED',
    createdAt: '2024-03-18T09:00:00',
    resolvedAt: '2024-03-18T14:30:00',
    resolvedBy: 'admin@ember.com',
    resolveNote: '경고 처리 완료. 재발 시 정지 예정.',
    targetPreviousReports: [],
  },
};

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');

  const reportId = params.id as string;
  const report = MOCK_REPORTS[reportId] || MOCK_REPORTS['1'];

  const handleResolve = async (action: string) => {
    if (!actionNote.trim()) {
      toast.error('처리 사유를 입력해주세요.');
      return;
    }
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));

    const actionMessages: Record<string, string> = {
      warning: '경고 처리되었습니다.',
      suspend_7d: '7일 정지 처리되었습니다.',
      ban: '영구 정지 처리되었습니다.',
    };
    toast.success(actionMessages[action] || '처리되었습니다.');
    setIsProcessing(false);
    router.push('/admin/reports');
  };

  const handleDismiss = async () => {
    if (!actionNote.trim()) {
      toast.error('기각 사유를 입력해주세요.');
      return;
    }
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('신고가 기각되었습니다.');
    setIsProcessing(false);
    router.push('/admin/reports');
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
        <PageHeader
          title={`신고 상세 #${report.id}`}
          description={`${REPORT_REASON_LABELS[report.reason]} | ${formatDateTime(report.createdAt)}`}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 신고 내용 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                신고 내용
              </CardTitle>
              <Badge className={REPORT_STATUS_COLORS[report.status]}>
                {REPORT_STATUS_LABELS[report.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">신고 사유</Label>
              <p className="font-medium">{REPORT_REASON_LABELS[report.reason]}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">상세 내용</Label>
              <p className="mt-1">{report.detail}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">증거 내용</Label>
              <div className="mt-1 rounded-lg bg-muted p-4">
                <p className="text-sm italic">&quot;{report.evidenceContent}&quot;</p>
              </div>
            </div>

            {report.status === 'RESOLVED' && (
              <>
                <Separator />
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">처리 완료</span>
                  </div>
                  <p className="mt-2 text-sm text-green-700">
                    처리자: {report.resolvedBy}
                  </p>
                  <p className="text-sm text-green-700">
                    처리 시간: {formatDateTime(report.resolvedAt)}
                  </p>
                  <p className="mt-2 text-sm text-green-600">
                    처리 내용: {report.resolveNote}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 관련 사용자 정보 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                신고자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">닉네임</span>
                <span className="font-medium">{report.reporterNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-sm">{report.reporterEmail}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/users/${report.reporterId}`}>프로필 보기</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                피신고자 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">닉네임</span>
                <span className="font-medium">{report.targetNickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이메일</span>
                <span className="text-sm">{report.targetEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이전 신고</span>
                <span className="font-medium">{report.targetPreviousReports.length}건</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/users/${report.targetId}`}>프로필 보기</a>
              </Button>
            </CardContent>
          </Card>

          {report.targetPreviousReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">이전 신고 이력</CardTitle>
              </CardHeader>
              <CardContent>
                {report.targetPreviousReports.map((prev: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{REPORT_REASON_LABELS[prev.reason]}</span>
                    <Badge variant="secondary">
                      {prev.status === 'DISMISSED' ? '기각' : '처리됨'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 처리 액션 (ADMIN 이상) */}
        {hasPermission('ADMIN') && report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                신고 처리
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="actionNote">처리/기각 사유</Label>
                  <Input
                    id="actionNote"
                    placeholder="처리 또는 기각 사유를 입력하세요..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleResolve('warning')}
                    disabled={isProcessing}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                    경고 처리
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleResolve('suspend_7d')}
                    disabled={isProcessing}
                  >
                    <Clock className="mr-2 h-4 w-4 text-orange-500" />
                    7일 정지
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleResolve('ban')}
                    disabled={isProcessing}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    영구 정지
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleDismiss}
                    disabled={isProcessing}
                  >
                    기각
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
