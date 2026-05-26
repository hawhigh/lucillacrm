# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (using clean install for reproducibility)
RUN npm ci

# Copy source code and config
COPY . .

# Build the project
RUN npm run build

# Production stage
FROM caddy:2-alpine

# Copy the build output to the server directory
COPY --from=build /app/dist /srv

# Copy the Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
