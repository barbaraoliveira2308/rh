FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

COPY frontend/. ./frontend/
COPY shared/. ./shared/

RUN pnpm --filter @bridge351/srh-frontend run build

FROM nginx:stable-alpine AS runner
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY --from=builder /app/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
