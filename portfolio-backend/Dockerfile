FROM maven:3-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Accept build argument for git commit
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
