'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { MessageSquare, Clock, CheckCircle, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 문의 데이터
const MOCK_INQUIRIES = [
  {
    id: 1,
    userId: 5,
    userNickname: '별빛소녀',
    userEmail: 'star@example.com',
    category: 'ACCOUNT',
    title: '비밀번호 변경이 안 됩니다',
    content: '비밀번호 변경을 시도했는데 계속 오류가 발생합니다. 확인 부탁드립니다.',
    status: 'PENDING',
    createdAt: '2024-03-22T10:30:00',
    repliedAt: null,
    reply: null,
  },
  {
    id: 2,
    userId: 8,
    userNickname: '달빛청년',
    userEmail: 'moon@example.com',
    category: 'MATCHING',
    title: '매칭이 안 되고 있어요',
    content: '일주일째 새로운 매칭이 없습니다. 시스템에 문제가 있는 건가요?',
    status: 'IN_PROGRESS',
    createdAt: '2024-03-21T14:00:00',
    repliedAt: null,
    reply: null,
  },
  {
    id: 3,
    userId: 12,
    userNickname: '햇살가득',
    userEmail: 'sun@example.com',
    category: 'PAYMENT',
    title: '환불 요청드립니다',
    content: '프리미엄 결제했는데 취소하고 싶습니다. 환불 가능할까요?',
    status: 'RESOLVED',
    createdAt: '2024-03-20T09:00:00',
    repliedAt: '2024-03-20T11:30:00',
    reply: '안녕하세요. 환불이 완료되었습니다. 3-5 영업일 내에 계좌로 입금될 예정입니다.',
  },
  {
    id: 4,
    userId: 15,
    userNickname: '구름위의아이',
    userEmail: 'cloud@example.com',
    category: 'BUG',
    title: '앱이 자꾸 종료됩니다',
    content: '일기 작성 중에 앱이 갑자기 종료되는 현상이 반복됩니다.',
    status: 'PENDING',
    createdAt: '2024-03-22T08:00:00',
    repliedAt: null,
    reply: null,
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  ACCOUNT: '계정',
  MATCHING: '매칭',
  PAYMENT: '결제',
  BUG: '버그',
  FEATURE: '기능 요청',
  OTHER: '기타',
};

const CATEGORY_COLORS: Record<string, string> = {
  ACCOUNT: 'bg-blue-100 text-blue-800',
  MATCHING: 'bg-pink-100 text-pink-800',
  PAYMENT: 'bg-green-100 text-green-800',
  BUG: 'bg-red-100 text-red-800',
  FEATURE: 'bg-purple-100 text-purple-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '대기중', color: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { label: '처리중', color: 'bg-blue-100 text-blue-800' },
  RESOLVED: { label: '완료', color: 'bg-green-100 text-green-800' },
};

export default function InquiriesPage() {
  const { hasPermission } = useAuthStore();
  const [inquiries, setInquiries] = useState(MOCK_INQUIRIES);
  const [selectedInquiry, setSelectedInquiry] = useState<typeof MOCK_INQUIRIES[0] | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleReply = (id: number) => {
    if (!replyText.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }
    setInquiries(
      inquiries.map((inq) =>
        inq.id === id
          ? {
              ...inq,
              status: 'RESOLVED',
              repliedAt: new Date().toISOString(),
              reply: replyText,
            }
          : inq
      )
    );
    setReplyText('');
    setSelectedInquiry(null);
    toast.success('답변이 전송되었습니다.');
  };

  const pendingCount = inquiries.filter((i) => i.status === 'PENDING').length;
  const inProgressCount = inquiries.filter((i) => i.status === 'IN_PROGRESS').length;

  return (
    <div>
      <PageHeader
        title="고객 문의 관리"
        description="사용자 문의 사항 확인 및 답변"
      />

      {/* 통계 */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">전체 문의</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{inquiries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">대기중</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">처리중</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">완료</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {inquiries.filter((i) => i.status === 'RESOLVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 문의 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>문의 목록</CardTitle>
            <div className="mt-2 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-8"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {inquiries
                .filter(
                  (inq) =>
                    inq.title.includes(searchKeyword) ||
                    inq.userNickname.includes(searchKeyword)
                )
                .map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      selectedInquiry?.id === inquiry.id ? 'border-primary bg-muted/30' : ''
                    }`}
                    onClick={() => setSelectedInquiry(inquiry)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={CATEGORY_COLORS[inquiry.category]}>
                          {CATEGORY_LABELS[inquiry.category]}
                        </Badge>
                        <Badge className={STATUS_CONFIG[inquiry.status].color}>
                          {STATUS_CONFIG[inquiry.status].label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(inquiry.createdAt)}
                      </span>
                    </div>
                    <h4 className="mt-2 font-medium">{inquiry.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inquiry.userNickname} ({inquiry.userEmail})
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 문의 상세 & 답변 */}
        <Card>
          <CardHeader>
            <CardTitle>문의 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedInquiry ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[selectedInquiry.category]}>
                      {CATEGORY_LABELS[selectedInquiry.category]}
                    </Badge>
                    <Badge className={STATUS_CONFIG[selectedInquiry.status].color}>
                      {STATUS_CONFIG[selectedInquiry.status].label}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{selectedInquiry.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedInquiry.userNickname} | {formatDateTime(selectedInquiry.createdAt)}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">{selectedInquiry.content}</p>
                </div>

                {selectedInquiry.reply && (
                  <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">관리자 답변</p>
                    <p className="mt-1 text-sm text-green-700">{selectedInquiry.reply}</p>
                    <p className="mt-2 text-xs text-green-600">
                      {formatDateTime(selectedInquiry.repliedAt!)}
                    </p>
                  </div>
                )}

                {hasPermission('ADMIN') && selectedInquiry.status !== 'RESOLVED' && (
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-lg border p-3 text-sm"
                      rows={4}
                      placeholder="답변을 입력하세요..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <Button
                      className="w-full"
                      onClick={() => handleReply(selectedInquiry.id)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      답변 전송
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                문의를 선택해주세요
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
