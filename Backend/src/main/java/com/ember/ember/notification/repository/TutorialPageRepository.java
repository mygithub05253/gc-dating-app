package com.ember.ember.notification.repository;

import com.ember.ember.notification.domain.TutorialPage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TutorialPageRepository extends JpaRepository<TutorialPage, Long> {

    List<TutorialPage> findByIsActiveTrueOrderByPageOrder();
}
