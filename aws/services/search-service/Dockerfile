FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/search-service ./services/search-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/search-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app/services/search-service
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/services/search-service ./
ENV PORT=3002
EXPOSE 3002
CMD ["node", "dist/index.js"]
