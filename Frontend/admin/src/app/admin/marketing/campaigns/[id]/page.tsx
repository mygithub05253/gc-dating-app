'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Ban, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import {
  useAdminCampaignDetail,
  useApproveAdminCampaign,
  useCancelAdminCampaign,
} from '@/hooks/useAdminCampaigns';
import type { CampaignStatus } from '@/types/campaign';

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: '초안',
  SCHEDULED: '예약됨',
  SENDING: '발송중',
  COMPLETED: '완료',
  CANCELLED: '취소됨',
};

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : null;

  const { data: campaign, isLoading } = useAdminCampaignDetail(id);
  const approve = useApproveAdminCampaign();
  const cancel = useCancelAdminCampaign();

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>;
  }
  if (!campaign) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        캠페인을 찾을 수 없습니다.
      </div>
    );
  }

  const handleApprove = async () => {
    if (!confirm('이 캠페인 발송을 승인하시겠습니까?')) return;
    try {
      await approve.mutateAsync(campaign.id);
    } catch (err) {
      toast.error('승인 실패: 상태가 올바른지 확인해 주세요.');
    }
  };

  const handleCancel = async () => {
    if (!confirm('예약 발송을 취소하시겠습니까?')) return;
    try {
      await cancel.mutateAsync(campaign.id);
    } catch (err) {
      toast.error('취소 실패: SCHEDULED 상태만 취소할 수 있습니다.');
    }
  };

  const filter = campaign.filterConditions ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.title}
        description={`상태: ${STATUS_LABEL[campaign.status]} · ID #${campaign.id}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/marketing/campaigns">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                목록
              </Link>
            </Button>
            {(campaign.status === 'COMPLETED' || campaign.status === 'SENDING') && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/marketing/campaigns/${campaign.id}/result`}>
                  <BarChart3 className="mr-1.5 h-4 w-4" />
                  결과 보기
                </Link>
              </Button>
            )}
            {campaign.status === 'DRAFT' && (
              <Button size="sm" onClick={handleApprove} disabled={approve.isPending}>
                <Send className="mr-1.5 h-4 w-4" />
                발송 승인
              </Button>
            )}
            {campaign.status === 'SCHEDULED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancel.isPending}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                예약 취소
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 메시지 */}
        <Card>
          <CardHeader>
            <CardTitle>메시지</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">발송 제목</div>
              <div className="font-medium">{campaign.messageSubject}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">본문</div>
              <pre className="whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                {campaign.messageBody}
              </pre>
            </div>
            <div className="flex flex-wrap gap-1">
              {campaign.sendTypes.map((t) => (
                <span
                  key={t}
                  className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 필터 + 일정 */}
        <Card>
          <CardHeader>
            <CardTitle>필터 / 발송 일정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">대상 수 (스냅샷)</div>
              <div className="font-medium">{campaign.targetCount.toLocaleString()}명</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">예약 시각</div>
              <div>
                {campaign.scheduledAt
                  ? formatDateTime(campaign.scheduledAt)
                  : '즉시 발송'}
              </div>
            </div>
            {campaign.sentAt && (
              <div>
                <div className="text-xs text-muted-foreground">시작 시각</div>
                <div>{formatDateTime(campaign.sentAt)}</div>
              </div>
            )}
            {campaign.completedAt && (
              <div>
                <div className="text-xs text-muted-foreground">종료 시각</div>
                <div>{formatDateTime(campaign.completedAt)}</div>
              </div>
            )}

            <div className="mt-3 border-t pt-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                필터 조건
              </div>
              <ul className="space-y-1 text-xs">
                {filter.signedUpAfter && (
                  <li>가입일 ≥ {formatDateTime(filter.signedUpAfter)}</li>
                )}
                {filter.signedUpBefore && (
                  <li>가입일 &lt; {formatDateTime(filter.signedUpBefore)}</li>
                )}
                {filter.lastActiveAfter && (
                  <li>마지막 접속 ≥ {formatDateTime(filter.lastActiveAfter)}</li>
                )}
                {filter.lastActiveBefore && (
                  <li>마지막 접속 &lt; {formatDateTime(filter.lastActiveBefore)}</li>
                )}
                {filter.genders && filter.genders.length > 0 && (
                  <li>성별: {filter.genders.join(', ')}</li>
                )}
                {filter.hasMatched !== null && filter.hasMatched !== undefined && (
                  <li>매칭 경험: {filter.hasMatched ? '있음' : '없음'}</li>
                )}
                {filter.aiConsent !== null && filter.aiConsent !== undefined && (
                  <li>AI 동의: {filter.aiConsent ? '동의함' : '미동의'}</li>
                )}
                {Object.values(filter).every((v) => v == null) && (
                  <li className="text-muted-foreground">전체 활성 사용자 (제재 자동 제외)</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
