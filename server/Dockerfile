# Build stage
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Install build dependencies for node-llama-cpp
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
# node-llama-cpp will download/build the necessary binaries during postinstall
RUN npm install

# Copy source code
COPY . .

# Final stage
FROM node:18-bullseye-slim

WORKDIR /app

# Copy built node_modules and code from builder
COPY --from=builder /app /app

# Expose the port the server runs on
EXPOSE 5000

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]
