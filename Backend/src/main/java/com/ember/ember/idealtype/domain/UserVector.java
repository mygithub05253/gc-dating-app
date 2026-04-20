package com.ember.ember.idealtype.domain;

import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 사용자 임베딩 벡터 엔티티.
 *
 * KoSimCSE가 생성한 768차원 float16 벡터를 BYTEA로 저장한다.
 * user_id가 PK이자 FK (users 테이블 참조, OneToOne 공유 PK 패턴).
 *
 * 생성 경로:
 *   - DIARY: 최근 일기 본문 임베딩 (비동기 Outbox 이벤트로 백그라운드 생성 — M6)
 *   - IDEAL_KEYWORDS: 이상형 키워드 텍스트 join → KoSimCSE 임베딩 (첫 매칭 요청 시 lazy)
 *   - MIXED: DIARY + IDEAL_KEYWORDS 혼합 (향후 확장)
 */
@Entity
@Table(name = "user_vectors")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserVector {

    /**
     * 사용자 PK를 공유 PK로 사용 (OneToOne Shared PK 패턴).
     * GenerationType 없이 @MapsId + @OneToOne 조합.
     */
    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    /**
     * 768차원 float16 벡터 바이트 배열 (1536 bytes).
     * KoSimCSE 모델 출력을 numpy float16 → bytes로 직렬화한 값.
     */
    @Column(columnDefinition = "bytea", nullable = false)
    private byte[] embedding;

    /**
     * 벡터 차원 수. 기본 768 (KoSimCSE 출력).
     * 모델 변경 이력 추적용.
     */
    @Column(nullable = false)
    private int dimension = 768;

    /**
     * 임베딩 생성 소스.
     * DIARY: 일기 본문 기반
     * IDEAL_KEYWORDS: 이상형 키워드 텍스트 기반 (lazy 생성 시 사용)
     * MIXED: 두 소스 혼합
     */
    @Column(nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private EmbeddingSource source;

    /** 임베딩 마지막 갱신 시각. lazy 생성 배치 처리 시 기준으로 사용. */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 임베딩 소스 종류.
     */
    public enum EmbeddingSource {
        DIARY,
        IDEAL_KEYWORDS,
        MIXED
    }

    // -------------------------------------------------------------------------
    // 팩토리 메서드
    // -------------------------------------------------------------------------

    /**
     * UserVector 신규 생성 팩토리 메서드.
     *
     * @param user      대상 사용자
     * @param embedding float16 직렬화 바이트 배열
     * @param source    임베딩 소스
     */
    public static UserVector create(User user, byte[] embedding, EmbeddingSource source) {
        UserVector uv = new UserVector();
        uv.user = user;
        uv.embedding = embedding;
        uv.dimension = 768;
        uv.source = source;
        uv.updatedAt = LocalDateTime.now();
        return uv;
    }

    // -------------------------------------------------------------------------
    // 도메인 상태 변경 메서드
    // -------------------------------------------------------------------------

    /**
     * 임베딩 갱신. 기존 레코드의 embedding·source·updatedAt을 교체한다.
     *
     * @param newEmbedding 새로운 float16 바이트 배열
     * @param newSource    임베딩 소스
     */
    public void update(byte[] newEmbedding, EmbeddingSource newSource) {
        this.embedding = newEmbedding;
        this.source = newSource;
        this.updatedAt = LocalDateTime.now();
    }
}
