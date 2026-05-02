package com.portfolio.backend;

import com.amazonaws.serverless.exceptions.ContainerInitializationException;
import com.amazonaws.serverless.proxy.model.AwsProxyRequest;
import com.amazonaws.serverless.proxy.model.AwsProxyResponse;
import com.amazonaws.serverless.proxy.spring.SpringBootLambdaContainerHandler;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestStreamHandler;
import com.portfolio.backend.repository.ProjectRepository;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.context.support.WebApplicationContextUtils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Lambda handler for Portfolio Backend
 * Uses AWS Serverless Java Container to proxy API Gateway events to Spring Boot.
 *
 * <p>Also handles a synthetic "warmer" event delivered by EventBridge so the JVM,
 * Hikari connection pool, and Aurora buffer cache stay warm between real requests.
 */
public class StreamLambdaHandler implements RequestStreamHandler {

    private static SpringBootLambdaContainerHandler<AwsProxyRequest, AwsProxyResponse> handler;

    static {
        try {
            handler = SpringBootLambdaContainerHandler.getAwsProxyHandler(PortfolioBackendApplication.class);
        } catch (ContainerInitializationException e) {
            // If we fail here, Lambda will re-throw the exception on every request
            e.printStackTrace();
            throw new RuntimeException("Could not initialize Spring Boot application", e);
        }
    }

    @Override
    public void handleRequest(InputStream inputStream, OutputStream outputStream, Context context)
            throws IOException {
        byte[] payload = inputStream.readAllBytes();

        // Short-circuit EventBridge warmer pings: { "warmer": true }
        // These are not API Gateway proxy events, so passing them to proxyStream would error.
        if (isWarmerEvent(payload)) {
            touchDatabase();
            outputStream.write("{\"warmed\":true}".getBytes(StandardCharsets.UTF_8));
            return;
        }

        handler.proxyStream(new ByteArrayInputStream(payload), outputStream, context);
    }

    private static boolean isWarmerEvent(byte[] payload) {
        if (payload.length == 0 || payload.length > 256) {
            return false;
        }
        String body = new String(payload, StandardCharsets.UTF_8);
        return body.contains("\"warmer\"");
    }

    private static void touchDatabase() {
        try {
            jakarta.servlet.ServletContext servletContext = handler.getServletContext();
            if (servletContext == null) {
                return;
            }
            WebApplicationContext ctx = WebApplicationContextUtils
                    .getRequiredWebApplicationContext(servletContext);
            ProjectRepository repo = ctx.getBean(ProjectRepository.class);
            repo.count();
        } catch (Exception e) {
            // Warmers must never fail loudly; log and move on.
            System.err.println("Warmer DB touch failed: " + e.getMessage());
        }
    }
}
