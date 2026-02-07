FROM node:25-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Use production nginx config by default
# For local development, mount nginx.local.conf to /etc/nginx/conf.d/default.conf
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
