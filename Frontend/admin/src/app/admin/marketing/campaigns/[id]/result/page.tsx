'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Eye, MousePointer } from 'lucide-react';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdminCampaignResult } from '@/hooks/useAdminCampaigns';

export default function CampaignResultPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : null;

  const { data: result, isLoading } = useAdminCampaignResult(id);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>;
  }
  if (!result) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        결과를 찾을 수 없습니다.
      </div>
    );
  }

  const formatRate = (rate: number | null) =>
    rate === null ? '—' : `${(rate * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`캠페인 #${result.campaignId} 결과`}
        description={`상태: ${result.status} · 대상 ${result.targetCount.toLocaleString()}명`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/marketing/campaigns/${result.campaignId}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              상세로
            </Link>
          </Button>
        }
      />

      {/* KPI */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <div className="text-xs text-muted-foreground">성공</div>
              <div className="text-xl font-semibold">
                {result.successCount.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-8 w-8 text-rose-500" />
            <div>
              <div className="text-xs text-muted-foreground">실패</div>
              <div className="text-xl font-semibold">
                {result.failureCount.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Eye className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">열람률</div>
              <div className="text-xl font-semibold">{formatRate(result.openRate)}</div>
              <div className="text-[10px] text-muted-foreground">
                {result.openedCount.toLocaleString()}건
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MousePointer className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">클릭률</div>
              <div className="text-xl font-semibold">{formatRate(result.clickRate)}</div>
              <div className="text-[10px] text-muted-foreground">
                {result.clickedCount.toLocaleString()}건
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 채널별 결과 */}
      <Card>
        <CardHeader>
          <CardTitle>채널별 결과</CardTitle>
        </CardHeader>
        <CardContent>
          {result.channelResults.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              발송 워커가 가동되면 여기에 채널별 카운트가 표시됩니다 (Phase 2-B 이후).
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">채널</th>
                  <th className="px-2 py-2 text-right">성공</th>
                  <th className="px-2 py-2 text-right">실패</th>
                </tr>
              </thead>
              <tbody>
                {result.channelResults.map((c) => (
                  <tr key={c.sendType} className="border-b last:border-0">
                    <td className="px-2 py-2">{c.sendType}</td>
                    <td className="px-2 py-2 text-right text-emerald-700">
                      {c.successCount.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right text-rose-700">
                      {c.failureCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
