FROM node:lts-slim

RUN apt-get update && \
    apt-get install -y curl tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ARG FLAG="flag{test_flag}"
RUN echo -n "${FLAG}" > /flag-$(cat /dev/urandom | tr -cd 'a-f0-9' | head -c 32)

EXPOSE 3000
ENTRYPOINT ["tini", "--"]
CMD ["pnpm", "start"]
