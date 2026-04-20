package com.ember.ember.global.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResponseCode {

    OK("200", "OK"),
    CREATED("201", "CREATED");

    private final String code;
    private final String message;
}
