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
  INQUIRY_CATEGORY_LABELS,
  INQUIRY_CATEGORY_COLORS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_STATUS_COLORS,
} from '@/lib/constants';
import type { Inquiry, InquiryStatus } from '@/types/support';
import { MessageSquare, Clock, CheckCircle, Search, Send, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 문의 데이터 (관리자_API_통합명세서_v2.0 §17.1 InquiryItem 구조)
const MOCK_INQUIRIES: Inquiry[] = [
  {
    id: 1,
    userId: 5,
    userNickname: '별빛소녀',
    userEmail: 'star@example.com',
    category: 'ACCOUNT',
    title: '비밀번호 변경이 안 됩니다',
    content: '비밀번호 변경을 시도했는데 계속 오류가 발생합니다. 확인 부탁드립니다.',
    status: 'OPEN',
    assignedAdminId: null,
    assignedAdminEmail: null,
    answer: null,
    answeredBy: null,
    answeredAt: null,
    createdAt: '2026-04-18T10:30:00',
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
    assignedAdminId: 1,
    assignedAdminEmail: 'admin@ember.com',
    answer: null,
    answeredBy: null,
    answeredAt: null,
    createdAt: '2026-04-17T14:00:00',
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
    assignedAdminId: 1,
    assignedAdminEmail: 'admin@ember.com',
    answer: '안녕하세요. 환불이 완료되었습니다. 3-5 영업일 내에 계좌로 입금될 예정입니다.',
    answeredBy: 'admin@ember.com',
    answeredAt: '2026-04-16T11:30:00',
    createdAt: '2026-04-15T09:00:00',
  },
  {
    id: 4,
    userId: 15,
    userNickname: '구름위의아이',
    userEmail: 'cloud@example.com',
    category: 'BUG',
    title: '앱이 자꾸 종료됩니다',
    content: '일기 작성 중에 앱이 갑자기 종료되는 현상이 반복됩니다.',
    status: 'OPEN',
    assignedAdminId: null,
    assignedAdminEmail: null,
    answer: null,
    answeredBy: null,
    answeredAt: null,
    createdAt: '2026-04-18T08:00:00',
  },
  {
    id: 5,
    userId: 22,
    userNickname: '바람결',
    userEmail: 'wind@example.com',
    category: 'EXCHANGE',
    title: '교환일기 상대를 변경하고 싶어요',
    content: '현재 매칭된 상대와 교환일기 진행이 어렵습니다. 변경 가능한가요?',
    status: 'IN_PROGRESS',
    assignedAdminId: 2,
    assignedAdminEmail: 'sub@ember.com',
    answer: null,
    answeredBy: null,
    answeredAt: null,
    createdAt: '2026-04-17T16:30:00',
  },
  {
    id: 6,
    userId: 27,
    userNickname: '평온한날',
    userEmail: 'calm@example.com',
    category: 'CHAT',
    title: '채팅방 알림이 오지 않아요',
    content: '상대방이 메시지를 보내도 알림이 오지 않습니다.',
    status: 'CLOSED',
    assignedAdminId: 1,
    assignedAdminEmail: 'admin@ember.com',
    answer: '알림 설정을 다시 확인 부탁드립니다. 추가 문의 시 다시 작성해주세요.',
    answeredBy: 'admin@ember.com',
    answeredAt: '2026-04-14T13:00:00',
    createdAt: '2026-04-14T09:00:00',
  },
];

const STATUS_FILTERS: { value: 'ALL' | InquiryStatus; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'OPEN', label: '대기 중' },
  { value: 'IN_PROGRESS', label: '처리 중' },
  { value: 'RESOLVED', label: '답변 완료' },
  { value: 'CLOSED', label: '종료' },
];

export default function InquiriesPage() {
  const { hasPermission, user } = useAuthStore();
  const [inquiries, setInquiries] = useState<Inquiry[]>(MOCK_INQUIRIES);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InquiryStatus>('ALL');

  // 답변 등록 — Mock 환경에서는 로컬 상태만 갱신
  const handleAnswer = (id: number) => {
    if (!replyText.trim()) {
      toast.error('답변을 입력해주세요.');
      return;
    }
    const now = new Date().toISOString();
    const adminEmail = user?.email ?? 'admin@ember.com';
    setInquiries((prev) =>
      prev.map((inq) =>
        inq.id === id
          ? {
              ...inq,
              status: 'RESOLVED',
              answer: replyText,
              answeredBy: adminEmail,
              answeredAt: now,
            }
          : inq,
      ),
    );
    setSelectedInquiry((cur) =>
      cur && cur.id === id
        ? { ...cur, status: 'RESOLVED', answer: replyText, answeredBy: adminEmail, answeredAt: now }
        : cur,
    );
    setReplyText('');
    toast.success('답변이 전송되었습니다.');
  };

  // 본인 담당 배정 — Mock 환경에서는 로컬 상태만 갱신
  const handleAssignSelf = (id: number) => {
    if (!user) return;
    setInquiries((prev) =>
      prev.map((inq) =>
        inq.id === id
          ? {
              ...inq,
              assignedAdminId: user.adminId,
              assignedAdminEmail: user.email,
              status: inq.status === 'OPEN' ? 'IN_PROGRESS' : inq.status,
            }
          : inq,
      ),
    );
    setSelectedInquiry((cur) =>
      cur && cur.id === id
        ? {
            ...cur,
            assignedAdminId: user.adminId,
            assignedAdminEmail: user.email,
            status: cur.status === 'OPEN' ? 'IN_PROGRESS' : cur.status,
          }
        : cur,
    );
    toast.success('본인을 담당자로 배정했습니다.');
  };

  // 종료 처리
  const handleClose = (id: number) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, status: 'CLOSED' } : inq)),
    );
    setSelectedInquiry((cur) => (cur && cur.id === id ? { ...cur, status: 'CLOSED' } : cur));
    toast.success('문의를 종료했습니다.');
  };

  const filteredInquiries = inquiries.filter((inq) => {
    if (statusFilter !== 'ALL' && inq.status !== statusFilter) return false;
    const kw = searchKeyword.trim();
    if (!kw) return true;
    return inq.title.includes(kw) || inq.userNickname.includes(kw) || inq.userEmail.includes(kw);
  });

  const openCount = inquiries.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = inquiries.filter((i) => i.status === 'IN_PROGRESS').length;
  const resolvedCount = inquiries.filter((i) => i.status === 'RESOLVED').length;

  return (
    <div>
      <PageHeader
        title="고객 문의 관리"
        description="사용자 문의 사항 확인 및 답변"
      />

      <MockPageNotice message="고객 문의 도메인 백엔드 API 준비 중입니다. 현재는 Mock 데이터로 화면 흐름만 검증됩니다." />

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
              <span className="text-sm text-muted-foreground">대기 중</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-600">{openCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">처리 중</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">답변 완료</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{resolvedCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 문의 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>문의 목록</CardTitle>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="제목/닉네임/이메일 검색"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setStatusFilter(f.value)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      statusFilter === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="space-y-3">
              {filteredInquiries.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  조건에 맞는 문의가 없습니다.
                </div>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                      selectedInquiry?.id === inquiry.id ? 'border-primary bg-muted/30' : ''
                    }`}
                    onClick={() => setSelectedInquiry(inquiry)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={INQUIRY_CATEGORY_COLORS[inquiry.category]}>
                          {INQUIRY_CATEGORY_LABELS[inquiry.category]}
                        </Badge>
                        <Badge className={INQUIRY_STATUS_COLORS[inquiry.status]}>
                          {INQUIRY_STATUS_LABELS[inquiry.status]}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(inquiry.createdAt)}
                      </span>
                    </div>
                    <h4 className="mt-2 font-medium">{inquiry.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {inquiry.userNickname} · {inquiry.userEmail}
                    </p>
                    {inquiry.assignedAdminEmail && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        담당자: {inquiry.assignedAdminEmail}
                      </p>
                    )}
                  </div>
                ))
              )}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={INQUIRY_CATEGORY_COLORS[selectedInquiry.category]}>
                      {INQUIRY_CATEGORY_LABELS[selectedInquiry.category]}
                    </Badge>
                    <Badge className={INQUIRY_STATUS_COLORS[selectedInquiry.status]}>
                      {INQUIRY_STATUS_LABELS[selectedInquiry.status]}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{selectedInquiry.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedInquiry.userNickname} | {formatDateTime(selectedInquiry.createdAt)}
                  </p>
                  {selectedInquiry.assignedAdminEmail && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      담당자: {selectedInquiry.assignedAdminEmail}
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="whitespace-pre-wrap text-sm">{selectedInquiry.content}</p>
                </div>

                {selectedInquiry.answer && (
                  <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-800">관리자 답변</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-green-700">
                      {selectedInquiry.answer}
                    </p>
                    <p className="mt-2 text-xs text-green-600">
                      {selectedInquiry.answeredBy} ·{' '}
                      {selectedInquiry.answeredAt && formatDateTime(selectedInquiry.answeredAt)}
                    </p>
                  </div>
                )}

                {hasPermission('ADMIN') && (
                  <div className="space-y-3">
                    {/* 담당자 배정 */}
                    {!selectedInquiry.assignedAdminId && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleAssignSelf(selectedInquiry.id)}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        본인을 담당자로 배정
                      </Button>
                    )}

                    {/* 답변 입력 */}
                    {selectedInquiry.status !== 'CLOSED' && (
                      <div className="space-y-2">
                        <textarea
                          className="w-full rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          rows={4}
                          placeholder="답변을 입력하세요..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={() => handleAnswer(selectedInquiry.id)}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            답변 전송
                          </Button>
                          {selectedInquiry.status === 'RESOLVED' && (
                            <Button
                              variant="outline"
                              onClick={() => handleClose(selectedInquiry.id)}
                            >
                              종료
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
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
