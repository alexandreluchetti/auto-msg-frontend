# syntax=docker/dockerfile:1
# Production front door: the panel's static build served by Caddy, which also gets the TLS
# certificate for DOMAIN and proxies the API and the WhatsApp webhook to the backend (APP_UPSTREAM).
FROM node:24-alpine AS build
WORKDIR /panel
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2.10-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /panel/dist /srv/panel
