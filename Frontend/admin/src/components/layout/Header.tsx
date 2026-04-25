'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Search, AlertTriangle, AlertCircle, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import ThemeToggle from '@/components/layout/ThemeToggle';
import {
  useAdminInboxList,
  useAdminInboxUnreadCount,
  useMarkAdminInboxRead,
} from '@/hooks/useAdminInbox';
import type { NotificationType } from '@/types/inbox';

// BE 타입(CRITICAL/WARN/INFO)에 맞춘 아이콘 매핑
const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  CRITICAL: <AlertTriangle className="h-4 w-4 text-destructive" />,
  WARN: <AlertCircle className="h-4 w-4 text-warning" />,
  INFO: <Info className="h-4 w-4 text-info" />,
};

const TYPE_LABEL: Record<NotificationType, string> = {
  CRITICAL: '긴급',
  WARN: '경고',
  INFO: '정보',
};

export default function Header() {
  const { user } = useAuthStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // 드롭다운에는 최근 5건만, 뱃지는 별도 폴링 쿼리로 가벼운 응답
  const { data: list } = useAdminInboxList({ size: 5 });
  const { data: unreadCount = 0 } = useAdminInboxUnreadCount();
  const markAsRead = useMarkAdminInboxRead();

  const recentNotifications = list?.items ?? [];

  const getInitials = (email: string) => email.substring(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="검색..." className="w-64 pl-9" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle (Ember Signal v1.0) */}
        <ThemeToggle />

        {/* Notification Center (BE: AdminInbox API, 명세 v2.3 §11.2) */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            aria-label="알림 센터"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          {isNotificationOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotificationOpen(false)}
              />

              {/* Dropdown Panel */}
              <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border bg-card shadow-lg">
                <div className="flex items-center justify-between border-b p-4">
                  <h3 className="font-semibold">알림 센터</h3>
                  <span className="text-xs text-muted-foreground">
                    미읽음 {unreadCount}건
                  </span>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {recentNotifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      알림이 없습니다
                    </div>
                  ) : (
                    recentNotifications.map((notification) => {
                      const isUnread = notification.status === 'UNREAD';
                      const targetUrl = notification.actionUrl || '/admin/notifications';
                      return (
                        <div
                          key={notification.id}
                          className={`relative border-b p-4 hover:bg-muted/50 ${
                            isUnread ? 'bg-accent/40' : ''
                          }`}
                        >
                          <Link
                            href={targetUrl}
                            onClick={() => {
                              if (isUnread) {
                                markAsRead.mutate(notification.id);
                              }
                              setIsNotificationOpen(false);
                            }}
                            className="flex gap-3"
                          >
                            <div className="mt-0.5 flex-shrink-0">
                              {TYPE_ICONS[notification.notificationType]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className={`text-sm font-medium ${
                                    isUnread ? 'text-foreground' : 'text-muted-foreground'
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                {isUnread && (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                                <span className="ml-auto text-[10px] text-muted-foreground">
                                  {TYPE_LABEL[notification.notificationType]}
                                </span>
                              </div>
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {notification.message}
                              </p>
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(notification.createdAt)}
                              </p>
                            </div>
                          </Link>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t p-2">
                  <Link
                    href="/admin/notifications"
                    onClick={() => setIsNotificationOpen(false)}
                    className="block w-full rounded p-2 text-center text-sm text-primary hover:bg-muted"
                  >
                    알림 센터 전체 보기
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.email ? getInitials(user.email) : 'AD'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-sm md:block">
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
