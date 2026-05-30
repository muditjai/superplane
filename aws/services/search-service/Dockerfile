FROM node:20-alpine AS builder
WORKDIR /app
COPY services/search-service ./
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
ENV PORT=3002
EXPOSE 3002
CMD ["node", "dist/index.js"]
