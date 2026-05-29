# HireFlow ATS — PostgreSQL database container.
#
# Schema and seed data are managed by Flyway in ats-backend (see
# src/main/resources/db/migration/V*.sql), so this image is intentionally
# a vanilla PostgreSQL with only environment defaults.
FROM postgres:16-alpine
ENV POSTGRES_DB=ats
ENV POSTGRES_USER=atsapp
ENV POSTGRES_PASSWORD=atsapp
