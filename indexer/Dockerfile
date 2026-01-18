FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV DB_PATH=/app/data/indexer.db
ENV PORT=3001

# Start the indexer
CMD ["npm", "start"]
