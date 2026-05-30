FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/payment-service ./services/payment-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/payment-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app/services/payment-service
COPY --from=builder /app/packages/shared /app/packages/shared
COPY --from=builder /app/services/payment-service ./
ENV PORT=3004
EXPOSE 3004
CMD ["node", "dist/index.js"]
