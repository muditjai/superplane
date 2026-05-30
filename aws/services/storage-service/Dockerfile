FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/storage-service ./services/storage-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/storage-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app/services/storage-service
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/services/storage-service ./
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
