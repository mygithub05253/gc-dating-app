package com.ember.ember.report.service;

import com.ember.ember.chat.domain.ChatRoom;
import com.ember.ember.chat.repository.ChatRoomRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.matching.domain.Matching;
import com.ember.ember.matching.repository.MatchingRepository;
import com.ember.ember.report.domain.Block;
import com.ember.ember.report.dto.BlockListResponse;
import com.ember.ember.report.dto.BlockResponse;
import com.ember.ember.report.repository.BlockRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BlockService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private final BlockRepository blockRepository;
    private final UserRepository userRepository;
    private final MatchingRepository matchingRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final RedisTemplate<String, String> redisTemplate;

    /** 사용자 차단 (연쇄 종료 포함, 단일 트랜잭션) */
    @Transactional
    public BlockResponse blockUser(Long blockerId, Long targetUserId) {
        // 자기 차단 방지
        if (blockerId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.BLOCK_SELF);
        }

        // 중복 차단 방지
        if (blockRepository.existsByBlockerUserIdAndBlockedUserIdAndStatus(
                blockerId, targetUserId, Block.BlockStatus.ACTIVE)) {
            throw new BusinessException(ErrorCode.BLOCK_DUPLICATE);
        }

        User blocker = userRepository.findById(blockerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));
        User blocked = userRepository.findById(targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 기존 UNBLOCKED 레코드가 있으면 재활용, 없으면 신규 생성
        Block block = blockRepository.findByBlockerUserIdAndBlockedUserIdAndStatus(
                        blockerId, targetUserId, Block.BlockStatus.UNBLOCKED)
                .map(existing -> { existing.reblock(); return existing; })
                .orElseGet(() -> Block.create(blocker, blocked));
        blockRepository.save(block);

        // 연쇄 종료: 매칭(CANCELLED), 교환일기(TERMINATED), 채팅(TERMINATED)
        int cancelledMatchings = cancelPendingMatchings(blockerId, targetUserId);
        int terminatedRooms = terminateExchangeRooms(blockerId, targetUserId);
        int terminatedChats = terminateChatRooms(blockerId, targetUserId);

        // Redis 매칭 추천 캐시 무효화
        invalidateMatchingCache(blockerId, targetUserId);

        log.info("[차단] 완료 — blocker={}, blocked={}, 연쇄종료: matchings={}, rooms={}, chats={}",
                blockerId, targetUserId, cancelledMatchings, terminatedRooms, terminatedChats);

        return BlockResponse.of(LocalDateTime.now());
    }

    /** 차단 해제 */
    @Transactional
    public BlockResponse unblockUser(Long blockerId, Long targetUserId) {
        Block block = blockRepository.findByBlockerUserIdAndBlockedUserIdAndStatus(
                        blockerId, targetUserId, Block.BlockStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(ErrorCode.BLOCK_NOT_FOUND));

        block.unblock();

        // Redis 매칭 추천 캐시 무효화 (재매칭 가능하도록)
        invalidateMatchingCache(blockerId, targetUserId);

        log.info("[차단 해제] 완료 — blocker={}, blocked={}", blockerId, targetUserId);

        return BlockResponse.of(LocalDateTime.now());
    }

    /** 차단 목록 조회 (커서 기반 페이징) */
    public BlockListResponse getBlockList(Long userId, Long cursor, Integer size) {
        int pageSize = (size == null || size <= 0) ? DEFAULT_PAGE_SIZE : Math.min(size, MAX_PAGE_SIZE);

        List<Block> blocks = blockRepository.findBlockList(userId, cursor, pageSize);

        return BlockListResponse.of(blocks, pageSize);
    }

    /** PENDING 매칭 취소 (양방향) */
    private int cancelPendingMatchings(Long userA, Long userB) {
        int count = 0;
        // A → B 방향
        matchingRepository.findByFromUserIdAndToUserIdAndStatus(userA, userB, Matching.MatchingStatus.PENDING)
                .ifPresent(m -> m.cancel());
        // B → A 방향
        matchingRepository.findByFromUserIdAndToUserIdAndStatus(userB, userA, Matching.MatchingStatus.PENDING)
                .ifPresent(m -> m.cancel());
        return count;
    }

    /** 진행 중인 교환일기 방 종료 */
    private int terminateExchangeRooms(Long userA, Long userB) {
        List<ExchangeRoom> rooms = exchangeRoomRepository.findByParticipant(userA);
        int count = 0;
        for (ExchangeRoom room : rooms) {
            if (room.isParticipant(userB) && room.getStatus() == ExchangeRoom.RoomStatus.ACTIVE) {
                room.terminate();
                count++;
            }
        }
        return count;
    }

    /** 진행 중인 채팅방 종료 */
    private int terminateChatRooms(Long userA, Long userB) {
        List<ChatRoom> chatRooms = chatRoomRepository.findByParticipant(userA);
        int count = 0;
        for (ChatRoom chatRoom : chatRooms) {
            if (chatRoom.isParticipant(userB) &&
                    (chatRoom.getStatus() == ChatRoom.ChatRoomStatus.ACTIVE
                            || chatRoom.getStatus() == ChatRoom.ChatRoomStatus.COUPLE_CONFIRMED)) {
                chatRoom.terminate();
                count++;
            }
        }
        return count;
    }

    /** Redis 매칭 추천 캐시 무효화 */
    private void invalidateMatchingCache(Long userA, Long userB) {
        try {
            redisTemplate.delete("MATCHING:RECO:" + userA);
            redisTemplate.delete("MATCHING:RECO:" + userB);
            redisTemplate.delete("AI:SIMILARITY:" + userA + ":" + userB);
            redisTemplate.delete("AI:SIMILARITY:" + userB + ":" + userA);
        } catch (Exception e) {
            log.warn("[차단] Redis 캐시 무효화 실패 (무시) — {}", e.getMessage());
        }
    }
}
