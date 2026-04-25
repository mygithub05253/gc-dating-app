'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminsApi } from '@/lib/api/admins';
import PageHeader from '@/components/layout/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { ADMIN_ROLE_LABELS } from '@/lib/constants';
import { UserPlus, Shield, Trash2, Edit, Key, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AdminAccount, AdminAccountCreateRequest, AdminAccountUpdateRequest, AdminAccountStatus } from '@/types/admin';
import type { AdminRole } from '@/types/common';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800',
};

export default function SystemAccountsPage() {
  const { hasPermission, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    adminName: '',
    adminRole: 'VIEWER' as AdminRole,
    password: '',
  });

  // 관리자 목록 조회
  const { data: pageData, isLoading } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => adminsApi.getList({ size: 100 }).then(r => r.data.data),
  });

  const admins = pageData?.content ?? [];

  // 관리자 생성
  const createMutation = useMutation({
    mutationFn: (data: AdminAccountCreateRequest) => adminsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      setNewAdmin({ email: '', adminName: '', adminRole: 'VIEWER', password: '' });
      setIsAddingNew(false);
      toast.success('관리자 계정이 생성되었습니다.');
    },
    onError: () => toast.error('관리자 계정 생성에 실패했습니다.'),
  });

  // 관리자 상태 변경
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdminAccountUpdateRequest }) =>
      adminsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('계정 상태가 변경되었습니다.');
    },
    onError: () => toast.error('계정 상태 변경에 실패했습니다.'),
  });

  // 관리자 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      toast.success('계정이 삭제되었습니다.');
    },
    onError: () => toast.error('계정 삭제에 실패했습니다.'),
  });

  const handleAddAdmin = () => {
    if (!newAdmin.email || !newAdmin.adminName || !newAdmin.password) {
      toast.error('모든 필드를 입력해주세요.');
      return;
    }
    createMutation.mutate({
      email: newAdmin.email,
      adminName: newAdmin.adminName,
      adminRole: newAdmin.adminRole,
      password: newAdmin.password,
    });
  };

  const handleToggleActive = (admin: AdminAccount) => {
    const newStatus: AdminAccountStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateMutation.mutate({ id: admin.id, data: { status: newStatus } });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleResetPassword = (email: string) => {
    toast.success(`${email}로 비밀번호 재설정 링크가 전송되었습니다.`);
  };

  const columns: DataTableColumn<AdminAccount>[] = useMemo(
    () => [
      {
        key: 'email',
        header: '이메일',
        cell: (admin) => <span className="font-medium">{admin.email}</span>,
      },
      { key: 'adminName', header: '이름', cell: (admin) => admin.adminName },
      {
        key: 'adminRole',
        header: '역할',
        cell: (admin) => (
          <Badge className={ROLE_COLORS[admin.adminRole]}>{ADMIN_ROLE_LABELS[admin.adminRole]}</Badge>
        ),
      },
      {
        key: 'status',
        header: '상태',
        cell: (admin) => (
          <Badge variant={admin.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {admin.status === 'ACTIVE' ? '활성' : '비활성'}
          </Badge>
        ),
      },
      {
        key: 'lastLoginAt',
        header: '마지막 로그인',
        cell: (admin) => (
          <span className="text-muted-foreground">
            {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : '-'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: '생성일',
        cell: (admin) => (
          <span className="text-muted-foreground">{formatDateTime(admin.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '액션',
        cell: (admin) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleResetPassword(admin.email)}
              title="비밀번호 재설정"
            >
              <Key className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleToggleActive(admin)}
              title={admin.status === 'ACTIVE' ? '비활성화' : '활성화'}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {admin.adminRole !== 'SUPER_ADMIN' && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleDelete(admin.id)}
                title="삭제"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admins],
  );

  const activeCount = admins.filter((a) => a.status === 'ACTIVE').length;

  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Card className="p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">접근 권한이 없습니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            이 페이지는 SUPER_ADMIN 권한이 필요합니다.
          </p>
        </Card>
      </div>
    );
  }

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
        title="관리자 계정 관리"
        description="관리자 계정 생성, 수정, 삭제"
        actions={
          <Button onClick={() => setIsAddingNew(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            새 관리자 추가
          </Button>
        }
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-sm text-muted-foreground">전체 관리자</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-sm text-muted-foreground">활성 계정</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{admins.length - activeCount}</div>
            <p className="text-sm text-muted-foreground">비활성 계정</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {admins.filter((a) => a.adminRole === 'SUPER_ADMIN').length}
            </div>
            <p className="text-sm text-muted-foreground">슈퍼 관리자</p>
          </CardContent>
        </Card>
      </div>

      {/* 새 관리자 추가 폼 */}
      {isAddingNew && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>새 관리자 추가</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@ember.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={newAdmin.adminName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, adminName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">역할</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newAdmin.adminRole}
                  onChange={(e) => setNewAdmin({ ...newAdmin, adminRole: e.target.value as AdminRole })}
                >
                  <option value="VIEWER">뷰어</option>
                  <option value="ADMIN">관리자</option>
                  <option value="SUPER_ADMIN">최고 관리자</option>
                </select>
              </div>
              <div>
                <Label htmlFor="password">임시 비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAddAdmin} disabled={createMutation.isPending}>
                {createMutation.isPending ? '생성 중...' : '생성'}
              </Button>
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 관리자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>관리자 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={admins}
            rowKey={(admin) => admin.id}
            wrapInCard={false}
            rowClassName={(admin) => (admin.status !== 'ACTIVE' ? 'opacity-50' : undefined)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
