package com.clarksprojects.ats.util;

import com.clarksprojects.ats.exception.ResourceNotFoundException;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Utility for the "load-or-404" lookup pattern every domain service was
 * repeating. Centralising it removes the per-service {@code findOrThrow}
 * helper that SonarQube CPD flags as duplication.
 *
 * <pre>{@code
 * Tag tag = Entities.findOrThrow(tagRepository, id, "Tag");
 * }</pre>
 */
public final class Entities {

    private Entities() {
        // utility class
    }

    public static <T> T findOrThrow(JpaRepository<T, Long> repo, Long id, String entityName) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(entityName + " not found: " + id));
    }
}
