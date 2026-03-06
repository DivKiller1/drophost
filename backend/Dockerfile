FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev


FROM node:20-alpine AS runtime

WORKDIR /app

# Install required tools
RUN apk add --no-cache docker-cli curl ca-certificates \
  && update-ca-certificates

# Create directories used by DropHost
RUN mkdir -p /var/sites \
  && mkdir -p /etc/nginx/conf.d \
  && chmod -R 777 /var/sites \
  && chmod -R 777 /etc/nginx/conf.d

# Copy app
COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

# Expose backend port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "src/index.js"]