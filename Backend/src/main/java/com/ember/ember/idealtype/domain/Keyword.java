package com.ember.ember.idealtype.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "keywords")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Keyword extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String label;

    @Column(nullable = false, length = 20)
    private String category;

    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal weight = new BigDecimal("0.50");

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /** 키워드 생성 팩터리 */
    public static Keyword create(String label, String category, BigDecimal weight,
                                 Integer displayOrder, Boolean isActive) {
        Keyword k = new Keyword();
        k.label = label;
        k.category = category;
        k.weight = weight != null ? weight : new BigDecimal("0.50");
        k.displayOrder = displayOrder != null ? displayOrder : 0;
        k.isActive = isActive != null ? isActive : true;
        return k;
    }

    /** 키워드 수정 */
    public void update(String label, String category, BigDecimal weight,
                       Integer displayOrder, Boolean isActive) {
        this.label = label;
        this.category = category;
        if (weight != null) this.weight = weight;
        if (displayOrder != null) this.displayOrder = displayOrder;
        if (isActive != null) this.isActive = isActive;
    }

    /** 활성/비활성 토글 */
    public void toggleActive() {
        this.isActive = !this.isActive;
    }

    /** 가중치 변경 */
    public void updateWeight(BigDecimal weight) {
        this.weight = weight;
    }
}
