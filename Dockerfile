FROM node:lts-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /src
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM caddy:alpine

WORKDIR /app
COPY --from=builder /src/dist /app/dist
COPY Caddyfile /app/Caddyfile
EXPOSE 8080
CMD ["caddy", "run", "--config", "./Caddyfile"]
