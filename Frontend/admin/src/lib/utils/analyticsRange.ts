/**
 * 분석 페이지 공통 — 기간 토글(7d / 30d / 90d) → API 파라미터 변환 헬퍼.
 *
 * 모든 분석 페이지 패턴:
 *   const [period, setPeriod] = useState<'7d'|'30d'|'90d'>('30d');
 *   const { startDate, endDate } = periodToDateRange(period);
 *   useXxx({ startDate, endDate });
 *
 * 기준 시각: KST 자정 (Date 객체 로컬). endDate=오늘, startDate=오늘 - N일.
 */

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export function periodToDays(period: AnalyticsPeriod): number {
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  return 90;
}

/** YYYY-MM-DD 포맷 (로컬 타임존 기준). */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 기간 → startDate(YYYY-MM-DD) + endDate(YYYY-MM-DD) */
export function periodToDateRange(period: AnalyticsPeriod): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - periodToDays(period));
  return {
    startDate: fmtDate(start),
    endDate: fmtDate(today),
  };
}

/** 기간 → startTs/endTs(ISO datetime) — AI 인사이트 등 Prometheus 메트릭용. */
export function periodToTimestampRange(period: AnalyticsPeriod): {
  startTs: string;
  endTs: string;
} {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - periodToDays(period));
  return {
    startTs: start.toISOString(),
    endTs: today.toISOString(),
  };
}
