FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/storage-service ./services/storage-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/storage-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/storage-service/dist ./dist
COPY --from=builder /app/services/storage-service/package.json ./
COPY --from=builder /app/services/storage-service/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
