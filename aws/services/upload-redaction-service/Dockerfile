FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/upload-redaction-service ./services/upload-redaction-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/upload-redaction-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app/services/upload-redaction-service
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/services/upload-redaction-service ./
ENV PORT=3003
EXPOSE 3003
CMD ["node", "dist/index.js"]
