# Slim Dockerfile for Node.js API
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (fast build, no compilation needed)
RUN npm install --production

# Copy source code
COPY . .

# Expose the port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "index.js"]
