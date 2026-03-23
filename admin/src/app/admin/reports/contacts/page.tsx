'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { RefreshCw, Download, Eye, AlertTriangle, CheckCircle, XCircle, Phone, Mail, MessageCircle, Link as LinkIcon, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock 외부 연락처 감지 데이터
const MOCK_CONTACT_DETECTIONS = [
  {
    id: 1,
    userId: 123,
    nickname: '수상한사용자',
    contentType: 'DIARY',
    contentId: 456,
    detectedPattern: '010-1234-5678',
    patternType: 'PHONE',
    context: '...연락해줘요 010-1234-5678 으로...',
    status: 'PENDING',
    confidence: 98,
    detectedAt: '2024-03-23T10:30:00',
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    id: 2,
    userId: 456,
    nickname: '연락처공유자',
    contentType: 'EXCHANGE_DIARY',
    contentId: 789,
    detectedPattern: 'kakao: friend123',
    patternType: 'KAKAO',
    context: '...카톡으로 연락해 kakao: friend123...',
    status: 'CONFIRMED',
    confidence: 95,
    detectedAt: '2024-03-23T09:15:00',
    reviewedBy: '김관리',
    reviewedAt: '2024-03-23T09:30:00',
  },
  {
    id: 3,
    userId: 789,
    nickname: '인스타유저',
    contentType: 'CHAT',
    contentId: 101,
    detectedPattern: '@instagram_user',
    patternType: 'INSTAGRAM',
    context: '...인스타로 연락주세요 @instagram_user...',
    status: 'PENDING',
    confidence: 92,
    detectedAt: '2024-03-23T08:45:00',
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    id: 4,
    userId: 202,
    nickname: '이메일공유자',
    contentType: 'DIARY',
    contentId: 303,
    detectedPattern: 'test@email.com',
    patternType: 'EMAIL',
    context: '...이메일로 연락해 test@email.com...',
    status: 'FALSE_POSITIVE',
    confidence: 75,
    detectedAt: '2024-03-22T16:00:00',
    reviewedBy: '이운영',
    reviewedAt: '2024-03-22T17:00:00',
  },
  {
    id: 5,
    userId: 404,
    nickname: '링크공유자',
    contentType: 'EXCHANGE_DIARY',
    contentId: 505,
    detectedPattern: 'open.kakao.com/xxx',
    patternType: 'LINK',
    context: '...오픈채팅방 open.kakao.com/xxx 에서...',
    status: 'CONFIRMED',
    confidence: 99,
    detectedAt: '2024-03-22T14:30:00',
    reviewedBy: '김관리',
    reviewedAt: '2024-03-22T15:00:00',
  },
];

// Mock 통계 데이터
const MOCK_PATTERN_STATS = [
  { type: '전화번호', count: 45 },
  { type: '카카오톡', count: 32 },
  { type: '인스타그램', count: 28 },
  { type: '이메일', count: 15 },
  { type: '링크', count: 12 },
];

const MOCK_DAILY_TREND = [
  { date: '3/17', count: 12 },
  { date: '3/18', count: 15 },
  { date: '3/19', count: 18 },
  { date: '3/20', count: 14 },
  { date: '3/21', count: 22 },
  { date: '3/22', count: 19 },
  { date: '3/23', count: 8 },
];

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const PATTERN_TYPE_LABELS: Record<string, string> = {
  PHONE: '전화번호',
  EMAIL: '이메일',
  KAKAO: '카카오톡',
  INSTAGRAM: '인스타그램',
  LINK: '외부 링크',
};

const PATTERN_TYPE_COLORS: Record<string, string> = {
  PHONE: 'bg-blue-100 text-blue-800',
  EMAIL: 'bg-green-100 text-green-800',
  KAKAO: 'bg-yellow-100 text-yellow-800',
  INSTAGRAM: 'bg-pink-100 text-pink-800',
  LINK: 'bg-purple-100 text-purple-800',
};

const PATTERN_TYPE_ICONS: Record<string, React.ReactNode> = {
  PHONE: <Phone className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  KAKAO: <MessageCircle className="h-4 w-4" />,
  INSTAGRAM: <MessageCircle className="h-4 w-4" />,
  LINK: <LinkIcon className="h-4 w-4" />,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  DIARY: '일기',
  EXCHANGE_DIARY: '교환일기',
  CHAT: '채팅',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '검토 대기',
  CONFIRMED: '확인됨',
  FALSE_POSITIVE: '오탐지',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-red-100 text-red-800',
  FALSE_POSITIVE: 'bg-green-100 text-green-800',
};

export default function ExternalContactsPage() {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const handleRefresh = () => {
    toast.success('감지 목록을 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('감지 이력을 CSV로 내보냅니다.');
  };

  const handleConfirm = (detectionId: number) => {
    toast.success('외부 연락처 공유로 확인했습니다.');
  };

  const handleFalsePositive = (detectionId: number) => {
    toast.success('오탐지로 처리했습니다.');
  };

  // Filter detections
  const filteredDetections = MOCK_CONTACT_DETECTIONS.filter(detection => {
    const matchesKeyword = !keyword ||
      detection.nickname.includes(keyword) ||
      detection.detectedPattern.includes(keyword);
    const matchesType = typeFilter === 'ALL' || detection.patternType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || detection.status === statusFilter;
    return matchesKeyword && matchesType && matchesStatus;
  });

  const pendingCount = MOCK_CONTACT_DETECTIONS.filter(d => d.status === 'PENDING').length;
  const confirmedCount = MOCK_CONTACT_DETECTIONS.filter(d => d.status === 'CONFIRMED').length;

  return (
    <div>
      <PageHeader
        title="외부 연락처 감지 관리"
        description="AI 기반 외부 연락처 공유 감지 및 관리"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              CSV 내보내기
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">오늘 감지</span>
            </div>
            <div className="mt-1 text-2xl font-bold">{MOCK_CONTACT_DETECTIONS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">검토 대기</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-muted-foreground">확인됨</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-red-600">{confirmedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">감지 정확도</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">94.2%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>패턴 유형별 감지</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={MOCK_PATTERN_STATS}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  {MOCK_PATTERN_STATS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>일별 감지 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={MOCK_DAILY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[300px]">
          <SearchBar
            value={keyword}
            onChange={setKeyword}
            placeholder="닉네임 또는 패턴 검색"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 패턴</option>
            {Object.entries(PATTERN_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="ALL">전체 상태</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Detection List */}
      <div className="grid gap-4">
        {filteredDetections.map(detection => (
          <Card key={detection.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={PATTERN_TYPE_COLORS[detection.patternType]}>
                      <span className="flex items-center gap-1">
                        {PATTERN_TYPE_ICONS[detection.patternType]}
                        {PATTERN_TYPE_LABELS[detection.patternType]}
                      </span>
                    </Badge>
                    <Badge className={STATUS_COLORS[detection.status]}>
                      {STATUS_LABELS[detection.status]}
                    </Badge>
                    <Badge variant="outline">
                      {CONTENT_TYPE_LABELS[detection.contentType]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      신뢰도: <span className={detection.confidence >= 90 ? 'text-red-600 font-bold' : ''}>{detection.confidence}%</span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <Link href={`/admin/users/${detection.userId}`} className="font-semibold text-blue-600 hover:underline">
                      {detection.nickname}
                    </Link>
                  </div>
                  <div className="mt-2 p-2 bg-muted rounded text-sm font-mono">
                    <span className="text-red-600 font-bold">{detection.detectedPattern}</span>
                    <p className="mt-1 text-muted-foreground">{detection.context}</p>
                  </div>
                </div>
                <div className="flex gap-1 ml-4">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {detection.status === 'PENDING' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfirm(detection.id)}
                      >
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFalsePositive(detection.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between text-sm text-muted-foreground">
                <span>감지: {formatDateTime(detection.detectedAt)}</span>
                {detection.reviewedBy && (
                  <span>검토: {detection.reviewedBy} ({formatDateTime(detection.reviewedAt!)})</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
