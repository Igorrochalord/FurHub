FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "true" mostra os botões de contas de demonstração na tela de login
ARG VITE_SHOW_DEMO=false
ENV VITE_SHOW_DEMO=$VITE_SHOW_DEMO
# provedor de tiles do mapa (padrão: OSM, apenas desenvolvimento/baixo volume)
ARG VITE_TILE_URL=
ARG VITE_TILE_ATTRIBUTION=
ENV VITE_TILE_URL=$VITE_TILE_URL VITE_TILE_ATTRIBUTION=$VITE_TILE_ATTRIBUTION
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
