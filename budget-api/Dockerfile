# --- Builder stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:22-alpine
WORKDIR /app

ARG COMMIT_SHA=unknown
ENV COMMIT_SHA=$COMMIT_SHA

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
