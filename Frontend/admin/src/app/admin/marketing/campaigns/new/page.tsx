'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateAdminCampaign,
  usePreviewAdminCampaign,
} from '@/hooks/useAdminCampaigns';
import type {
  CampaignFilterConditions,
  SendType,
} from '@/types/campaign';

const ALL_SEND_TYPES: SendType[] = ['NOTICE', 'PUSH', 'EMAIL'];
const SEND_TYPE_LABEL: Record<SendType, string> = {
  NOTICE: '앱 내 공지',
  PUSH: '푸시 알림',
  EMAIL: '이메일',
};

const ALL_GENDERS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
];

/**
 * 캠페인 생성 폼 (명세 v2.3 §11.1.3 Step 3 / Step 6 POST /admin/notification-campaigns).
 *
 * 필터 조건:
 *   - 가입일 범위 (signedUpAfter / signedUpBefore)
 *   - 마지막 접속일 범위 (lastActiveAfter / lastActiveBefore)
 *   - 성별
 *   - 매칭 성공 여부
 *   - AI 동의 여부
 *
 * 미리보기로 대상 수를 확인한 뒤 DRAFT 상태로 저장한다 (즉시 발송 X).
 * 발송 승인은 목록 페이지에서 별도 액션으로 수행.
 */
export default function CampaignCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sendTypes, setSendTypes] = useState<SendType[]>(['PUSH']);
  const [scheduledAt, setScheduledAt] = useState('');

  // 필터 조건
  const [signedUpAfter, setSignedUpAfter] = useState('');
  const [signedUpBefore, setSignedUpBefore] = useState('');
  const [lastActiveAfter, setLastActiveAfter] = useState('');
  const [lastActiveBefore, setLastActiveBefore] = useState('');
  const [genders, setGenders] = useState<string[]>([]);
  const [hasMatched, setHasMatched] = useState<'ANY' | 'TRUE' | 'FALSE'>('ANY');
  const [aiConsent, setAiConsent] = useState<'ANY' | 'TRUE' | 'FALSE'>('ANY');

  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const create = useCreateAdminCampaign();
  const preview = usePreviewAdminCampaign();

  const buildFilterConditions = (): CampaignFilterConditions => ({
    signedUpAfter: signedUpAfter ? `${signedUpAfter}T00:00:00` : null,
    signedUpBefore: signedUpBefore ? `${signedUpBefore}T23:59:59` : null,
    lastActiveAfter: lastActiveAfter ? `${lastActiveAfter}T00:00:00` : null,
    lastActiveBefore: lastActiveBefore ? `${lastActiveBefore}T23:59:59` : null,
    hasMatched: hasMatched === 'ANY' ? null : hasMatched === 'TRUE',
    aiConsent: aiConsent === 'ANY' ? null : aiConsent === 'TRUE',
    genders: genders.length > 0 ? genders : null,
  });

  const toggleSendType = (t: SendType) => {
    setSendTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const toggleGender = (g: string) => {
    setGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const handlePreview = async () => {
    try {
      const res = await preview.mutateAsync({ filterConditions: buildFilterConditions() });
      setPreviewCount(res.targetCount);
      toast.success(`대상 ${res.targetCount.toLocaleString()}명에게 발송됩니다.`);
    } catch (err) {
      toast.error('미리보기에 실패했습니다.');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !messageSubject.trim() || !messageBody.trim()) {
      toast.error('제목·메시지 제목·본문을 모두 입력해 주세요.');
      return;
    }
    if (sendTypes.length === 0) {
      toast.error('발송 채널을 1개 이상 선택해 주세요.');
      return;
    }
    try {
      await create.mutateAsync({
        title,
        messageSubject,
        messageBody,
        filterConditions: buildFilterConditions(),
        sendTypes,
        scheduledAt: scheduledAt ? `${scheduledAt}:00` : null,
      });
      router.push('/admin/marketing/campaigns');
    } catch (err) {
      toast.error('캠페인 저장에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="캠페인 만들기"
        description="필터 조건을 설정한 뒤 미리보기로 대상 수를 확인하고 DRAFT 상태로 저장합니다."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/marketing/campaigns">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              목록으로
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 메시지 */}
        <Card>
          <CardHeader>
            <CardTitle>메시지</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">캠페인 제목 (관리자 식별용)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 7월 1일 점검 안내"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">발송 제목</Label>
              <Input
                id="subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="이메일 제목 / 푸시 타이틀"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">메시지 본문</Label>
              <textarea
                id="body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="발송할 본문 내용을 작성합니다."
              />
            </div>

            <div className="space-y-1.5">
              <Label>발송 채널 (1개 이상 선택)</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SEND_TYPES.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={sendTypes.includes(t) ? 'default' : 'outline'}
                    onClick={() => toggleSendType(t)}
                  >
                    {SEND_TYPE_LABEL[t]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="scheduled">예약 발송 시각 (선택)</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                비워두면 승인 즉시 발송됩니다.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 필터 */}
        <Card>
          <CardHeader>
            <CardTitle>발송 대상 필터</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>가입일 시작</Label>
                <Input
                  type="date"
                  value={signedUpAfter}
                  onChange={(e) => setSignedUpAfter(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>가입일 종료</Label>
                <Input
                  type="date"
                  value={signedUpBefore}
                  onChange={(e) => setSignedUpBefore(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>마지막 접속 시작</Label>
                <Input
                  type="date"
                  value={lastActiveAfter}
                  onChange={(e) => setLastActiveAfter(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>마지막 접속 종료</Label>
                <Input
                  type="date"
                  value={lastActiveBefore}
                  onChange={(e) => setLastActiveBefore(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>성별</Label>
              <div className="flex gap-2">
                {ALL_GENDERS.map((g) => (
                  <Button
                    key={g.value}
                    type="button"
                    size="xs"
                    variant={genders.includes(g.value) ? 'default' : 'outline'}
                    onClick={() => toggleGender(g.value)}
                  >
                    {g.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>매칭 성공 경험</Label>
              <div className="flex gap-2">
                {(['ANY', 'TRUE', 'FALSE'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="xs"
                    variant={hasMatched === v ? 'default' : 'outline'}
                    onClick={() => setHasMatched(v)}
                  >
                    {v === 'ANY' ? '구분 없음' : v === 'TRUE' ? '있음' : '없음'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>AI 동의 상태</Label>
              <div className="flex gap-2">
                {(['ANY', 'TRUE', 'FALSE'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="xs"
                    variant={aiConsent === v ? 'default' : 'outline'}
                    onClick={() => setAiConsent(v)}
                  >
                    {v === 'ANY' ? '구분 없음' : v === 'TRUE' ? '동의함' : '미동의'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              {previewCount === null ? (
                <span className="text-muted-foreground">
                  미리보기 버튼을 누르면 대상 사용자 수가 표시됩니다.
                </span>
              ) : (
                <span className="font-medium">
                  대상 {previewCount.toLocaleString()}명 (제재·탈퇴 사용자 자동 제외)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={preview.isPending}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          {preview.isPending ? '미리보기 중...' : '대상 미리보기'}
        </Button>
        <Button type="button" onClick={handleSave} disabled={create.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {create.isPending ? '저장 중...' : 'DRAFT 저장'}
        </Button>
      </div>
    </div>
  );
}
