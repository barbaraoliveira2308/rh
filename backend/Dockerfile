FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile

COPY backend/. ./backend/
COPY frontend/. ./frontend/
COPY shared/. ./shared/

RUN pnpm --filter @bridge351/srh-backend run build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/package.json ./frontend/
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/shared/node_modules ./shared/node_modules

EXPOSE 3000
CMD ["node", "backend/dist/main"]
