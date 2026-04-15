'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Plus, Edit, Eye, History, FileText, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 약관 데이터
const MOCK_TERMS = [
  {
    id: 1,
    type: 'SERVICE',
    title: '서비스 이용약관',
    version: '2.1',
    status: 'ACTIVE',
    content: '제1조 (목적)\n본 약관은 Ember 교환일기 서비스의 이용에 관한...',
    effectiveDate: '2024-03-01T00:00:00',
    createdAt: '2024-02-25T10:00:00',
    updatedAt: '2024-02-28T15:30:00',
    updatedBy: '김관리',
    acceptCount: 45678,
  },
  {
    id: 2,
    type: 'PRIVACY',
    title: '개인정보 처리방침',
    version: '3.0',
    status: 'ACTIVE',
    content: '1. 개인정보의 수집 및 이용 목적\n회사는 다음의 목적을 위해...',
    effectiveDate: '2024-03-01T00:00:00',
    createdAt: '2024-02-25T10:00:00',
    updatedAt: '2024-02-28T15:30:00',
    updatedBy: '김관리',
    acceptCount: 45678,
  },
  {
    id: 3,
    type: 'LOCATION',
    title: '위치정보 이용약관',
    version: '1.2',
    status: 'ACTIVE',
    content: '제1조 (목적)\n본 약관은 위치정보의 보호 및 이용 등에 관한...',
    effectiveDate: '2024-01-15T00:00:00',
    createdAt: '2024-01-10T10:00:00',
    updatedAt: '2024-01-12T14:00:00',
    updatedBy: '이운영',
    acceptCount: 38901,
  },
  {
    id: 4,
    type: 'MARKETING',
    title: '마케팅 정보 수신 동의',
    version: '1.0',
    status: 'ACTIVE',
    content: '1. 마케팅 정보 수신\n이벤트, 프로모션 등의 정보를...',
    effectiveDate: '2024-01-01T00:00:00',
    createdAt: '2023-12-20T10:00:00',
    updatedAt: '2023-12-20T10:00:00',
    updatedBy: '김관리',
    acceptCount: 28456,
  },
  {
    id: 5,
    type: 'AI_ANALYSIS',
    title: 'AI 분석 동의',
    version: '1.1',
    status: 'ACTIVE',
    content: '1. AI 분석 항목\n일기 내용의 감정 분석, 키워드 추출...',
    effectiveDate: '2024-02-01T00:00:00',
    createdAt: '2024-01-28T10:00:00',
    updatedAt: '2024-01-30T11:00:00',
    updatedBy: '이운영',
    acceptCount: 41234,
  },
  {
    id: 6,
    type: 'SERVICE',
    title: '서비스 이용약관 (구버전)',
    version: '2.0',
    status: 'ARCHIVED',
    content: '제1조 (목적)\n본 약관은...',
    effectiveDate: '2024-01-01T00:00:00',
    createdAt: '2023-12-20T10:00:00',
    updatedAt: '2024-02-28T15:30:00',
    updatedBy: '김관리',
    acceptCount: 12345,
  },
];

// Mock 약관 버전 이력
const MOCK_TERM_HISTORY = [
  { version: '2.1', date: '2024-03-01', change: '교환일기 관련 조항 추가' },
  { version: '2.0', date: '2024-01-01', change: '매칭 서비스 관련 조항 신설' },
  { version: '1.5', date: '2023-10-01', change: '개인정보 처리 관련 조항 수정' },
  { version: '1.0', date: '2023-07-01', change: '최초 등록' },
];

const TYPE_LABELS: Record<string, string> = {
  SERVICE: '서비스 이용약관',
  PRIVACY: '개인정보 처리방침',
  LOCATION: '위치정보 이용약관',
  MARKETING: '마케팅 수신 동의',
  AI_ANALYSIS: 'AI 분석 동의',
};

const TYPE_COLORS: Record<string, string> = {
  SERVICE: 'bg-blue-100 text-blue-800',
  PRIVACY: 'bg-purple-100 text-purple-800',
  LOCATION: 'bg-green-100 text-green-800',
  MARKETING: 'bg-yellow-100 text-yellow-800',
  AI_ANALYSIS: 'bg-pink-100 text-pink-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  ARCHIVED: 'bg-orange-100 text-orange-800',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '적용중',
  DRAFT: '초안',
  ARCHIVED: '보관됨',
};

export default function TermsManagementPage() {
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

  const handleRefresh = () => {
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

  const activeTerms = MOCK_TERMS.filter(t => t.status === 'ACTIVE');

  return (
    <div>
      <PageHeader
        title="약관 관리"
        description="서비스 이용약관 및 개인정보 처리방침 관리"
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
            <div className="mt-1 text-2xl font-bold">{MOCK_TERMS.length}</div>
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
              {MOCK_TERMS.reduce((sum, t) => sum + t.acceptCount, 0).toLocaleString()}
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
              {MOCK_TERMS.filter(t => t.status === 'ARCHIVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms List */}
      <div className="grid gap-4">
        {MOCK_TERMS.map(term => (
          <Card key={term.id} className={term.status === 'ARCHIVED' ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{term.title}</h3>
                    <Badge className={TYPE_COLORS[term.type]}>
                      {TYPE_LABELS[term.type]}
                    </Badge>
                    <Badge className={STATUS_COLORS[term.status]}>
                      {STATUS_LABELS[term.status]}
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
              {MOCK_TERM_HISTORY.map((history, index) => (
                <div key={index} className="flex items-center gap-4 pb-3 border-b last:border-0">
                  <Badge variant="outline">v{history.version}</Badge>
                  <span className="text-sm text-muted-foreground">{history.date}</span>
                  <span className="text-sm flex-1">{history.change}</span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
