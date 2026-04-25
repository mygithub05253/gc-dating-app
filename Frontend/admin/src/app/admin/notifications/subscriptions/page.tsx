'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useAdminInboxSubscriptions,
  useUpdateAdminInboxSubscriptions,
} from '@/hooks/useAdminInbox';
import type {
  AdminNotificationSubscriptionItem,
  NotificationChannel,
  NotificationType,
} from '@/types/inbox';

const KNOWN_CATEGORIES = [
  { value: 'ALL', label: '전체 (모든 카테고리)' },
  { value: 'AI_MONITORING', label: 'AI 품질 모니터링' },
  { value: 'PIPELINE', label: 'AI 파이프라인 / MQ' },
  { value: 'REPORT_SLA', label: '신고 SLA' },
  { value: 'BATCH_FAILURE', label: '배치 실패' },
  { value: 'MANUAL', label: '수동 발행' },
];

const ALERT_LEVELS: NotificationType[] = ['CRITICAL', 'WARN', 'INFO'];
const CHANNEL_OPTIONS: NotificationChannel[] = ['EMAIL', 'SLACK', 'IN_APP'];

const ALERT_LEVEL_LABEL: Record<NotificationType, string> = {
  CRITICAL: '긴급 이상',
  WARN: '경고 이상',
  INFO: '정보 이상 (전체)',
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  EMAIL: '이메일',
  SLACK: 'Slack',
  IN_APP: '앱 내',
};

/**
 * 관리자 알림 구독 설정 페이지 (명세 v2.3 §11.2 — admin_notification_subscription).
 *
 * <p>WARN/INFO 알림은 이 설정에 따라 발송 여부와 채널이 결정된다.
 * CRITICAL 알림은 구독 설정과 무관하게 ADMIN 이상 전원에게 강제 발송된다.</p>
 */
export default function AdminNotificationsSubscriptionsPage() {
  const { data, isLoading } = useAdminInboxSubscriptions();
  const updateMutation = useUpdateAdminInboxSubscriptions();
  const [items, setItems] = useState<AdminNotificationSubscriptionItem[]>([]);

  useEffect(() => {
    if (data?.subscriptions) {
      setItems(data.subscriptions);
    }
  }, [data]);

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      { category: 'AI_MONITORING', alertLevel: 'WARN', channels: ['IN_APP'] },
    ]);
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = <K extends keyof AdminNotificationSubscriptionItem>(
    index: number,
    key: K,
    value: AdminNotificationSubscriptionItem[K],
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  };

  const handleToggleChannel = (index: number, channel: NotificationChannel) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const has = item.channels.includes(channel);
        return {
          ...item,
          channels: has
            ? item.channels.filter((c) => c !== channel)
            : [...item.channels, channel],
        };
      }),
    );
  };

  const handleSave = () => {
    // 채널이 비어있는 행 검증
    const invalid = items.find((item) => item.channels.length === 0);
    if (invalid) {
      alert('각 행마다 최소 1개 이상의 채널을 선택해야 합니다.');
      return;
    }
    updateMutation.mutate({ subscriptions: items });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="알림 구독 설정"
        description="WARN / INFO 알림의 카테고리·채널을 직접 설정합니다. CRITICAL은 구독 설정과 무관하게 강제 발송됩니다."
        actions={
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
          >
            <Save className="mr-1 h-4 w-4" />
            저장
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">구독 항목</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
              구독 항목이 없습니다. 아래 &quot;항목 추가&quot;로 추가하세요.
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 items-end gap-3 rounded border bg-card p-4 md:grid-cols-12"
              >
                {/* 카테고리 */}
                <div className="md:col-span-3">
                  <Label className="mb-1 block text-xs">카테고리</Label>
                  <select
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                    value={item.category}
                    onChange={(e) => handleChange(index, 'category', e.target.value)}
                  >
                    {KNOWN_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                    {/* 알려진 카테고리에 없는 자유 입력 카테고리 보존 */}
                    {!KNOWN_CATEGORIES.some((c) => c.value === item.category) && (
                      <option value={item.category}>{item.category} (커스텀)</option>
                    )}
                  </select>
                </div>

                {/* 알림 수준 */}
                <div className="md:col-span-3">
                  <Label className="mb-1 block text-xs">최소 알림 수준</Label>
                  <select
                    className="w-full rounded border bg-background px-3 py-2 text-sm"
                    value={item.alertLevel}
                    onChange={(e) =>
                      handleChange(index, 'alertLevel', e.target.value as NotificationType)
                    }
                  >
                    {ALERT_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {ALERT_LEVEL_LABEL[level]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 채널 */}
                <div className="md:col-span-5">
                  <Label className="mb-1 block text-xs">채널 (복수 선택)</Label>
                  <div className="flex gap-2">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const checked = item.channels.includes(channel);
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => handleToggleChannel(index, channel)}
                          className={`rounded border px-3 py-1.5 text-xs transition ${
                            checked
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                          }`}
                        >
                          {CHANNEL_LABEL[channel]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 삭제 */}
                <div className="md:col-span-1 md:text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(index)}
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          <div>
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Plus className="mr-1 h-4 w-4" />
              항목 추가
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
