FROM node:20-alpine AS builder
WORKDIR /app
COPY services/analytics-service ./
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
ENV PORT=3005
EXPOSE 3005
CMD ["node", "dist/index.js"]
