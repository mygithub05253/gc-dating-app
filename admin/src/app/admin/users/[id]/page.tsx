'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import { USER_STATUS_LABELS, USER_STATUS_COLORS } from '@/lib/constants';
import {
  ArrowLeft,
  User,
  Mail,
  MapPin,
  School,
  Calendar,
  BookOpen,
  Heart,
  AlertTriangle,
  Ban,
  Clock,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock 사용자 데이터
const MOCK_USERS: Record<string, any> = {
  '1': {
    id: 1,
    nickname: '별빛소녀',
    realName: '김민지',
    email: 'minji@example.com',
    gender: 'FEMALE',
    birthDate: '1999-05-15',
    region: '서울 강남구',
    school: '가천대학교',
    status: 'ACTIVE',
    role: 'ROLE_USER',
    isProfileCompleted: true,
    createdAt: '2024-01-15T10:30:00',
    modifiedAt: '2024-03-20T14:00:00',
    lastLoginAt: '2024-03-22T09:15:00',
    diaryCount: 45,
    matchCount: 8,
    reportCount: 0,
    exchangeRoomCount: 3,
    personalityKeywords: ['감성적인', '배려심 있는', '활발한', '긍정적인'],
    recentDiaries: [
      { id: 101, title: '오늘 있었던 일', createdAt: '2024-03-22T08:00:00' },
      { id: 102, title: '주말 카페 탐방', createdAt: '2024-03-20T15:30:00' },
      { id: 103, title: '봄이 오는 소리', createdAt: '2024-03-18T20:00:00' },
    ],
    reportHistory: [],
  },
  '2': {
    id: 2,
    nickname: '달빛청년',
    realName: '이준호',
    email: 'junho@example.com',
    gender: 'MALE',
    birthDate: '1998-11-22',
    region: '부산 해운대구',
    school: '부산대학교',
    status: 'SUSPEND_7D',
    role: 'ROLE_USER',
    isProfileCompleted: true,
    createdAt: '2024-02-01T14:00:00',
    modifiedAt: '2024-03-19T10:00:00',
    lastLoginAt: '2024-03-18T22:30:00',
    diaryCount: 23,
    matchCount: 4,
    reportCount: 2,
    exchangeRoomCount: 1,
    personalityKeywords: ['논리적인', '차분한', '독립적인'],
    recentDiaries: [
      { id: 201, title: '코딩하는 밤', createdAt: '2024-03-18T23:00:00' },
      { id: 202, title: '바다가 보고 싶어', createdAt: '2024-03-15T18:00:00' },
    ],
    reportHistory: [
      { id: 1, reason: 'PROFANITY', status: 'RESOLVED', createdAt: '2024-03-10T10:00:00' },
      { id: 2, reason: 'SPAM', status: 'PENDING', createdAt: '2024-03-19T08:00:00' },
    ],
    suspendReason: '부적절한 언어 사용',
    suspendUntil: '2024-03-26T10:00:00',
  },
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const userId = params.id as string;
  const user = MOCK_USERS[userId] || MOCK_USERS['1'];

  const handleSuspend = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('7일 정지 처리되었습니다.');
    setIsProcessing(false);
  };

  const handleBan = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('영구 정지 처리되었습니다.');
    setIsProcessing(false);
  };

  const handleUnsuspend = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 500));
    toast.success('정지가 해제되었습니다.');
    setIsProcessing(false);
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          뒤로가기
        </Button>
        <PageHeader
          title={`회원 상세: ${user.nickname}`}
          description={`ID: ${user.id} | ${user.realName}`}
          actions={
            hasPermission('ADMIN') && (
              <div className="flex gap-2">
                {user.status === 'ACTIVE' ? (
                  <>
                    <Button variant="outline" onClick={handleSuspend} disabled={isProcessing}>
                      <Clock className="mr-2 h-4 w-4" />
                      7일 정지
                    </Button>
                    <Button variant="destructive" onClick={handleBan} disabled={isProcessing}>
                      <Ban className="mr-2 h-4 w-4" />
                      영구 정지
                    </Button>
                  </>
                ) : user.status !== 'BANNED' ? (
                  <Button variant="outline" onClick={handleUnsuspend} disabled={isProcessing}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    정지 해제
                  </Button>
                ) : null}
              </div>
            )
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 기본 정보 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">닉네임:</span>
                  <span className="font-medium">{user.nickname}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">실명:</span>
                  <span className="font-medium">{user.realName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">성별:</span>
                  <span>{user.gender === 'MALE' ? '남성' : '여성'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{user.birthDate}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.region}</span>
                </div>
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span>{user.school}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">상태:</span>
                  <Badge className={USER_STATUS_COLORS[user.status]}>
                    {USER_STATUS_LABELS[user.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">가입일:</span>
                  <span>{formatDateTime(user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">최근 접속:</span>
                  <span>{formatDateTime(user.lastLoginAt)}</span>
                </div>
              </div>
            </div>

            {user.status === 'SUSPEND_7D' && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-4">
                <p className="font-medium text-yellow-800">정지 사유: {user.suspendReason}</p>
                <p className="text-sm text-yellow-600">
                  해제 예정: {formatDateTime(user.suspendUntil)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 활동 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>활동 통계</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span>작성 일기</span>
              </div>
              <span className="font-bold">{user.diaryCount}편</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-500" />
                <span>매칭 수</span>
              </div>
              <span className="font-bold">{user.matchCount}회</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>교환일기방</span>
              </div>
              <span className="font-bold">{user.exchangeRoomCount}개</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span>신고 당한 횟수</span>
              </div>
              <span className="font-bold">{user.reportCount}회</span>
            </div>
          </CardContent>
        </Card>

        {/* AI 분석 키워드 */}
        <Card>
          <CardHeader>
            <CardTitle>AI 성격 분석 키워드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.personalityKeywords.map((keyword: string) => (
                <Badge key={keyword} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 최근 일기 */}
        <Card>
          <CardHeader>
            <CardTitle>최근 일기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.recentDiaries.map((diary: any) => (
                <div key={diary.id} className="flex items-center justify-between">
                  <span className="text-sm">{diary.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(diary.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 신고 이력 */}
        <Card>
          <CardHeader>
            <CardTitle>신고 이력</CardTitle>
          </CardHeader>
          <CardContent>
            {user.reportHistory.length > 0 ? (
              <div className="space-y-3">
                {user.reportHistory.map((report: any) => (
                  <div key={report.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{report.reason}</span>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(report.createdAt)}
                      </p>
                    </div>
                    <Badge variant={report.status === 'RESOLVED' ? 'secondary' : 'destructive'}>
                      {report.status === 'RESOLVED' ? '처리됨' : '대기중'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">신고 이력이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
