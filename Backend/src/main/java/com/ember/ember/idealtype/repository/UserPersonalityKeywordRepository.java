package com.ember.ember.idealtype.repository;

import com.ember.ember.idealtype.domain.UserPersonalityKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 사용자 퍼스널리티 키워드 Repository.
 * AI 분석 결과로 누적된 사용자 성격/감정/라이프스타일/톤 태그.
 * 매칭 시 후보 사용자의 퍼스널리티 키워드를 조회해 FastAPI로 전달.
 */
public interface UserPersonalityKeywordRepository extends JpaRepository<UserPersonalityKeyword, Long> {

    /**
     * userId에 해당하는 퍼스널리티 키워드 전체 조회.
     */
    List<UserPersonalityKeyword> findByUserId(Long userId);

    /**
     * 후보 사용자 ID 목록의 퍼스널리티 키워드 일괄 조회.
     * 매칭 요청 구성 시 후보별 키워드 배치 로드에 사용.
     */
    List<UserPersonalityKeyword> findByUserIdIn(List<Long> userIds);

    /**
     * 특정 사용자의 특정 tagType + label 조합 단건 조회.
     * 라이프스타일 분석 결과 누적 업데이트 시 기존 행 존재 여부 확인용.
     *
     * @param userId  사용자 PK
     * @param tagType 태그 유형
     * @param label   태그 레이블
     * @return 기존 레코드 (없으면 Optional.empty())
     */
    Optional<UserPersonalityKeyword> findByUserIdAndTagTypeAndLabel(
            Long userId,
            UserPersonalityKeyword.TagType tagType,
            String label);
}
