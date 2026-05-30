FROM node:20-alpine AS builder
WORKDIR /app
COPY services/payment-service ./
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
ENV PORT=3004
EXPOSE 3004
CMD ["node", "dist/index.js"]
