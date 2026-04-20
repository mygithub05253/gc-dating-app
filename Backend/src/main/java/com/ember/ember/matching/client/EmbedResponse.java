package com.ember.ember.matching.client;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * FastAPI POST /api/matching/embed 응답 바디.
 * embeddings: Base64 인코딩된 float16 바이트 목록 (요청 texts와 1:1 대응).
 */
@Getter
@NoArgsConstructor
public class EmbedResponse {

    /** Base64 인코딩된 float16 임베딩 목록 */
    private List<String> embeddings;
}
