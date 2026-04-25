'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
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
  Loader2,
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

interface SystemService {
  name: string;
  description: string;
  status: string;
  uptime: string;
  lastCheck: string;
  responseTime: number;
  version?: string;
  port?: number;
  connections?: string;
  region?: string;
  usage?: string;
  memory?: string;
}

interface AiModel {
  name: string;
  status: string;
  memoryUsage: string;
  lastInference: string;
  avgLatency: number;
  requestsToday: number;
}

interface MetricsHistory {
  time: string;
  cpu: number;
  memory: number;
  requests: number;
  latency: number;
}

interface SystemIncident {
  id: number;
  type: string;
  service: string;
  message: string;
  occurredAt: string;
  resolvedAt: string | null;
}

interface ResourceUsage {
  cpuPercent: number;
  memoryUsed: string;
  memoryTotal: string;
  memoryPercent: number;
  diskUsed: string;
  diskTotal: string;
  diskPercent: number;
  networkUpMbps: number;
  networkDownMbps: number;
}

interface SystemStatusResponse {
  services: SystemService[];
  aiModels: AiModel[];
  metricsHistory: MetricsHistory[];
  incidents: SystemIncident[];
  resourceUsage: ResourceUsage;
}

export default function SystemPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<SystemStatusResponse>({
    queryKey: ['system-status'],
    queryFn: () => apiClient.get('/api/admin/system/status').then(r => r.data.data),
    refetchInterval: 30_000,
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetch().finally(() => {
      setIsRefreshing(false);
      toast.success('시스템 상태를 새로고침했습니다.');
    });
  };

  const services = data?.services ?? [];
  const aiModels = data?.aiModels ?? [];
  const metricsHistory = data?.metricsHistory ?? [];
  const incidents = data?.incidents ?? [];
  const resource = data?.resourceUsage;

  const allHealthy = services.length > 0 && services.every(s => s.status === 'HEALTHY');
  const healthyCount = services.filter(s => s.status === 'HEALTHY').length;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                  {healthyCount}/{services.length} 서비스 정상
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
            <div className="text-2xl font-bold">{resource?.cpuPercent ?? 0}%</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-all ${(resource?.cpuPercent ?? 0) > 80 ? 'bg-red-500' : (resource?.cpuPercent ?? 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${resource?.cpuPercent ?? 0}%` }}
              />
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
            <div className="text-2xl font-bold">{resource?.memoryUsed ?? '—'} / {resource?.memoryTotal ?? '—'}</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-all ${(resource?.memoryPercent ?? 0) > 80 ? 'bg-red-500' : (resource?.memoryPercent ?? 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${resource?.memoryPercent ?? 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{resource?.memoryPercent ?? 0}% 사용중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">디스크 사용량</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resource?.diskUsed ?? '—'} / {resource?.diskTotal ?? '—'}</div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className={`h-2 rounded-full transition-all ${(resource?.diskPercent ?? 0) > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${resource?.diskPercent ?? 0}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{resource?.diskPercent ?? 0}% 사용중</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">네트워크</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((resource?.networkUpMbps ?? 0) + (resource?.networkDownMbps ?? 0)).toFixed(0)} Mbps</div>
            <div className="flex gap-4 text-sm mt-2">
              <span className="text-green-600">↑ {resource?.networkUpMbps ?? 0} Mbps</span>
              <span className="text-blue-600">↓ {resource?.networkDownMbps ?? 0} Mbps</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      {metricsHistory.length > 0 && (
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
                <LineChart data={metricsHistory}>
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
                <AreaChart data={metricsHistory}>
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
      )}

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
            {services.map((service) => (
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
                  {service.version && (
                    <div>
                      <span className="text-muted-foreground">버전:</span>
                      <span className="ml-1 font-medium">v{service.version}</span>
                    </div>
                  )}
                  {service.connections && (
                    <div>
                      <span className="text-muted-foreground">연결:</span>
                      <span className="ml-1 font-medium">{service.connections}</span>
                    </div>
                  )}
                  {service.region && (
                    <div>
                      <span className="text-muted-foreground">리전:</span>
                      <span className="ml-1 font-medium">{service.region}</span>
                    </div>
                  )}
                  {service.usage && (
                    <div>
                      <span className="text-muted-foreground">사용량:</span>
                      <span className="ml-1 font-medium">{service.usage}</span>
                    </div>
                  )}
                  {service.memory && (
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
      {aiModels.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI 모델 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {aiModels.map((model) => (
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
      )}

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            최근 이벤트/장애 이력
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">최근 이벤트가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  {INCIDENT_ICONS[incident.type]}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{incident.service}</span>
                      <span className="text-sm text-muted-foreground">
                        {incident.occurredAt.split('T')[1]?.substring(0, 5)}
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
          )}
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
