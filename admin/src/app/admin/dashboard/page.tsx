'use client';

import Link from 'next/link';
import {
  Users,
  UserPlus,
  Heart,
  Percent,
  BookOpen,
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
}

function KPICard({ title, value, description, icon: Icon, trend }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trend.isPositive ? '+' : '-'}{trend.value}% 전일 대비</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const signupData = [
  { date: '3/17', users: 65 },
  { date: '3/18', users: 78 },
  { date: '3/19', users: 82 },
  { date: '3/20', users: 70 },
  { date: '3/21', users: 95 },
  { date: '3/22', users: 89 },
  { date: '3/23', users: 102 },
];

const matchingData = [
  { name: '성공', value: 156, color: '#22c55e' },
  { name: '진행중', value: 89, color: '#3b82f6' },
  { name: '만료', value: 34, color: '#ef4444' },
];

export default function DashboardPage() {
  const kpi = {
    totalSignups: 15678,
    newSignupsToday: 102,
    activeMatching: 89,
    matchingSuccessRate: 72.4,
    diaryCountToday: 1243,
    exchangeDiaryCountToday: 432,
    churnRate7d: 8.3,
  };

  const pendingReports = 12;

  return (
    <div>
      <PageHeader title="대시보드" description="Ember 서비스 현황을 한눈에 확인하세요" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="누적 가입자" value={kpi.totalSignups} icon={Users} trend={{ value: 3.2, isPositive: true }} />
        <KPICard title="신규 가입자" value={kpi.newSignupsToday} icon={UserPlus} trend={{ value: 14.6, isPositive: true }} description="오늘" />
        <KPICard title="활성 매칭" value={kpi.activeMatching} icon={Heart} trend={{ value: 5.1, isPositive: true }} description="진행 중인 매칭" />
        <KPICard title="매칭 성공률" value={`${kpi.matchingSuccessRate}%`} icon={Percent} trend={{ value: 2.8, isPositive: true }} />
        <KPICard title="일기 작성 수" value={kpi.diaryCountToday} icon={BookOpen} trend={{ value: 8.4, isPositive: true }} description="오늘" />
        <KPICard title="교환일기 수" value={kpi.exchangeDiaryCountToday} icon={MessageCircle} trend={{ value: 11.2, isPositive: true }} description="오늘" />
        <KPICard title="7일 이탈률" value={`${kpi.churnRate7d}%`} icon={TrendingDown} trend={{ value: 1.5, isPositive: false }} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>신규 가입자 추이 (최근 7일)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="users" stroke="#8b5cf6" fill="#c4b5fd" strokeWidth={2} name="신규 가입자" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>매칭 현황</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={matchingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {matchingData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4">
              {matchingData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">빠른 작업</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/reports">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-medium">신고 처리</p>
                  <p className="text-sm text-muted-foreground">{pendingReports}건 대기 중</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/members">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-4">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">회원 관리</p>
                  <p className="text-sm text-muted-foreground">신규 가입 {kpi.newSignupsToday}명</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/content/topics">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-4">
                <MessageCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium">콘텐츠 관리</p>
                  <p className="text-sm text-muted-foreground">주제 및 큐레이션</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
