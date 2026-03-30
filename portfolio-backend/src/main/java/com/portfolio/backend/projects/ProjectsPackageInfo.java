package com.portfolio.backend.projects;

/**
 * Base package for interactive portfolio projects.
 * 
 * Each project should have its own subpackage with:
 * - controller/  - REST endpoints
 * - service/     - Business logic
 * - dto/         - Data transfer objects
 * - entity/      - JPA entities (if needed)
 * - repository/  - Data access (if needed)
 * 
 * Example structure for AI Chatbot:
 * projects/
 *   chatbot/
 *     ChatbotController.java
 *     ChatbotService.java
 *     dto/
 *       ChatMessage.java
 *       ChatResponse.java
 */
public final class ProjectsPackageInfo {
    private ProjectsPackageInfo() {}
}
