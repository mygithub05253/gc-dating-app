package com.ember.ember.exchange.repository;

import com.ember.ember.exchange.domain.ExchangeDiary;
import com.ember.ember.exchange.domain.ExchangeDiary.ExchangeDiaryStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 교환일기 Repository
 */
public interface ExchangeDiaryRepository extends JpaRepository<ExchangeDiary, Long> {

    /**
     * 특정 교환방에서 특정 작성자가 제출한 교환일기 목록 조회.
     * AI 리포트 요청 시 diariesA/diariesB 페이로드 구성에 사용.
     * ExchangeDiaryStatus.SUBMITTED 필터링 → 임시저장(DRAFT)은 제외.
     *
     * @param roomId   exchange_rooms PK
     * @param authorId 작성자(User) PK
     * @return 제출 완료 교환일기 목록 (턴 번호 오름차순)
     */
    @Query("SELECT ed FROM ExchangeDiary ed " +
           "WHERE ed.room.id = :roomId " +
           "AND ed.author.id = :authorId " +
           "AND ed.status = :status " +
           "ORDER BY ed.turnNumber ASC")
    List<ExchangeDiary> findByRoomIdAndAuthorIdAndStatus(
            @Param("roomId") Long roomId,
            @Param("authorId") Long authorId,
            @Param("status") ExchangeDiaryStatus status
    );
}
