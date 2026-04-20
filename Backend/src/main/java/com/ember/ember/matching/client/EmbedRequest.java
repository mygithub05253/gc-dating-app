package com.ember.ember.matching.client;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * FastAPI POST /api/matching/embed 요청 바디.
 * 텍스트 목록을 KoSimCSE로 임베딩해 Base64 반환 요청.
 * 기준 사용자의 user_vector가 없을 때 이상형 키워드 텍스트를 임베딩하기 위해 사용.
 */
@Getter
@Builder
public class EmbedRequest {

    /** 임베딩할 텍스트 목록 (단일 임베딩이면 1개 원소 리스트) */
    private List<String> texts;
}
