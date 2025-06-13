FROM node:20.9-alpine as builder

WORKDIR /app

# Copy files for dependency installation
COPY package.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# Runtime stage
FROM node:20.9-alpine

WORKDIR /app

# Copy compiled files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Start the server when the container launches
CMD ["node", "dist/index.js"]