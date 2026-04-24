'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Heart, Activity, Clock, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─── 타입 ───────────────────────────────────────────────────────────────────

type PeriodFilter = '7d' | '30d' | '90d';
type SegmentFilter = 'all' | 'male' | 'female' | '20s' | '30s' | '40s+';

// ─── Mock: Kaplan-Meier 생존 곡선 (60일) ────────────────────────────────────

/** 3개 그룹 생존 확률 데이터 (일단위) */
const buildKmData = () => {
  const points: { day: number; total: number; male: number; female: number }[] = [];
  for (let d = 0; d <= 60; d += 2) {
    const t = d / 60;
    // 전체: 1.0 → 0.45, 남성: 1.0 → 0.40, 여성: 1.0 → 0.50 (지수 감소)
    points.push({
      day: d,
      total: parseFloat((1.0 - 0.55 * (1 - Math.exp(-2.5 * t))).toFixed(3)),
      male: parseFloat((1.0 - 0.60 * (1 - Math.exp(-2.8 * t))).toFixed(3)),
      female: parseFloat((1.0 - 0.50 * (1 - Math.exp(-2.2 * t))).toFixed(3)),
    });
  }
  return points;
};

const MOCK_KM_DATA = buildKmData();

// ─── Mock: 세그먼트별 퍼널 (6단계 × 4세그먼트) ──────────────────────────────

const FUNNEL_STAGES = ['가입', '프로필 완성', '첫 일기', '매칭 신청', '교환 시작', '채팅 전환'];

/** Grouped BarChart 용 — X: 단계, 4개 막대 */
const MOCK_SEGMENT_FUNNEL = FUNNEL_STAGES.map((stage, i) => {
  // 단계마다 감소율 다르게
  const base = [10000, 7500, 5200, 3800, 2100, 890];
  const maleRate = [1.0, 0.72, 0.48, 0.38, 0.19, 0.079];
  const femaleRate = [1.0, 0.78, 0.56, 0.40, 0.23, 0.095];
  const topRate = [1.0, 0.82, 0.62, 0.46, 0.27, 0.11]; // Top 세그먼트 (30대)
  return {
    stage,
    전체: base[i],
    남성: Math.round(base[i] * maleRate[i] * 0.52),   // 남성 비율 52%
    여성: Math.round(base[i] * femaleRate[i] * 0.48),  // 여성 비율 48%
    Top세그먼트: Math.round(base[i] * topRate[i] * 0.28), // 30대
  };
});

// ─── Mock: 코호트별 퍼널 도달율 (4주 × 6단계) ───────────────────────────────

const MOCK_COHORT_REACH = [
  { cohort: '4월 1주', 가입: 100, 프로필: 78, 일기: 54, 매칭: 40, 교환: 22, 채팅: 9.1 },
  { cohort: '4월 2주', 가입: 100, 프로필: 80, 일기: 57, 매칭: 42, 교환: 24, 채팅: 9.8 },
  { cohort: '4월 3주', 가입: 100, 프로필: 75, 일기: 52, 매칭: 38, 교환: 21, 채팅: 8.6 },
  { cohort: '4월 4주', 가입: 100, 프로필: 82, 일기: 59, 매칭: 44, 교환: 25, 채팅: 10.2 },
];

// ─── Mock: 시간대별 이탈 패턴 (24시간) ──────────────────────────────────────

/** 밤 시간대(22~04시) 이탈 많은 패턴 */
const MOCK_HOURLY_DROP = Array.from({ length: 24 }, (_, h) => {
  const isNight = h >= 22 || h <= 4;
  const isPeak = h >= 0 && h <= 2;
  const base = isNight ? (isPeak ? 280 : 210) : h >= 9 && h <= 18 ? 80 : 130;
  const jitter = Math.round((Math.random() - 0.5) * 20);
  return { hour: `${String(h).padStart(2, '0')}시`, 이탈수: base + jitter };
});

// ─── Mock: 이탈 사유 심화 테이블 (12행) ─────────────────────────────────────

const MOCK_DROP_REASONS = [
  { stage: '프로필 완성', reason: '입력 항목 과다', count: 1240, recovery: 34, action: '단계별 간소화 UX 적용' },
  { stage: '프로필 완성', reason: '사진 업로드 실패', count: 820, recovery: 62, action: '업로드 오류 알림 개선' },
  { stage: '첫 일기 작성', reason: '무엇을 쓸지 모름', count: 1050, recovery: 28, action: '가이드 템플릿 노출 확대' },
  { stage: '첫 일기 작성', reason: '앱 재방문 미발생', count: 740, recovery: 18, action: 'D+1 푸시 알림 강화' },
  { stage: '매칭 신청', reason: '마음에 드는 상대 없음', count: 890, recovery: 41, action: '추천 알고리즘 다양성 개선' },
  { stage: '매칭 신청', reason: '기능 인지 부족', count: 560, recovery: 55, action: '온보딩 튜토리얼 보강' },
  { stage: '교환 시작', reason: '상대 미응답', count: 730, recovery: 22, action: '응답 독려 알림 추가' },
  { stage: '교환 시작', reason: '일기 주제 불만족', count: 410, recovery: 38, action: '주제 재선택 기능 추가' },
  { stage: '채팅 전환', reason: '교환 완주 피로', count: 620, recovery: 31, action: '완주 보상 강화' },
  { stage: '채팅 전환', reason: '상대 프로필 불일치', count: 380, recovery: 19, action: '프로필 미리보기 강화' },
  { stage: '교환 시작', reason: '시간 부족', count: 490, recovery: 27, action: '짧은 일기 옵션 추가' },
  { stage: '매칭 신청', reason: '부담감/두려움', count: 340, recovery: 44, action: '익명 하트 기능 도입 검토' },
];

// ─── Mock: 세그먼트별 KPI 비교 (6행) ────────────────────────────────────────

const MOCK_SEGMENT_KPI = [
  { segment: '전체', signup: 10000, diary: 52.0, match: 38.0, exchange: 21.0, chat: 8.9 },
  { segment: '남성',  signup: 5200,  diary: 48.5, match: 35.2, exchange: 18.8, chat: 7.9 },
  { segment: '여성',  signup: 4800,  diary: 55.8, match: 41.2, exchange: 23.5, chat: 9.5 },
  { segment: '20대',  signup: 3800,  diary: 58.2, match: 43.0, exchange: 25.1, chat: 10.8 },
  { segment: '30대',  signup: 4200,  diary: 54.1, match: 40.5, exchange: 23.2, chat: 9.6 },
  { segment: '40대+', signup: 2000,  diary: 41.5, match: 28.0, exchange: 14.2, chat: 6.1 },
];

// ─── 색 팔레트 ───────────────────────────────────────────────────────────────

const COLORS = {
  total: '#3b82f6',    // 파란
  male: '#3b82f6',     // 파란
  female: '#ec4899',   // 분홍
  age20: '#f59e0b',    // 황
  age30: '#10b981',    // 초록
  age40: '#8b5cf6',    // 보라
  top: '#f59e0b',      // Top 세그먼트 (20대 기준)
};

// ─── 회복률 색 ───────────────────────────────────────────────────────────────

function recoveryColor(pct: number) {
  if (pct >= 50) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

// ─── 페이지 컴포넌트 ─────────────────────────────────────────────────────────

export default function FunnelDeepPage() {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [segment, setSegment] = useState<SegmentFilter>('all');

  const handleRefresh = () => toast.success('데이터를 새로고침했습니다.');
  const handleExport = () => toast.success('퍼널 심화 분석 리포트를 다운로드합니다.');

  // KM D7 / D30 생존율 (period, segment 필터 변동에 따라 미세 조정)
  const periodMult = period === '7d' ? 1.05 : period === '30d' ? 1.0 : 0.95;
  const segMult = segment === 'female' ? 1.08 : segment === 'male' ? 0.95 : 1.0;

  const d7Total  = parseFloat((MOCK_KM_DATA.find(d => d.day === 6)!.total  * periodMult * segMult).toFixed(2));
  const d30Total = parseFloat((MOCK_KM_DATA.find(d => d.day === 30)!.total * periodMult * segMult).toFixed(2));
  const avgLifecycle = parseFloat((18.4 * periodMult * segMult).toFixed(1));
  const topConversion = parseFloat((27.1 * periodMult).toFixed(1));

  // KM 라인 표시 필터링
  const showMale   = segment === 'all' || segment === 'male';
  const showFemale = segment === 'all' || segment === 'female';
  const showTotal  = segment === 'all' || segment === '20s' || segment === '30s' || segment === '40s+';

  return (
    <div>
      {/* 1. PageHeader */}
      <PageHeader
        title="퍼널 심화 분석"
        description="세그먼트·기간·코호트별 퍼널 비교 + 생존 분석 (Kaplan-Meier)"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* 기간 토글 */}
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d', '30d', '90d'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors duration-short ${
                    period === p
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </button>
              ))}
            </div>

            {/* 세그먼트 셀렉터 */}
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value as SegmentFilter)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="all">전체</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
              <option value="20s">20대</option>
              <option value="30s">30대</option>
              <option value="40s+">40대+</option>
            </select>

            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              새로고침
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              다운로드
            </Button>
          </div>
        }
      />

      {/* 2. MockPageNotice */}
      <MockPageNotice
        description="GET /api/v2.2/admin/analytics/funnel-deep 연결 예정 (KM Survival + 멀티 코호트 비교)"
      />

      {/* 3. KPI 카드 4개 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="7일 생존율 (KM D7)"
          value={`${(d7Total * 100).toFixed(1)}%`}
          description="가입 후 7일차 활성 잔존율"
          icon={Heart}
          valueClassName="text-primary"
        />
        <KpiCard
          title="30일 생존율 (KM D30)"
          value={`${(d30Total * 100).toFixed(1)}%`}
          description="가입 후 30일차 활성 잔존율"
          icon={Activity}
          valueClassName="text-blue-500"
        />
        <KpiCard
          title="평균 생명주기"
          value={`${avgLifecycle}일`}
          description="중앙 생존 시간 (Median Survival)"
          icon={Clock}
        />
        <KpiCard
          title="Top 세그먼트 전환율"
          value={`${topConversion}%`}
          description="이번 주 가장 높은 세그먼트 (30대 여성)"
          icon={Crown}
          valueClassName="text-amber-500"
        />
      </div>

      {/* 4. Kaplan-Meier 생존 곡선 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Kaplan-Meier 생존 곡선 (가입 후 60일)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={MOCK_KM_DATA} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="day"
                stroke="#6b7280"
                fontSize={12}
                label={{ value: '가입 후 일수', position: 'insideBottomRight', offset: -8, fontSize: 11, fill: '#9ca3af' }}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                stroke="#6b7280"
                fontSize={12}
                label={{ value: '생존 확률', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#9ca3af' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${(value * 100).toFixed(1)}%`, name]}
                labelFormatter={(label: number) => `D+${label}`}
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {showTotal && (
                <Line
                  type="monotone"
                  dataKey="total"
                  name="전체"
                  stroke={COLORS.total}
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 2"
                />
              )}
              {showMale && (
                <Line
                  type="monotone"
                  dataKey="male"
                  name="남성"
                  stroke={COLORS.male}
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {showFemale && (
                <Line
                  type="monotone"
                  dataKey="female"
                  name="여성"
                  stroke={COLORS.female}
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            전체: 점선 (dash) — 남성: 파란 실선 — 여성: 분홍 실선
          </p>
        </CardContent>
      </Card>

      {/* 5. 세그먼트별 퍼널 비교 (Grouped BarChart) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>세그먼트별 퍼널 비교 (6단계 × 4그룹)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={MOCK_SEGMENT_FUNNEL} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="stage" stroke="#6b7280" fontSize={11} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
                formatter={(value: number) => [value.toLocaleString(), '']}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="전체"      fill={COLORS.total}  radius={[3, 3, 0, 0]} />
              <Bar dataKey="남성"      fill={COLORS.male}   radius={[3, 3, 0, 0]} fillOpacity={0.75} />
              <Bar dataKey="여성"      fill={COLORS.female} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Top세그먼트" fill={COLORS.top}  radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Top 세그먼트 = 30대 (이번 주 기준 가장 높은 전환율)
          </p>
        </CardContent>
      </Card>

      {/* 6. 보조 차트 2개 */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 6-1. 코호트별 퍼널 도달율 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">코호트별 퍼널 도달율 (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={MOCK_COHORT_REACH} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="cohort" stroke="#6b7280" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={10} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 11 }}
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="프로필" stroke={COLORS.total}  strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="일기"   stroke={COLORS.age20}  strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="매칭"   stroke={COLORS.age30}  strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="교환"   stroke={COLORS.female} strokeWidth={1.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="채팅"   stroke={COLORS.age40}  strokeWidth={1.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 6-2. 시간대별 이탈 패턴 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">시간대별 이탈 패턴 (00~23시)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={MOCK_HOURLY_DROP} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis
                  dataKey="hour"
                  stroke="#6b7280"
                  fontSize={9}
                  interval={2}
                  angle={-30}
                  textAnchor="end"
                  height={36}
                />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 11 }}
                  formatter={(value: number) => [`${value}건`, '이탈']}
                />
                <Bar dataKey="이탈수" fill={COLORS.female} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-1 text-xs text-muted-foreground text-center">
              00~04시 심야 이탈이 집중됨 — 푸시 알림 타이밍 최적화 필요
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 7. 이탈 사유 심화 분석 테이블 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>이탈 사유 심화 분석</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">단계</th>
                <th className="pb-2 pr-4 font-medium">이탈 사유</th>
                <th className="pb-2 pr-4 font-medium text-right">빈도</th>
                <th className="pb-2 pr-4 font-medium text-right">회복 후 전환율</th>
                <th className="pb-2 font-medium">권장 조치</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DROP_REASONS.map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors duration-short">
                  <td className="py-2.5 pr-4">
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {row.stage}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-foreground">{row.reason}</td>
                  <td className="py-2.5 pr-4 text-right font-mono-data tabular-nums">
                    {row.count.toLocaleString()}건
                  </td>
                  <td className={`py-2.5 pr-4 text-right font-mono-data tabular-nums font-semibold ${recoveryColor(row.recovery)}`}>
                    {row.recovery}%
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            * 회복 후 전환율: 이탈 후 재방문한 사용자가 해당 단계 이상 도달한 비율
          </p>
        </CardContent>
      </Card>

      {/* 8. 세그먼트별 KPI 비교 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>세그먼트별 KPI 비교</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">세그먼트</th>
                <th className="pb-2 pr-4 font-medium text-right">가입수</th>
                <th className="pb-2 pr-4 font-medium text-right">첫 일기 전환</th>
                <th className="pb-2 pr-4 font-medium text-right">매칭 전환</th>
                <th className="pb-2 pr-4 font-medium text-right">교환 전환</th>
                <th className="pb-2 font-medium text-right">채팅 전환</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SEGMENT_KPI.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors duration-short ${i === 0 ? 'font-semibold' : ''}`}
                >
                  <td className="py-2.5 pr-4">
                    <span
                      className="inline-block h-2 w-2 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          row.segment === '남성' ? COLORS.male :
                          row.segment === '여성' ? COLORS.female :
                          row.segment === '20대' ? COLORS.age20 :
                          row.segment === '30대' ? COLORS.age30 :
                          row.segment === '40대+' ? COLORS.age40 :
                          '#6b7280',
                      }}
                    />
                    {row.segment}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono-data tabular-nums">
                    {row.signup.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono-data tabular-nums text-blue-600 dark:text-blue-400">
                    {row.diary}%
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono-data tabular-nums text-violet-600 dark:text-violet-400">
                    {row.match}%
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono-data tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.exchange}%
                  </td>
                  <td className="py-2.5 text-right font-mono-data tabular-nums text-amber-600 dark:text-amber-400">
                    {row.chat}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
