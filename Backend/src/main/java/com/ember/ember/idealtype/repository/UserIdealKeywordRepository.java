package com.ember.ember.idealtype.repository;

import com.ember.ember.idealtype.domain.UserIdealKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 사용자 이상형 키워드 Repository.
 */
public interface UserIdealKeywordRepository extends JpaRepository<UserIdealKeyword, Long> {

    /**
     * userId에 해당하는 이상형 키워드 전체 조회.
     * Keyword 엔티티를 Eager로 가져오기 위해 Join Fetch 쿼리는 필요 시 추가.
     */
    List<UserIdealKeyword> findByUserId(Long userId);
}
