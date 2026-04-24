'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  FileText,
  Brain,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  Shield,
  MessageCircle,
  TrendingUp,
  Activity,
  Gift,
  BookOpen,
  Flag,
  Clock,
  Megaphone,
  FileQuestion,
  Scale,
  Sparkles,
  UserX,
  Ban,
  Phone,
  PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { Separator } from '@/components/ui/separator';

interface SubNavItem {
  title: string;
  href: string;
  requiredRole?: 'VIEWER' | 'ADMIN' | 'SUPER_ADMIN';
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: 'VIEWER' | 'ADMIN' | 'SUPER_ADMIN';
  subItems?: SubNavItem[];
}

const navItems: NavItem[] = [
  { title: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard },
  {
    title: '회원 관리',
    href: '/admin/members',
    icon: Users,
    subItems: [
      { title: '회원 목록', href: '/admin/members' },
      { title: '의심 계정 탐지', href: '/admin/members/suspicious' },
    ],
  },
  {
    title: '신고 관리',
    href: '/admin/reports',
    icon: AlertTriangle,
    requiredRole: 'ADMIN',
    subItems: [
      { title: '신고 목록', href: '/admin/reports' },
      { title: '차단 이력', href: '/admin/reports/blocks' },
      { title: '외부 연락처 감지', href: '/admin/reports/contacts' },
      { title: '신고 패턴 분석', href: '/admin/reports/patterns' },
    ],
  },
  {
    title: '콘텐츠 관리',
    href: '/admin/content/topics',
    icon: FileText,
    requiredRole: 'ADMIN',
    subItems: [
      { title: '랜덤 주제 관리', href: '/admin/content/topics' },
      { title: '큐레이션 관리', href: '/admin/content/curations' },
      { title: '약관 관리', href: '/admin/content/terms' },
      { title: '약관 변경 이력', href: '/admin/content/terms/history', requiredRole: 'SUPER_ADMIN' },
      { title: '공지사항 관리', href: '/admin/content/notices' },
      { title: '금칙어 관리', href: '/admin/content/banned-words' },
      { title: '교환일기 가이드 관리', href: '/admin/content/exchange-guide' },
      { title: '예제 일기 관리', href: '/admin/content/examples' },
    ],
  },
  {
    title: 'AI 모니터링',
    href: '/admin/ai',
    icon: Brain,
    subItems: [
      { title: 'AI 성능 현황', href: '/admin/ai' },
      { title: 'AI 동의 통계', href: '/admin/ai/consent-stats' },
      { title: 'MQ / DLQ', href: '/admin/ai/mq' },
      { title: 'OutboxRelay', href: '/admin/ai/outbox' },
      { title: 'Redis 캐시', href: '/admin/ai/redis' },
      { title: '분석 상태 분포', href: '/admin/ai/analysis' },
      { title: 'A/B 테스트', href: '/admin/ai/ab-test' },
    ],
  },
  {
    title: '분석',
    href: '/admin/analytics/matching',
    icon: BarChart3,
    subItems: [
      { title: '매칭 분석', href: '/admin/analytics/matching' },
      { title: '리텐션 분석', href: '/admin/analytics/retention' },
      { title: '일기 패턴', href: '/admin/analytics/diaries' },
      { title: '퍼널 분석', href: '/admin/analytics/funnel' },
      { title: '이탈 생존분석 (KM)', href: '/admin/analytics/survival' },
      { title: '세그먼테이션 (RFM·K-Means)', href: '/admin/analytics/segmentation' },
      { title: '연관규칙 (Apriori)', href: '/admin/analytics/associations' },
      { title: '코호트 리텐션 매트릭스', href: '/admin/analytics/cohort' },
    ],
  },
  {
    title: '마케팅',
    href: '/admin/marketing/events',
    icon: Gift,
    requiredRole: 'ADMIN',
    subItems: [
      { title: '이벤트/프로모션', href: '/admin/marketing/events' },
    ],
  },
  {
    title: '시스템',
    href: '/admin/system',
    icon: Settings,
    requiredRole: 'ADMIN',
    subItems: [
      { title: '시스템 현황', href: '/admin/system' },
      { title: '관리자 계정', href: '/admin/system/accounts' },
      { title: '활동 로그', href: '/admin/system/logs' },
      { title: 'PII 접근 로그', href: '/admin/system/pii-logs', requiredRole: 'SUPER_ADMIN' },
      { title: '기능 플래그', href: '/admin/system/feature-flags' },
      { title: '배치 스케줄', href: '/admin/system/batch' },
    ],
  },
  {
    title: '고객지원',
    href: '/admin/support/inquiries',
    icon: HelpCircle,
    requiredRole: 'ADMIN',
    subItems: [
      { title: '문의 관리', href: '/admin/support/inquiries' },
      { title: '이의신청', href: '/admin/support/appeals' },
    ],
  },
  {
    title: '설정',
    href: '/admin/settings/account',
    icon: Settings,
    subItems: [
      { title: '내 계정', href: '/admin/settings/account' },
      { title: '비밀번호 변경', href: '/admin/settings/password' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand the item that matches current path
  const getActiveParent = () => {
    for (const item of navItems) {
      if (item.subItems) {
        for (const subItem of item.subItems) {
          if (pathname === subItem.href || pathname.startsWith(subItem.href + '/')) {
            return item.href;
          }
        }
      }
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return item.href;
      }
    }
    return null;
  };

  const toggleExpand = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  const isExpanded = (href: string) => {
    return expandedItems.includes(href) || getActiveParent() === href;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo — Ember Signal v1.0: Instrument Serif 브랜드 타입 */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/admin/dashboard" className="flex items-baseline gap-2">
          <span className="font-serif text-2xl italic text-primary leading-none">Ember</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admin
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          // 권한 체크
          if (item.requiredRole && !hasPermission(item.requiredRole)) {
            return null;
          }

          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const expanded = isExpanded(item.href);

          return (
            <div key={item.href}>
              {hasSubItems ? (
                // With submenu — active parent: 좌측 orange 막대 + accent 배경
                <>
                  <button
                    onClick={() => toggleExpand(item.href)}
                    className={cn(
                      'relative flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors duration-short',
                      isActive
                        ? 'bg-accent/60 text-foreground'
                        : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                    )}
                  >
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                      {item.title}
                    </div>
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {expanded && (
                    <div className="ml-5 mt-1 space-y-0.5 border-l border-border pl-3">
                      {item.subItems!.map((subItem) => {
                        // subItem 수준 권한 필터링
                        if (subItem.requiredRole && !hasPermission(subItem.requiredRole)) {
                          return null;
                        }
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              'block rounded-sm px-3 py-1.5 text-sm transition-colors duration-short',
                              isSubActive
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                            )}
                          >
                            {subItem.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                // Without submenu — active: 좌측 orange 막대 + accent 배경
                <Link
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-short',
                    isActive
                      ? 'bg-accent/60 text-foreground'
                      : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
                    />
                  )}
                  <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                  {item.title}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      <Separator />

      {/* User Info & Logout */}
      <div className="space-y-1 p-4">
        <div className="mb-2 px-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{user?.email}</p>
          <p className="text-xs">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className={cn(
            // Phase 2-C (2026-04-21): nav 아이템과 계층 일치. rounded-md + duration-short.
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-short',
            'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground',
          )}
        >
          <LogOut className="h-5 w-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
