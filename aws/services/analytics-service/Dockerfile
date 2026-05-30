FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/analytics-service ./services/analytics-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/analytics-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/analytics-service/dist ./dist
COPY --from=builder /app/services/analytics-service/package.json ./
COPY --from=builder /app/services/analytics-service/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
ENV PORT=3005
EXPOSE 3005
CMD ["node", "dist/index.js"]
