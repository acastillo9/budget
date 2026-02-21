# --- Builder stage ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG API_URL
ENV API_URL=$API_URL
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# --- Production stage ---
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/build ./build
EXPOSE 3000
CMD ["node", "build/index.js"]
