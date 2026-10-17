# Build the existing authoritative Node server from the workspace root.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN npm ci
COPY packages/shared packages/shared
COPY packages/server packages/server
RUN npm run build -w @balik/server

# The bundle contains shared rules and validation; ws is its only external package.
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787
COPY --from=build --chown=node:node /app/packages/server/package.json ./package.json
COPY --from=build --chown=node:node /app/packages/server/dist/server.js ./server.js
COPY --from=build --chown=node:node /app/node_modules/ws ./node_modules/ws
USER node
EXPOSE 8787
CMD ["node", "server.js"]
