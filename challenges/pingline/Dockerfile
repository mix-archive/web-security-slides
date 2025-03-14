FROM node:18-slim AS base

FROM base AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN rm -rf .dockerignore && \
    pnpm build

FROM base AS runner

RUN useradd -m app
RUN apt-get update && \
    apt-get install -y iputils-ping tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_NETWORK=0
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

ARG FLAG=flag{test_flag}
RUN echo -n "${FLAG}" > /flag-$(cat /dev/urandom | tr -cd 'a-f0-9' | head -c 32)

USER app
EXPOSE 3000
ENV PORT=3000 \
    HOSTNAME="0.0.0.0"
ENTRYPOINT ["tini", "--", "/usr/bin/env", "sh"]
CMD ["-c", "while true; do timeout 30s node server.js || true; done"]
