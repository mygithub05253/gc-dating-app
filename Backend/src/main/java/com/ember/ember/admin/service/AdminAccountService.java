package com.ember.ember.admin.service;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.*;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.admin.repository.AdminAuditLogRepository;
import com.ember.ember.auth.service.TokenService;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 관리자 계정 관리 서비스 — 관리자 API 통합명세서 v2.1 §13.1~13.8
 * <p>SUPER_ADMIN 전용 엔드포인트에서 호출. {@code @AdminAction} 로 감사 로그가 자동 기록된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAccountService {

    private final AdminAccountRepository adminAccountRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    // ---------- §13.1 목록 ----------
    public Page<AdminAccountListItemResponse> list(String search,
                                                    AdminAccount.AdminRole role,
                                                    AdminAccount.AdminStatus status,
                                                    Pageable pageable) {
        String normalized = (search == null || search.isBlank()) ? null : search.trim();
        return adminAccountRepository
                .searchAdmins(normalized, role, status, pageable)
                .map(AdminAccountListItemResponse::from);
    }

    // ---------- §13.2 상세 ----------
    public AdminAccountDetailResponse getDetail(Long adminId) {
        AdminAccount account = adminAccountRepository.findByIdAndDeletedAtIsNull(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));
        return AdminAccountDetailResponse.from(account);
    }

    // ---------- §13.3 생성 ----------
    @Transactional
    @AdminAction(action = "ADMIN_ACCOUNT_CREATE", targetType = "ADMIN")
    public AdminAccountDetailResponse create(AdminAccountCreateRequest request) {
        // 1. 이메일 중복 검사 (C002)
        if (adminAccountRepository.existsByEmailAndDeletedAtIsNull(request.email())) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE);
        }

        // 2. BCrypt 해싱 (PasswordEncoder Bean strength 설정에 의존 — 기본 10)
        String passwordHash = passwordEncoder.encode(request.password());

        // 3. 저장 — 상태 미지정 시 ACTIVE
        AdminAccount.AdminStatus status = (request.status() != null)
                ? request.status()
                : AdminAccount.AdminStatus.ACTIVE;

        AdminAccount saved = adminAccountRepository.save(
                AdminAccount.create(request.email(), request.adminName(), passwordHash,
                                    request.adminRole(), status));

        // 4. 초기 비밀번호 이메일 발송 — TODO(Phase B): 메일 서비스 연동. 현재는 플래그만 로깅.
        if (Boolean.TRUE.equals(request.sendEmail())) {
            log.info("TODO: send initial password email to {}", saved.getEmail());
        }

        return AdminAccountDetailResponse.from(saved);
    }

    // ---------- §13.4 이메일 중복 확인 ----------
    public AdminEmailAvailabilityResponse checkEmail(String email) {
        boolean exists = adminAccountRepository.existsByEmailAndDeletedAtIsNull(email);
        return new AdminEmailAvailabilityResponse(!exists);
    }

    // ---------- §13.5 수정 ----------
    @Transactional
    @AdminAction(action = "ADMIN_ACCOUNT_UPDATE", targetType = "ADMIN", targetIdParam = "adminId")
    public AdminAccountDetailResponse update(Long adminId, AdminAccountUpdateRequest request) {
        AdminAccount account = adminAccountRepository.findByIdAndDeletedAtIsNull(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));

        // 직접 DELETED로 전환하는 것은 차단 — 삭제 API 사용 유도
        if (request.status() == AdminAccount.AdminStatus.DELETED) {
            throw new BusinessException(ErrorCode.BAD_REQUEST);
        }

        // 마지막 SUPER_ADMIN 역할 변경 방지 — §13.5 C002
        boolean demotingSuperAdmin = (account.getRole() == AdminAccount.AdminRole.SUPER_ADMIN)
                && (request.adminRole() != AdminAccount.AdminRole.SUPER_ADMIN);
        if (demotingSuperAdmin) {
            long activeSuperAdmins = adminAccountRepository.countByRoleAndStatus(
                    AdminAccount.AdminRole.SUPER_ADMIN, AdminAccount.AdminStatus.ACTIVE);
            if (activeSuperAdmins <= 1) {
                throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE); // "마지막 SUPER_ADMIN은 역할을 변경할 수 없습니다"
            }
        }

        boolean roleChanged = (account.getRole() != request.adminRole());

        account.updateByAdmin(request.adminName(), request.adminRole(), request.status());

        // 역할 변경 시 Redis RT 삭제로 즉시 재로그인 유도
        if (roleChanged) {
            tokenService.deleteAdminRefreshToken(adminId);
        }

        return AdminAccountDetailResponse.from(account);
    }

    // ---------- §13.6 삭제 (소프트) ----------
    @Transactional
    @AdminAction(action = "ADMIN_ACCOUNT_DELETE", targetType = "ADMIN", targetIdParam = "adminId")
    public void softDelete(Long adminId, Long currentAdminId) {
        // 자기 자신 삭제 차단 — ADM005
        if (adminId.equals(currentAdminId)) {
            throw new BusinessException(ErrorCode.ADM_SELF_DELETE);
        }

        AdminAccount account = adminAccountRepository.findByIdAndDeletedAtIsNull(adminId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_ADMIN_NOT_FOUND));

        // 마지막 SUPER_ADMIN 삭제 차단 — ADM010
        if (account.getRole() == AdminAccount.AdminRole.SUPER_ADMIN) {
            long activeSuperAdmins = adminAccountRepository.countByRoleAndStatus(
                    AdminAccount.AdminRole.SUPER_ADMIN, AdminAccount.AdminStatus.ACTIVE);
            if (activeSuperAdmins <= 1) {
                throw new BusinessException(ErrorCode.ADM_LAST_SUPER_ADMIN);
            }
        }

        account.softDelete(LocalDateTime.now());
        tokenService.deleteAdminRefreshToken(adminId); // 즉시 세션 무효화
    }

    // ---------- §13.7 SUPER_ADMIN 개수 ----------
    public AdminSuperAdminCountResponse countActiveSuperAdmins() {
        long count = adminAccountRepository.countByRoleAndStatus(
                AdminAccount.AdminRole.SUPER_ADMIN, AdminAccount.AdminStatus.ACTIVE);
        return new AdminSuperAdminCountResponse(count);
    }

    // ---------- §13.8 감사 로그 조회 ----------
    public Page<AdminAuditLogResponse> searchAuditLogs(Long adminId,
                                                        String action,
                                                        String targetType,
                                                        LocalDate startDate,
                                                        LocalDate endDate,
                                                        String search,
                                                        Pageable pageable) {
        // 기본 기간: 최근 7일 (endDate 포함)
        LocalDate today = LocalDate.now();
        LocalDate effectiveStart = (startDate != null) ? startDate : today.minusDays(7);
        LocalDate effectiveEnd = (endDate != null) ? endDate : today;

        LocalDateTime startAt = effectiveStart.atStartOfDay();
        // endAt은 "다음날 00:00" (exclusive) — endDate 당일 23:59:59 포함
        LocalDateTime endAt = effectiveEnd.plusDays(1).atStartOfDay();

        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        String normalizedAction = (action == null || action.isBlank()) ? null : action.trim();
        String normalizedTarget = (targetType == null || targetType.isBlank()) ? null : targetType.trim();

        return adminAuditLogRepository
                .searchAuditLogs(adminId, normalizedAction, normalizedTarget,
                                 startAt, endAt, normalizedSearch, pageable)
                .map(AdminAuditLogResponse::from);
    }
}
