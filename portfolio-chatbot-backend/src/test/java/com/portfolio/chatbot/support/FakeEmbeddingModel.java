package com.portfolio.chatbot.support;

import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;

import java.util.ArrayList;
import java.util.List;

/**
 * Offline {@link EmbeddingModel} for tests. Returns a fixed vector for every
 * input and counts calls. If {@code throwOnUse} is true it throws on any
 * embedding attempt — used to prove the load path performs no embedding.
 */
public class FakeEmbeddingModel implements EmbeddingModel {

    private final float[] vector;
    private final boolean throwOnUse;
    private int calls = 0;

    public FakeEmbeddingModel(boolean throwOnUse, float... vector) {
        this.throwOnUse = throwOnUse;
        this.vector = vector.length == 0 ? new float[] {0.1f, 0.2f, 0.3f} : vector;
    }

    public int calls() {
        return calls;
    }

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
        calls++;
        if (throwOnUse) {
            throw new IllegalStateException("FakeEmbeddingModel: embedding must not be called on the load path");
        }
        List<Embedding> out = new ArrayList<>();
        List<String> inputs = request.getInstructions();
        for (int i = 0; i < inputs.size(); i++) {
            out.add(new Embedding(vector.clone(), i));
        }
        return new EmbeddingResponse(out);
    }

    @Override
    public float[] embed(Document document) {
        calls++;
        if (throwOnUse) {
            throw new IllegalStateException("FakeEmbeddingModel: embedding must not be called on the load path");
        }
        return vector.clone();
    }

    @Override
    public int dimensions() {
        return vector.length;
    }
}
