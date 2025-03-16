FROM node:lts-slim

RUN groupadd -r pptruser && \
    useradd -r -g pptruser -G audio,video pptruser && \
    mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser

RUN apt-get update && \
    apt-get install -y chromium gosu tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . /app

ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    (cd /app/bot && pnpm install --frozen-lockfile) && \
    (cd /app/web && pnpm install --frozen-lockfile)

ARG FLAG=flag{test_flag}
ENV FLAG=${FLAG} \
    NODE_ENV=production

WORKDIR /app
EXPOSE 1337/tcp 3000/tcp
ENTRYPOINT ["tini", "--", "/usr/bin/env", "bash", "-c"]
CMD ["(cd /app/bot && gosu pptruser node index.mjs) & \
    (cd /app/web && gosu 404:404 node index.js)"]
