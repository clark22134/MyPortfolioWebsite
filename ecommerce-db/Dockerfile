# E-Commerce — MySQL database container (local development only).
#
# MYSQL_PASSWORD and MYSQL_ROOT_PASSWORD are intentionally NOT baked into the
# image — they must be injected at runtime (docker-compose requires them via
# ${MYSQL_PASSWORD:?} / ${MYSQL_ROOT_PASSWORD:?}). Without them the official
# image fails to start, which is the desired fail-closed behavior: no image
# ships a known default credential.
FROM mysql:8.0
COPY init/ /docker-entrypoint-initdb.d/
ENV MYSQL_DATABASE=full-stack-ecommerce
ENV MYSQL_USER=ecommerceapp
