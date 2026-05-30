FROM node:20-alpine AS builder
WORKDIR /app
COPY services/storage-service ./
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
ENV PORT=3001
EXPOSE 3001
CMD ["node", "dist/index.js"]
