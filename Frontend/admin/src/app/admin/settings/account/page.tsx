'use client';

// 관리자 내 계정 통합 페이지 — Phase 3B (AUTH-11).
// 프로필 조회·수정, 비밀번호 변경 링크, 활성 세션, 활동 로그를 한곳에서 관리한다.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  useAdminMe,
  useUpdateProfile,
  useAdminSessions,
  useTerminateSession,
  useAdminActivityLog,
} from '@/hooks/useAdminAccount';
import toast from 'react-hot-toast';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  } catch {
    return value;
  }
}

// ─── 프로필 카드 (조회 + 수정 토글) ─────────────────────────────────────────

function ProfileCard() {
  const { data: profile, isLoading } = useAdminMe();
  const updateProfile = useUpdateProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');

  useEffect(() => {
    if (profile && !editing) {
      setName(profile.name ?? '');
      setProfileImageUrl(profile.profileImageUrl ?? '');
    }
  }, [profile, editing]);

  if (isLoading) return <Card><CardContent className="p-6">불러오는 중…</CardContent></Card>;
  if (!profile) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      {
        name: name.trim() || undefined,
        profileImageUrl: profileImageUrl.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('프로필이 변경되었습니다');
          setEditing(false);
        },
        onError: () => toast.error('프로필 변경에 실패했습니다'),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>프로필</CardTitle>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            수정
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setName(profile.name ?? '');
              setProfileImageUrl(profile.profileImageUrl ?? '');
            }}
          >
            취소
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">이메일</label>
            <p className="font-medium">{profile.email}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">역할</label>
            <p>
              <Badge variant="outline">{profile.role}</Badge>
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">마지막 로그인</label>
            <p className="text-sm">{formatDate(profile.lastLoginAt)}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">최근 비밀번호 변경</label>
            <p className="text-sm">{formatDate(profile.passwordLastChangedAt)}</p>
          </div>
        </div>

        {!editing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">이름</label>
              <p className="font-medium">{profile.name}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">프로필 이미지 URL</label>
              <p className="break-all text-sm">
                {profile.profileImageUrl ?? <span className="text-muted-foreground">미설정</span>}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-sm font-medium">이름</label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="profile-image" className="text-sm font-medium">프로필 이미지 URL</label>
              <Input
                id="profile-image"
                type="url"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://..."
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">외부 URL 만 허용됩니다 (비워두면 미설정).</p>
            </div>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? '저장 중…' : '저장'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 비밀번호 변경 섹션 (기존 페이지 로직 재활용) ───────────────────────────

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{10,}$/;

function PasswordSection() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoutOtherSessions, setLogoutOtherSessions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다');
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.error('비밀번호는 영대소문자·숫자·특수문자 포함 10자 이상이어야 합니다');
      return;
    }
    if (currentPassword === newPassword) {
      toast.error('새 비밀번호가 현재 비밀번호와 동일합니다');
      return;
    }
    setIsLoading(true);
    try {
      const { authApi } = await import('@/lib/api/auth');
      await authApi.changePassword({ currentPassword, newPassword, logoutOtherSessions });
      toast.success('비밀번호가 변경되었습니다. 다시 로그인해 주세요');
      setTimeout(() => router.push('/admin/login'), 1500);
    } catch {
      toast.error('비밀번호 변경에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 변경</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">현재 비밀번호</label>
            <Input type="password" value={currentPassword}
                   onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">새 비밀번호</label>
            <Input type="password" value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   placeholder="영대소문자·숫자·특수문자 포함 10자 이상"
                   required autoComplete="new-password" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">새 비밀번호 확인</label>
            <Input type="password" value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input id="logoutOther" type="checkbox" checked={logoutOtherSessions}
                   onChange={(e) => setLogoutOtherSessions(e.target.checked)}
                   className="h-4 w-4 rounded border-gray-300 text-primary" />
            <label htmlFor="logoutOther" className="text-sm">다른 세션 모두 로그아웃</label>
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '변경 중…' : '비밀번호 변경'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── 활성 세션 섹션 ─────────────────────────────────────────────────────────

function SessionsSection() {
  const { data: sessions, isLoading, error } = useAdminSessions();
  const terminate = useTerminateSession();

  const handleTerminate = (sessionId: string) => {
    if (!window.confirm('해당 세션을 종료하시겠습니까?')) return;
    terminate.mutate(sessionId, {
      onSuccess: () => toast.success('세션을 종료했습니다'),
      onError: () => toast.error('세션 종료에 실패했습니다'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>활성 세션</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
        {error && <p className="text-sm text-destructive">세션을 불러오지 못했습니다.</p>}
        {!isLoading && !error && (
          sessions && sessions.length > 0 ? (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <li key={s.sessionId}
                    className="flex items-center justify-between rounded border border-border p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.device ?? '알 수 없는 디바이스'}</span>
                      {s.current && <Badge>현재 세션</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      IP {s.ipAddress ?? '-'} · 시작 {formatDate(s.issuedAt)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTerminate(s.sessionId)}
                    disabled={terminate.isPending}
                  >
                    종료
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">활성 세션이 없습니다.</p>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ─── 활동 로그 섹션 ─────────────────────────────────────────────────────────

function ActivityLogSection() {
  const { data, isLoading, error } = useAdminActivityLog(0, 20);

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동 로그</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">불러오는 중…</p>}
        {error && <p className="text-sm text-destructive">활동 로그를 불러오지 못했습니다.</p>}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">시각</th>
                  <th className="py-2">이벤트</th>
                  <th className="py-2">IP</th>
                  <th className="py-2">User-Agent</th>
                  <th className="py-2 text-right">결과</th>
                </tr>
              </thead>
              <tbody>
                {data?.content?.length ? (
                  data.content.map((log, idx) => (
                    <tr key={`${log.occurredAt}-${idx}`} className="border-b last:border-0">
                      <td className="py-2 text-xs text-muted-foreground">{formatDate(log.occurredAt)}</td>
                      <td className="py-2">
                        <Badge variant="outline">{log.actionType}</Badge>
                      </td>
                      <td className="py-2 font-mono-data text-xs">{log.ipAddress ?? '-'}</td>
                      <td className="py-2 text-xs text-muted-foreground truncate max-w-[220px]">
                        {log.userAgent ?? '-'}
                      </td>
                      <td className={`py-2 text-right text-xs ${log.success ? 'text-success' : 'text-destructive'}`}>
                        {log.success ? '성공' : '실패'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">
                      기록된 활동이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 페이지 본체 ────────────────────────────────────────────────────────────

export default function AdminAccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="내 계정"
        description="프로필·비밀번호·세션·활동 로그를 한곳에서 관리합니다."
      />

      <ProfileCard />
      <PasswordSection />
      <SessionsSection />
      <ActivityLogSection />

      <p className="pt-2 text-xs text-muted-foreground">
        기존 비밀번호 변경 전용 페이지는 <Link href="/admin/settings/password" className="underline">여기</Link>에서도 접근 가능합니다.
      </p>
    </div>
  );
}
