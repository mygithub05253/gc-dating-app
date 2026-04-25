package com.ember.ember.idealtype.repository;

import com.ember.ember.idealtype.domain.UserIdealKeyword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

/**
 * 사용자 이상형 키워드 Repository - main + feature 메서드 합산.
 */
public interface UserIdealKeywordRepository extends JpaRepository<UserIdealKeyword, Long> {

    /**
     * userId에 해당하는 이상형 키워드 단순 조회.
     */
    List<UserIdealKeyword> findByUserId(Long userId);

    /**
     * userId에 해당하는 이상형 키워드 Keyword 엔티티 Join Fetch 조회.
     */
    @Query("SELECT uik FROM UserIdealKeyword uik JOIN FETCH uik.keyword WHERE uik.user.id = :userId")
    List<UserIdealKeyword> findByUserIdWithKeyword(Long userId);

    @Modifying
    @Query("DELETE FROM UserIdealKeyword uik WHERE uik.user.id = :userId")
    void deleteByUserId(Long userId);

    /** 해당 키워드를 선택한 사용자 수 */
    long countByKeywordId(Long keywordId);
}
