# Build stage
FROM apify/actor-node:22 AS builder

WORKDIR /usr/src/app

COPY --chown=myuser:myuser package*.json ./
RUN npm ci --include=dev

COPY --chown=myuser:myuser tsconfig*.json ./
COPY --chown=myuser:myuser src ./src
RUN npm run build

# Production stage
FROM apify/actor-node:22

WORKDIR /usr/src/app

COPY --chown=myuser:myuser package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=myuser:myuser --from=builder /usr/src/app/dist ./dist
COPY --chown=myuser:myuser .actor ./.actor

CMD ["node", "dist/main.js"]
