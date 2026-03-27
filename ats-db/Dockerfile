FROM postgres:16-alpine
COPY init/ /docker-entrypoint-initdb.d/
ENV POSTGRES_DB=ats
ENV POSTGRES_USER=atsapp
ENV POSTGRES_PASSWORD=atsapp
