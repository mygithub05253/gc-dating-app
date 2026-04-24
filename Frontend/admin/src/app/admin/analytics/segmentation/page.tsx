'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import AnalyticsDateRangePicker, { defaultRange } from '@/components/common/AnalyticsDateRangePicker';
import {
  AnalyticsLoading,
  AnalyticsEmpty,
  AnalyticsError,
  AnalyticsMetaBar,
  AnalyticsToolbar,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { useUserSegmentation } from '@/hooks/useAnalytics';
import type { RfmSegmentLabel } from '@/types/analytics';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Cpu,
  Heart,
  RefreshCw,
  Sparkles,
  Target,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Method = 'RFM' | 'KMEANS' | 'BOTH';

// K-Means 클러스터 색상 (최대 k=10)
const CLUSTER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// RFM 세그먼트 색/아이콘 매핑
const RFM_STYLE: Record<RfmSegmentLabel, { color: string; icon: React.ComponentType<{ className?: string }>; tone: string; description: string }> = {
  CHAMPIONS:  { color: '#10b981', icon: BadgeCheck,   tone: 'text-success',    description: 'R·F·E 모두 상위' },
  LOYAL:      { color: '#3b82f6', icon: Heart,        tone: 'text-primary',    description: 'F·E 상위 (충성)' },
  PROMISING:  { color: '#06b6d4', icon: Sparkles,     tone: 'text-info',       description: 'R 상위 (최근 유입)' },
  AT_RISK:    { color: '#f59e0b', icon: AlertCircle,  tone: 'text-warning',    description: '과거엔 활발, 최근 이탈 조짐' },
  LOST:       { color: '#ef4444', icon: XCircle,      tone: 'text-destructive',description: '장기 비활동' },
};

/**
 * 사용자 세그먼테이션 (RFM Quintile + K-Means) — B-3 / §3.15.
 *
 * 2개 알고리즘 동시 시각화:
 *   - RFM Quintile: NTILE(5) 기반 R/F/E 점수 → 5 label 매핑
 *   - K-Means:      Z-score 정규화 + Lloyd + k-means++ (seed=42 고정)
 */
export default function SegmentationAnalyticsPage() {
  const [range, setRange] = useState(defaultRange(29));
  const [method, setMethod] = useState<Method>('BOTH');
  const [k, setK] = useState<number>(5);

  const { data, isLoading, isError, error, refetch, isFetching } = useUserSegmentation({
    ...range,
    method,
    k,
  });

  // RFM 차트 데이터
  const rfmChartData = useMemo(() => {
    if (!data?.rfm) return [];
    return data.rfm.segments.map((s) => ({
      name: s.label,
      users: s.userCount,
      share: s.share != null ? Number((s.share * 100).toFixed(1)) : 0,
      fill: RFM_STYLE[s.label].color,
    }));
  }, [data?.rfm]);

  // K-Means RadarChart 데이터 — feature 축 3개, 각 클러스터가 시리즈
  const radarData = useMemo(() => {
    if (!data?.kmeans) return [];
    const features: { key: string; label: string; index: number }[] = [
      { key: 'recency',    label: 'Recency (Z)',    index: 0 },
      { key: 'frequency',  label: 'Frequency (Z)',  index: 1 },
      { key: 'engagement', label: 'Engagement (Z)', index: 2 },
    ];
    return features.map((f) => {
      const row: Record<string, number | string> = { feature: f.label };
      data.kmeans!.clusters.forEach((c) => {
        row[`C${c.clusterId}`] = Number((c.centroidZ[f.index] ?? 0).toFixed(3));
      });
      return row;
    });
  }, [data?.kmeans]);

  // K-Means 클러스터 크기 BarChart 데이터
  const kmeansBarData = useMemo(() => {
    if (!data?.kmeans) return [];
    return data.kmeans.clusters.map((c) => ({
      name: `C${c.clusterId}`,
      users: c.userCount,
      share: c.share != null ? Number((c.share * 100).toFixed(1)) : 0,
      label: c.label,
      fill: CLUSTER_COLORS[c.clusterId % CLUSTER_COLORS.length],
    }));
  }, [data?.kmeans]);

  const showRfm = (method === 'RFM' || method === 'BOTH') && !!data?.rfm;
  const showKmeans = (method === 'KMEANS' || method === 'BOTH') && !!data?.kmeans;

  return (
    <div>
      <PageHeader
        title="사용자 세그먼테이션 (RFM + K-Means)"
        description="RFE(Recency·Frequency·Engagement) 이중 세그먼테이션 — 재현성 seed=42 고정"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            새로고침
          </Button>
        }
      />

      {/* Toolbar */}
      <AnalyticsToolbar>
        <AnalyticsDateRangePicker value={range} onChange={setRange} />
        <div className="flex items-center gap-2 ml-auto">
          <Label className="text-xs text-muted-foreground">Method</Label>
          <div className="flex gap-1">
            {(['BOTH', 'RFM', 'KMEANS'] as Method[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={method === m ? 'default' : 'outline'}
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <Label htmlFor="k" className="text-xs text-muted-foreground ml-2">
            k
          </Label>
          <Input
            id="k"
            type="number"
            min={2}
            max={10}
            value={k}
            onChange={(e) => setK(Number(e.target.value) || 5)}
            className="h-9 w-[70px]"
          />
        </div>
      </AnalyticsToolbar>

      {/* Meta bar */}
      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AnalyticsMetaBar
            algorithm={data.meta.algorithm}
            dataSourceVersion={data.meta.dataSourceVersion}
          />
          <DegradedBadge degraded={!!data.meta.degraded} />
          {data.kmeans && (
            <>
              <Badge variant={data.kmeans.converged ? 'success' : 'warning'}>
                {data.kmeans.converged ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <AlertCircle className="mr-1 h-3 w-3" />
                )}
                {data.kmeans.converged ? 'converged' : 'max-iter reached'}
              </Badge>
              <Badge variant="soft-muted" className="text-[11px]">
                iter {data.kmeans.iterations} · tol {data.kmeans.tolerance.toExponential(0)} · seed {data.kmeans.seed}
              </Badge>
            </>
          )}
        </div>
      )}

      {/* KPI */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard title="총 사용자" value={data?.totalUsers ?? 0} description="기간 내 활성 회원" icon={Users} />
        <KpiCard
          title="RFM 세그먼트"
          value={data?.rfm?.segments.length ?? 0}
          description="CHAMPIONS / LOYAL / PROMISING / AT_RISK / LOST"
          icon={Target}
        />
        <KpiCard
          title="K-Means 클러스터"
          value={data?.kmeans?.k ?? 0}
          description={data?.kmeans ? `${data.kmeans.iterations} iterations` : '-'}
          icon={Cpu}
        />
        <KpiCard
          title="Inertia (WCSS)"
          value={data?.kmeans ? data.kmeans.inertia.toFixed(1) : '-'}
          description="낮을수록 cluster tight — Elbow method 참조"
          icon={Activity}
          valueClassName="text-primary"
        />
      </div>

      {/* RFM Section */}
      {showRfm && data?.rfm && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">RFM Quintile 세그먼트</h2>
            <Badge variant="soft-primary" className="text-[11px]">
              NTILE(5) × label mapping
            </Badge>
          </div>

          {/* 세그먼트 카드 그리드 */}
          <div className="mb-4 grid gap-4 md:grid-cols-5">
            {data.rfm.segments.map((s) => {
              const style = RFM_STYLE[s.label];
              const Icon = style.icon;
              return (
                <Card key={s.label} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: style.color + '20' }}
                      >
                        <Icon className={`h-4 w-4 ${style.tone}`} />
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {s.label}
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-bold">{s.userCount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.share != null ? `${(s.share * 100).toFixed(1)}%` : '-'}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">{style.description}</p>
                    <div className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">avg R</span>
                        <span className="font-mono-data">{s.avgRecency != null ? s.avgRecency.toFixed(1) + 'd' : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">avg F</span>
                        <span className="font-mono-data">{s.avgFrequency != null ? s.avgFrequency.toFixed(1) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">avg E</span>
                        <span className="font-mono-data">{s.avgEngagement != null ? s.avgEngagement.toFixed(1) : '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* RFM Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">세그먼트별 사용자 분포</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={rfmChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: unknown, name) => {
                      if (name === 'users') return [(value as number).toLocaleString(), '사용자 수'];
                      if (name === 'share') return [`${value}%`, '점유율'];
                      return [String(value), name];
                    }}
                  />
                  <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                    {rfmChartData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>
      )}

      {/* K-Means Section */}
      {showKmeans && data?.kmeans && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">K-Means Clustering</h2>
            <Badge variant="soft-primary" className="text-[11px]">
              Lloyd + k-means++ · Z-score normalized
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Radar: cluster × feature(Z) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">클러스터 centroid (Z-score)</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  각 feature 의 표준화된 값 — 원점(0)이 평균
                </p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <AnalyticsLoading height={280} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="feature" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fontSize: 10 }} />
                      {data.kmeans.clusters.map((c) => (
                        <Radar
                          key={c.clusterId}
                          name={`C${c.clusterId} ${c.label}`}
                          dataKey={`C${c.clusterId}`}
                          stroke={CLUSTER_COLORS[c.clusterId % CLUSTER_COLORS.length]}
                          fill={CLUSTER_COLORS[c.clusterId % CLUSTER_COLORS.length]}
                          fillOpacity={0.2}
                          isAnimationActive={false}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 클러스터 크기 BarChart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">클러스터 크기</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  avgDistance: 클러스터 내 centroid 까지 평균 L2 거리
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kmeansBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={50} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: unknown, name, item) => {
                        if (name === 'users') {
                          const label = (item?.payload as { label?: string })?.label;
                          return [`${(value as number).toLocaleString()} (${label ?? ''})`, '사용자 수'];
                        }
                        return [String(value), name];
                      }}
                    />
                    <Bar dataKey="users" radius={[0, 4, 4, 0]}>
                      {kmeansBarData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cluster Detail Table */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">클러스터 상세</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>라벨</TableHead>
                    <TableHead className="text-right">사용자 수</TableHead>
                    <TableHead className="text-right">점유율</TableHead>
                    <TableHead className="text-right">avgDistance</TableHead>
                    <TableHead className="text-right">centroid Raw (R, F, E)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.kmeans.clusters.map((c) => (
                    <TableRow key={c.clusterId}>
                      <TableCell>
                        <div
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full font-mono-data text-xs font-bold text-white"
                          style={{ backgroundColor: CLUSTER_COLORS[c.clusterId % CLUSTER_COLORS.length] }}
                        >
                          {c.clusterId}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{c.label}</TableCell>
                      <TableCell className="text-right font-mono-data">{c.userCount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono-data">
                        {c.share != null ? `${(c.share * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono-data text-muted-foreground">
                        {c.avgDistance != null ? c.avgDistance.toFixed(3) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono-data text-muted-foreground text-xs">
                        [{c.centroidRaw.map((v) => v.toFixed(1)).join(', ')}]
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 로딩/에러/빈 상태 */}
      {isLoading && !data && <AnalyticsLoading height={400} />}
      {isError && (
        <AnalyticsError message={(error as Error)?.message} onRetry={() => refetch()} />
      )}
      {!isLoading && !isError && data && data.totalUsers === 0 && (
        <AnalyticsEmpty description="해당 기간에 활성 사용자가 없습니다." />
      )}

      {/* 알고리즘 노트 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            알고리즘 노트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">RFM Quintile</strong> —
            R(최근성, 일수 역순)·F(빈도, 일기 수)·E(참여도, 교환×2 + 완료일기) 3축.
            각 축을 NTILE(5) 로 1~5 점수화 후 조합 규칙으로 5개 라벨 매핑.
          </div>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            CHAMPIONS: R≥4 AND F≥4 AND E≥4<br />
            LOYAL:     F≥4 AND E≥3 (CHAMPIONS 제외)<br />
            PROMISING: R≥4 (위 둘 제외)<br />
            AT_RISK:   R∈{'{2,3}'} AND F≥3<br />
            LOST:      그 외
          </div>
          <div>
            <strong className="text-foreground">K-Means (Lloyd + k-means++)</strong> —
            Z-score 정규화 후 k-means++ 초기화로 locally optimal seed 확보.
            Lloyd iteration(assignment → centroid update)을 tolerance(1e-4) 또는 max-iter(50) 까지.
            재현성 위해 <code className="text-xs">seed=42</code> 고정.
          </div>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs">
            Inertia (WCSS) = Σ ||x_i − μ_{'{cluster(i)}'}||²<br />
            (작을수록 cluster tight — Elbow method 로 적정 k 판단)
          </div>
          <div>
            <strong className="text-foreground">구현 방식</strong> —
            RFE 원천은 PostgreSQL CTE(<code className="text-xs">diary_activity + exchange_activity</code>) 로
            user × (recency_days, frequency, engagement) 벡터 추출.
            K-Means 는 순수 Java(<code className="text-xs">KMeansAlgorithm.java</code>)로 외부 라이브러리 없이 구현.
            빈 클러스터 방어 — 가장 먼 포인트를 승격(farthest point heuristic).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
