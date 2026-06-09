# E-Commerce — MySQL database container (local development only).
#
# MYSQL_PASSWORD and MYSQL_ROOT_PASSWORD are intentionally NOT baked into the
# image — they must be injected at runtime (docker-compose requires them via
# ${MYSQL_PASSWORD:?} / ${MYSQL_ROOT_PASSWORD:?}). Without them the official
# image fails to start, which is the desired fail-closed behavior: no image
# ships a known default credential.
#
# Infra M1 (non-root): no USER directive on purpose. The official mysql
# entrypoint starts as root only to prepare/chown the data volume, then drops to
# the unprivileged `mysql` user (gosu) before running the server — so the daemon
# already runs non-root. Adding USER here would break that init chown.
# Infra M2: base image pinned by digest for reproducible builds (tag kept for
# clarity; Dependabot still bumps tag + digest).
FROM mysql:8.0@sha256:7dcddc01f13bab2f15cde676d44d01f61fc9f99fe7785e86196dfc07d358ae2b
COPY init/ /docker-entrypoint-initdb.d/
ENV MYSQL_DATABASE=full-stack-ecommerce
ENV MYSQL_USER=ecommerceapp
