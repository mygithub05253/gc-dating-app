import axios from 'axios';
import toast from 'react-hot-toast';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// 에러 코드별 한글 메시지 매핑 (Backend API 명세서 기준)
const ERROR_MESSAGES: Record<string, string> = {
  // 인증 관련 (A0xx)
  A001: '인증 토큰이 없습니다.',
  A002: '만료된 토큰입니다.',
  A003: '이메일 또는 비밀번호가 일치하지 않습니다.',
  A004: '이메일 또는 비밀번호가 일치하지 않습니다.',
  A005: '유효하지 않은 Refresh Token입니다.',
  A006: '로그아웃된 토큰입니다.',
  A007: '접근 권한이 없습니다.',
  A008: '해당 작업은 최고 관리자만 수행할 수 있습니다.',
  A011: '로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도하세요.',
  A012: '비활성화된 계정입니다.',
  A013: '정지된 계정입니다.',
  // 공통 오류 (C0xx)
  C001: '입력값이 올바르지 않습니다.',
  C004: '요청 횟수를 초과했습니다. 잠시 후 다시 시도하세요.',
  // 도메인 오류 (ADM0xx)
  ADM001: '해당 사용자를 찾을 수 없습니다.',
  ADM004: '해당 관리자를 찾을 수 없습니다.',
};

// Request: 토큰 자동 첨부
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response: 401 시 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/auth/refresh`,
          { refreshToken },
        );

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;

        return apiClient(originalRequest);
      } catch {
        // 갱신 실패 → 로그아웃
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
      }
    }

    // 개발 모드에서는 토스트 표시 안함 (Mock 데이터 사용 중)
    // 프로덕션에서만 에러 토스트 표시
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev) {
      if (error.response) {
        const { code, message } = error.response.data || {};
        const displayMessage = ERROR_MESSAGES[code] || message || '알 수 없는 오류가 발생했습니다.';

        if (error.response.status !== 401) {
          toast.error(displayMessage);
        }
      } else {
        toast.error('서버와의 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
