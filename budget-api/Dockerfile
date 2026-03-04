# --- Builder stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY budget-api/package.json ./budget-api/
RUN npm ci -w budget-api
COPY budget-api/ ./budget-api/
RUN npm run build -w budget-api

# --- Production stage ---
FROM node:22-alpine
WORKDIR /app

ARG COMMIT_SHA=unknown
ENV COMMIT_SHA=$COMMIT_SHA

COPY package.json package-lock.json ./
COPY budget-api/package.json ./budget-api/
RUN npm ci -w budget-api --omit=dev
COPY --from=builder /app/budget-api/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
