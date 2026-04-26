'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { TERMS_TYPE_LABELS, TERMS_STATUS_LABELS } from '@/lib/constants';
import { RefreshCw, Plus, Edit, Eye, History, FileText, Shield, Users, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminTermsList, useAdminTermsHistory } from '@/hooks/useAdminTerms';
import type { Terms, TermsVersionHistory } from '@/types/content';
import { useQueryClient } from '@tanstack/react-query';

const TYPE_COLORS: Record<string, string> = {
  USER_TERMS: 'bg-blue-100 text-blue-800',
  AI_TERMS: 'bg-pink-100 text-pink-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  ARCHIVED: 'bg-orange-100 text-orange-800',
};

export default function TermsManagementPage() {
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

  const { data: pageData, isLoading, isError } = useAdminTermsList({});
  const { data: historyData } = useAdminTermsHistory();

  const terms: Terms[] = pageData?.content ?? [];
  const termHistory: TermsVersionHistory[] = historyData?.content ?? (Array.isArray(historyData) ? historyData : []);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-terms-list'] });
    queryClient.invalidateQueries({ queryKey: ['admin-terms-history'] });
    toast.success('약관 목록을 새로고침했습니다.');
  };

  const handleAddTerm = () => {
    toast.success('새 약관 작성 모달이 열립니다.');
  };

  const handleEdit = (termId: number) => {
    toast.success('약관 수정 모달이 열립니다.');
  };

  const handleViewHistory = (termId: number) => {
    setSelectedTerm(termId);
    toast.success('버전 이력을 조회합니다.');
  };

  const activeTerms = terms.filter(t => t.status === 'ACTIVE');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">약관 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="mt-2">약관 목록을 불러오는데 실패했습니다.</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="약관 관리"
        description="서비스 이용 약관(USER_TERMS) 및 AI 분석 동의(AI_TERMS) 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleAddTerm}>
              <Plus className="mr-2 h-4 w-4" />
              약관 추가
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 약관</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{terms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">적용중</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">{activeTerms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">총 동의 수</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {terms.reduce((sum, t) => sum + t.acceptCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">보관된 버전</span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              {terms.filter(t => t.status === 'ARCHIVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms List */}
      <div className="grid gap-4">
        {terms.map(term => (
          <Card key={term.id} className={term.status === 'ARCHIVED' ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{term.title}</h3>
                    <Badge className={TYPE_COLORS[term.type]}>
                      {TERMS_TYPE_LABELS[term.type]}
                    </Badge>
                    <Badge className={STATUS_COLORS[term.status]}>
                      {TERMS_STATUS_LABELS[term.status]}
                    </Badge>
                    <Badge variant="outline">v{term.version}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {term.content}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm" onClick={() => handleViewHistory(term.id)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(term.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">시행일</span>
                  <p className="font-medium mt-1">{formatDateTime(term.effectiveDate).split(' ')[0]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">동의 수</span>
                  <p className="font-medium mt-1">{term.acceptCount.toLocaleString()}명</p>
                </div>
                <div>
                  <span className="text-muted-foreground">최종 수정</span>
                  <p className="font-medium mt-1">{formatDateTime(term.updatedAt)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">수정자</span>
                  <p className="font-medium mt-1">{term.updatedBy}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Version History Section */}
      {selectedTerm && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">버전 이력</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {termHistory.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  버전 이력이 없습니다.
                </div>
              ) : (
                termHistory.map((history, index) => (
                  <div key={index} className="flex items-center gap-4 pb-3 border-b last:border-0">
                    <Badge variant="outline">v{history.version}</Badge>
                    <span className="text-sm text-muted-foreground">{history.date}</span>
                    <span className="text-sm flex-1">{history.change}</span>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
