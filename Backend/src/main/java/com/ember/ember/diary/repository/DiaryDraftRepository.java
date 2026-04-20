package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.DiaryDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiaryDraftRepository extends JpaRepository<DiaryDraft, Long> {

    /** 특정 사용자의 임시저장 목록 (삭제되지 않은 것만) */
    List<DiaryDraft> findByUserIdAndDeletedAtIsNullOrderBySavedDateDesc(Long userId);

    /** 특정 사용자의 임시저장 개수 (삭제되지 않은 것만) */
    long countByUserIdAndDeletedAtIsNull(Long userId);
}
