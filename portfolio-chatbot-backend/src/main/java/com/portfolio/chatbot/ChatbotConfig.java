package com.portfolio.chatbot;

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
 * Spring AI wiring. Beans are created only when the chatbot is enabled
 * <b>and</b> an OpenAI API key is configured. When either is missing the
 * Lambda starts cleanly and {@link PortfolioAssistantController} returns
 * 503 for chat requests.
 *
 * <p>We use {@link SimpleVectorStore} (in-process) rather than a separate
 * vector DB because the portfolio knowledge base is tiny (~hundreds of
 * chunks) and adding ChromaDB/PGVector would add ops, latency, and cost
 * without quality benefit. The {@link VectorStore} interface lets us swap
 * implementations later with no controller changes.</p>
 */
@Configuration
@ConditionalOnExpression("'${chatbot.enabled:true}' == 'true' and !'${spring.ai.openai.api-key:}'.isEmpty()")
public class ChatbotConfig {

    @Bean
    public SimpleVectorStore portfolioVectorStore(EmbeddingModel embeddingModel) {
        return SimpleVectorStore.builder(embeddingModel).build();
    }

    @Bean
    public ChatMemory portfolioChatMemory() {
        return MessageWindowChatMemory.builder()
                .maxMessages(20)
                .build();
    }

    @Bean
    public ChatClient portfolioChatClient(ChatClient.Builder builder, ChatMemory portfolioChatMemory) {
        return builder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(portfolioChatMemory).build())
                .build();
    }
}
