package com.ember.ember.global.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ── 공통 (C) ──
    BAD_REQUEST("C001", HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    DUPLICATE_RESOURCE("C002", HttpStatus.CONFLICT, "이미 존재하는 리소스입니다."),
    INTERNAL_ERROR("C003", HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류입니다."),
    RATE_LIMIT_EXCEEDED("C004", HttpStatus.TOO_MANY_REQUESTS, "요청 횟수가 초과되었습니다."),

    // ── 인증 (A) — 사용자 ──
    TOKEN_NOT_FOUND("A001", HttpStatus.UNAUTHORIZED, "인증 토큰이 없습니다."),
    TOKEN_EXPIRED("A002", HttpStatus.UNAUTHORIZED, "만료된 토큰입니다."),
    ACCOUNT_NOT_FOUND("A003", HttpStatus.UNAUTHORIZED, "존재하지 않는 계정입니다."),
    PASSWORD_MISMATCH("A004", HttpStatus.UNAUTHORIZED, "비밀번호가 일치하지 않습니다."),
    REFRESH_TOKEN_MISMATCH("A005", HttpStatus.UNAUTHORIZED, "유효하지 않은 Refresh Token입니다."),
    BLACKLISTED_TOKEN("A006", HttpStatus.UNAUTHORIZED, "로그아웃된 토큰입니다."),
    ACCESS_DENIED("A007", HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    SUPER_ADMIN_ONLY("A008", HttpStatus.FORBIDDEN, "해당 작업은 SUPER_ADMIN만 수행할 수 있습니다."),
    SOCIAL_AUTH_FAILED("A009", HttpStatus.UNAUTHORIZED, "소셜 인증에 실패했습니다."),
    UNSUPPORTED_PROVIDER("A010", HttpStatus.BAD_REQUEST, "지원하지 않는 로그인 방식입니다."),

    // A011/A012 — 사용자 계정 복구 전용
    RESTORE_TOKEN_INVALID("A011", HttpStatus.UNAUTHORIZED, "유효하지 않은 복구 토큰입니다."),
    RESTORE_PERIOD_EXPIRED("A012", HttpStatus.BAD_REQUEST, "계정 복구 가능 기간이 만료되었습니다."),

    // A020/A021/A022 — 관리자 전용 (관리자 API 통합명세서 v2.1 §1.1)
    ADMIN_LOGIN_LIMIT("A020", HttpStatus.TOO_MANY_REQUESTS, "로그인 시도 횟수를 초과했습니다."),
    ADMIN_ACCOUNT_INACTIVE("A021", HttpStatus.FORBIDDEN, "비활성화된 계정입니다."),
    ADMIN_ACCOUNT_SUSPENDED("A022", HttpStatus.FORBIDDEN, "정지된 계정입니다."),

    // ── 사용자 (U) ──
    NICKNAME_DUPLICATE("U001", HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
    UNDERAGE_USER("U002", HttpStatus.BAD_REQUEST, "만 18세 이상만 가입 가능합니다."),
    IMAGE_SIZE_EXCEEDED("U003", HttpStatus.BAD_REQUEST, "이미지 용량이 10MB를 초과합니다."),
    KEYWORD_COUNT_INVALID("U004", HttpStatus.BAD_REQUEST, "이상형 키워드는 3~5개 선택해야 합니다."),
    KEYWORD_NOT_FOUND("U005", HttpStatus.NOT_FOUND, "존재하지 않는 키워드입니다."),
    NICKNAME_CHANGE_COOLDOWN("U006", HttpStatus.BAD_REQUEST, "닉네임 변경은 30일에 1회만 가능합니다."),

    // ── 일기 (D) ──
    DIARY_DAILY_LIMIT("D001", HttpStatus.CONFLICT, "오늘 이미 일기를 작성했습니다."),
    DIARY_CONTENT_LENGTH("D002", HttpStatus.BAD_REQUEST, "글자 수 제한(200~1,000자)에 맞지 않습니다."),
    TOPIC_NOT_FOUND("D003", HttpStatus.NOT_FOUND, "존재하지 않는 주제입니다."),
    DIARY_NOT_FOUND("D004", HttpStatus.NOT_FOUND, "존재하지 않는 일기입니다."),
    DIARY_UNAUTHORIZED("D005", HttpStatus.FORBIDDEN, "본인의 일기가 아닙니다."),
    DIARY_NOT_EDITABLE("D006", HttpStatus.BAD_REQUEST, "당일 작성한 일기만 수정 가능합니다."),
    DRAFT_NOT_FOUND("D007", HttpStatus.NOT_FOUND, "존재하지 않는 임시저장 일기입니다."),
    DRAFT_LIMIT_EXCEEDED("D008", HttpStatus.BAD_REQUEST, "임시저장은 최대 3건까지 가능합니다."),

    // ── 매칭 (M) ──
    MATCHING_ALREADY_REQUESTED("M001", HttpStatus.CONFLICT, "이미 교환 신청한 사용자입니다."),
    MATCHING_SELF_REQUEST("M002", HttpStatus.BAD_REQUEST, "자기 자신에게 신청할 수 없습니다."),
    MATCHING_BLOCKED_USER("M003", HttpStatus.FORBIDDEN, "차단된 사용자입니다."),
    MATCHING_NO_DIARY("M004", HttpStatus.BAD_REQUEST, "일기를 먼저 작성해야 매칭이 가능합니다."),
    MATCHING_CONCURRENT_LIMIT("M005", HttpStatus.CONFLICT, "동시에 진행할 수 있는 교환일기는 최대 3건입니다."),

    // ── 교환일기 (ER) ──
    EXCHANGE_ROOM_NOT_FOUND("ER001", HttpStatus.NOT_FOUND, "존재하지 않는 교환일기 방입니다."),
    EXCHANGE_NOT_PARTICIPANT("ER002", HttpStatus.FORBIDDEN, "교환일기 참여자가 아닙니다."),
    EXCHANGE_NOT_YOUR_TURN("ER003", HttpStatus.BAD_REQUEST, "현재 내 차례가 아닙니다."),
    EXCHANGE_EXPIRED("ER004", HttpStatus.BAD_REQUEST, "작성 제한 시간이 만료되었습니다."),
    EXCHANGE_SELF_REACTION("ER005", HttpStatus.BAD_REQUEST, "본인 일기에는 리액션할 수 없습니다."),
    EXCHANGE_REPORT_NOT_FOUND("ER006", HttpStatus.NOT_FOUND, "공통점 리포트가 아직 생성되지 않았습니다."),
    EXCHANGE_REPORT_PROCESSING("ER007", HttpStatus.ACCEPTED, "공통점 리포트 분석 중입니다."),
    EXCHANGE_NOT_COMPLETED("ER008", HttpStatus.BAD_REQUEST, "교환일기가 아직 완료되지 않았습니다."),
    EXCHANGE_DIARY_NOT_FOUND("ER009", HttpStatus.NOT_FOUND, "존재하지 않는 교환일기입니다."),

    // ── 다음 단계 (NS) ──
    NEXT_STEP_NOT_COMPLETED("NS001", HttpStatus.BAD_REQUEST, "교환일기가 완료되지 않아 선택할 수 없습니다."),
    NEXT_STEP_ALREADY_CHOSEN("NS002", HttpStatus.CONFLICT, "이미 선택을 완료했습니다."),
    NEXT_STEP_NOT_PARTICIPANT("NS003", HttpStatus.FORBIDDEN, "교환일기 참여자가 아닙니다."),

    // ── 채팅/커플 (CR) ──
    CHATROOM_NOT_FOUND("CR001", HttpStatus.NOT_FOUND, "존재하지 않는 채팅방입니다."),
    CHATROOM_NOT_PARTICIPANT("CR002", HttpStatus.FORBIDDEN, "채팅방 참여자가 아닙니다."),
    COUPLE_REQUEST_ALREADY_SENT("CR003", HttpStatus.CONFLICT, "이미 커플 요청을 보냈습니다."),
    COUPLE_ALREADY_CONFIRMED("CR004", HttpStatus.CONFLICT, "이미 커플 확정된 채팅방입니다."),
    COUPLE_REQUEST_NOT_FOUND("CR005", HttpStatus.NOT_FOUND, "존재하지 않는 커플 요청입니다."),
    COUPLE_REQUEST_EXPIRED("CR006", HttpStatus.BAD_REQUEST, "만료된 커플 요청입니다."),
    CHATROOM_TERMINATED("CR007", HttpStatus.BAD_REQUEST, "이미 종료된 채팅방입니다."),
    CHATROOM_ALREADY_LINKED("CR008", HttpStatus.CONFLICT, "이미 연결된 채팅방이 있습니다."),

    // ── 신고 (R) ──
    REPORT_SELF("R001", HttpStatus.BAD_REQUEST, "자기 자신을 신고할 수 없습니다."),
    REPORT_DUPLICATE("R002", HttpStatus.CONFLICT, "이미 신고한 사용자입니다."),

    // ── 차단 (B) ──
    BLOCK_SELF("B001", HttpStatus.BAD_REQUEST, "자기 자신을 차단할 수 없습니다."),
    BLOCK_DUPLICATE("B002", HttpStatus.CONFLICT, "이미 차단한 사용자입니다."),
    BLOCK_NOT_FOUND("B003", HttpStatus.NOT_FOUND, "차단 기록이 없습니다."),

    // ── AI 서버 (AI) ──
    AI_ANALYSIS_ERROR("AI001", HttpStatus.BAD_GATEWAY, "AI 분석 서버 응답 오류"),
    AI_ANALYSIS_TIMEOUT("AI002", HttpStatus.GATEWAY_TIMEOUT, "AI 분석 서버 타임아웃"),
    AI_MATCHING_ERROR("AI003", HttpStatus.BAD_GATEWAY, "AI 매칭 서버 응답 오류"),
    AI_MATCHING_TIMEOUT("AI004", HttpStatus.GATEWAY_TIMEOUT, "AI 매칭 서버 타임아웃"),
    AI_REPORT_ERROR("AI005", HttpStatus.BAD_GATEWAY, "AI 리포트 서버 응답 오류"),
    AI_REPORT_TIMEOUT("AI006", HttpStatus.GATEWAY_TIMEOUT, "AI 리포트 서버 타임아웃"),
    AI_PIPELINE_ERROR("AI007", HttpStatus.BAD_GATEWAY, "AI 파이프라인 상태 조회 실패"),

    // ── 공지사항 (NT) ──
    NOTICE_NOT_FOUND("NT001", HttpStatus.NOT_FOUND, "존재하지 않는 공지사항입니다."),
    NOTICE_COUNT_ERROR("NT002", HttpStatus.INTERNAL_SERVER_ERROR, "공지 수 조회에 실패했습니다."),

    // ── 고객센터 (SP) ──
    INQUIRY_LIMIT_EXCEEDED("SP001", HttpStatus.TOO_MANY_REQUESTS, "진행 중인 문의가 너무 많습니다. 처리 후 다시 시도해 주세요."),
    INQUIRY_FILE_SIZE_EXCEEDED("SP002", HttpStatus.BAD_REQUEST, "첨부파일 용량이 5MB를 초과합니다."),
    INQUIRY_NOT_FOUND("SP003", HttpStatus.NOT_FOUND, "존재하지 않는 문의입니다."),

    // ── 이의신청 (AP) ──
    APPEAL_NOT_SUSPENDED("AP001", HttpStatus.BAD_REQUEST, "정지 상태의 계정만 이의신청 가능합니다."),
    APPEAL_ALREADY_PENDING("AP002", HttpStatus.CONFLICT, "이미 진행 중인 이의신청이 있습니다."),
    APPEAL_PERMANENT_BAN("AP003", HttpStatus.FORBIDDEN, "영구 정지 계정은 이의신청이 불가합니다."),

    // ── 알림 (N) ──
    NOTIFICATION_NOT_FOUND("N001", HttpStatus.NOT_FOUND, "존재하지 않는 알림이거나 접근 권한이 없습니다."),

    // ── 검열 (SC) ──
    // ── AI 동의 (AC) ──
    CONSENT_NOT_FOUND("AC001", HttpStatus.BAD_REQUEST, "동의 이력이 없습니다."),

    // ── 검열 (SC) ──
    CONTENT_FILTERED("SC001", HttpStatus.BAD_REQUEST, "부적절한 내용이 포함되어 있습니다."),

    // ── 관리자 도메인 (ADM) ──
    ADM_USER_NOT_FOUND("ADM001", HttpStatus.NOT_FOUND, "존재하지 않는 회원입니다."),
    ADM_REPORT_NOT_FOUND("ADM002", HttpStatus.NOT_FOUND, "존재하지 않는 신고입니다."),
    ADM_REPORT_ALREADY_PROCESSED("ADM003", HttpStatus.BAD_REQUEST, "이미 처리된 신고입니다."),
    ADM_ADMIN_NOT_FOUND("ADM004", HttpStatus.NOT_FOUND, "존재하지 않는 관리자 계정입니다."),
    ADM_SELF_DELETE("ADM005", HttpStatus.BAD_REQUEST, "자기 자신의 계정은 삭제할 수 없습니다."),
    ADM_DIARY_NOT_FOUND("ADM006", HttpStatus.NOT_FOUND, "일기를 찾을 수 없습니다."),
    ADM_REANALYSIS_IN_PROGRESS("ADM007", HttpStatus.BAD_REQUEST, "재분석 요청이 이미 진행 중입니다."),
    ADM_TOPIC_NOT_FOUND("ADM008", HttpStatus.NOT_FOUND, "존재하지 않는 주간 주제입니다."),
    ADM_TERMS_NOT_FOUND("ADM009", HttpStatus.NOT_FOUND, "존재하지 않는 약관입니다."),
    ADM_LAST_SUPER_ADMIN("ADM010", HttpStatus.BAD_REQUEST, "마지막 SUPER_ADMIN은 삭제할 수 없습니다."),
    ADM_AUDIT_LOG_FAILED("ADM011", HttpStatus.INTERNAL_SERVER_ERROR, "감사 로그 저장에 실패했습니다."),
    ADM_PII_LOG_FAILED("ADM012", HttpStatus.INTERNAL_SERVER_ERROR, "PII 접근 로그 저장에 실패했습니다."),

    // ── 모더레이션 CRUD (Phase 3B §9.6) ──
    ADM_BANNED_WORD_NOT_FOUND("ADM013", HttpStatus.NOT_FOUND, "존재하지 않는 금칙어입니다."),
    ADM_URL_WHITELIST_NOT_FOUND("ADM014", HttpStatus.NOT_FOUND, "존재하지 않는 허용 도메인입니다."),

    // ── 회원 제재 (API §3.3~3.5) ──
    ADM_USER_NOT_SANCTIONED("ADM015", HttpStatus.BAD_REQUEST, "제재 상태가 아닌 회원입니다."),
    ADM_BANNED_RELEASE_FORBIDDEN("ADM016", HttpStatus.FORBIDDEN, "영구 정지 해제는 SUPER_ADMIN 권한이 필요합니다."),
    ADM_SANCTION_CONFLICT("ADM017", HttpStatus.CONFLICT, "제재 처리 중 충돌이 발생했습니다. 잠시 후 다시 시도해 주세요.");

    private final String code;
    private final HttpStatus status;
    private final String message;
}
