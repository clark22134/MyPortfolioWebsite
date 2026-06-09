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
FROM postgres:16-alpine
ENV POSTGRES_DB=ats
ENV POSTGRES_USER=atsapp
