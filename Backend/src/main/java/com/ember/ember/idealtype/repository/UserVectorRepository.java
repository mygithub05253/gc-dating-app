package com.ember.ember.idealtype.repository;

import com.ember.ember.idealtype.domain.UserVector;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 사용자 벡터 Repository.
 * PK = user_id (Shared PK 패턴) → findById(userId)로 조회 가능.
 */
public interface UserVectorRepository extends JpaRepository<UserVector, Long> {

    /**
     * userId로 벡터 조회.
     * JpaRepository.findById(userId)와 동일하나 명시성을 위해 선언.
     */
    Optional<UserVector> findByUserId(Long userId);

    /**
     * 후보 사용자 ID 목록에 해당하는 벡터를 일괄 조회.
     * 매칭 요청 시 후보 임베딩 배치 로드에 사용.
     */
    @Query("SELECT uv FROM UserVector uv WHERE uv.userId IN :userIds")
    List<UserVector> findAllByUserIdIn(@Param("userIds") List<Long> userIds);
}
