# Base images are pinned by digest for reproducible builds (Infra M2). The
# human-readable tag is kept for clarity; Dependabot still bumps tag + digest.
# Stage 1: Build with Maven
FROM maven:3-eclipse-temurin-21@sha256:d7e7f57407437c014571f1ad5a9955f03fc3edcb1d964067ef351fa38e798665 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine@sha256:704db3c40204a44f471191446ddd9cda5d60dab40f0e15c6507b815ed897238b
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

# Run as an unprivileged user (Infra M1). The app binds to 8080, not a
# privileged port, so no root capabilities are needed at runtime.
RUN addgroup -S app && adduser -S -G app -H app
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
