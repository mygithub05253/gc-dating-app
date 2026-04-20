package com.ember.ember.global.security.oauth2;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class OAuthUserInfo {

    private final String providerId;
    private final String email;
}
