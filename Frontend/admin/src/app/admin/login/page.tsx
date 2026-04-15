'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// Mock 계정 정보
const MOCK_ACCOUNTS = [
  { email: 'super@ember.com', password: 'admin123', role: 'SUPER_ADMIN' as const, adminId: 1 },
  { email: 'admin@ember.com', password: 'admin123', role: 'ADMIN' as const, adminId: 2 },
  { email: 'viewer@ember.com', password: 'admin123', role: 'VIEWER' as const, adminId: 3 },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    // Mock 로그인 처리
    await new Promise((resolve) => setTimeout(resolve, 500)); // 로딩 시뮬레이션

    const account = MOCK_ACCOUNTS.find(
      (acc) => acc.email === email && acc.password === password
    );

    if (account) {
      const mockToken = `mock-token-${account.role}-${Date.now()}`;
      login(mockToken, `refresh-${mockToken}`, {
        adminId: account.adminId,
        email: account.email,
        role: account.role,
      });
      toast.success(`${account.role} 로그인 성공`);
      router.push('/admin/dashboard');
    } else {
      toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Ember Admin</CardTitle>
          <CardDescription>관리자 계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ember.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          {/* Mock 계정 안내 */}
          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="mb-2 text-sm font-medium">테스트 계정 (비밀번호: admin123)</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• super@ember.com (SUPER_ADMIN)</p>
              <p>• admin@ember.com (ADMIN)</p>
              <p>• viewer@ember.com (VIEWER)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
