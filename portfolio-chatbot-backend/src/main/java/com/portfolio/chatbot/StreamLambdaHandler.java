package com.portfolio.chatbot;

import com.amazonaws.serverless.exceptions.ContainerInitializationException;
import com.amazonaws.serverless.proxy.model.AwsProxyRequest;
import com.amazonaws.serverless.proxy.model.AwsProxyResponse;
import com.amazonaws.serverless.proxy.spring.SpringBootLambdaContainerHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * AWS Lambda entry point. Mirrors the portfolio-backend handler so the same
 * EventBridge warmer pings ({@code {"warmer": true}}) keep the JVM and
 * SimpleVectorStore index hot between real chat requests.
 */
public class StreamLambdaHandler implements RequestStreamHandler {

    private static SpringBootLambdaContainerHandler<AwsProxyRequest, AwsProxyResponse> handler;

    static {
        try {
            handler = SpringBootLambdaContainerHandler.getAwsProxyHandler(PortfolioChatbotApplication.class);
        } catch (ContainerInitializationException e) {
            e.printStackTrace();
            throw new RuntimeException("Could not initialize Spring Boot application", e);
        }
    }

    @Override
    public void handleRequest(InputStream inputStream, OutputStream outputStream, Context context)
            throws IOException {
        byte[] payload = inputStream.readAllBytes();

        if (isWarmerEvent(payload)) {
            outputStream.write("{\"warmed\":true}".getBytes(StandardCharsets.UTF_8));
            return;
        }

        handler.proxyStream(new ByteArrayInputStream(payload), outputStream, context);
    }

    private static boolean isWarmerEvent(byte[] payload) {
        if (payload.length == 0 || payload.length > 256) {
            return false;
        }
        return new String(payload, StandardCharsets.UTF_8).contains("\"warmer\"");
    }
}
