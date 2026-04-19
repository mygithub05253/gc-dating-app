import { Info } from 'lucide-react';

interface MockPageNoticeProps {
  /** 추가 안내 메시지 (선택) */
  message?: string;
}

/**
 * Mock 데이터로 동작 중인 페이지 상단에 표시하는 공통 안내 배너.
 * 백엔드 API 연결 전까지 노출되며, API 연결 시 페이지에서 본 컴포넌트만 제거하면 된다.
 *
 * 사용 예:
 *   <MockPageNotice message="고객 문의 도메인 백엔드 API 준비 중입니다." />
 */
export default function MockPageNotice({ message }: MockPageNoticeProps) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>
        <p className="font-medium">Mock 데이터 — 실제 API 연결 예정</p>
        {message && <p className="mt-0.5 text-xs text-amber-700">{message}</p>}
      </div>
    </div>
  );
}
