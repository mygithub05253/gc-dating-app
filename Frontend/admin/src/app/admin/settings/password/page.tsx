'use client';

// 비밀번호 변경 페이지 — 현재 비밀번호 확인 후 새 비밀번호로 변경, 다른 세션 로그아웃 옵션 포함

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

// 비밀번호 강도 정규식: 영대문자 + 영소문자 + 숫자 + 특수문자, 10자 이상
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{10,}$/;

export default function PasswordChangePage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoutOtherSessions, setLogoutOtherSessions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 새 비밀번호 일치 확인
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다');
      return;
    }

    // 2. 비밀번호 강도 검사
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error('비밀번호는 영대소문자·숫자·특수문자 포함 10자 이상이어야 합니다');
      return;
    }

    // 3. 현재 비밀번호와 동일 여부 확인
    if (currentPassword === newPassword) {
      toast.error('새 비밀번호가 현재 비밀번호와 동일합니다. 다른 비밀번호를 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, logoutOtherSessions });
      toast.success('비밀번호가 변경되었습니다. 2초 후 대시보드로 이동합니다');
      setTimeout(() => router.push('/admin/dashboard'), 2000);
    } catch {
      toast.error('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="비밀번호 변경"
        description="현재 비밀번호를 확인 후 새 비밀번호로 변경합니다"
      />

      <div className="max-w-md">
        <Card>
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 현재 비밀번호 */}
              <div className="space-y-1.5">
                <label htmlFor="currentPassword" className="text-sm font-medium">
                  현재 비밀번호
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* 새 비밀번호 */}
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  새 비밀번호
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="영대소문자·숫자·특수문자 포함 10자 이상"
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* 새 비밀번호 확인 */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  새 비밀번호 확인
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                  autoComplete="new-password"
                />
              </div>

              {/* 다른 세션 로그아웃 체크박스 */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="logoutOtherSessions"
                  type="checkbox"
                  checked={logoutOtherSessions}
                  onChange={(e) => setLogoutOtherSessions(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                <label htmlFor="logoutOtherSessions" className="text-sm">
                  다른 세션 모두 로그아웃
                </label>
              </div>

              {/* 안내 문구 */}
              <p className="text-xs text-muted-foreground">
                비밀번호 변경 후 현재 세션은 유지되며, 다른 기기 세션은 즉시 로그아웃됩니다
              </p>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
