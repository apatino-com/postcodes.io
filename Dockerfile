FROM node:24-alpine AS base

RUN apk update && apk upgrade && apk add --no-cache bash

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile && \
    pnpm store prune && \
    pnpm run build

FROM base AS install

ARG PORT=8000
ENV PORT $PORT
EXPOSE $PORT

USER node

COPY ./build ./dist/build

WORKDIR /app/dist

HEALTHCHECK --interval=5s CMD node healthcheck.js

CMD [ "node", "server.js" ]
