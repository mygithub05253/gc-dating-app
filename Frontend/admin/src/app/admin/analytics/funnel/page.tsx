'use client';

import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, ArrowRight, ArrowDown, Users, BookOpen, Heart, MessageCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from 'recharts';

// Mock 퍼널 데이터
const MOCK_FUNNEL_DATA = [
  { name: '가입', value: 10000, fill: '#3b82f6' },
  { name: '프로필 완성', value: 7500, fill: '#60a5fa' },
  { name: '첫 일기 작성', value: 5200, fill: '#93c5fd' },
  { name: '매칭 신청', value: 3800, fill: '#bfdbfe' },
  { name: '교환일기 시작', value: 2100, fill: '#dbeafe' },
  { name: '채팅 전환', value: 890, fill: '#eff6ff' },
];

const MOCK_CONVERSION_RATES = [
  { from: '가입', to: '프로필 완성', rate: 75.0, avgTime: '2.3시간' },
  { from: '프로필 완성', to: '첫 일기 작성', rate: 69.3, avgTime: '1.5일' },
  { from: '첫 일기 작성', to: '매칭 신청', rate: 73.1, avgTime: '3.2일' },
  { from: '매칭 신청', to: '교환일기 시작', rate: 55.3, avgTime: '5.1일' },
  { from: '교환일기 시작', to: '채팅 전환', rate: 42.4, avgTime: '7.8일' },
];

const MOCK_COHORT_DATA = [
  { cohort: '3월 1주', signup: 1200, profile: 890, diary: 620, match: 450, exchange: 240, chat: 98 },
  { cohort: '3월 2주', signup: 1350, profile: 1010, diary: 710, match: 520, exchange: 290, chat: 120 },
  { cohort: '3월 3주', signup: 1180, profile: 870, diary: 590, match: 420, exchange: 220, chat: 85 },
];

const MOCK_DROP_OFF_REASONS = [
  { stage: '프로필 완성', reason: '복잡한 프로필 입력', percentage: 45 },
  { stage: '프로필 완성', reason: '사진 업로드 실패', percentage: 30 },
  { stage: '프로필 완성', reason: '관심 없음', percentage: 25 },
  { stage: '첫 일기 작성', reason: '무엇을 쓸지 모름', percentage: 40 },
  { stage: '첫 일기 작성', reason: '시간 부족', percentage: 35 },
  { stage: '첫 일기 작성', reason: '앱 재방문 없음', percentage: 25 },
  { stage: '매칭 신청', reason: '마음에 드는 상대 없음', percentage: 50 },
  { stage: '매칭 신청', reason: '기능 인지 부족', percentage: 30 },
  { stage: '매칭 신청', reason: '부담감', percentage: 20 },
];

const STAGE_ICONS: Record<string, React.ReactNode> = {
  '가입': <Users className="h-5 w-5" />,
  '프로필 완성': <Users className="h-5 w-5" />,
  '첫 일기 작성': <BookOpen className="h-5 w-5" />,
  '매칭 신청': <Heart className="h-5 w-5" />,
  '교환일기 시작': <MessageCircle className="h-5 w-5" />,
  '채팅 전환': <Sparkles className="h-5 w-5" />,
};

export default function FunnelAnalysisPage() {
  const handleRefresh = () => {
    toast.success('데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('퍼널 분석 리포트를 다운로드합니다.');
  };

  const overallConversion = ((MOCK_FUNNEL_DATA[MOCK_FUNNEL_DATA.length - 1].value / MOCK_FUNNEL_DATA[0].value) * 100).toFixed(1);

  return (
    <div>
      <PageHeader
        title="사용자 퍼널 분석"
        description="가입부터 채팅 전환까지의 사용자 여정 분석"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              리포트 다운로드
            </Button>
          </div>
        }
      />

      {/* Overview Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">전체 전환율</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">{overallConversion}%</div>
            <p className="text-xs text-muted-foreground mt-1">가입 → 채팅 전환</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">최저 전환 구간</div>
            <div className="mt-1 text-2xl font-bold text-red-600">42.4%</div>
            <p className="text-xs text-muted-foreground mt-1">교환일기 → 채팅</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">평균 전환 시간</div>
            <div className="mt-1 text-2xl font-bold">19.9일</div>
            <p className="text-xs text-muted-foreground mt-1">가입 → 채팅 전환</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">이번 주 신규 가입</div>
            <div className="mt-1 text-2xl font-bold text-green-600">1,180</div>
            <p className="text-xs text-muted-foreground mt-1">전주 대비 -12.6%</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>사용자 여정 퍼널</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 py-4 overflow-x-auto">
            {MOCK_FUNNEL_DATA.map((stage, index) => (
              <div key={stage.name} className="flex items-center">
                <div
                  className="flex flex-col items-center p-4 rounded-lg min-w-[120px]"
                  style={{ backgroundColor: stage.fill + '40' }}
                >
                  <div className="p-2 rounded-full bg-white shadow-sm">
                    {STAGE_ICONS[stage.name]}
                  </div>
                  <span className="mt-2 text-sm font-medium">{stage.name}</span>
                  <span className="text-xl font-bold">{stage.value.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">
                    {((stage.value / MOCK_FUNNEL_DATA[0].value) * 100).toFixed(1)}%
                  </span>
                </div>
                {index < MOCK_FUNNEL_DATA.length - 1 && (
                  <ArrowRight className="h-6 w-6 text-gray-400 mx-2 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversion Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle>단계별 전환율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {MOCK_CONVERSION_RATES.map((item, index) => (
                <div key={index} className="flex items-center gap-4 pb-4 border-b last:border-0">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium">{item.from}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{item.to}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.rate >= 60 ? 'bg-green-500' : item.rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                    <span className={`font-bold w-16 text-right ${item.rate >= 60 ? 'text-green-600' : item.rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.rate}%
                    </span>
                    <span className="text-sm text-muted-foreground w-16">{item.avgTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Drop-off Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>주요 이탈 사유</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['프로필 완성', '첫 일기 작성', '매칭 신청'].map(stage => (
                <div key={stage} className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    {STAGE_ICONS[stage]}
                    {stage} 단계 이탈
                  </h4>
                  <div className="space-y-2">
                    {MOCK_DROP_OFF_REASONS
                      .filter(r => r.stage === stage)
                      .map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1 text-sm text-muted-foreground">{reason.reason}</div>
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-400 rounded-full"
                              style={{ width: `${reason.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm w-10 text-right">{reason.percentage}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>코호트별 퍼널 분석 (최근 3주)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={MOCK_COHORT_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="cohort" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="signup" name="가입" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profile" name="프로필" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="diary" name="일기" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="match" name="매칭" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exchange" name="교환" fill="#dbeafe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="chat" name="채팅" fill="#eff6ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
