package com.ember.ember.user.repository;

import com.ember.ember.user.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByNickname(String nickname);

    boolean existsByNickname(String nickname);
}
