FROM node:20-alpine AS builder
WORKDIR /app
COPY services/upload-redaction-service ./
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
ENV PORT=3003
EXPOSE 3003
CMD ["node", "dist/index.js"]
