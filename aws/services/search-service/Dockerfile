FROM node:20-alpine AS builder
WORKDIR /app
COPY packages/shared ./packages/shared
COPY services/search-service ./services/search-service
WORKDIR /app/packages/shared
RUN npm install && npm run build
WORKDIR /app/services/search-service
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/services/search-service/dist ./dist
COPY --from=builder /app/services/search-service/package.json ./
COPY --from=builder /app/services/search-service/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
ENV PORT=3002
EXPOSE 3002
CMD ["node", "dist/index.js"]
