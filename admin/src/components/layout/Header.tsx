'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Search, AlertTriangle, CheckCircle, Info, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';

// Mock 알림 데이터
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'URGENT',
    title: '긴급: 신고 처리 필요',
    message: '대기 중인 신고가 5건 있습니다.',
    link: '/admin/reports',
    createdAt: '2024-03-23T10:30:00',
    isRead: false,
  },
  {
    id: 2,
    type: 'WARNING',
    title: '의심 계정 탐지',
    message: '새로운 의심 계정 3건이 탐지되었습니다.',
    link: '/admin/users/suspicious',
    createdAt: '2024-03-23T09:15:00',
    isRead: false,
  },
  {
    id: 3,
    type: 'INFO',
    title: '배치 작업 완료',
    message: '일일 매칭 알고리즘 실행이 완료되었습니다.',
    link: '/admin/system/batch',
    createdAt: '2024-03-23T03:00:00',
    isRead: true,
  },
  {
    id: 4,
    type: 'SUCCESS',
    title: 'A/B 테스트 결과',
    message: '매칭 알고리즘 V2 테스트에서 유의미한 결과가 나왔습니다.',
    link: '/admin/ai/ab-test',
    createdAt: '2024-03-22T18:00:00',
    isRead: true,
  },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  URGENT: <AlertTriangle className="h-4 w-4 text-red-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  SUCCESS: <CheckCircle className="h-4 w-4 text-green-500" />,
};

export default function Header() {
  const { user } = useAuthStore();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const handleMarkAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const handleDismiss = (notificationId: number) => {
    setNotifications(prev =>
      prev.filter(n => n.id !== notificationId)
    );
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="검색..."
            className="w-64 pl-9"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notification Center */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Notification Dropdown */}
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
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                    >
                      모두 읽음
                    </Button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      알림이 없습니다
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`relative border-b p-4 hover:bg-muted/50 ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                      >
                        <Link
                          href={notification.link}
                          onClick={() => {
                            handleMarkAsRead(notification.id);
                            setIsNotificationOpen(false);
                          }}
                          className="flex gap-3"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {TYPE_ICONS[notification.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(notification.createdAt)}
                            </p>
                          </div>
                        </Link>
                        <button
                          className="absolute right-2 top-2 p-1 hover:bg-muted rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(notification.id);
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t p-2">
                  <Link
                    href="/admin/system/logs"
                    onClick={() => setIsNotificationOpen(false)}
                    className="block w-full rounded p-2 text-center text-sm text-muted-foreground hover:bg-muted"
                  >
                    모든 활동 로그 보기
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
