package com.ember.ember.idealtype.repository;

import com.ember.ember.idealtype.domain.Keyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {

    List<Keyword> findByCategoryAndIsActiveTrueOrderByDisplayOrder(String category);

    List<Keyword> findByIsActiveTrueOrderByDisplayOrder();
}
