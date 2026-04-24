package com.ember.ember.chat.service;

import com.ember.ember.chat.domain.ChatRoom;
import com.ember.ember.chat.domain.ChatRoom.ChatRoomStatus;
import com.ember.ember.chat.domain.Message;
import com.ember.ember.chat.domain.Message.MessageType;
import com.ember.ember.chat.dto.*;
import com.ember.ember.chat.repository.ChatRoomRepository;
import com.ember.ember.chat.repository.MessageRepository;
import com.ember.ember.diary.domain.DiaryKeyword;
import com.ember.ember.diary.repository.DiaryKeywordRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.domain.ExchangeRoom.RoomStatus;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.content.service.ContentScanResult;
import com.ember.ember.content.service.ContentScanService;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.notification.domain.Notification;
import com.ember.ember.notification.repository.NotificationRepository;
import com.ember.ember.user.domain.User;
import com.ember.ember.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 채팅 서비스 (도메인 7)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final int DEFAULT_SIZE = 30;
    private static final int MAX_SIZE = 50;

    /** 외부 연락처 탐지 패턴 (전화번호, 카카오ID, 인스타 등) */
    private static final Pattern CONTACT_PATTERN = Pattern.compile(
            "(01[0-9][-\\s]?\\d{3,4}[-\\s]?\\d{4})" +
            "|(kakao|카톡|카카오|insta|인스타|line|라인|텔레그램)" +
            "|(@[a-zA-Z0-9_.]+)",
            Pattern.CASE_INSENSITIVE
    );

    private final ChatRoomRepository chatRoomRepository;
    private final MessageRepository messageRepository;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final DiaryKeywordRepository diaryKeywordRepository;
    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ContentScanService contentScanService;

    /** 6.1 채팅 시작 (교환일기 → 채팅방 생성) */
    @Transactional
    public ChatRoomListResponse.ChatRoomItem createChatRoom(Long userId, Long exchangeRoomId) {
        ExchangeRoom exchangeRoom = exchangeRoomRepository.findById(exchangeRoomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXCHANGE_ROOM_NOT_FOUND));

        if (!exchangeRoom.isParticipant(userId)) {
            throw new BusinessException(ErrorCode.EXCHANGE_NOT_PARTICIPANT);
        }

        // 이미 채팅방 존재 확인
        if (chatRoomRepository.findByExchangeRoomId(exchangeRoomId).isPresent()) {
            throw new BusinessException(ErrorCode.CHATROOM_ALREADY_LINKED);
        }

        // 교환방 상태 확인
        if (exchangeRoom.getStatus() != RoomStatus.CHAT_CONNECTED &&
            exchangeRoom.getStatus() != RoomStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.EXCHANGE_NOT_COMPLETED);
        }

        ChatRoom chatRoom = ChatRoom.create(exchangeRoom.getUserA(), exchangeRoom.getUserB(), exchangeRoom);
        chatRoomRepository.save(chatRoom);
        exchangeRoom.connectChat(chatRoom);

        User partner = exchangeRoom.getPartner(userId);

        log.info("[ChatService] 채팅방 생성 — chatRoomId={}, exchangeRoomId={}",
                chatRoom.getId(), exchangeRoomId);

        return ChatRoomListResponse.ChatRoomItem.builder()
                .chatRoomId(chatRoom.getId())
                .roomUuid(chatRoom.getRoomUuid().toString())
                .partnerNickname(partner.getNickname())
                .status(chatRoom.getStatus().name())
                .unreadCount(0)
                .build();
    }

    /** 6.2 채팅방 목록 조회 (배치 쿼리로 N+1 방지) */
    @Transactional(readOnly = true)
    public ChatRoomListResponse getChatRooms(Long userId) {
        List<ChatRoom> rooms = chatRoomRepository.findByParticipant(userId);
        if (rooms.isEmpty()) {
            return ChatRoomListResponse.builder().chatRooms(List.of()).build();
        }

        List<Long> roomIds = rooms.stream().map(ChatRoom::getId).toList();

        // 미읽음 수 배치 조회 (N번 COUNT → 1번 GROUP BY)
        Map<Long, Long> unreadMap = messageRepository.countUnreadByRoomIds(roomIds, userId)
                .stream().collect(Collectors.toMap(
                        row -> (Long) row[0], row -> (Long) row[1]));

        // 마지막 메시지 배치 조회 (N번 SELECT → 1번 서브쿼리)
        Map<Long, Message> lastMsgMap = messageRepository.findLastMessageByRoomIds(roomIds)
                .stream().collect(Collectors.toMap(
                        msg -> msg.getChatRoom().getId(), msg -> msg));

        List<ChatRoomListResponse.ChatRoomItem> items = rooms.stream().map(room -> {
            User partner = room.getPartner(userId);
            long unreadCount = unreadMap.getOrDefault(room.getId(), 0L);
            Message lastMsg = lastMsgMap.get(room.getId());

            return ChatRoomListResponse.ChatRoomItem.builder()
                    .chatRoomId(room.getId())
                    .roomUuid(room.getRoomUuid().toString())
                    .partnerNickname(partner.getNickname())
                    .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                    .lastMessageAt(lastMsg != null ? lastMsg.getCreatedAt().format(ISO) : null)
                    .unreadCount(unreadCount)
                    .status(room.getStatus().name())
                    .build();
        }).toList();

        return ChatRoomListResponse.builder().chatRooms(items).build();
    }

    /** 6.3 메시지 이력 조회 */
    @Transactional(readOnly = true)
    public ChatMessageListResponse getMessages(Long userId, Long roomId, Long before, Integer size) {
        ChatRoom room = findChatRoomOrThrow(roomId);
        validateChatParticipant(room, userId);

        int pageSize = (size != null && size > 0 && size <= MAX_SIZE) ? size : DEFAULT_SIZE;
        List<Message> messages = messageRepository.findByCursor(
                roomId, before, PageRequest.of(0, pageSize + 1));

        boolean hasMore = messages.size() > pageSize;
        if (hasMore) {
            messages = messages.subList(0, pageSize);
        }

        List<ChatMessageResponse> items = messages.stream().map(this::toMessageResponse).toList();
        // 역순으로 반환 (오래된 → 최신)
        List<ChatMessageResponse> reversed = new java.util.ArrayList<>(items);
        Collections.reverse(reversed);

        return ChatMessageListResponse.builder()
                .messages(reversed)
                .hasMore(hasMore)
                .build();
    }

    /** 6.4 채팅 상대방 프로필 조회 */
    @Transactional(readOnly = true)
    public ChatPartnerProfileResponse getPartnerProfile(Long userId, Long roomId) {
        ChatRoom room = findChatRoomOrThrow(roomId);
        validateChatParticipant(room, userId);

        User partner = room.getPartner(userId);

        // AI 성격 태그 조회 (RELATIONSHIP_STYLE 타입 빈도 상위 3개)
        List<String> personalityTags = diaryKeywordRepository.findByUserId(partner.getId()).stream()
                .filter(k -> k.getTagType() == DiaryKeyword.TagType.RELATIONSHIP_STYLE)
                .collect(Collectors.groupingBy(DiaryKeyword::getLabel, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(3)
                .map(Map.Entry::getKey)
                .toList();

        return ChatPartnerProfileResponse.builder()
                .userId(partner.getId())
                .nickname(partner.getNickname())
                .birthDate(partner.getBirthDate() != null ? partner.getBirthDate().toString() : null)
                .gender(partner.getGender() != null ? partner.getGender().name() : null)
                .sido(partner.getSido())
                .personalityTags(personalityTags)
                .build();
    }

    /** 6.5 메시지 전송 (WebSocket STOMP 핸들러에서 호출) */
    @Transactional
    public ChatMessageResponse sendMessage(Long userId, Long roomId, ChatMessageRequest request) {
        ChatRoom room = findChatRoomOrThrow(roomId);
        validateChatParticipant(room, userId);

        if (room.getStatus() == ChatRoomStatus.TERMINATED || room.getStatus() == ChatRoomStatus.CHAT_LEFT) {
            throw new BusinessException(ErrorCode.CHATROOM_TERMINATED);
        }

        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND));

        // 금칙어 검열
        ContentScanResult scanResult = contentScanService.scan(request.content());
        if (!scanResult.isAllowed()) {
            throw new BusinessException(ErrorCode.CONTENT_FILTERED);
        }

        // Redis INCR로 sequenceId 발급
        String seqKey = "MSG:SEQ:" + roomId;
        Long sequenceId = redisTemplate.opsForValue().increment(seqKey);

        MessageType type;
        try {
            type = MessageType.valueOf(request.type());
        } catch (IllegalArgumentException e) {
            type = MessageType.TEXT;
        }

        Message message = Message.create(room, sender, request.content(), type, sequenceId);

        // 외부 연락처 탐지
        if (CONTACT_PATTERN.matcher(request.content()).find()) {
            message.flag();
            log.warn("[ChatService] 외부 연락처 탐지 — roomId={}, senderId={}", roomId, userId);
        }

        messageRepository.save(message);

        log.debug("[ChatService] 메시지 전송 — roomId={}, seqId={}", roomId, sequenceId);

        return toMessageResponse(message);
    }

    /** 6.5 읽음 처리 (WebSocket에서 호출) */
    @Transactional
    public void markRead(Long userId, Long roomId) {
        ChatRoom room = findChatRoomOrThrow(roomId);
        validateChatParticipant(room, userId);

        int updated = messageRepository.markAllRead(roomId, userId);
        if (updated > 0) {
            log.debug("[ChatService] 읽음 처리 — roomId={}, userId={}, count={}", roomId, userId, updated);
        }
    }

    /** 6.6 채팅방 나가기 */
    @Transactional
    public void leaveChatRoom(Long userId, Long roomId) {
        ChatRoom room = findChatRoomOrThrow(roomId);
        validateChatParticipant(room, userId);

        if (room.getStatus() == ChatRoomStatus.TERMINATED) {
            throw new BusinessException(ErrorCode.CHATROOM_TERMINATED);
        }

        room.leave(userId);

        // 시스템 메시지 생성
        String seqKey = "MSG:SEQ:" + roomId;
        Long sequenceId = redisTemplate.opsForValue().increment(seqKey);

        User leaver = room.getUserA().getId().equals(userId) ? room.getUserA() : room.getUserB();
        Message systemMsg = Message.createSystem(room,
                leaver.getNickname() + "님이 채팅방을 나갔습니다.", sequenceId);
        messageRepository.save(systemMsg);

        // WebSocket 브로드캐스트
        messagingTemplate.convertAndSend("/topic/chat/" + roomId, toMessageResponse(systemMsg));

        log.info("[ChatService] 채팅방 나가기 — roomId={}, userId={}", roomId, userId);
    }

    // ── Private 헬퍼 ──

    private ChatRoom findChatRoomOrThrow(Long roomId) {
        return chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHATROOM_NOT_FOUND));
    }

    private void validateChatParticipant(ChatRoom room, Long userId) {
        if (!room.isParticipant(userId)) {
            throw new BusinessException(ErrorCode.CHATROOM_NOT_PARTICIPANT);
        }
    }

    private ChatMessageResponse toMessageResponse(Message msg) {
        return ChatMessageResponse.builder()
                .messageId(msg.getId())
                .senderId(msg.getSender() != null ? msg.getSender().getId() : null)
                .content(msg.getContent())
                .type(msg.getType().name())
                .createdAt(msg.getCreatedAt() != null ? msg.getCreatedAt().format(ISO) : null)
                .isRead(msg.getIsRead())
                .isFlagged(msg.getIsFlagged())
                .sequenceId(msg.getSequenceId())
                .build();
    }
}
