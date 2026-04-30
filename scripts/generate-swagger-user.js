/**
 * swagger-user.json 생성 스크립트
 *
 * 사용법: node scripts/generate-swagger-user.js
 * 전제: 로컬 서버가 http://localhost:8080에서 실행 중이어야 함
 *
 * 1. /v3/api-docs에서 raw swagger 가져오기
 * 2. admin API 제거
 * 3. 에러코드 + Rate Limit + Dev API 설명 추가
 * 4. API별 description + 예시 응답 주입
 * 5. swagger-user.json으로 저장
 */

const fs = require('fs');
const path = require('path');

// raw swagger 파일 읽기 (사전에 curl로 저장해둬야 함)
const rawPath = path.join(__dirname, '..', 'swagger-raw.json');
if (!fs.existsSync(rawPath)) {
  console.error('swagger-raw.json이 없습니다. 먼저 실행:\n  curl -s http://localhost:8080/v3/api-docs > swagger-raw.json');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

// ── 1. admin API 제거 ──
const adminTags = raw.tags ? raw.tags.filter(t => t.name.toLowerCase().startsWith('admin')) : [];
const adminTagNames = new Set(adminTags.map(t => t.name));
raw.tags = (raw.tags || []).filter(t => !adminTagNames.has(t.name));

const paths = {};
for (const [p, methods] of Object.entries(raw.paths || {})) {
  if (p.startsWith('/api/admin')) continue;
  const filtered = {};
  for (const [method, spec] of Object.entries(methods)) {
    const tags = spec.tags || [];
    if (tags.some(t => adminTagNames.has(t))) continue;
    filtered[method] = spec;
  }
  if (Object.keys(filtered).length > 0) paths[p] = filtered;
}
raw.paths = paths;

const apiCount = Object.values(paths).reduce((sum, m) => sum + Object.keys(m).length, 0);

// ── 2. info 수정 ──
raw.info.title = 'Ember API 서버';
raw.info.version = 'v2.2';
raw.info.description = `Ember 사용자 + Dev API (총 ${apiCount}개)

서버: https://ember-app.duckdns.org
인증: Bearer 토큰 (GET /api/dev/token?userId=1 로 발급)

# Dev API 사용법
- GET /api/dev/token?userId={id} — 카카오 로그인 없이 테스트 토큰 발급
- POST /api/dev/ai/simulate/{diaryId} — AI 분석 결과 시뮬레이션 (2~3초 후 diary_keywords 생성)
- GET /api/dev/redis/summary — Redis 캐시 카테고리별 요약
- GET /api/dev/redis/user/{userId} — 유저별 캐시 현황
- GET /api/dev/redis/get?key= — Redis 키 값 + TTL 조회
- DELETE /api/dev/redis/delete?key= — Redis 키 삭제
- GET /api/dev/redis/keys?pattern= — 패턴으로 키 검색
- POST /api/dev/exchange-rooms/{roomUuid}/force-complete — 교환일기 강제 완주

# Rate Limiting
- 인증 전 API: 20회/분 (IP 기준)
- 인증 후 GET: 60회/분 (userId 기준)
- 인증 후 POST/PUT/PATCH/DELETE: 30회/분 (userId 기준)
- POST /api/auth/social: 5회/분, POST /api/diaries: 5회/분, POST /api/matching/*: 10회/분
- 초과 시 429 + X-RateLimit-Limit/Remaining/Reset 헤더 + Retry-After

# 에러 응답 형식
{ "code": "D001", "message": "오늘 이미 일기를 작성했습니다.", "status": 409 }

# 에러코드 목록

## 공통 (C)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| C001 | 400 | 잘못된 요청입니다. |
| C002 | 409 | 이미 존재하는 리소스입니다. |
| C003 | 500 | 서버 내부 오류입니다. |
| C004 | 429 | 요청 횟수가 초과되었습니다. |

## 인증 (A)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| A001 | 401 | 인증 토큰이 없습니다. |
| A002 | 401 | 만료된 토큰입니다. |
| A003 | 401 | 존재하지 않는 계정입니다. |
| A005 | 401 | 유효하지 않은 Refresh Token입니다. |
| A006 | 401 | 로그아웃된 토큰입니다. |
| A007 | 403 | 접근 권한이 없습니다. |
| A009 | 401 | 소셜 인증에 실패했습니다. |
| A011 | 401 | 유효하지 않은 복구 토큰입니다. |
| A012 | 400 | 계정 복구 가능 기간이 만료되었습니다. |

## 사용자 (U)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| U001 | 409 | 이미 사용 중인 닉네임입니다. |
| U002 | 400 | 만 18세 이상만 가입 가능합니다. |
| U004 | 400 | 이상형 키워드는 3~5개 선택해야 합니다. |
| U005 | 404 | 존재하지 않는 키워드입니다. |
| U006 | 400 | 닉네임 변경은 30일에 1회만 가능합니다. |

## 일기 (D)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| D001 | 409 | 오늘 이미 일기를 작성했습니다. |
| D002 | 400 | 글자 수 제한(200~1,000자)에 맞지 않습니다. |
| D003 | 404 | 존재하지 않는 주제입니다. |
| D004 | 404 | 존재하지 않는 일기입니다. |
| D005 | 403 | 본인의 일기가 아닙니다. |
| D006 | 400 | 당일 작성한 일기만 수정 가능합니다. |
| D007 | 404 | 존재하지 않는 임시저장 일기입니다. |
| D008 | 400 | 임시저장은 최대 3건까지 가능합니다. |

## 매칭 (M)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| M001 | 409 | 이미 교환 신청한 사용자입니다. |
| M002 | 400 | 자기 자신에게 신청할 수 없습니다. |
| M003 | 403 | 차단된 사용자입니다. |
| M004 | 400 | 일기를 먼저 작성해야 매칭이 가능합니다. |
| M005 | 409 | 동시에 진행할 수 있는 교환일기는 최대 3건입니다. |
| M006 | 404 | 존재하지 않는 매칭 요청입니다. |

## 교환일기 (ER)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| ER001 | 404 | 존재하지 않는 교환일기 방입니다. |
| ER002 | 403 | 교환일기 참여자가 아닙니다. |
| ER003 | 400 | 현재 내 차례가 아닙니다. |
| ER004 | 400 | 작성 제한 시간이 만료되었습니다. |
| ER005 | 400 | 본인 일기에는 리액션할 수 없습니다. |

## 다음 단계 (NS)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| NS001 | 400 | 교환일기가 완료되지 않아 선택할 수 없습니다. |
| NS002 | 409 | 이미 선택을 완료했습니다. |

## 채팅/커플 (CR)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| CR001 | 404 | 존재하지 않는 채팅방입니다. |
| CR002 | 403 | 채팅방 참여자가 아닙니다. |
| CR003 | 409 | 이미 커플 요청을 보냈습니다. |
| CR004 | 409 | 이미 커플 확정된 채팅방입니다. |
| CR007 | 400 | 이미 종료된 채팅방입니다. |

## 신고/차단 (R/B)
| 코드 | HTTP | 메시지 |
|------|------|--------|
| R001 | 400 | 자기 자신을 신고할 수 없습니다. |
| R002 | 409 | 이미 신고한 사용자입니다. |
| B001 | 400 | 자기 자신을 차단할 수 없습니다. |
| B002 | 409 | 이미 차단한 사용자입니다. |
| B003 | 404 | 차단 기록이 없습니다. |

## 기타
| 코드 | HTTP | 메시지 |
|------|------|--------|
| SC001 | 400 | 부적절한 내용이 포함되어 있습니다. |
| AC001 | 400 | 동의 이력이 없습니다. |
| N001 | 404 | 존재하지 않는 알림입니다. |
| SP001 | 429 | 진행 중인 문의가 너무 많습니다. |
| AP001 | 400 | 정지 상태의 계정만 이의신청 가능합니다. |
| AP002 | 409 | 이미 진행 중인 이의신청이 있습니다. |
`;

raw.servers = [{ url: 'https://ember-app.duckdns.org', description: 'Ember 배포 서버' }];

// ── 3. API별 description + 예시 응답 주입 ──
const apiMeta = {
  // ── 인증 ──
  'post:/api/auth/social': { desc: '카카오 소셜 로그인 또는 회원가입을 처리합니다.\n\n**요청 필드:**\n- `provider`: 소셜 로그인 제공자 (현재 `KAKAO`만 지원)\n- `accessToken`: 카카오 SDK에서 발급받은 Access Token\n\n**동작:**\n- 기존 회원이면 JWT 토큰 쌍(AT+RT) 발급\n- 신규 회원이면 자동 회원가입 후 `ROLE_GUEST`로 생성, `isNewUser=true` 반환\n- 탈퇴 유예 중인 계정이면 `restoreToken` 포함 (POST /api/auth/restore로 복구 가능)\n\n**에러:** A009(소셜 인증 실패), A010(지원하지 않는 provider)', ex: {"code":"201","message":"CREATED","data":{"accessToken":"eyJ...","refreshToken":"eyJ...","userId":1,"isNewUser":true,"role":"ROLE_GUEST"}} },

  'post:/api/auth/refresh': { desc: 'Access Token 만료 시 Refresh Token으로 새 토큰 쌍을 발급합니다.\n\n**요청 필드:**\n- `refreshToken`: 이전에 발급받은 Refresh Token\n\n**동작:**\n- Refresh Token Rotation 적용 — 기존 RT는 즉시 무효화되고 새 RT 발급\n- 무효화된 RT로 재요청 시 A005 에러\n\n**에러:** A005(유효하지 않은 RT)', ex: {"code":"200","message":"OK","data":{"accessToken":"eyJ...","refreshToken":"eyJ..."}} },

  'post:/api/auth/logout': { desc: '현재 세션을 로그아웃합니다.\n\n**동작:**\n- Access Token을 Redis 블랙리스트에 등록 (만료 시간까지 유지)\n- Refresh Token을 Redis에서 삭제\n- 블랙리스트에 등록된 AT로 API 호출 시 A006 에러\n\n**헤더:** `Authorization: Bearer {accessToken}` 필수', ex: {"code":"200","message":"OK","data":null} },

  'post:/api/auth/restore': { desc: '탈퇴 유예 기간(30일) 내 계정을 복구합니다.\n\n**요청 필드:**\n- `restoreToken`: 소셜 로그인 응답에서 받은 복구 토큰\n\n**동작:**\n- DEACTIVATED → ACTIVE 상태 전환\n- deactivatedAt, permanentDeleteAt 초기화\n- 30일 초과 시 A012 에러 (영구 삭제됨)\n\n**에러:** A011(유효하지 않은 복구 토큰), A012(복구 기간 만료)', ex: {"code":"200","message":"OK","data":{"userId":1,"restoredAt":"2026-04-30T10:00:00","status":"ACTIVE"}} },

  // ── 사용자 ──
  'post:/api/users/nickname/generate': { desc: '랜덤 닉네임을 생성합니다. 인증 불필요.\n\n**동작:**\n- 형용사(20개) + 명사(20개) 조합으로 생성 (예: "따뜻한별빛", "용감한하늘")\n- 중복 검사 포함 — 기존 닉네임과 겹치지 않음\n- 프로필 등록 전 닉네임 미리보기 용도', ex: {"code":"201","message":"CREATED","data":{"nickname":"따뜻한별빛"}} },

  'post:/api/users/profile': { desc: '온보딩 1단계 — 기본 프로필을 등록합니다.\n\n**요청 필드:**\n- `nickname` (필수): 2~10자, 한글/영문/숫자\n- `birthDate` (필수): yyyy-MM-dd, 만 18세 이상\n- `gender` (필수): MALE 또는 FEMALE\n- `realName` (선택): 실명 2~5자 한글\n- `sido` (선택): 시/도 (예: "서울특별시")\n- `sigungu` (선택): 시/군/구 (예: "강남구")\n- `school` (선택): 학교명\n\n**동작:**\n- onboardingStep 0 → 1 변경\n- 닉네임 중복 시 U001, 미성년자 U002\n\n**에러:** U001(닉네임 중복), U002(미성년자)', ex: {"code":"201","message":"CREATED","data":{"userId":1,"nickname":"따뜻한별빛","onboardingStep":1}} },

  'get:/api/users/me': { desc: '현재 로그인한 사용자의 전체 프로필을 조회합니다.\n\n**응답 포함 정보:**\n- 기본 정보: userId, nickname, birthDate, gender, sido, sigungu, school\n- 온보딩 상태: onboardingCompleted, onboardingStep (0=미시작, 1=프로필완료, 2=키워드완료)\n- 이상형 키워드: idealKeywords 배열\n- 계정 상태: accountStatus (ACTIVE/DEACTIVATED/SUSPEND_7D/SUSPEND_30D/BANNED)\n- 제재 정보: suspensionReason, suspendedUntil, canAppeal', ex: {"code":"200","message":"OK","data":{"userId":1,"nickname":"따뜻한별빛","birthDate":"2000-01-01","gender":"MALE","sido":"서울특별시","sigungu":"강남구","onboardingCompleted":true,"accountStatus":"ACTIVE"}} },

  'patch:/api/users/me/profile': { desc: '프로필 정보를 수정합니다.\n\n**수정 가능 필드:** nickname, realName, sido, sigungu, school\n- 닉네임 변경은 30일 쿨다운 적용 (lastNicknameChangedAt 기준)\n- 변경할 필드만 보내면 됨 (PATCH 방식)\n\n**에러:** U001(닉네임 중복), U006(30일 쿨다운)', ex: {"code":"200","message":"OK","data":{"userId":1,"nickname":"새닉네임"}} },

  'post:/api/users/me/fcm-token': { desc: 'FCM 푸시 알림용 디바이스 토큰을 등록하거나 갱신합니다.\n\n**요청 필드:**\n- `fcmToken` (필수): Firebase에서 발급받은 디바이스 토큰\n- `deviceType` (필수): `AOS` 또는 `IOS` (ANDROID, iOS 아님 주의!)\n\n**동작:**\n- 동일 userId+deviceType 조합이면 토큰 갱신\n- 다른 유저가 같은 토큰을 가지고 있으면 기존 것 삭제 (디바이스 변경 대응)\n\n**에러:** C001(잘못된 deviceType)', ex: {"code":"200","message":"OK","data":null} },

  // ── 이상형 ──
  'get:/api/users/ideal-type/keyword-list': { desc: '이상형 키워드 마스터 목록을 조회합니다. 인증 불필요.\n\n**응답:**\n- 10개 키워드, category별 그룹핑 (RELATIONSHIP, EMOTION, LIFESTYLE 등)\n- 온보딩 2단계에서 키워드 선택 UI에 사용\n- id 값을 POST /api/users/ideal-type/keywords에 전달', ex: {"code":"200","message":"OK","data":{"keywords":[{"id":1,"label":"안정적인 사람","category":"RELATIONSHIP"},{"id":2,"label":"긍정적인 사람","category":"EMOTION"}]}} },

  'post:/api/users/ideal-type/keywords': { desc: '온보딩 2단계 — 이상형 키워드를 설정합니다.\n\n**요청 필드:**\n- `keywordIds`: 키워드 ID 배열 (최소 1개, 최대 3개)\n\n**동작:**\n- onboardingStep 1 → 2 변경\n- ROLE_GUEST → ROLE_USER 승격 (이후 모든 인증 API 사용 가능)\n- 이미 설정된 키워드가 있으면 덮어쓰기\n\n**에러:** U004(3~5개 선택 필요), U005(존재하지 않는 키워드 ID)', ex: {"code":"200","message":"OK","data":null} },

  // ── 튜토리얼 ──
  'get:/api/tutorials/pages': { desc: '튜토리얼 페이지 목록을 순서대로 조회합니다.\n\n**응답:** pageOrder 오름차순 정렬된 페이지 배열\n- 각 페이지: pageOrder, title, content, imageUrl', ex: {"code":"200","message":"OK","data":[{"pageOrder":1,"title":"환영합니다"}]} },
  'post:/api/users/tutorial/complete': { desc: '튜토리얼 완료를 처리합니다.\n\n**동작:** tutorialCompletedAt에 현재 시간 기록. 이미 완료된 경우에도 멱등하게 동작합니다.', ex: {"code":"200","message":"OK","data":null} },

  // ── 시스템 ──
  'get:/api/health': { desc: '서버 상태를 확인합니다. 인증 불필요.\n\n**응답:** status("ok"), profile("local"/"prod"), timestamp(ISO 8601)', ex: {"code":"200","message":"OK","data":{"status":"ok","profile":"prod","timestamp":"2026-04-30T10:00:00"}} },
  'get:/api/system/version': { desc: '앱 최소/최신 버전을 확인합니다. 인증 불필요.\n\n**응답:**\n- `updateType`: FORCE_UPDATE(강제), RECOMMEND_UPDATE(권장), NONE(최신)\n- `latestVersion`: 최신 버전\n- `storeUrl`: 스토어 링크 (업데이트 필요 시)', ex: {"code":"200","message":"OK","data":{"updateType":"NONE","latestVersion":"1.0.0"}} },

  'post:/api/consent': { desc: 'AI 분석 동의를 등록합니다.\n\n**요청 필드:**\n- `consentType` (필수): `AI_ANALYSIS` 또는 `AI_DATA_USAGE` (다른 값은 C001 에러)\n\n**동작:**\n- ai_consent_log 테이블에 GRANTED 이력 INSERT (Append-Only)\n- AI_ANALYSIS: 일기 성격/감정 분석 동의\n- AI_DATA_USAGE: 매칭 유사도 계산 등 데이터 활용 동의\n- 온보딩 시 두 타입 모두 등록 필요\n\n**주의:** USER_TERMS, AI_TERMS는 더 이상 사용하지 않습니다.', ex: {"code":"200","message":"OK","data":null} },

  'delete:/api/consent': { desc: 'AI 분석 동의를 철회합니다.\n\n**동작:**\n- AI_ANALYSIS, AI_DATA_USAGE 모두 REVOKED 이력 INSERT\n- Redis AI 캐시 삭제\n- 철회 후 AI 분석/매칭 추천이 중단됨\n- 동의 이력이 없으면 AC001 에러\n\n**에러:** AC001(동의 이력 없음)', ex: {"code":"200","message":"OK","data":null} },

  // ── 일기 ──
  'get:/api/diaries/today': { desc: '오늘 일기를 이미 작성했는지 확인합니다.\n\n**응답:**\n- `exists`: true이면 오늘 이미 작성함\n- `diaryId`: 작성한 일기 ID (exists=false이면 null)\n- 일기 작성 버튼 활성화/비활성화 판단에 사용', ex: {"code":"200","message":"OK","data":{"exists":false,"diaryId":null}} },

  'post:/api/diaries': { desc: '새 일기를 작성합니다. 하루 1회만 가능.\n\n**요청 필드:**\n- `content` (필수): 일기 본문, 200~1000자\n- `visibility` (필수): `PRIVATE`(나만 보기) 또는 `EXCHANGE_ONLY`(교환 대상 노출)\n- `topicId` (선택): 수요일 주제 ID (GET /api/diaries/weekly-topic에서 조회)\n\n**동작:**\n1. 하루 1회 제한 검증 (D001)\n2. 금칙어/URL 검열 — 차단 시 SC001\n3. XSS 이스케이프 후 저장\n4. AI 분석 비동기 발행 (RabbitMQ → FastAPI)\n5. analysisStatus=PENDING으로 반환\n\n**에러:** D001(일 1회), D002(글자 수), SC001(부적절한 내용)', ex: {"code":"201","message":"CREATED","data":{"diaryId":1,"status":"PRIVATE","analysisStatus":"PENDING"}} },

  'get:/api/diaries': { desc: '내 일기 목록을 페이징 조회합니다.\n\n**쿼리 파라미터:**\n- `page` (기본 0): 페이지 번호\n- `size` (기본 10): 페이지 크기\n\n**응답:** 최신순 정렬, 각 일기의 analysisStatus(PENDING/COMPLETED/FAILED) 포함', ex: {"code":"200","message":"OK","data":{"content":[{"diaryId":1,"content":"오늘은...","date":"2026-04-30","analysisStatus":"COMPLETED"}],"totalPages":1}} },

  'get:/api/diaries/{diaryId}': { desc: '일기 상세를 조회합니다. 본인 일기만 조회 가능.\n\n**응답 포함:**\n- 일기 본문, 날짜, visibility\n- AI 분석 키워드 (analysisStatus=COMPLETED인 경우)\n  - tagType: EMOTION(감정), RELATIONSHIP_STYLE(관계성향), LIFESTYLE(생활), TONE(톤)\n  - label: 분석 결과 태그 (예: "편안함", "안정 추구")\n\n**에러:** D004(존재하지 않음), D005(본인 일기 아님)', ex: {"code":"200","message":"OK","data":{"diaryId":1,"content":"오늘은...","date":"2026-04-30","keywords":[{"tagType":"EMOTION","label":"편안함"}]}} },

  'patch:/api/diaries/{diaryId}': { desc: '당일 작성한 일기만 수정할 수 있습니다.\n\n**요청 필드:**\n- `content` (필수): 수정할 본문, 200~1000자\n\n**동작:**\n- 수정 전/후 본문을 diary_edit_logs에 기록\n- 기존 AI 키워드 삭제 + AI 캐시 무효화\n- AI 재분석 자동 발행 (analysisStatus → PENDING)\n\n**에러:** D004, D005(본인 아님), D006(당일 아님)', ex: {"code":"200","message":"OK","data":{"diaryId":1,"updatedAt":"2026-04-30T10:00:00"}} },

  'get:/api/diaries/weekly-topic': { desc: '이번 주 수요일 주제를 조회합니다. 인증 불필요.\n\n**응답:**\n- 수요일이면 `isActive=true`, 다른 요일이면 `false`\n- 주제가 등록되지 않은 주에는 topicId/title이 null\n- topicId를 POST /api/diaries의 topicId 파라미터로 전달하면 주제 일기로 작성', ex: {"code":"200","message":"OK","data":{"topicId":1,"title":"가장 기억에 남는 여행지는?","isActive":true}} },

  'get:/api/diaries/drafts': { desc: '임시저장된 일기 목록을 조회합니다.\n\n**응답:** 최대 3건, 최신순 정렬\n- draftId, content(전체 본문), savedAt\n- Redis 캐시(24h) + DB 폴백', ex: {"code":"200","message":"OK","data":{"drafts":[{"draftId":1,"content":"임시저장","savedAt":"2026-04-30T10:00:00"}],"totalCount":1}} },

  'post:/api/diaries/draft': { desc: '일기를 임시저장합니다.\n\n**요청 필드:**\n- `content` (필수): 임시저장할 본문 (글자 수 제한 없음)\n\n**동작:** 최대 3건 제한, 초과 시 D008 에러\n\n**에러:** D008(3건 초과)', ex: {"code":"200","message":"OK","data":{"draftId":1,"savedAt":"2026-04-30T10:00:00"}} },
  'delete:/api/diaries/draft/{draftId}': { desc: '임시저장을 삭제합니다.\n\n**에러:** D007(존재하지 않음)', ex: {"code":"200","message":"OK","data":null} },

  // ── 탐색/매칭 ──
  'get:/api/diaries/explore': { desc: '다른 사용자의 일기를 탐색합니다 (카드 스와이프 UI).\n\n**쿼리 파라미터:**\n- `cursor` (선택): 이전 응답의 nextCursor 값\n- `size` (기본 10): 한 번에 가져올 개수\n- `sort` (기본 latest): `latest`(최신순) 또는 `recommended`(AI 추천순, 현재 최신순 폴백)\n- `sido` (선택): 시/도 필터 (예: "서울특별시")\n- `sigungu` (선택): 시/군/구 필터\n- `ageGroup` (선택): 연령대 필터 (예: "20대")\n- `keywordFilter` (기본 false): true이면 내 이상형 키워드와 일치하는 일기만\n\n**필터링 규칙:**\n- 이성 일기만 노출\n- 차단한/된 유저 제외\n- 이미 매칭 신청/넘긴 일기 제외\n- 교환일기 3건 만석 유저 제외\n\n**응답 카드:** nickname, ageGroup, sido, sigungu, content(앞 200자), personalityKeywords(상위3), moodTags', ex: {"code":"200","message":"OK","data":{"diaries":[{"diaryId":10,"nickname":"미소짓는풍선","ageGroup":"20대","sido":"서울특별시","content":"오늘은...","personalityKeywords":["안정 추구"]}],"nextCursor":9,"hasMore":true}} },

  'get:/api/diaries/{diaryId}/detail': { desc: '탐색에서 선택한 일기의 상세를 조회합니다.\n\n**응답 포함:**\n- 일기 전체 본문\n- 작성자 성격 키워드 (AI 분석 결과)\n- 작성자의 다른 공개 일기 미리보기 (최대 3건)\n- 유사도 점수/배지 (AI 연동 시)', ex: {"code":"200","message":"OK","data":{"diaryId":10,"content":"오늘은...","personalityKeywords":["안정 추구"]}} },

  'get:/api/matching/recommendations': { desc: 'AI 기반 매칭 추천 목록을 조회합니다.\n\n**동작:**\n- KoSimCSE 유사도 기반 상위 추천\n- Redis 캐시(24h) → 만료 시 stale 캐시 폴백 (빈 응답 방지)\n- AI FastAPI 미연동 시 AI003 에러\n\n**에러:** AI003(AI 매칭 서버 오류)', ex: {"code":"200","message":"OK","data":[{"diaryId":10,"nickname":"미소짓는풍선","similarityScore":0.85}]} },

  'get:/api/matching/recommendations/{diaryId}/preview': { desc: '추천 일기의 블라인드 미리보기를 조회합니다.\n\n**응답:**\n- 본문 앞 100자만 노출\n- 유사도 배지: 0.7이상 "잘 맞을 것 같아요", 0.5~0.7 "공통점이 있어요"', ex: {"code":"200","message":"OK","data":{"diaryId":10,"preview":"오늘은...","similarityBadge":"잘 맞을 것 같아요"}} },

  'get:/api/matching/lifestyle-report': { desc: '내 라이프스타일 리포트를 조회합니다.\n\n**활성화 조건:** 일기 5편 이상 작성\n- 5편 미만이면 analysisAvailable=false, requiredDiaryCount=5 반환\n\n**응답 (활성화 시):**\n- 활동 히트맵, 요일별 패턴, 감정 그래프, 평균 일기 길이 등', ex: {"code":"200","message":"OK","data":{"analysisAvailable":true,"requiredDiaryCount":5,"currentDiaryCount":7}} },

  'post:/api/matching/{diaryId}/select': { desc: '해당 일기 작성자에게 교환일기를 신청합니다.\n\n**동작:**\n- PENDING 상태로 매칭 요청 생성\n- 상대방에게 MATCHING_REQUEST 알림 발송\n- **양방향 매칭 감지:** 상대도 나에게 신청했으면 자동으로 매칭 성사 → 교환일기 방 생성\n- 비관적 락(PESSIMISTIC_WRITE)으로 Race Condition 방지\n\n**에러:** M001(이미 신청), M003(차단), M004(일기 없음), M005(교환 3건 만석)', ex: {"code":"200","message":"OK","data":{"matchingId":1,"status":"PENDING"}} },

  'post:/api/matching/{diaryId}/skip': { desc: '해당 일기를 넘깁니다.\n\n**동작:** matching_pass 테이블에 기록, 7일간 탐색에서 재노출 방지', ex: {"code":"200","message":"OK","data":null} },

  'get:/api/matching/requests': { desc: '받은 매칭 요청 목록을 조회합니다.\n\n**응답:** 요청자 닉네임, 연령대, 일기 미리보기 포함\n- matchingId를 POST /api/matching/requests/{matchingId}/accept에 전달', ex: {"code":"200","message":"OK","data":[{"matchingId":1,"nickname":"미소짓는풍선","ageGroup":"20대"}]} },

  'post:/api/matching/requests/{matchingId}/accept': { desc: '매칭 요청을 수락합니다.\n\n**동작:**\n- 매칭 상태 PENDING → MATCHED\n- 교환일기 방 자동 생성 (roomUuid 반환)\n- 양측에게 MATCHING_MATCHED 알림 발송\n\n**에러:** M006(존재하지 않는 매칭)', ex: {"code":"200","message":"OK","data":{"roomUuid":"bf48bc80-4773-4d50-a293-3ba5f7cea823"}} },

  // ── 교환일기 ──
  'get:/api/exchange-rooms': { desc: '현재 진행 중인 교환일기 방 목록을 조회합니다.\n\n**응답:** ACTIVE 상태 방만 반환\n- roomUuid, partnerNickname, status, turnCount, isMyTurn, deadlineAt\n- isMyTurn=true이면 내가 작성할 차례', ex: {"code":"200","message":"OK","data":{"rooms":[{"roomUuid":"bf48bc80-...","partnerNickname":"미소짓는풍선","status":"ACTIVE","isMyTurn":true}]}} },

  'get:/api/exchange-rooms/{roomUuid}': { desc: '교환일기 방 상세를 조회합니다.\n\n**응답 포함:**\n- 방 상태, 현재 턴, 총 턴 수(라운드1: 4턴, 라운드2: 2턴)\n- 내 차례 여부, 데드라인\n- 작성된 일기 목록 (turnNumber 순)\n\n**에러:** ER001(존재하지 않음), ER002(참여자 아님)', ex: {"code":"200","message":"OK","data":{"roomUuid":"bf48bc80-...","status":"ACTIVE","turnCount":2,"totalTurns":4,"isMyTurn":true}} },

  'get:/api/exchange-rooms/{roomUuid}/diaries/{diaryId}': { desc: '교환일기 개별 일기를 열람합니다.\n\n**동작:** 최초 열람 시 readAt 자동 기록 (읽음 확인용)\n\n**에러:** ER002(참여자 아님)', ex: {"code":"200","message":"OK","data":{"diaryId":1,"content":"오늘은...","turnNumber":1,"readAt":"2026-04-30T10:00:00"}} },

  'post:/api/exchange-rooms/{roomUuid}/diaries': { desc: '교환일기를 작성합니다. 내 차례일 때만 가능.\n\n**요청 필드:**\n- `content` (필수): 200~1000자\n\n**동작:**\n- 턴 기반 — 내 차례(isMyTurn=true)가 아니면 ER003\n- 데드라인 초과 시 ER004\n- 작성 후 상대에게 턴 넘김 + 알림\n- 라운드1: 4턴(2회 왕복) 완주 → COMPLETED\n\n**에러:** ER003(내 차례 아님), ER004(시간 만료)', ex: {"code":"201","message":"CREATED","data":{"diaryId":5,"turnNumber":3}} },

  'post:/api/exchange-rooms/{roomUuid}/diaries/{diaryId}/reaction': { desc: '상대방 일기에 감정 리액션을 남깁니다.\n\n**요청 필드:**\n- `reaction` (필수): `HEART`, `SAD`, `HAPPY`, `FIRE` 중 택 1\n\n**규칙:** 본인 일기에는 리액션 불가 (ER005)\n\n**에러:** ER005(본인 일기)', ex: {"code":"200","message":"OK","data":null} },

  'get:/api/exchange-rooms/{roomUuid}/report': { desc: 'AI 공통점 리포트를 조회합니다.\n\n**응답:**\n- 4턴 완주 후 AI가 양측 일기를 분석하여 공통 주제/성격 추출\n- 분석 중이면 HTTP 202 + ER007 코드 반환\n- AI 동의(AI_DATA_USAGE) 없으면 CONSENT_REQUIRED 상태\n\n**에러:** ER007(분석 중, 202)', ex: {"code":"200","message":"OK","data":{"reportId":1,"commonTopics":["여행","음식"],"compatibilityScore":0.78}} },

  'post:/api/exchange-rooms/{roomUuid}/next-step': { desc: '교환일기 완주 후 관계 확장을 선택합니다.\n\n**요청 필드:**\n- `choice` (필수): `CHAT`(채팅 전환) 또는 `CONTINUE`(추가 교환)\n\n**동작:**\n- 양측 모두 CHAT → 채팅방 자동 생성 (CHAT_CREATED)\n- 양측 모두 CONTINUE → 라운드2 추가 교환 (2턴, AUTO_EXTENDED)\n- 불일치 → 라운드1이면 라운드2로 자동 연장, 라운드2면 ARCHIVED\n\n**에러:** NS001(완주 전), NS002(이미 선택)', ex: {"code":"200","message":"OK","data":{"myChoice":"CHAT","bothChosen":true,"result":"CHAT_CREATED"}} },

  'get:/api/exchange-rooms/{roomUuid}/next-step/status': { desc: '양측의 관계 확장 선택 상태를 조회합니다.\n\n**응답:** myChoice(내 선택), partnerChosen(상대 선택 여부)\n- 상대가 아직 선택 안 했으면 partnerChosen=false', ex: {"code":"200","message":"OK","data":{"myChoice":"CHAT","partnerChosen":false}} },

  // ── 채팅 ──
  'post:/api/exchange-rooms/{roomUuid}/chat': { desc: '채팅방을 생성합니다.\n\n**동작:** 양측 CHAT 선택 시 자동 생성되므로 직접 호출할 일은 거의 없음\n\n**에러:** CR008(이미 연결됨)', ex: {"code":"201","message":"CREATED","data":{"chatRoomId":1}} },

  'get:/api/chat-rooms': { desc: '채팅방 목록을 조회합니다.\n\n**응답:** ACTIVE 상태 방 목록\n- partnerNickname, lastMessage, lastMessageAt, unreadCount 포함\n- N+1 최적화 적용 (JOIN FETCH + 배치 쿼리)', ex: {"code":"200","message":"OK","data":{"chatRooms":[{"chatRoomId":1,"partnerNickname":"미소짓는풍선","status":"ACTIVE","lastMessage":"안녕하세요!","unreadCount":2}]}} },

  'get:/api/chat-rooms/{roomId}/messages': { desc: '채팅 메시지 이력을 커서 기반으로 조회합니다.\n\n**쿼리 파라미터:**\n- `cursor` (선택): 이전 응답의 nextCursor\n- `size` (기본 20): 한 번에 가져올 개수\n\n**응답:** 최신순 정렬, sequenceId로 순서 보장\n- type: TEXT(일반), SYSTEM(시스템 메시지)', ex: {"code":"200","message":"OK","data":{"messages":[{"messageId":1,"content":"안녕하세요!","type":"TEXT","sequenceId":1}],"hasMore":false}} },

  'get:/api/chat-rooms/{roomId}/profile': { desc: '채팅 상대방의 프로필을 조회합니다.\n\n**응답:** nickname, gender, ageGroup, personalityTags(AI 분석 성격 태그 상위 3개)', ex: {"code":"200","message":"OK","data":{"userId":2,"nickname":"미소짓는풍선","gender":"FEMALE","ageGroup":"20대","personalityTags":["안정 추구"]}} },

  'post:/api/chat-rooms/{roomId}/messages': { desc: '채팅 메시지를 전송합니다 (REST 방식).\n\n**요청 필드:**\n- `content` (필수): 메시지 본문\n- `type` (필수): `TEXT`\n\n**동작:**\n1. 금칙어 검열 (SC001)\n2. XSS 이스케이프\n3. Redis INCR로 sequenceId 발급\n4. 외부 연락처(전화번호/카카오/인스타) 탐지 → 플래그 처리\n\n**실시간 채팅:** WebSocket STOMP (`/ws/chat` 연결, `/topic/chat/{roomId}` 구독)\n\n**에러:** SC001(부적절한 내용), CR007(종료된 채팅방)', ex: {"code":"200","message":"OK","data":{"messageId":5,"sequenceId":5,"sentAt":"2026-04-30T10:00:00"}} },

  'post:/api/chat-rooms/{roomId}/leave': { desc: '채팅방을 나갑니다.\n\n**동작:**\n- 시스템 메시지 생성 ("상대방이 채팅방을 나갔습니다")\n- 채팅방 상태 CHAT_LEFT로 변경\n- WebSocket으로 상대에게 브로드캐스트\n\n**에러:** CR002(참여자 아님)', ex: {"code":"200","message":"OK","data":null} },

  // ── 커플 ──
  'post:/api/chat-rooms/{roomId}/couple-request': { desc: '채팅 상대에게 커플 요청을 보냅니다.\n\n**동작:**\n- 72시간 만료 타이머 시작\n- 24시간/48시간 후 리마인드 알림 발송 예약\n- 이미 요청 보냈으면 CR003\n\n**에러:** CR003(이미 요청), CR004(이미 커플)', ex: {"code":"200","message":"OK","data":{"coupleRequestId":1,"expiresAt":"2026-05-03T10:00:00"}} },

  'post:/api/chat-rooms/{roomId}/couple-accept': { desc: '커플 요청을 수락합니다.\n\n**동작:**\n- Couple 엔티티 생성 (confirmedAt 기록)\n- ChatRoom 상태 COUPLE_CONFIRMED로 변경\n- 양측에게 COUPLE_CONFIRMED 알림\n\n**에러:** CR005(요청 없음), CR006(만료)', ex: {"code":"200","message":"OK","data":{"coupleId":1,"confirmedAt":"2026-04-30T10:00:00"}} },

  'post:/api/chat-rooms/{roomId}/couple-reject': { desc: '커플 요청을 거절합니다.\n\n**에러:** CR005(요청 없음)', ex: {"code":"200","message":"OK","data":null} },

  // ── 신고/차단 ──
  'post:/api/users/{targetUserId}/report': { desc: '사용자를 신고합니다.\n\n**요청 필드:**\n- `reason` (필수): 신고 사유 (예: "SPAM", "HARASSMENT")\n- `detail` (선택): 상세 설명\n\n**규칙:**\n- 자기 자신 신고 불가 (R001)\n- 동일 유저 7일 이내 중복 신고 불가 (R002)\n- 5건 누적 시 관리자에게 자동 알림\n\n**에러:** R001(자기 신고), R002(중복)', ex: {"code":"200","message":"OK","data":null} },

  'post:/api/users/{targetUserId}/block': { desc: '사용자를 차단합니다.\n\n**동작 (단일 트랜잭션):**\n1. 차단 기록 생성\n2. 진행 중인 매칭 요청 취소\n3. 활성 교환일기 방 종료 (TERMINATED)\n4. 활성 채팅방 종료\n5. 차단 상대 탐색/추천에서 영구 제외\n\n**에러:** B001(자기 차단), B002(이미 차단)', ex: {"code":"200","message":"OK","data":null} },

  'delete:/api/users/{targetUserId}/block': { desc: '차단을 해제합니다.\n\n**동작:** 차단 해제 후에도 종료된 교환/채팅은 복구되지 않음\n- 재차단 시 unique 위반 방지 처리 (reblock)\n\n**에러:** B003(차단 기록 없음)', ex: {"code":"200","message":"OK","data":null} },

  'get:/api/users/me/block-list': { desc: '차단한 사용자 목록을 커서 기반으로 조회합니다.\n\n**쿼리 파라미터:**\n- `cursor` (선택): 이전 nextCursor\n- `size` (기본 20)\n\n**응답:** blockId, blockedUserId, blockedNickname, blockedAt', ex: {"code":"200","message":"OK","data":{"blocks":[{"blockId":1,"blockedUserId":5,"blockedNickname":"차단된유저"}],"nextCursor":null,"hasMore":false}} },

  // ── 알림 ──
  'get:/api/notifications': { desc: '최근 30일간의 알림 목록을 조회합니다.\n\n**알림 타입:**\n- MATCHING_REQUEST: 매칭 신청 알림\n- MATCHING_MATCHED: 매칭 성사 알림\n- EXCHANGE_TURN: 교환일기 턴 알림\n- COUPLE_CONFIRMED: 커플 확정 알림\n- AI_ANALYSIS_DONE: AI 분석 완료 알림\n- SYSTEM: 시스템 공지 등', ex: {"code":"200","message":"OK","data":{"notifications":[{"notificationId":1,"type":"MATCHING_REQUEST","title":"매칭 요청","body":"미소짓는풍선님이 교환을 신청했어요","isRead":false}]}} },

  'patch:/api/notifications/{id}/read': { desc: '개별 알림을 읽음 처리합니다. 이미 읽은 알림도 에러 없이 처리됩니다 (멱등).\n\n**에러:** N001(존재하지 않는 알림)', ex: {"code":"200","message":"OK","data":null} },

  'patch:/api/notifications/read-all': { desc: '모든 미읽음 알림을 한 번에 읽음 처리합니다.\n\n**응답:** updatedCount(읽음 처리된 개수), readAt(처리 시간)', ex: {"code":"200","message":"OK","data":{"updatedCount":3,"readAt":"2026-04-30T10:00:00"}} },

  'get:/api/users/me/notification-settings': { desc: '알림 설정을 조회합니다.\n\n**6종 카테고리:**\n- matching: 매칭 관련 알림\n- diaryTurn: 교환일기 턴 알림\n- chat: 채팅 메시지 알림\n- aiAnalysis: AI 분석 완료 알림\n- couple: 커플 관련 알림\n- system: 시스템 알림', ex: {"code":"200","message":"OK","data":{"matching":true,"diaryTurn":true,"chat":true,"aiAnalysis":true,"couple":true,"system":true}} },

  'patch:/api/users/me/notification-settings': { desc: '알림 설정을 수정합니다. 변경할 항목만 보내면 됩니다 (PATCH).\n\n**요청 예시:** `{"matching":false}` → matching만 끔, 나머지 유지', ex: {"code":"200","message":"OK","data":{"matching":true,"diaryTurn":true,"chat":true,"aiAnalysis":true,"couple":true,"system":true}} },

  // ── 계정 ──
  'post:/api/users/me/deactivate': { desc: '회원 탈퇴를 요청합니다 (30일 유예 후 영구 삭제).\n\n**요청 필드:**\n- `reason` (선택): 탈퇴 사유\n- `detail` (선택): 상세 설명, 최대 500자\n\n**동작:**\n1. 계정 상태 DEACTIVATED, permanentDeleteAt = 30일 후\n2. 활성 교환일기/채팅 전부 TERMINATED\n3. Redis 키 정리 (RT, 매칭 캐시, AI 캐시)\n4. 30일 내 POST /api/users/me/restore로 복구 가능\n5. 30일 후 배치에서 영구 삭제 (일기 익명화, 개인정보 삭제)', ex: {"code":"200","message":"OK","data":{"deactivatedAt":"2026-04-30T10:00:00","permanentDeleteAt":"2026-05-30T10:00:00"}} },

  'post:/api/users/me/restore': { desc: '탈퇴 유예 계정을 복구합니다 (마이페이지 경로).\n\n**동작:** DEACTIVATED → ACTIVE, 탈퇴 관련 필드 초기화\n- 30일 초과 시 복구 불가 (영구 삭제됨)', ex: {"code":"200","message":"OK","data":{"userId":1,"restoredAt":"2026-04-30T10:00:00","status":"ACTIVE"}} },

  'get:/api/users/me/ai-profile': { desc: 'AI 성격 분석 결과를 조회합니다.\n\n**활성화 조건:** 일기 3편 이상 작성\n- 3편 미만이면 analysisAvailable=false\n\n**응답 (활성화 시):**\n- dominantPersonalityTags: 관계성향 상위 3개 (예: "안정 추구", "공감 우선")\n- dominantEmotionTags: 감정 상위 3개\n- dominantLifestyleTags: 라이프스타일 상위 3개\n- dominantToneTags: 글쓰기 톤 상위 3개\n\n각 태그는 diary_keywords 테이블의 빈도 집계 기반', ex: {"code":"200","message":"OK","data":{"analysisAvailable":true,"diaryCount":5,"dominantPersonalityTags":["안정 추구","공감 우선"],"dominantEmotionTags":["편안함"],"dominantLifestyleTags":["미식"],"dominantToneTags":["솔직한"]}} },

  'post:/api/users/me/appeals': { desc: '제재에 대한 이의신청을 접수합니다.\n\n**요청 필드:**\n- `sanctionId` (필수): 제재 이력 ID\n- `reason` (필수): 이의신청 사유, 20~500자\n\n**조건:** SUSPEND_7D 또는 SUSPEND_30D 상태만 가능\n- BANNED(영구 정지)는 이의신청 불가\n- 동일 제재에 중복 이의신청 불가\n\n**에러:** AP001(정지 상태 아님), AP002(이미 접수됨), AP003(영구 정지)', ex: {"code":"200","message":"OK","data":{"appealId":1,"status":"PENDING","createdAt":"2026-04-30T10:00:00"}} },

  // ── 마이페이지 ──
  'get:/api/users/me/ideal-type': { desc: '마이페이지에서 이상형 키워드를 조회합니다.\n\n**응답:** 설정된 키워드 목록, maxSelectable(최대 선택 가능 수), nextEditableAt(다음 수정 가능 시간)', ex: {"code":"200","message":"OK","data":{"keywords":[{"id":1,"text":"안정적인 사람","type":"PERSONALITY"}],"maxSelectable":3}} },

  'put:/api/users/me/ideal-type': { desc: '이상형 키워드를 수정합니다.\n\n**요청 필드:**\n- `keywordIds`: 키워드 ID 배열 (최대 3개)\n\n**동작:**\n- 기존 키워드 전부 삭제 후 새로 INSERT (DELETE-then-INSERT)\n- 매칭 추천 캐시(MATCHING:RECO:{userId}) 자동 무효화\n\n**에러:** U004(키워드 수 초과)', ex: {"code":"200","message":"OK","data":{"keywords":[{"id":1,"text":"안정적인 사람","type":"PERSONALITY"}],"maxSelectable":3}} },

  'get:/api/users/me/history/exchange-rooms': { desc: '교환일기 히스토리를 커서 기반으로 조회합니다.\n\n**포함 상태:** COMPLETED, CHAT_CONNECTED, EXPIRED, TERMINATED, ARCHIVED\n\n**쿼리 파라미터:** cursor, size(기본 10)', ex: {"code":"200","message":"OK","data":{"rooms":[{"roomUuid":"bf48bc80-...","partnerNickname":"미소짓는풍선","status":"COMPLETED","totalDiaryCount":4}],"hasMore":false}} },

  'get:/api/users/me/history/chat-rooms': { desc: '채팅 히스토리를 커서 기반으로 조회합니다.\n\n**쿼리 파라미터:** cursor, size(기본 10)', ex: {"code":"200","message":"OK","data":{"chatRooms":[{"chatRoomId":1,"partnerNickname":"미소짓는풍선","status":"TERMINATED"}],"hasMore":false}} },

  'patch:/api/users/me/settings': { desc: '앱 설정을 수정합니다.\n\n**수정 가능 필드:**\n- `darkMode`: 다크모드 (true/false)\n- `language`: 언어 (ko/en)\n- `ageFilterRange`: 탐색 연령 필터 범위 (정수, 예: 5 = ±5세)\n\n변경할 필드만 보내면 됩니다 (Upsert).', ex: {"code":"200","message":"OK","data":{"darkMode":false,"language":"ko","ageFilterRange":5}} },

  // ── 공지/FAQ/지원 ──
  'get:/api/notices': { desc: '공지사항 목록을 조회합니다.\n\n**정렬:** 고정(isPinned=true) 우선, 그 다음 최신순\n- Redis 1시간 캐싱 적용', ex: {"code":"200","message":"OK","data":[{"noticeId":1,"title":"서비스 업데이트","isPinned":true}]} },
  'get:/api/notices/{id}': { desc: '공지사항 상세를 조회합니다.\n\n**에러:** NT001(존재하지 않음)', ex: {"code":"200","message":"OK","data":{"noticeId":1,"title":"서비스 업데이트","content":"업데이트 내용..."}} },
  'get:/api/notices/banners': { desc: '현재 활성화된 배너를 조회합니다. 최대 5개.\n\n**응답:** id, title, imageUrl, linkType(NONE/INTERNAL/EXTERNAL), linkUrl\n- Redis 1시간 캐싱', ex: {"code":"200","message":"OK","data":[{"id":1,"title":"이벤트","imageUrl":"https://...","linkType":"NONE"}]} },
  'get:/api/notices/unread-count': { desc: '미읽음 공지 수를 반환합니다.\n\n**동작:** lastReadNoticeId 기준으로 그 이후 공지 수 카운트', ex: {"code":"200","message":"OK","data":5} },
  'get:/api/faq': { desc: 'FAQ 목록을 조회합니다.\n\n**응답:** faqId, question, answer, category\n- Redis 1시간 캐싱', ex: {"code":"200","message":"OK","data":[{"faqId":1,"question":"교환일기는 어떻게 시작하나요?","answer":"일기를 작성하고..."}]} },
  'post:/api/support/inquiry': { desc: '1:1 문의를 접수합니다.\n\n**요청 필드:**\n- `category` (필수): 문의 카테고리 (예: "기능 문의", "버그 제보")\n- `title` (필수): 제목\n- `content` (필수): 문의 내용\n\n**제한:** 진행 중(PENDING) 문의 5건 초과 시 SP001 에러\n\n**에러:** SP001(5건 초과)', ex: {"code":"200","message":"OK","data":{"inquiryId":1,"createdAt":"2026-04-30T10:00:00"}} },
  'get:/api/support/inquiries': { desc: '내 문의 목록을 조회합니다.\n\n**응답:** inquiryId, category, title, status(PENDING/ANSWERED/CLOSED), createdAt', ex: {"code":"200","message":"OK","data":[{"inquiryId":1,"category":"기능 문의","title":"테스트","status":"PENDING"}]} },
  'get:/api/support/inquiries/{id}': { desc: '문의 상세를 조회합니다.\n\n**응답:** 문의 내용 + 관리자 답변(answer, 없으면 null)\n\n**에러:** SP003(존재하지 않음)', ex: {"code":"200","message":"OK","data":{"inquiryId":1,"title":"테스트","content":"내용...","answer":null,"status":"PENDING"}} },
};

let applied = 0;
for (const [p, methods] of Object.entries(raw.paths)) {
  for (const [method, spec] of Object.entries(methods)) {
    const key = method + ':' + p;
    const meta = apiMeta[key];
    if (meta) {
      if (meta.desc) spec.description = meta.desc;
      if (meta.ex) {
        const respCode = meta.ex.code === '201' ? '201' : '200';
        if (!spec.responses) spec.responses = {};
        if (!spec.responses[respCode]) spec.responses[respCode] = { description: '성공' };
        spec.responses[respCode].content = {
          'application/json': { example: meta.ex }
        };
      }
      applied++;
    }
  }
}

fs.writeFileSync(path.join(__dirname, '..', 'swagger-user.json'), JSON.stringify(raw, null, 2));
console.log(`swagger-user.json 생성 완료 — API ${apiCount}개, 설명+예시 ${applied}개 적용`);
