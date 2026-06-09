# Base images are pinned by digest for reproducible builds (Infra M2). The
# human-readable tag is kept for clarity; Dependabot still bumps tag + digest.
# Stage 1: Build Angular app
FROM node:26-alpine@sha256:144769ec3f32e8ee36b3cfde91e82bee25d9367b20f31a151f3f7eea3a2a8541 AS build
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
FROM nginx:alpine@sha256:8b1e78743a03dbb2c95171cc58639fef29abc8816598e27fb910ed2e621e589a
COPY --from=build /app/dist/angular-ecommerce/browser /usr/share/nginx/html
COPY 00-rate-limit.conf /etc/nginx/conf.d/00-rate-limit.conf
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
