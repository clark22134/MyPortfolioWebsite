# HireFlow ATS — PostgreSQL database container.
#
# Schema and seed data are managed by Flyway in ats-backend (see
# src/main/resources/db/migration/V*.sql), so this image is intentionally
# a vanilla PostgreSQL with only non-secret environment defaults.
#
# POSTGRES_PASSWORD is intentionally NOT baked into the image — it must be
# injected at runtime (docker-compose requires it via ${POSTGRES_PASSWORD:?}).
# Without it the official image fails to start, which is the desired fail-closed
# behavior: no image ships a known default credential.
#
# Infra M1 (non-root): no USER directive on purpose. The official postgres
# entrypoint starts as root only to chown the data volume, then drops to the
# unprivileged `postgres` user (gosu) before running the server — so the daemon
# already runs non-root. Adding USER here would break that init chown.
# Infra M2: base image pinned by digest for reproducible builds (tag kept for
# clarity; Dependabot still bumps tag + digest).
FROM postgres:17-alpine@sha256:979c4379dd698aba0b890599a6104e082035f98ef31d9b9291ec22f2b13059ca
ENV POSTGRES_DB=ats
ENV POSTGRES_USER=atsapp
