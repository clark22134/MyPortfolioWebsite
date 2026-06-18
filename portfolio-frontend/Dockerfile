# Base images are pinned by digest for reproducible builds (Infra M2). The
# human-readable tag is kept for clarity; Dependabot still bumps tag + digest.
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Infra M1: this stock nginx image keeps its default root master process.
# Running nginx unprivileged would mean switching to nginxinc/nginx-unprivileged
# and moving the listener off :80 (and the matching docker-compose port maps +
# nginx .conf "listen" directives) — disproportionate for a local-dev-only image
# (prod serves the SPA via CloudFront/S3, not this container).
FROM nginx:alpine@sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a
COPY --from=build /app/dist/portfolio-frontend/browser /usr/share/nginx/html

# Use production nginx config by default
# For local development, mount nginx.local.conf to /etc/nginx/conf.d/default.conf
COPY 00-rate-limit.conf /etc/nginx/conf.d/00-rate-limit.conf
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
