'use client';

import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  BookOpen,
  Edit,
  FileText,
  Star,
  Calendar,
  Smile,
  Lightbulb,
  Clock,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

// 일기 분석 서브 페이지 카드 목록
const SUB_PAGES = [
  {
    href: '/admin/analytics/diaries/heatmap',
    icon: Calendar,
    title: '일기 시간 히트맵',
    description: '요일·시간대별 작성 패턴',
  },
  {
    href: '/admin/analytics/diaries/quality',
    icon: FileText,
    title: '일기 길이·품질',
    description: '글자 수 분포·AI 품질 점수',
  },
  {
    href: '/admin/analytics/diaries/emotion',
    icon: Smile,
    title: '일기 감정 추이',
    description: 'KcELECTRA 6종 감정 태그',
  },
  {
    href: '/admin/analytics/diaries/topic',
    icon: Lightbulb,
    title: '일기 주제 참여',
    description: '주제별 응답률·인기도',
  },
  {
    href: '/admin/analytics/diaries/response',
    icon: Clock,
    title: '교환 응답률',
    description: '응답 시간·완료/만료 분포',
  },
  {
    href: '/admin/analytics/diaries/turn-funnel',
    icon: MessageCircle,
    title: '턴 퍼널',
    description: '1~7턴 완주율·이탈 패턴',
  },
] as const;

export default function DiariesAnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="일기 패턴 분석"
        description="일기 작성·품질·감정·주제·교환 패턴 종합 허브"
      />

      <MockPageNotice
        description="일기 도메인 분석의 서브 페이지들로 이동해 세부 지표를 확인하세요"
      />

      {/* 개요 KPI 4개 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="총 일기 수"
          value={156789}
          icon={BookOpen}
        />
        <KpiCard
          title="오늘 작성 수"
          value={892}
          icon={Edit}
        />
        <KpiCard
          title="평균 글자 수"
          value="287자"
          icon={FileText}
        />
        <KpiCard
          title="평균 품질 점수"
          value="78.4"
          icon={Star}
        />
      </div>

      {/* 6개 분석 서브 페이지 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SUB_PAGES.map(({ href, icon: Icon, title, description }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer transition-colors duration-short hover:border-primary/40 hover:bg-accent/30">
              <CardContent className="flex items-center gap-4 p-5">
                {/* 아이콘 배지 */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>

                {/* 텍스트 영역 */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                </div>

                {/* 우측 화살표 */}
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
