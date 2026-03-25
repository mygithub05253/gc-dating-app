'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import StatusBadge from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import { Eye } from 'lucide-react';

// Mock data for development
const MOCK_USERS = [
  {
    id: 1,
    nickname: '별빛소녀',
    realName: '김민지',
    gender: 'F' as const,
    region: '서울',
    status: 'ACTIVE' as const,
    diaryCount: 15,
    matchCount: 3,
    createdAt: '2024-03-01T10:00:00',
  },
  {
    id: 2,
    nickname: '달빛청년',
    realName: '이준호',
    gender: 'M' as const,
    region: '부산',
    status: 'SUSPEND_7D' as const,
    diaryCount: 8,
    matchCount: 1,
    createdAt: '2024-03-05T14:30:00',
  },
  {
    id: 3,
    nickname: '햇살가득',
    realName: '박서연',
    gender: 'F' as const,
    region: '인천',
    status: 'ACTIVE' as const,
    diaryCount: 22,
    matchCount: 5,
    createdAt: '2024-02-20T11:00:00',
  },
  {
    id: 4,
    nickname: '밤하늘별',
    realName: '최민수',
    gender: 'M' as const,
    region: '대전',
    status: 'ACTIVE' as const,
    diaryCount: 10,
    matchCount: 2,
    createdAt: '2024-02-25T09:30:00',
  },
  {
    id: 5,
    nickname: '꽃구름',
    realName: '정유진',
    gender: 'F' as const,
    region: '광주',
    status: 'BANNED' as const,
    diaryCount: 3,
    matchCount: 0,
    createdAt: '2024-03-10T16:00:00',
  },
  {
    id: 6,
    nickname: '바람처럼',
    realName: '김태현',
    gender: 'M' as const,
    region: '서울',
    status: 'ACTIVE' as const,
    diaryCount: 18,
    matchCount: 4,
    createdAt: '2024-01-15T14:00:00',
  },
  {
    id: 7,
    nickname: '달콤한하루',
    realName: '이수민',
    gender: 'F' as const,
    region: '경기',
    status: 'ACTIVE' as const,
    diaryCount: 25,
    matchCount: 6,
    createdAt: '2024-01-10T10:00:00',
  },
  {
    id: 8,
    nickname: '푸른바다',
    realName: '박준영',
    gender: 'M' as const,
    region: '부산',
    status: 'SUSPEND_7D' as const,
    diaryCount: 5,
    matchCount: 1,
    createdAt: '2024-03-08T12:00:00',
  },
];

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState('');

  const handleSearch = () => {
    setPage(0);
  };

  // Filter users based on keyword
  const filteredUsers = keyword
    ? MOCK_USERS.filter(
        (user) =>
          user.nickname.includes(keyword) || user.realName.includes(keyword)
      )
    : MOCK_USERS;

  const users = filteredUsers;
  const totalPages = Math.ceil(filteredUsers.length / 20) || 1;

  return (
    <div>
      <PageHeader
        title="회원 관리"
        description="전체 회원 목록 조회 및 관리"
      />

      <div className="mb-6">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          placeholder="닉네임 또는 이름 검색"
          onSearch={handleSearch}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">닉네임</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">실명</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">성별</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">지역</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">일기</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">매칭</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">가입일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{user.nickname}</td>
                    <td className="px-4 py-3 text-sm">{user.realName}</td>
                    <td className="px-4 py-3 text-sm">
                      {user.gender === 'M' ? '남성' : '여성'}
                    </td>
                    <td className="px-4 py-3 text-sm">{user.region}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">{user.diaryCount}</td>
                    <td className="px-4 py-3 text-sm">{user.matchCount}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/members/${user.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          상세
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
