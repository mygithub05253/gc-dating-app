'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  useAdminBannersList,
  useCreateAdminBanner,
  useUpdateAdminBanner,
  useDeleteAdminBanner,
} from '@/hooks/useAdminBanners';
import type { BannerCreateRequest } from '@/lib/api/banners';
import type { Banner } from '@/types/content';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Image,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BannerFormData {
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
}

const INITIAL_FORM: BannerFormData = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  isActive: true,
  displayOrder: 1,
  startDate: '',
  endDate: '',
};

export default function BannersPage() {
  const { hasPermission } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerFormData>(INITIAL_FORM);

  const { data: pageData, isLoading, isError } = useAdminBannersList({});
  const createMutation = useCreateAdminBanner();
  const updateMutation = useUpdateAdminBanner();
  const deleteMutation = useDeleteAdminBanner();

  const banners: Banner[] = pageData?.content ?? [];

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM, displayOrder: banners.length + 1 });
    setShowForm(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
      startDate: banner.startDate.slice(0, 16),
      endDate: banner.endDate.slice(0, 16),
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      toast.error('제목과 이미지 URL을 입력해주세요.');
      return;
    }

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, body: form });
    } else {
      const body: BannerCreateRequest = {
        ...form,
        startDate: form.startDate || new Date().toISOString(),
        endDate: form.endDate || new Date().toISOString(),
      };
      createMutation.mutate(body);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return;
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (banner: Banner) => {
    updateMutation.mutate({
      id: banner.id,
      body: { isActive: !banner.isActive },
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-banners-list'] });
    toast.success('배너 목록을 새로고침했습니다.');
  };

  const activeCount = banners.filter((b) => b.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">배너 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">배너 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="배너 관리"
        description="앱 내 배너 등록 및 관리"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                새로고침
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                배너 등록
              </Button>
            </div>
          )
        }
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Image className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 배너</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{banners.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">활성 배너</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-muted-foreground">비활성 배너</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-500">{banners.length - activeCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && hasPermission('ADMIN') && (
        <Card className="mb-6 border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId !== null ? '배너 수정' : '배너 등록'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">제목</label>
                <Input
                  placeholder="배너 제목"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">표시 순서</label>
                <Input
                  type="number"
                  min={1}
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">이미지 URL</label>
              <Input
                placeholder="https://example.com/banner.jpg"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">링크 URL</label>
              <Input
                placeholder="/events/spring-2024 또는 https://..."
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">시작일</label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">종료일</label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                활성화
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                취소
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId !== null ? '수정 완료' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 배너 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>배너 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {banners.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                등록된 배너가 없습니다.
              </div>
            ) : (
              [...banners]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((banner) => (
                  <div
                    key={banner.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      banner.isActive ? '' : 'opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* 이미지 미리보기 */}
                      <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium">{banner.title}</h4>
                          <Badge
                            className={
                              banner.isActive
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground'
                            }
                          >
                            {banner.isActive ? '활성' : '비활성'}
                          </Badge>
                          <Badge variant="outline">순서 {banner.displayOrder}</Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{banner.linkUrl}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(banner.startDate)} ~ {formatDateTime(banner.endDate)}
                        </div>
                      </div>

                      {/* 액션 */}
                      {hasPermission('ADMIN') && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(banner)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                            title={banner.isActive ? '비활성화' : '활성화'}
                          >
                            {banner.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(banner)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                            title="수정"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner.id)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
