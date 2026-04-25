package com.ember.ember.admin.aop;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.AdminAuditLog;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.admin.repository.AdminAuditLogRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * {@code @AdminAction} 어노테이션이 붙은 메서드가 정상 완료된 후
 * {@code admin_audit_logs} 테이블에 감사 로그를 자동 저장하는 Aspect.
 *
 * <p>트랜잭션 전파 전략: {@code REQUIRES_NEW} — 감사 로그 저장 실패가
 * 비즈니스 로직의 트랜잭션 롤백을 유발하지 않도록 별도 트랜잭션을 사용한다.
 * 단, 저장 실패 시에는 ERROR 로그를 남기고 {@link BusinessException}을 throw하여
 * 전역 예외 핸들러에 전달한다.</p>
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AdminAuditAspect {

    private final AdminAuditLogRepository auditLogRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final ParameterNameDiscoverer paramDiscoverer = new DefaultParameterNameDiscoverer();

    /**
     * {@code @AdminAction} 메서드 성공 후 감사 로그 저장.
     *
     * @param joinPoint   호출 지점 정보
     * @param adminAction 어노테이션 메타데이터
     */
    @AfterReturning("@annotation(adminAction)")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void writeAuditLog(JoinPoint joinPoint, AdminAction adminAction) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails ud)) {
                // 인증 컨텍스트가 없는 경우 — 감사 로그 없이 경고만 기록
                log.warn("@AdminAction 감사 로그 스킵: SecurityContext 미상 - action={}", adminAction.action());
                return;
            }

            Long adminId = ud.getUserId();
            // getReferenceById로 proxy만 확보 (추가 SELECT 쿼리 방지)
            AdminAccount admin = adminAccountRepository.getReferenceById(adminId);

            Long targetId = extractTargetId(joinPoint, adminAction.targetIdParam());
            String ipAddress = extractIp();
            String detail = adminAction.detail().isBlank() ? null : adminAction.detail();
            String targetType = adminAction.targetType().isBlank() ? null : adminAction.targetType();

            auditLogRepository.save(
                AdminAuditLog.of(admin, adminAction.action(), targetType, targetId, detail, ipAddress)
            );
        } catch (Exception e) {
            log.error("감사 로그 저장 실패: action={}, msg={}", adminAction.action(), e.getMessage(), e);
            throw new BusinessException(ErrorCode.ADM_AUDIT_LOG_FAILED);
        }
    }

    /**
     * 메서드 파라미터 이름으로 대상 엔티티 id를 추출한다.
     *
     * @param joinPoint 호출 지점
     * @param paramName 파라미터 이름 (빈 문자열이면 null 반환)
     * @return 추출된 id 값, 없으면 null
     */
    private Long extractTargetId(JoinPoint joinPoint, String paramName) {
        if (paramName == null || paramName.isBlank()) return null;
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] names = paramDiscoverer.getParameterNames(signature.getMethod());
        Object[] args = joinPoint.getArgs();
        if (names == null) names = signature.getParameterNames();
        if (names == null) return null;
        for (int i = 0; i < names.length; i++) {
            if (paramName.equals(names[i]) && args[i] instanceof Number n) {
                return n.longValue();
            }
        }
        return null;
    }

    /**
     * 현재 HTTP 요청에서 클라이언트 IP를 추출한다.
     * X-Forwarded-For 헤더를 우선 확인하여 프록시/로드밸런서 환경을 지원한다.
     *
     * @return 클라이언트 IP 문자열, 요청 컨텍스트 없으면 null
     */
    private String extractIp() {
        try {
            ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
            HttpServletRequest req = attrs.getRequest();
            String xff = req.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return xff.split(",")[0].trim();
            }
            return req.getRemoteAddr();
        } catch (Exception e) {
            return null;
        }
    }
}
