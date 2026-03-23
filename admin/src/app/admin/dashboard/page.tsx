'use client';

import Link from 'next/link';
import { Users, MessageCircle, AlertTriangle, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import {
  LineChart,
  Line,
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
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <p className={`text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : '-'}{trend.value}% 전일 대비
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Mock data for charts
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
  const displayKPI = {
    dau: 1234,
    mau: 15678,
    newUsersToday: 89,
    matchesToday: 156,
    pendingReports: 12,
    activeExchanges: 432,
  };

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="Ember 서비스 현황을 한눈에 확인하세요"
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="일간 활성 사용자 (DAU)"
          value={displayKPI.dau}
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <KPICard
          title="오늘의 매칭"
          value={displayKPI.matchesToday}
          icon={Heart}
          description="새로운 매칭 성사"
        />
        <KPICard
          title="활성 교환일기"
          value={displayKPI.activeExchanges}
          icon={MessageCircle}
          description="진행 중인 교환일기"
        />
        <KPICard
          title="대기 중인 신고"
          value={displayKPI.pendingReports}
          icon={AlertTriangle}
          description="처리 필요"
        />
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>신규 가입자 추이 (최근 7일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#8b5cf6"
                  fill="#c4b5fd"
                  strokeWidth={2}
                  name="신규 가입자"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>매칭 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={matchingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {matchingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4">
              {matchingData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">빠른 작업</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/reports">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="font-medium">신고 처리</p>
                  <p className="text-sm text-muted-foreground">{displayKPI.pendingReports}건 대기 중</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-4 p-4">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">회원 관리</p>
                  <p className="text-sm text-muted-foreground">신규 가입 {displayKPI.newUsersToday}명</p>
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
