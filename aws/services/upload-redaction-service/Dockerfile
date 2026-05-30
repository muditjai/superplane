FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/upload-redaction-service ./services/upload-redaction-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/upload-redaction-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/upload-redaction-service/dist ./dist
COPY --from=builder /app/services/upload-redaction-service/package.json ./
COPY --from=builder /app/services/upload-redaction-service/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
ENV PORT=3003
EXPOSE 3003
CMD ["node", "dist/index.js"]
