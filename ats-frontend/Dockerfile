# Base images are pinned by digest for reproducible builds (Infra M2). The
# human-readable tag is kept for clarity; Dependabot still bumps tag + digest.
# Stage 1: Build Angular app
FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with nginx
# Infra M1: this stock nginx image keeps its default root master process.
# Running nginx unprivileged would mean switching to nginxinc/nginx-unprivileged
# and moving the listener off :80 (and the matching docker-compose port maps +
# nginx .conf "listen" directives) — disproportionate for a local-dev-only image
# (prod serves the SPA via CloudFront/S3, not this container).
FROM nginx:alpine@sha256:20316569d8f81a160065d7d2a5eeffc7ca97d79022462ee255fd23fa103a6b5c
COPY --from=build /app/dist/ats-frontend/browser /usr/share/nginx/html
COPY 00-rate-limit.conf /etc/nginx/conf.d/00-rate-limit.conf
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
