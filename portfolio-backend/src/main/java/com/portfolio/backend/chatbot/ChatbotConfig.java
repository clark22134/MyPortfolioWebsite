package com.portfolio.backend.chatbot;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SimpleVectorStore;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring AI wiring for the portfolio chatbot.
 *
 * <p>Beans here are created only when the chatbot is enabled <b>and</b> an
 * OpenAI API key is configured. When either is missing the application
 * starts normally and {@link PortfolioAssistantController} returns 503 for
 * chat endpoints, so the rest of the site keeps working.</p>
 *
 * <h2>Why these choices</h2>
 * <ul>
 *   <li><b>SimpleVectorStore</b> (file-backed) instead of ChromaDB or PGVector.
 *       The portfolio knowledge base is small (~hundreds of chunks). Running
 *       a separate vector DB would add ops, latency, and cost without quality
 *       benefit. This keeps the AWS Lambda artifact self-contained. The
 *       {@link VectorStore} interface lets us swap in Chroma/PGVector later
 *       with no controller changes.</li>
 *   <li><b>OpenAI embeddings + chat</b> auto-configured by
 *       {@code spring-ai-starter-model-openai}. We only declare the
 *       {@link ChatClient.Builder}-derived bean and a chat memory.</li>
 * </ul>
 */
@Configuration
@ConditionalOnExpression("'${chatbot.enabled:true}' == 'true' and !'${spring.ai.openai.api-key:}'.isEmpty()")
public class ChatbotConfig {

    /**
     * In-process vector store. Persistence is handled by
     * {@link KnowledgeIngestionService} which writes/loads a JSON file.
     */
    @Bean
    public VectorStore portfolioVectorStore(EmbeddingModel embeddingModel) {
        return SimpleVectorStore.builder(embeddingModel).build();
    }

    /**
     * Sliding-window chat memory (last N turns) so the bot can answer
     * follow-ups like "what about the e-commerce one?" after an initial
     * question. Kept small to bound prompt size.
     */
    @Bean
    public ChatMemory portfolioChatMemory() {
        return MessageWindowChatMemory.builder()
                .maxMessages(20)
                .build();
    }

    /**
     * Pre-configured ChatClient with system prompt, chat memory, and a
     * deterministic-ish temperature for factual answers.
     */
    @Bean
    public ChatClient portfolioChatClient(ChatClient.Builder builder, ChatMemory portfolioChatMemory) {
        return builder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(portfolioChatMemory).build())
                .build();
    }
}
