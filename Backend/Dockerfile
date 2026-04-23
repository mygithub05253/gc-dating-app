FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 1) Gradle Wrapper + 빌드 스크립트만 먼저 복사 → 의존성 레이어 캐시
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
RUN sed -i 's/\r$//' ./gradlew && chmod +x ./gradlew \
    && ./gradlew dependencies --no-daemon || true

# 2) 소스 복사 → 빌드 (의존성 안 바뀌면 위 레이어 캐시 히트)
COPY src src
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
