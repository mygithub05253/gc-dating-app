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
import { useDiaryAssociationRules } from '@/hooks/useAnalytics';
import type { AssociationRule } from '@/types/analytics';
import {
  AlertCircle,
  ArrowRight,
  Database,
  Filter,
  GitBranch,
  Hash,
  Layers,
  Network,
  RefreshCw,
  Scissors,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

const ALL_TAG_TYPES = ['EMOTION', 'LIFESTYLE', 'TONE', 'RELATIONSHIP_STYLE'] as const;
type TagType = (typeof ALL_TAG_TYPES)[number];

// Lift 등급 → 색
function liftColor(lift: number): string {
  if (lift >= 3)   return '#ef4444'; // 매우 강한 연관
  if (lift >= 2)   return '#f97316';
  if (lift >= 1.5) return '#f59e0b';
  if (lift >= 1.2) return '#10b981';
  return '#94a3b8';
}

// 태그 string → 토큰 분리
function parseItem(item: string): { type: string; label: string } {
  const [type, label] = item.split(':');
  return { type, label: label ?? item };
}

// tagType 별 색
const TAG_COLOR: Record<string, string> = {
  EMOTION:            '#ec4899',
  LIFESTYLE:          '#3b82f6',
  TONE:               '#8b5cf6',
  RELATIONSHIP_STYLE: '#10b981',
};

function ItemChip({ item, className = '' }: { item: string; className?: string }) {
  const { type, label } = parseItem(item);
  const color = TAG_COLOR[type] ?? '#64748b';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
      style={{ borderColor: color + '60', color, backgroundColor: color + '12' }}
    >
      <span className="text-[9px] opacity-70">{type}</span>
      <span>{label}</span>
    </span>
  );
}

/**
 * Apriori 연관 규칙 마이닝 (B-4) — §3.16.
 *
 * 일기 태그 집합을 transaction 으로 보고 빈발 아이템셋과 연관 규칙을 도출.
 */
export default function AssociationsAnalyticsPage() {
  const [range, setRange] = useState(defaultRange(29));
  const [minSupport, setMinSupport] = useState(0.02);
  const [minConfidence, setMinConfidence] = useState(0.3);
  const [minLift, setMinLift] = useState(1.2);
  const [maxK, setMaxK] = useState<2 | 3>(3);
  const [tagTypes, setTagTypes] = useState<TagType[]>([...ALL_TAG_TYPES]);

  const { data, isLoading, isError, error, refetch, isFetching } = useDiaryAssociationRules({
    ...range,
    tagTypes,
    minSupport,
    minConfidence,
    minLift,
    maxItemsetSize: maxK,
  });

  const toggleTag = (t: TagType) => {
    setTagTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  // Scatter 데이터: support × confidence, size=lift
  const scatterData = useMemo(() => {
    if (!data) return [];
    return data.rules.map((r) => ({
      name: `${r.antecedent.join(',')} → ${r.consequent.join(',')}`,
      support: Number((r.support * 100).toFixed(2)),
      confidence: Number((r.confidence * 100).toFixed(2)),
      lift: Number(r.lift.toFixed(2)),
      count: r.count,
      fill: liftColor(r.lift),
    }));
  }, [data]);

  const topRules = data?.rules.slice(0, 10) ?? [];
  const topItemsets = useMemo(() => {
    if (!data) return [];
    return [...data.frequentItemsets]
      .sort((a, b) => b.support - a.support)
      .slice(0, 20);
  }, [data]);

  return (
    <div>
      <PageHeader
        title="일기 태그 연관규칙 마이닝 (Apriori)"
        description="support / confidence / lift 임계값을 만족하는 연관 규칙 — downward closure pruning 적용"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            재계산
          </Button>
        }
      />

      {/* Toolbar (2줄: 날짜+threshold, tagType toggle) */}
      <AnalyticsToolbar>
        <AnalyticsDateRangePicker value={range} onChange={setRange} />
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Label className="text-xs text-muted-foreground">min support</Label>
          <Input type="number" step="0.005" min={0.001} max={0.5}
            value={minSupport} onChange={(e) => setMinSupport(Number(e.target.value))}
            className="h-9 w-[80px]" />
          <Label className="text-xs text-muted-foreground">min confidence</Label>
          <Input type="number" step="0.05" min={0.05} max={0.99}
            value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="h-9 w-[80px]" />
          <Label className="text-xs text-muted-foreground">min lift</Label>
          <Input type="number" step="0.1" min={1.0} max={5.0}
            value={minLift} onChange={(e) => setMinLift(Number(e.target.value))}
            className="h-9 w-[80px]" />
          <Label className="text-xs text-muted-foreground">maxK</Label>
          <div className="flex gap-1">
            {[2, 3].map((v) => (
              <Button key={v} size="sm" variant={maxK === v ? 'default' : 'outline'} onClick={() => setMaxK(v as 2 | 3)}>
                {v}
              </Button>
            ))}
          </div>
        </div>
      </AnalyticsToolbar>

      {/* tagType filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">포함 tag_type:</span>
        {ALL_TAG_TYPES.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tagTypes.includes(t) ? 'default' : 'outline'}
            onClick={() => toggleTag(t)}
            className="h-7"
          >
            <span
              className="mr-1 h-2 w-2 rounded-full"
              style={{ backgroundColor: TAG_COLOR[t] }}
            />
            {t}
          </Button>
        ))}
      </div>

      {/* Meta bar */}
      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AnalyticsMetaBar
            algorithm={data.meta.algorithm}
            dataSourceVersion={data.meta.dataSourceVersion}
            kAnonymityMin={data.meta.kAnonymityMin}
          />
          <DegradedBadge degraded={!!data.meta.degraded} />
        </div>
      )}

      {/* KPI */}
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <KpiCard title="Transactions" value={data?.totalTransactions ?? 0} description="분석 대상 일기 수" icon={Database} />
        <KpiCard title="Unique Items" value={data?.totalItems ?? 0} description="distinct tag 조합" icon={Hash} />
        <KpiCard title="L1 · L2 · L3" value={data ? `${data.stats.l1Size}·${data.stats.l2Size}·${data.stats.l3Size}` : '-'}
          description="level 별 빈발 아이템셋 수" icon={Layers} valueClassName="text-primary" />
        <KpiCard title="Rules" value={data?.stats.ruleCount ?? 0} description={`lift ≥ ${minLift}`} icon={GitBranch}
          valueClassName="text-success" />
        <KpiCard title="Candidates pruned" value={data?.stats.candidatePruned ?? 0}
          description="downward closure 효율성" icon={Scissors} valueClassName="text-warning" />
      </div>

      {/* Loading/Error fallback */}
      {isLoading && <AnalyticsLoading height={300} />}
      {isError && <AnalyticsError message={(error as Error)?.message} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.rules.length === 0 && (
        <AnalyticsEmpty description="임계값을 만족하는 규칙이 없습니다. min support/confidence/lift 를 낮춰 보세요." />
      )}

      {data && data.rules.length > 0 && (
        <>
          {/* 상위 규칙 카드 (Rule Network 대체) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-4 w-4" /> Top 규칙 (lift 내림차순)
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                각 규칙 X → Y 의 좌측은 antecedent, 우측은 consequent. 색 = lift 등급.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topRules.map((r, i) => (
                  <RuleRow key={i} rule={r} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Support × Confidence scatter (lift=size) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" /> Support × Confidence × Lift
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  각 점 = 1개 규칙 · 크기·색 = lift · 우상단일수록 강한 규칙
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="support"
                      name="support"
                      unit="%"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      label={{ value: 'support (%)', position: 'insideBottom', offset: -4, fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="confidence"
                      name="confidence"
                      unit="%"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      label={{ value: 'confidence (%)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="lift" range={[40, 360]} name="lift" />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: unknown, name) => [String(value), String(name)]}
                      labelFormatter={() => ''}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Scatter name="규칙" data={scatterData} isAnimationActive={false}>
                      {scatterData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Frequent Itemsets TopN */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" /> Top 빈발 아이템셋
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  support 내림차순 상위 {topItemsets.length}개
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">|X|</TableHead>
                      <TableHead>itemset</TableHead>
                      <TableHead className="text-right w-[80px]">count</TableHead>
                      <TableHead className="text-right w-[80px]">support</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topItemsets.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono-data">{it.items.length}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {it.items.map((item) => (
                              <ItemChip key={item} item={item} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono-data">{it.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono-data text-primary">
                          {(it.support * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Full rules table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4" /> 전체 규칙 (최대 200건, lift 내림차순)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>antecedent</TableHead>
                      <TableHead>→</TableHead>
                      <TableHead>consequent</TableHead>
                      <TableHead className="text-right">count</TableHead>
                      <TableHead className="text-right">support</TableHead>
                      <TableHead className="text-right">confidence</TableHead>
                      <TableHead className="text-right">lift</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rules.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.antecedent.map((item) => (
                              <ItemChip key={item} item={item} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {r.consequent.map((item) => (
                              <ItemChip key={item} item={item} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-xs">{r.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono-data text-xs">
                          {(r.support * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono-data text-xs">
                          {(r.confidence * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell
                          className="text-right font-mono-data text-xs font-bold"
                          style={{ color: liftColor(r.lift) }}
                        >
                          {r.lift.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 알고리즘 노트 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> 알고리즘 노트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Apriori</strong> — 일기 1건 = transaction,
            태그(tag_type:label) = item. 빈발 아이템셋 + 연관 규칙 마이닝.
          </p>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs leading-relaxed">
            support(X)       = |{'{T : X ⊆ T}'}| / |D|<br />
            confidence(X→Y)  = support(X ∪ Y) / support(X)<br />
            lift(X→Y)        = confidence(X→Y) / support(Y)
          </div>
          <p>
            <strong className="text-foreground">Downward Closure Property</strong> —
            (k−1)-부분집합 중 하나라도 빈발하지 않으면 k-아이템셋은 절대 빈발할 수 없음.
            본 페이지 상단 <code className="text-xs">Candidates pruned</code> 지표가 이 가지치기로 제거된 후보 수.
          </p>
          <p>
            <strong className="text-foreground">구현 방식</strong> —
            순수 Java(<code className="text-xs">AprioriAlgorithm.java</code>), 외부 라이브러리(mlxtend 등) 없이 구현.
            후보 생성은 L_{'{k-1}'} prefix 공유 merge(O(|L_{'{k-1}'}|²)), 규칙 생성은 bitmask 로 모든 non-empty proper subset 열거.
            maxK ≤ 3 로 2^k 열거 비용 제한.
          </p>
          <p>
            <strong className="text-foreground">lift 해석</strong> — lift &gt; 1 양의 연관, = 1 독립, &lt; 1 음의 연관(상호 배제).
            포트폴리오 예시: <span className="text-primary">\"EMOTION:HAPPY ∧ LIFESTYLE:CAFE → TONE:PLAYFUL lift 2.1\"</span> 같은 인사이트 노출.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// 내부 컴포넌트
// =============================================================================

function RuleRow({ rule }: { rule: AssociationRule }) {
  const color = liftColor(rule.lift);
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-md border bg-card/60 p-3"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <div className="flex flex-wrap gap-1">
        {rule.antecedent.map((item) => (
          <ItemChip key={item} item={item} />
        ))}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-wrap gap-1">
        {rule.consequent.map((item) => (
          <ItemChip key={item} item={item} />
        ))}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
        <Badge variant="soft-muted" className="font-mono-data">
          sup {(rule.support * 100).toFixed(2)}%
        </Badge>
        <Badge variant="soft-muted" className="font-mono-data">
          conf {(rule.confidence * 100).toFixed(1)}%
        </Badge>
        <Badge
          className="font-mono-data font-bold text-white"
          style={{ backgroundColor: color }}
        >
          lift {rule.lift.toFixed(2)}
        </Badge>
      </div>
    </div>
  );
}
