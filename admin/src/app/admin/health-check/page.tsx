'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface HealthData {
  code: string;
  message: string;
  data: {
    status: string;
    profile: string;
    timestamp: string;
  };
}

export default function HealthCheckPage() {
  const [result, setResult] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkHealth = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: HealthData = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결 실패');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Backend 연결 테스트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkHealth} disabled={isLoading} className="w-full">
            {isLoading ? '확인 중...' : '연결 확인'}
          </Button>

          {result && (
            <div className="rounded-lg bg-green-50 p-4 text-sm">
              <p className="font-semibold text-green-800">연결 성공</p>
              <div className="mt-2 space-y-1 text-green-700">
                <p>상태: {result.data.status}</p>
                <p>프로파일: {result.data.profile}</p>
                <p>시간: {result.data.timestamp}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm">
              <p className="font-semibold text-red-800">연결 실패</p>
              <p className="mt-1 text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
