'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Activity,
  Zap,
  Cloud,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Wifi,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Mock 실시간 메트릭 데이터
const MOCK_METRICS_HISTORY = [
  { time: '10:00', cpu: 22, memory: 48, requests: 120, latency: 45 },
  { time: '10:05', cpu: 25, memory: 49, requests: 145, latency: 52 },
  { time: '10:10', cpu: 28, memory: 51, requests: 180, latency: 48 },
  { time: '10:15', cpu: 23, memory: 50, requests: 165, latency: 44 },
  { time: '10:20', cpu: 35, memory: 52, requests: 210, latency: 62 },
  { time: '10:25', cpu: 32, memory: 53, requests: 195, latency: 55 },
  { time: '10:30', cpu: 23, memory: 52, requests: 140, latency: 42 },
];

// Mock 서비스 상태 데이터
const MOCK_SERVICES = [
  {
    name: 'Spring Boot API',
    description: '메인 백엔드 서버',
    status: 'HEALTHY',
    uptime: '99.95%',
    lastCheck: '2024-03-23T10:30:00',
    responseTime: 45,
    version: '1.2.3',
    port: 8080,
  },
  {
    name: 'FastAPI AI Server',
    description: 'AI 분석 서버 (KoSimCSE, KcELECTRA)',
    status: 'HEALTHY',
    uptime: '99.8%',
    lastCheck: '2024-03-23T10:30:00',
    responseTime: 120,
    version: '0.5.1',
    port: 8000,
  },
  {
    name: 'Supabase PostgreSQL',
    description: 'Cloud PostgreSQL 데이터베이스',
    status: 'HEALTHY',
    uptime: '99.99%',
    lastCheck: '2024-03-23T10:30:00',
    responseTime: 12,
    region: 'ap-northeast-2',
    connections: '12/100',
  },
  {
    name: 'Supabase Storage',
    description: '파일 스토리지 (프로필 이미지)',
    status: 'HEALTHY',
    uptime: '99.9%',
    lastCheck: '2024-03-23T10:30:00',
    responseTime: 85,
    usage: '2.4 GB / 10 GB',
  },
  {
    name: 'Redis Cache',
    description: '세션 및 캐시 서버',
    status: 'HEALTHY',
    uptime: '99.95%',
    lastCheck: '2024-03-23T10:30:00',
    responseTime: 2,
    memory: '256 MB / 1 GB',
  },
  {
    name: 'FCM (Firebase)',
    description: '푸시 알림 서비스',
    status: 'HEALTHY',
    uptime: '99.9%',
    lastCheck: '2024-03-23T10:30:00',
    responseTime: 150,
  },
];

// Mock AI 모델 상태
const MOCK_AI_MODELS = [
  {
    name: 'KoSimCSE (매칭)',
    status: 'LOADED',
    memoryUsage: '1.2 GB',
    lastInference: '2024-03-23T10:29:55',
    avgLatency: 85,
    requestsToday: 12450,
  },
  {
    name: 'KcELECTRA (키워드)',
    status: 'LOADED',
    memoryUsage: '0.8 GB',
    lastInference: '2024-03-23T10:29:58',
    avgLatency: 45,
    requestsToday: 8920,
  },
  {
    name: 'Emotion Classifier',
    status: 'LOADED',
    memoryUsage: '0.5 GB',
    lastInference: '2024-03-23T10:29:50',
    avgLatency: 32,
    requestsToday: 15680,
  },
];

// Mock 최근 알림/장애 이력
const MOCK_INCIDENTS = [
  {
    id: 1,
    type: 'WARNING',
    service: 'FastAPI AI Server',
    message: 'GPU 메모리 사용량 80% 초과',
    occurredAt: '2024-03-23T09:45:00',
    resolvedAt: '2024-03-23T09:52:00',
  },
  {
    id: 2,
    type: 'INFO',
    service: 'Spring Boot API',
    message: '서버 재시작 완료 (업데이트)',
    occurredAt: '2024-03-23T03:00:00',
    resolvedAt: '2024-03-23T03:02:00',
  },
  {
    id: 3,
    type: 'ERROR',
    service: 'Supabase PostgreSQL',
    message: '연결 풀 일시적 포화',
    occurredAt: '2024-03-22T22:15:00',
    resolvedAt: '2024-03-22T22:18:00',
  },
];

const STATUS_COLORS: Record<string, string> = {
  HEALTHY: 'bg-green-100 text-green-800',
  DEGRADED: 'bg-yellow-100 text-yellow-800',
  UNHEALTHY: 'bg-red-100 text-red-800',
  LOADED: 'bg-green-100 text-green-800',
  LOADING: 'bg-yellow-100 text-yellow-800',
  ERROR: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  HEALTHY: '정상',
  DEGRADED: '성능 저하',
  UNHEALTHY: '장애',
  LOADED: '로드됨',
  LOADING: '로딩중',
  ERROR: '오류',
};

const INCIDENT_ICONS: Record<string, React.ReactNode> = {
  ERROR: <AlertTriangle className="h-4 w-4 text-red-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  INFO: <CheckCircle className="h-4 w-4 text-blue-500" />,
};

export default function SystemPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('시스템 상태를 새로고침했습니다.');
    }, 1000);
  };

  const allHealthy = MOCK_SERVICES.every(s => s.status === 'HEALTHY');
  const healthyCount = MOCK_SERVICES.filter(s => s.status === 'HEALTHY').length;

  return (
    <div>
      <PageHeader
        title="시스템 현황"
        description="서버 상태 및 인프라 모니터링 대시보드"
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        }
      />

      {/* Overall Status */}
      <Card className={`mb-6 ${allHealthy ? 'border-green-500' : 'border-yellow-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {allHealthy ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold">
                  {allHealthy ? '모든 시스템 정상 운영 중' : '일부 시스템 점검 필요'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {healthyCount}/{MOCK_SERVICES.length} 서비스 정상 | 마지막 점검: 2024-03-23 10:30:00
                </p>
              </div>
            </div>
            <Badge className={allHealthy ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {allHealthy ? '전체 정상' : '주의 필요'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Resource Usage */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU 사용량</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div className="h-2 w-[23%] rounded-full bg-green-500 transition-all" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">평균 (최근 1시간)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">메모리 사용량</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2 GB / 8 GB</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div className="h-2 w-[52%] rounded-full bg-yellow-500 transition-all" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">52% 사용중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">디스크 사용량</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45 GB / 100 GB</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div className="h-2 w-[45%] rounded-full bg-green-500 transition-all" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">45% 사용중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">네트워크</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245 Mbps</div>
            <div className="flex gap-4 text-sm mt-2">
              <span className="text-green-600">↑ 120 Mbps</span>
              <span className="text-blue-600">↓ 125 Mbps</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              리소스 사용 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={MOCK_METRICS_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="memory" name="Memory %" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              API 요청 및 응답시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_METRICS_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Area yAxisId="left" type="monotone" dataKey="requests" name="요청 수" stroke="#8b5cf6" fill="#c4b5fd" />
                <Line yAxisId="right" type="monotone" dataKey="latency" name="응답시간(ms)" stroke="#f59e0b" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Services Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            서비스 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {MOCK_SERVICES.map((service) => (
              <div
                key={service.name}
                className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        service.status === 'HEALTHY' ? 'bg-green-500' :
                        service.status === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <span className="font-medium">{service.name}</span>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[service.status]}>
                    {STATUS_LABELS[service.status]}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">가동률:</span>
                    <span className="ml-1 font-medium">{service.uptime}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">응답시간:</span>
                    <span className="ml-1 font-medium">{service.responseTime}ms</span>
                  </div>
                  {'version' in service && (
                    <div>
                      <span className="text-muted-foreground">버전:</span>
                      <span className="ml-1 font-medium">v{service.version}</span>
                    </div>
                  )}
                  {'connections' in service && (
                    <div>
                      <span className="text-muted-foreground">연결:</span>
                      <span className="ml-1 font-medium">{service.connections}</span>
                    </div>
                  )}
                  {'region' in service && (
                    <div>
                      <span className="text-muted-foreground">리전:</span>
                      <span className="ml-1 font-medium">{service.region}</span>
                    </div>
                  )}
                  {'usage' in service && (
                    <div>
                      <span className="text-muted-foreground">사용량:</span>
                      <span className="ml-1 font-medium">{service.usage}</span>
                    </div>
                  )}
                  {'memory' in service && (
                    <div>
                      <span className="text-muted-foreground">메모리:</span>
                      <span className="ml-1 font-medium">{service.memory}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Models Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI 모델 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {MOCK_AI_MODELS.map((model) => (
              <div key={model.name} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  <Badge className={STATUS_COLORS[model.status]}>
                    {STATUS_LABELS[model.status]}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">메모리 사용</span>
                    <span className="font-medium">{model.memoryUsage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">평균 응답시간</span>
                    <span className="font-medium">{model.avgLatency}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">오늘 요청 수</span>
                    <span className="font-medium">{model.requestsToday.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            최근 이벤트/장애 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_INCIDENTS.map((incident) => (
              <div
                key={incident.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                {INCIDENT_ICONS[incident.type]}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{incident.service}</span>
                    <span className="text-sm text-muted-foreground">
                      {incident.occurredAt.split('T')[1].substring(0, 5)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{incident.message}</p>
                </div>
                {incident.resolvedAt && (
                  <Badge variant="outline" className="text-green-600">
                    해결됨
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="link" className="text-sm">
              전체 이벤트 로그 보기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
