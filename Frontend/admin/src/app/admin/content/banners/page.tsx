'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Image,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 배너 데이터
type MockBanner = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  displayOrder: number;
  startDate: string;
  endDate: string;
  createdAt: string;
};

const MOCK_BANNERS: MockBanner[] = [
  {
    id: 1,
    title: '봄맞이 교환일기 이벤트',
    imageUrl: 'https://example.com/banner1.jpg',
    linkUrl: '/events/spring-2024',
    isActive: true,
    displayOrder: 1,
    startDate: '2024-03-01T00:00:00',
    endDate: '2024-03-31T23:59:59',
    createdAt: '2024-02-28T10:00:00',
  },
  {
    id: 2,
    title: '신규 회원 환영 배너',
    imageUrl: 'https://example.com/banner2.jpg',
    linkUrl: '/welcome',
    isActive: true,
    displayOrder: 2,
    startDate: '2024-01-01T00:00:00',
    endDate: '2024-12-31T23:59:59',
    createdAt: '2024-01-01T10:00:00',
  },
  {
    id: 3,
    title: '시스템 점검 안내',
    imageUrl: 'https://example.com/banner3.jpg',
    linkUrl: '/notices/3',
    isActive: false,
    displayOrder: 3,
    startDate: '2024-03-25T00:00:00',
    endDate: '2024-03-25T06:00:00',
    createdAt: '2024-03-22T15:00:00',
  },
  {
    id: 4,
    title: 'AI 매칭 업데이트 알림',
    imageUrl: 'https://example.com/banner4.jpg',
    linkUrl: '/notices/5',
    isActive: true,
    displayOrder: 4,
    startDate: '2024-03-15T00:00:00',
    endDate: '2024-04-15T23:59:59',
    createdAt: '2024-03-14T09:00:00',
  },
];

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
  const [banners, setBanners] = useState<MockBanner[]>(MOCK_BANNERS);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerFormData>(INITIAL_FORM);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...INITIAL_FORM, displayOrder: banners.length + 1 });
    setShowForm(true);
  };

  const openEdit = (banner: MockBanner) => {
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
    const now = new Date().toISOString();

    if (editingId !== null) {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === editingId ? { ...b, ...form, startDate: form.startDate || b.startDate, endDate: form.endDate || b.endDate } : b,
        ),
      );
      toast.success('배너가 수정되었습니다.');
    } else {
      const newBanner: MockBanner = {
        id: Math.max(0, ...banners.map((b) => b.id)) + 1,
        ...form,
        startDate: form.startDate || now,
        endDate: form.endDate || now,
        createdAt: now,
      };
      setBanners((prev) => [...prev, newBanner]);
      toast.success('배너가 등록되었습니다.');
    }
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
  };

  const handleDelete = (id: number) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return;
    setBanners((prev) => prev.filter((b) => b.id !== id));
    toast.success('배너가 삭제되었습니다.');
  };

  const handleToggleActive = (id: number) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)),
    );
    const target = banners.find((b) => b.id === id);
    toast.success(target?.isActive ? '배너가 비활성화되었습니다.' : '배너가 활성화되었습니다.');
  };

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <div>
      <PageHeader
        title="배너 관리"
        description="앱 내 배너 등록 및 관리"
        actions={
          hasPermission('ADMIN') && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success('배너 목록을 새로고침했습니다.')}>
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

      <MockPageNotice message="배너 도메인 백엔드 API 준비 중입니다. 현재는 Mock 데이터로 화면 흐름만 검증됩니다." />

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
              <Button onClick={handleSave}>
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
              banners
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
                            onClick={() => handleToggleActive(banner.id)}
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
