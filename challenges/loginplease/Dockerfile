FROM node:lts-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

EXPOSE 5001
ENV FLAG="ictf{omg_js_why_are_you_doing_this_to_me}"
CMD ["pnpm", "start"]