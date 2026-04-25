package com.ember.ember.admin.aop;

import com.ember.ember.admin.annotation.PiiAccess;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.domain.AdminPiiAccessLog;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.admin.repository.AdminPiiAccessLogRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
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
 * {@code @PiiAccess} 어노테이션이 붙은 메서드 실행 <b>전</b>에
 * {@code admin_pii_access_log} 테이블에 PII 접근 감사 로그를 저장하는 Aspect.
 *
 * <p><b>Fail-Closed 정책</b>: 로그 저장 실패 시 메서드 실행 자체를 차단한다.
 * 인증 컨텍스트가 없거나 targetUserId 파라미터를 추출하지 못해도 동일하게 차단한다.</p>
 *
 * <p>트랜잭션 전파: {@code REQUIRES_NEW} — 호출 측 트랜잭션과 별도로 저장하여
 * 호출 측 롤백이 PII 로그를 지우지 않도록 보장한다.</p>
 */
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class PiiAccessAspect {

    private final AdminPiiAccessLogRepository piiAccessLogRepository;
    private final AdminAccountRepository adminAccountRepository;
    private final UserRepository userRepository;
    private final ParameterNameDiscoverer paramDiscoverer = new DefaultParameterNameDiscoverer();

    /**
     * {@code @PiiAccess} 메서드 실행 전 PII 접근 로그 저장.
     * 저장 실패 시 메서드 실행이 차단된다 (Fail-Closed).
     *
     * @param joinPoint 호출 지점 정보
     * @param piiAccess 어노테이션 메타데이터
     */
    @Before("@annotation(piiAccess)")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logPiiAccess(JoinPoint joinPoint, PiiAccess piiAccess) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !(auth.getPrincipal() instanceof CustomUserDetails ud)) {
                // 인증 정보가 없으면 접근 자체를 차단
                throw new BusinessException(ErrorCode.ACCESS_DENIED);
            }

            Long adminId = ud.getUserId();
            Long targetUserId = extractTargetId(joinPoint, piiAccess.targetUserIdParam());
            if (targetUserId == null) {
                // 대상 userId 파라미터를 추출하지 못하면 차단
                log.error("PII 접근 로그 실패: targetUserIdParam='{}' 추출 불가 - accessType={}",
                    piiAccess.targetUserIdParam(), piiAccess.accessType());
                throw new BusinessException(ErrorCode.BAD_REQUEST);
            }

            // getReferenceById로 proxy만 확보 (추가 SELECT 쿼리 방지)
            AdminAccount admin = adminAccountRepository.getReferenceById(adminId);
            User targetUser = userRepository.getReferenceById(targetUserId);
            String ipAddress = extractIp();

            piiAccessLogRepository.save(
                AdminPiiAccessLog.of(admin, targetUser, piiAccess.accessType(), ipAddress)
            );
        } catch (BusinessException be) {
            // BusinessException은 그대로 재전파 (Fail-Closed)
            throw be;
        } catch (Exception e) {
            log.error("PII 접근 로그 저장 실패 (Fail-Closed): accessType={}, msg={}",
                piiAccess.accessType(), e.getMessage(), e);
            throw new BusinessException(ErrorCode.ADM_PII_LOG_FAILED);
        }
    }

    /**
     * 메서드 파라미터 이름으로 대상 사용자 id를 추출한다.
     *
     * @param joinPoint 호출 지점
     * @param paramName 파라미터 이름
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
