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
import { ArrowLeft, User, FileText, AlertTriangle, CheckCircle, XCircle, Clock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 신고 데이터 (기능명세서 9.2 기준)
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
    priorityScore: 6.0,
    slaDeadline: '2024-03-23T10:30:00',
    slaProgress: 0.65,
    assignedTo: null,
    accumulatedReportCount: 2,
    createdAt: '2024-03-20T10:30:00',
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    sanctionType: null,
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
    status: 'UNDER_REVIEW',
    priorityScore: 10.0,
    slaDeadline: '2024-03-20T15:45:00',
    slaProgress: 0.92,
    assignedTo: 'admin@ember.com',
    accumulatedReportCount: 1,
    createdAt: '2024-03-19T15:45:00',
    resolvedAt: null,
    resolvedBy: null,
    resolveNote: null,
    sanctionType: null,
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
    priorityScore: 4.0,
    slaDeadline: '2024-03-21T09:00:00',
    slaProgress: 0.3,
    assignedTo: 'admin@ember.com',
    accumulatedReportCount: 1,
    createdAt: '2024-03-18T09:00:00',
    resolvedAt: '2024-03-18T14:30:00',
    resolvedBy: 'admin@ember.com',
    resolveNote: '경고 처리 완료. 재발 시 정지 예정.',
    sanctionType: 'WARNING',
    targetPreviousReports: [],
  },
};

function getSlaColor(progress: number) {
  if (progress >= 1.0) return 'bg-red-500';
  if (progress >= 0.8) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getSlaLabel(progress: number) {
  if (progress >= 1.0) return { text: 'SLA 초과', className: 'bg-red-100 text-red-800' };
  if (progress >= 0.8) return { text: 'SLA 접근 중', className: 'bg-yellow-100 text-yellow-800' };
  return { text: 'SLA 정상', className: 'bg-green-100 text-green-800' };
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminMemo, setAdminMemo] = useState('');
  const [sanctionType, setSanctionType] = useState<string>('NONE');

  const reportId = params.id as string;
  const report = MOCK_REPORTS[reportId] || MOCK_REPORTS['1'];
  const slaLabel = getSlaLabel(report.slaProgress);

  const handleProcess = async (result: 'RESOLVED' | 'DISMISSED') => {
    if (adminMemo.trim().length < 10) {
      toast.error('처리 사유를 최소 10자 이상 입력해주세요.');
      return;
    }
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));

    if (result === 'DISMISSED') {
      toast.success('신고가 기각되었습니다.');
    } else {
      const msgs: Record<string, string> = {
        NONE: '처리 완료되었습니다.',
        WARNING: '경고 처리되었습니다.',
        SUSPEND_7D: '7일 정지 처리되었습니다.',
        BANNED: '영구 정지 처리되었습니다.',
      };
      toast.success(msgs[sanctionType] || '처리되었습니다.');
    }
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
        {/* 신고 내용 + SLA */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                신고 내용
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={slaLabel.className}>{slaLabel.text}</Badge>
                <Badge className={REPORT_STATUS_COLORS[report.status]}>
                  {REPORT_STATUS_LABELS[report.status]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SLA 진행바 */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">SLA 진행률</span>
                <span className="font-medium">{Math.round(report.slaProgress * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2 rounded-full transition-all ${getSlaColor(report.slaProgress)}`}
                  style={{ width: `${Math.min(report.slaProgress * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                마감: {formatDateTime(report.slaDeadline)} | 우선순위 점수: {report.priorityScore.toFixed(1)}
              </p>
            </div>

            <Separator />

            {/* 담당자 */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">담당자</Label>
                <p className="font-medium">{report.assignedTo || '미배정'}</p>
              </div>
              {hasPermission('ADMIN') && (
                <Button variant="outline" size="sm">
                  <Shield className="mr-1 h-4 w-4" />
                  담당자 변경
                </Button>
              )}
            </div>

            <Separator />

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
                  <p className="mt-2 text-sm text-green-700">처리자: {report.resolvedBy}</p>
                  <p className="text-sm text-green-700">처리 시간: {formatDateTime(report.resolvedAt)}</p>
                  <p className="mt-2 text-sm text-green-600">처리 내용: {report.resolveNote}</p>
                  {report.sanctionType && report.sanctionType !== 'NONE' && (
                    <p className="text-sm text-green-600">제재: {report.sanctionType}</p>
                  )}
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
                <a href={`/admin/members/${report.reporterId}`}>프로필 보기</a>
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
                <span className="text-muted-foreground">누적 신고</span>
                <span className="font-medium text-red-600">{report.accumulatedReportCount}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">이전 신고</span>
                <span className="font-medium">{report.targetPreviousReports.length}건</span>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <a href={`/admin/members/${report.targetId}`}>프로필 보기</a>
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
                      {REPORT_STATUS_LABELS[prev.status] || prev.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 처리 액션 (ADMIN 이상, 기능명세서 9.2 기준) */}
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
                {/* 제재 유형 선택 (4종) */}
                <div>
                  <Label>제재 유형</Label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {[
                      { value: 'NONE', label: '없음', icon: null },
                      { value: 'WARNING', label: '경고', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> },
                      { value: 'SUSPEND_7D', label: '7일 정지', icon: <Clock className="h-4 w-4 text-orange-500" /> },
                      { value: 'BANNED', label: '영구 정지', icon: <XCircle className="h-4 w-4 text-red-500" /> },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                          sanctionType === option.value
                            ? 'border-primary bg-primary/5 font-medium'
                            : 'border-gray-200 hover:bg-muted'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sanctionType"
                          value={option.value}
                          checked={sanctionType === option.value}
                          onChange={(e) => setSanctionType(e.target.value)}
                          className="sr-only"
                        />
                        {option.icon}
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 처리 사유 (최소 10자) */}
                <div>
                  <Label htmlFor="adminMemo">처리 사유 (최소 10자)</Label>
                  <Input
                    id="adminMemo"
                    placeholder="처리 또는 기각 사유를 상세히 입력하세요..."
                    value={adminMemo}
                    onChange={(e) => setAdminMemo(e.target.value)}
                    className="mt-1"
                  />
                  {adminMemo.length > 0 && adminMemo.length < 10 && (
                    <p className="mt-1 text-xs text-red-500">
                      {10 - adminMemo.length}자 더 입력해주세요
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleProcess('RESOLVED')}
                    disabled={isProcessing || adminMemo.length < 10}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    처리 완료
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleProcess('DISMISSED')}
                    disabled={isProcessing || adminMemo.length < 10}
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
