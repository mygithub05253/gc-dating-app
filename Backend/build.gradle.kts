plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.ember"
version = "0.0.1-SNAPSHOT"
description = "Ember - 교환일기 기반 소개팅 앱 백엔드"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot Starters
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-websocket")
    implementation("org.springframework.boot:spring-boot-starter-amqp")

    // WebClient (AI 서버 통신)
    implementation("org.springframework.boot:spring-boot-starter-webflux")

    // Swagger (SpringDoc)
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.0")

    // JWT
    implementation("io.jsonwebtoken:jjwt-api:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.3")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.3")

    // Firebase (FCM 푸시 알림)
    implementation("com.google.firebase:firebase-admin:9.2.0")

    // Database
    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("com.h2database:h2")

    // Flyway (DB 스키마 마이그레이션)
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // ── 관측성 (M7) ─────────────────────────────────────────────────────────────
    // Spring Actuator + Prometheus 메트릭 노출
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("io.micrometer:micrometer-registry-prometheus")

    // Micrometer → OpenTelemetry 트레이싱 브리지 (Spring Boot BOM 버전 자동 관리)
    implementation("io.micrometer:micrometer-tracing-bridge-otel")
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")

    // 구조화 JSON 로깅 (Logstash 인코더 — prod 프로파일)
    implementation("net.logstash.logback:logstash-logback-encoder:7.4")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

tasks.jar {
    enabled = false
}

// .env 파일 로드 (bootRun 시)
// .env.local이 있으면 우선 로드, 없으면 .env 로드
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    doFirst {
        val envLocal = file("../.env.local")
        val envFile = file("../.env")
        val target = if (envLocal.exists()) envLocal else envFile

        if (target.exists()) {
            target.readLines().forEach { line ->
                if (line.isNotBlank() && !line.startsWith("#")) {
                    val parts = line.split("=", limit = 2)
                    if (parts.size == 2) {
                        environment(parts[0].trim(), parts[1].trim())
                    }
                }
            }
        }
    }
}
